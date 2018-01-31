/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/**
 * @params win {Object} ChromeWindow
 */
console.log('tabsplit-store.js');

(function(win) {
"use strict";

if (!win.TabSplit) {
  win.TabSplit = {};
}
const TabSplit = win.TabSplit;

TabSplit.store = {

  // TODO: Maybe could remove this
  TAB_GROUP_ID_PREFIX: "tabsplit-tab-group-id-",

  VALID_LAYOUTS: [ "column_split" ],

  // We do incremental id
  _tabGroupIdCount: 0,

  // Listeners for the state change.
  // One listener is a object having `onStateChange` function with the signature below:
  //   - store {object} TabSplit.store
  //   - tabGroupsDiff {Object} the tabGroups state diff after the state changes.
  //        This is to let ouside quickly know what changes on tabGroups.
  //        Holds 3 properties:
  //        - added {Array} the newly added tabGroups' id
  //        - removed {Array} the removed tabGroups' id
  //        - updated {Array} the updated tabGroups'  // TODO: Maybe this is useless
  _listeners: null,

  // This object stores the current state, which includes
  //
  // status {String} the status of TabSplit function, could be "status_active", "status_inactive", "status_destroyed".
  //
  // tabbrowserWidth {Number} the current tabbrowser width
  //
  // selectedLinkedPanel {String} the selected tab's linkedPanel attribute value
  //
  // tabGroupIds {Array} The array of tab group ids. The order represents tab groups' order.
  //
  // tabGroups {Object} holds instances of TabGroup, see below for TabGroup. Key is tab group id.
  //
  // TabGroup is one object holding info of one group of tabs being split
  // - id {Number} this tabGroup id (Should never allow any update on the id).
  // - color {String} #xxxxx used for visually grouping tabs
  // - layout {String} see `VALID_LAYOUTS` for the valid values
  // - tabs {Array} instances of Tab, see below for Tab details.
  //                The order represents tabs' order: The smaller col comes first.
  //
  // Tab is one object holding info of one split tab in one tab group
  // - linkedPanel {String} the tab's linkedPanel attribute value
  // - col: {Number} the column index where the tab locate. 0 is the left most column.
  // - distribution {Number} 0 ~ 1. The percentage of window width this tab occupies
  _state: null,

  _resetState() {
    this._state = {
      status: "status_inactive",
      tabbrowserWidth: -1,
      selectedLinkedPanel: "",
      tabGroupIds: [],
      tabGroups: {},
    };
  },

  /**
   * @params params {Object}
   *    - utils {Object} TabSplit.utils
   */
  init(params) {
    const { utils } = params;
    this._utils = utils;
    this._resetState();
    this._tabGroupIdCount = 0;
    this._listeners = new Set();
  },

  getState() {
    return this._copy(this._state);
  },

  /**
   * Should call this to udpate states.
   *
   * @params actions {Object} state update actions. See Action below for details
   *
   * Action is an object describing the state update action, holding:
   *  - type {String} the action type
   *  - args {Object} holding args for this action. The content depends on the `type` property.
   * The valid actions are:
   *  - type: "set_active"
   *  - args: null, not required
   *
   *  - type: "set_inactive"; this will reset all other states
   *  - args: null, not required
   *
   *  - type: "set_destroyed"; this will clear all other states and listeners
   *  - args: null, not required
   *
   *  - type: "update_tabbrowser_width"
   *  - args:
   *      - tabbrowserWidth {Number} see `tabbrowserWidth` in `_state`
   *
   *  - type: "update_selected_linkedPanel"
   *  - args:
   *      - selectedLinkedPanel {String} see `selectedLinkedPanel` in `_state`
   *
   *  - type: "add_tab_group". This will add to the end.
   *  - args:
   *      - newTabGroup {Object} see TabGroup in `_state`
   *
   *  - type: "remove_tab_group"
   *  - args:
   *      - id {Number} the id of tabGroup in `_state`
   *
   *  - type: "remove_all_tab_groups"
   *  - args: null, not required
   *
   *  - type: "update_tab_distibutions".
   *  - args:
   *      - id {Number} the id of the group to update.
   *      - distributions {Array} the new tabs' distributions,
   *          the order should correspond to tabs' order in tab group
   */
  update(...actions) {
    const added = [];
    const removed = [];
    const updated = [];
    let dirty = false;
    for (const action of actions) {
      try {
        if (this._state.status === "status_destroyed") {
          throw new Error("The current status is destroyed, please init TabSplit.store again before updating any state");
        }

        const args = action.args;
        switch (action.type) {
          case "set_active":
            if (this._state.status !== "status_active") {
              this._state.status = "status_active";
              dirty = true;
            } else {
              throw new Error("Set active on the status that is already active");
            }
            break;

          case "set_inactive":
            if (this._state.status === "status_active") {
              this._state.status = "status_inactive";
              dirty = true;
            } else {
              throw new Error("Set inactive on the status that is not active");
            }
            break;

          case "set_destroyed":
            this._state.status = "status_destroyed";
            dirty = true;
            console.log("TMP> tabsplit-store - set_destroyed at", Date.now());
            break;

          case "update_tabbrowser_width":
            if (args.tabbrowserWidth <= 0) {
              throw new Error(`Invalid tabbrowser width of ${v}`);
            }
            if (args.tabbrowserWidth !== this._state.tabbrowserWidth) {
              this._state.tabbrowserWidth = args.tabbrowserWidth;
              dirty = true;
            }
            break;

          case "update_selected_linkedPanel":
            if (!this._utils.getTabByLinkedPanel(args.selectedLinkedPanel)) {
              throw new Error(`Unknown selected linkedPanel of ${args.selectedLinkedPanel}`);
            }
            this._state.selectedLinkedPanel = args.selectedLinkedPanel;
            dirty = true;
            break;

          case "add_tab_group": {
            const newId = this._addTabGroup(args.newTabGroup);
            added.push(newId);
            dirty = true;
            break;
          }

          case "remove_tab_group":
            this._removeTabGroup(args.id);
            removed.push(args.id);
            dirty = true;
            break;

          case "remove_all_tab_groups":
            // Notice: Here is important because we allow batch updates.
            // Assume there are tab groups [ 1, 2, 3 ] and
            // 1. The 1st update is "remove_tab_group" for the group 1,
            //    so tab groups is [ 2, 3 ] and `removed` is [1]
            // 2. The 2nd update is "remove_all_tab_groups",
            //    so we should collect the `removed`: [1] with the rest tab groups: [ 2, 3 ].
            //
            // If it went the opposite direction, which was
            // 1. The 1st update is "remove_all_tab_groups"
            // 2. The 2nd update is "remove_tab_group" for the group 1, then
            //    it will throw because of no more tab groups.
            // This case should be reasonable and the outside should take care of that
            // since the outside demands *remove_all_tab_groups* first.
            // Though no batch update, just one-by-one update, the same throw will occur.
            removed.splice(0, 0, ...this._state.tabGroupIds);
            this._state.tabGroupIds = [];
            this._state.tabGroups = {};
            dirty = true;
            break;

          case "update_tab_distibutions":
            this._updateTabDistributions(args.id, args.distributions);
            updated.push(args.id);
            dirty = true;
            break;

          default:
            throw new Error(`Unknow action type of ${action.type}`);
        }
      } catch (e) {
        console.error(`Fail at the update action of ${action.type}`);
        console.error(e);
        return;
      }
    }

    if (dirty) {
      if (this._state.status === "status_inactive") {
        this._resetState();
      } else if (this._state.status === "status_destroyed") {
        // A simple way to clear all other states except for the status state
        this._state = { status: "status_destroyed" };
      }

      this._listeners.forEach(listener => {
        // TODO: Should we pass a copy of `{ added, removed, updated }`
        // in case that outside modifies these important variables?
        listener.onStateChange(this, { added, removed, updated });
      });

      if (this._state.status === "status_destroyed") {
        this._listeners.clear();
        this._listeners = null;
      }
    }
  },

  /**
   * @return the new tabGroup id
   */
  _addTabGroup(newTabGroup) {
    const { tabs, color, layout } = newTabGroup;

    if (!this.VALID_LAYOUTS.includes(layout)) {
      throw new Error(`Invalid split layout: ${layout}`);
    }

    if (color === "") {
      throw new Error("Lack the color property");
    }

    if (tabs.length !== 2) {
      throw new Error(`Unexpected tabs length of ${tabs.length}`);
    }

    const seenPanels = [];
    let distributionSum = 0;
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      if (t.col !== i) {
        // Maybe we should relax this check and do sorting if needed.
        throw new Error(`The tab with linkedPanel of ${t.linkedPanel} has array position ${i} different from column position ${t.col}`);
      }
      if (!this._isValidTab(t)) {
        throw new Error(`The tab with linkedPanel of ${t.linkedPanel} being added is invalid`);
      }
      if (this._utils.getTabGroupByLinkedPanel(t.linkedPanel, this._state)) {
        throw new Error(`The tab with linkedPanel of ${t.linkedPanel} being added is already split`);
      }
      if (seenPanels.includes(t.linkedPanel)) {
        throw new Error(`Cannot add the tab with linkedPanel of ${t.linkedPanel} twice in one tab group`);
      }
      seenPanels.push(t.linkedPanel);
      distributionSum += t.distribution;
    }
    if (distributionSum !== 1) {
      const panels = tabs.map(t => t.linkedPanel);
      throw new Error(`Expect the sum of tabs' distributions to be 1 but get ${distributionSum} from ${panels.join(", ")}`);
    }

    // NOTE: What if redundant props passed with newTabGroup
    const newGroup = this._copy(newTabGroup);
    newGroup.id = this.TAB_GROUP_ID_PREFIX + this._tabGroupIdCount++;
    this._state.tabGroups[newGroup.id] = newGroup;
    this._state.tabGroupIds.push(newGroup.id);
    return newGroup.id;
  },

  _removeTabGroup(id) {
    const i = this._state.tabGroupIds.indexOf(id);
    if (i < 0) {
      throw new Error(`Remove unknow tab group with id = ${id}`);
    }
    this._state.tabGroupIds.splice(i, 1);
    delete this._state.tabGroups[id];
  },

  _updateTabDistributions(id, distributions) {
    const group = this._state.tabGroups[id];
    if (!group) {
      throw new Error(`Update tabs' distributions on unknown tab group with the id = ${id}`);
    }

    if (distributions.length !== group.tabs.length) {
      throw new Error(`Expect ${group.tabs.length} tabs' distributions to update but get ${distributions.length}`);
    }

    const sum = distributions.reduce((sum, percentage) => sum += percentage, 0);
    if (sum !== 1) {
      throw new Error(`Expect the total tabs' distributions to be 1 but get ${distributions}`);
    }

    for (let i = group.tabs.length - 1; i >= 0; --i) {
      group.tabs[i].distribution = distributions[i];
    }
  },

  _copy(obj) {
    // We don't wanna give outside any chance to mutaute our state
    // so make a copy when returning/receiving states.
    // NOTE:
    // The state only contains Number/String and is simple so we can do this copy trick.
    // Maybe we should borrow from immutable.js when the state gets complex.
    return JSON.parse(JSON.stringify(obj));
  },

  _isValidTab(tab) {
    const { col, distribution, linkedPanel } = tab;
    if ((col < 0 || col > 1 ) ||
        (distribution <= 0 || distribution >= 1) ||
        !this._utils.getTabByLinkedPanel(linkedPanel)) {
      return false;
    }
    return true;
  },

  /**
   * @param listener {Function} See `_listeners`
   */
  subscribe(listener) {
    if (!this._listeners.has(listener)) {
      this._listeners.add(listener);
    }
  },

  /**
   * @param listener {Function} See `_listeners`
   */
  unsubscribe(listener) {
    if (this._listeners && this._listeners.has(listener)) {
      this._listeners.delete(listener);
    }
  },
};

})(this);
