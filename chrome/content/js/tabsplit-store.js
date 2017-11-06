/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/**
 * @params win {Object} ChromeWindow
 */
(function (win) {
"use strict";

if (!win.TabSplit) {
  win.TabSplit = {};
}
const TabSplit = win.TabSplit;

TabSplit.store = {

  // TODO: Maybe could remove this
  TAB_GROUP_ID_PREFIX: "tabsplit-tab-group-id-",

  // We do incremental id
  _tabGroupIdCount: 0,
  
  // Listeners for the state change.
  // One listener is a function with the signature below:
  //   - store {object} TabSplit.store
  //   - tabGroupsDiff {Object} the tabGroups state diff after the state changes.
  //        This is to let ouside quickly know what changes on tabGroups.
  //        Holds 3 properties:
  //        - added {Array} the newly added tabGroups' id
  //        - removed {Array} the removed tabGroups' id
  //        - updated {Array} the updated tabGroups'  // TODO: Maybe this is useless
  _listeners: new Set(),

  // This object stores the current state, which includes
  _state: {
    // windowWidth {Number} the current window width
    windowWidth: -1,
    // selectedLinkedPanel {String} the selected tab's linkedPanel attribute value
    selectedLinkedPanel: "",
    // tabGroupIds {Array} The array of tab group ids. The order represents tab groups' order.
    tabGroupIds: [],
    // tabGroups {Object} holds instances of TabGroup, see below for TabGroup. Key is tab group id.
    // 
    // TabGroup is one object holding info of one group of tabs being split
    // - id {Number} this tabGroup id (Should never allow any update on the id).
    // - color {String} #xxxxx used for visually grouping tabs
    // - layout {String} currently only support "vertical"
    // - tabs {Array} instances of Tab, see below for Tab details.
    //                The order represents tabs' order.
    // 
    // Tab is one object holding info of one split tab in one tab group
    // - linkedPanel {String} the tab's linkedPanel attribute value
    // - position {String} currently only "left" or "right"
    // - distribution {Number} 0 ~ 1. The percentage of window width this tab occupies
    tabGroups: {},
  },

  /**
   * @params params {Object}
   *    - utils {Object} TabSplit.utils
   */
  init(params) {
    let { utils } = params;
    this._utils = utils;
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
   *  - value {*} the new state value. The format depends on the `type` property. 
   * The valid actions are:
   *  - type: "update_window_width"
   *  - value: {Number} the crruent window width
   *
   *  - type: "update_selected_linkedPanel"
   *    value: {String} see `selectedLinkedPanel` in `_state`
   *
   *  - type: "add_tab_group". This will add to the end.
   *    value: {Object} see TabGroup in `_state`
   *
   *  - type: "remove_tab_group"
   *    value: {Number} the id of tabGroup in `_state`
   *
   *  - type: "update_tab_distibutions".
   *    value:
   *      - id {Number} the id of the group to update.
   *      - distributions {Array} the new tabs' distributions
   */
  update(...actions) {
    let added = [];
    let removed = [];
    let updated = [];
    let dirty = false;
    for (let action of actions) {
      try {
        let v = action.value;
        switch (action.type) {
          case "update_window_width":
            if (v <= 0) {
              throw `Invalid window width of ${v}`;
            }
            if (v !== this._state.windowWidth) {
              this._state.windowWidth = v;
              dirty = true;
            }
            break;

          case "update_selected_linkedPanel":
            if (!this._utils.getTabByLinkedPanel(v)) {
              throw `Unknown selected linkedPanel of ${v}`;
            }
            this._state.selectedLinkedPanel = v;
            dirty = true;
            break;

          case "add_tab_group":
            let newId = this._addTabGroup(v);
            added.push(newId);
            dirty = true;
            break;

          case "remove_tab_group":
            this._removeTabGroup(v);
            removed.push(v);
            dirty = true;
            break;

          case "update_tab_distibutions":
            this._updateTabDistributions(v.id, v.distributions);
            updated.push(v.id);
            dirty = true;
            break;

          default:
            throw `Unknow action type of ${action.type}`;
        }
      } catch(e) {
        console.error(`Fail at the update action of ${action.type}`);
        console.error(e);
        break;
      }
    }

    dirty && this._listeners.forEach(listener => {
      // TODO: Should we pass a copy of `{ added, removed, updated }`
      // in case that outside modifies these important variables?
      listener(this, { added, removed, updated });
    });
  },

  /**
   * @return the new tabGroup id
   */
  _addTabGroup(newTabGroup) {
    let { tabs, color, layout } = newTabGroup;

    if (layout != "vertical") {
      throw `Invalid split layout: ${layout}`;
    }

    if (color == "") {
      throw "Lack the color property";
    }

    if (tabs.length != 2) {
      throw `Unexpected tabs length of ${tabs.length}`;
    }

    let [ tab0, tab1 ] = tabs;
    if (this._tabsEqual(tab0, tab1)) {
      throw "Cannot adding 2 equal tabs in one tab group";
    }

    if (tab0.distribution + tab1.distribution != 1) {
      throw "Expect the sum of tabs' distributions to be 1, " +
            `but get the distributions as [${tab0.distribution}, ${tab1.distribution}]`;
    }

    if (!this._isValidTab(tab0)) {
      throw "The 1st tab being added is invalid";
    }

    if (!this._isValidTab(tab1)) {
      throw "The 2nd tab being added is invalid";
    }
    
    if (this._utils.getTabGroupByLinkedPanel(tab0.linkedPanel, this._state)) {
      throw `Adding already existed tab with linkedPanel of ${tab0.linkedPanel}`;
    }

    if (this._utils.getTabGroupByLinkedPanel(tab1.linkedPanel, this._state)) {
      throw `Adding already existed tab with linkedPanel of ${tab1.linkedPanel}`;
    }

    // NOTE: What if redundant props passed with newTabGroup
    let newGroup = this._copy(newTabGroup);
    newGroup.id = this.TAB_GROUP_ID_PREFIX + this._tabGroupIdCount++;
    this._state.tabGroups[newGroup.id] = newGroup;
    this._state.tabGroupIds.push(newGroup.id);
    return newGroup.id;
  },

  _removeTabGroup(id) {

  },

  _updateTabDistributions(id, distributions) {

  },

  _copy(obj) {
    // We don't wanna give outside any chance to mutaute our state
    // so make a copy when returning/receiving states.
    // NOTE:
    // The state only contains Number/String and is simple so we can do this copy trick.
    // Maybe we should borrow from immutable.js when the state gets complex.
    return JSON.parse(JSON.stringify(obj));
  },

  _tabsEqual(tab0, tab1) {
    if (tab0.position == tab1.position ||
        tab0.linkedPanel == tab1.linkedPanel) {
      return true;
    }
    return false;
  },

  _isValidTab(tab) {
    let { position, distribution, linkedPanel } = tab;
    if ((distribution <= 0 || distribution >= 1) ||
        (position != "left" && position != "right") ||
        !this._utils.getTabByLinkedPanel(tab.linkedPanel)) {
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
};

})(this);
