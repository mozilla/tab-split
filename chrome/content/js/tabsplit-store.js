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
  
  // Listeners for the state change.
  // One listener is a function with the signature below:
  //   - store {object} TabSplit.store
  //   - tabGroupsDiff {Object} the tabGroups state diff after changing state.
  //        This is to let ouside quickly know what changes on tabGroups.
  //        Holds 3 properties:
  //        - added {Array} the newly added tabGroups' id
  //        - removed {Array} the removed tabGroups' id
  //        - updated {Array} the updated tabGroups' id
  _listeners: new Set(),

  // This object stores the current state, which includes
  // - windowWidth {Number} the current window width
  // - selectedLinkedPanel {String} the selected tab's linkedPanel attribute value
  // - tabGroupIds {Array} The array of tab group ids. The order represents tab groups' order.
  // - tabGroups {Object} holds instances of TabGroup, see below for TabGroup. Key is tab group id.
  // 
  // TabGroup is one object holding info of one group of tabs split
  // - color {String} #xxxxx used for visually grouping tabs
  // - splitDirection {String} currently only support "horizonal"
  // - tabs {Array} instances of Tab, see below for Tab details.
  //                The order represents tabs' order.
  // 
  // Tab is one object holding info of one split tab in one tab group
  // - linkedPanel {String} the tab's linkedPanel attribute value
  // - position {String} currently only "left" or "right"
  // - distribution {Number} 0 ~ 1. The percentage of window width this tab occupies
  _state: {},

  // We do incremental id
  _tabGroupIdCount: 0,

  getState() {
    // The states only contain Number and String so we can do this copy trick.
    // Maybe we should borrow from immutable.js when the states get complex.
    return JSON.parse(JSON.stringify(this._states));
  },

  /**
   * Should call this to udpate states.
   * 
   * @params actions {Object} state update action. For the batch update, pass multiple actions.
   *                          See Action below for details
   *
   * Action is an object describing the state update action, holding:
   *  - type {String} the action type
   *  - value {*} the new state value. The format depends on the `type` property. 
   * The valid actions are:
   *  - type: "update_window_width"
   *  - value: {Number} the crruent window width
   *
   *  - type: "update_selected_linkedPanel"
   *    value: {String} see selectedLinkedPanel in `_state`
   *
   *  - type: "add_tab_group". This will add to the end
   *    value: {Object} see TabGroup in `_state`
   *
   *  - type: "remove_tab_group"
   *    value: {Number} the id of tabGroup in `_state`
   *
   *  - type: "update_tab_group". Do this when updating some values in one TabGroup
   *    value:
   *      - id {Number} the id of the group to update.
   *      - prop being updated as key with the new value, see TabGroup in `_state` for valid props.
   */
  update(...actions) {
    let added = [];
    let removed = [];
    let updated = [];
    for (let action of actions) {
      switch (action.type) {
        case "update_window_width":
        break;

        case "update_selected_linkedPanel":
        break;

        case "add_tab_group":
          let newId = this._addTabGroup(action.value);
          if (newId) {
            added.push(newId);
          }
        break;

        case "remove_tab_group":
          if (this._removeTabGroup(action.value)) {
            removed.push(action.value);
          }
        break;

        case "update_tab_group":
          if (this._updateTabGroup(action.value.id, action.value)) {
            updated.push(action.value.id);
          }
        break;
      }
    }

    for (let listener of this._listeners) {
      // TODO: Should we pass a copy of `{ added, removed, updated }`
      // in case taht outside modifies these important variables?
      listener(this, { added, removed, updated });
    }
  },

  /**
   * @return the new tabGroup id if operation succeeds otherwise null
   */
  _addTabGroup(newTabGroup) {

  },

  /**
   * @return true if operation succeeds otherwise false
   */
  _removeTabGroup(id) {

  },

  /**
   * @return true if operation succeeds otherwise false
   */
  _updateTabGroup(id, updates) {

  },

  /**
   * @param listener {Function} See `_listeners`
   */
  subscribe(listener) {
    if (!this._listeners.has(listener)) {
      this._listeners.add(listener);
    }
  },

  unsubscribe(listener) {
    if (this._listeners.has(listener)) {
      this._listeners.delete(listener);
    }
  }
};

})(this);
