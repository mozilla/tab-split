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
let TabSplit = win.TabSplit;

TabSplit.control = {

  MS_MAX_IDLE_DURATION: 1000 * 60 * 10, // 10 mins

  _lastTimeBeingActive: -1,

  /**
   * @params params {Object}
   *    - view {Objec} TabSplit.view
   *    - store {Objec} TabSplit.store
   *    - utils {Object} TabSplit.utils
   *    - gBrowser {XULELement} <tabbrowser>
   */
  init(params) {
    let { view, store, utils, gBrowser } = params;
    this._view = view;
    this._store = store;
    this._utils = utils;
    this._gBrowser = gBrowser;

    this._utils.init({
      gBrowser
    });
    this._store.init({
      utils,
    });
    this._view.init({
      store,
      utils,
      gBrowser,
      listener: this
    });
    this._state = this._store.getState();
    this._store.subscribe(this);
  },

  activate() {
    return new Promise(resolve => {
      console.log("TMP> tabsplit-control - activate");
      if (this._state.status == "status_active") {
        console.log("TMP> tabsplit-control - activate - already active");
        resolve();
        return;
      }
      this._lastTimeBeingActive = Date.now();
      
      // Make sure seeing the view successfully inits the tabbrowser
      let obs = new MutationObserver(mutations => {
        if (this._gBrowser.getAttribute("data-tabsplit-tabbrowser-init") !== "true") {
          return;
        }
        obs.disconnect();
        // TODO: Setup listeners to the chrome global event
        this._registerChromeEvents();
        // TODO: Override the chrome global behavior
        resolve();
      });
      obs.observe(this._gBrowser, { attributes: true });

      this._store.update({
        type: "set_active"
      },{
        type: "update_window_width",
        args: { windowWidth: win.innerWidth }
      }, {
        type: "update_selected_linkedPanel",
        args: { selectedLinkedPanel: this._gBrowser.selectedTab.linkedPanel }
      });
    });
  },

  deactivate() {
    this._lastTimeBeingActive = -1;
    this._unregisterChromeEvents();
    this._store.update({
      type: "set_inactive"
    });
  },

  _currentTabColorIndex: -1,

  _tabColors: [ 
    "#d8707b", "#ce7be5", "#7b7ee5", "#7bc2e5", "#7fd8d3", "#9ed87f", "#e0ba76", "#e07f76" 
  ],

  splitTabs() {
    console.log("TMP> tabsplit-control - splitTabs");
    let leftTab = this._gBrowser.selectedTab;
    let rightTab = this._gBrowser.addTab("about:newtab");
    this._gBrowser.addEventListener("TabSwitchDone", () => {
      let newTabGroup = {};
      // TODO: A temp way to pick out a color
      this._currentTabColorIndex = (this._currentTabColorIndex + 1) % this._tabColors.length;
      newTabGroup.color = this._tabColors[this._currentTabColorIndex];
      newTabGroup.layout = "column_split";
      newTabGroup.tabs = [
        {
          linkedPanel: leftTab.linkedPanel,
          col: 0,
          distribution: 0.5
        }, {
          linkedPanel: rightTab.linkedPanel,
          col: 1,
          distribution: 0.5
        }
      ];
      this._store.update({
        type: "add_tab_group",
        args: { newTabGroup }
      });
    }, { once: true });
    this._gBrowser.selectedTab = rightTab;
  },

  /* The store listeners */

  onStateChange(store, tabGroupsDiff) {
    this._state = store.getState();
    let { status, tabGroupIds } = this._state;
    if (tabGroupIds && tabGroupIds.length > 0) {
      this._lastTimeBeingActive = Date.now();
    } else {
      // Consider users used our tabsplit feature happily for 1 hr,
      // then users didn't use in the next 3 hrs.
      // In this case we should put ourselves into the inactive state 
      // so no redundant burden and risk to manipulate with tab browsing behavior.
      if (status == "status_active" &&
          Date.now() - this._lastTimeBeingActive > this.MS_MAX_IDLE_DURATION) {
        console.log("TMP> tabsplit-control - onStateChange - put into inactive");
        this.deactivate();
        return;
      }
    }
  },

  /* The store listeners end */

  /* The view listeners */

  async onTabSplitButtonClick() {
    console.log("TMP> tabsplit-control - Clicked onTabSplitButtonClick");
    let status = this._state.status;
    if (status != "status_destroyed" && status == "status_inactive") {
      await this.activate(); // Lazy active
      console.log("TMP> tabsplit-control - activate done");
    }
    this.splitTabs();
  },

  /* The view listeners end */

  /* The global listeners */

  _chromeEvents: null,

  _registerChromeEvents() {
    if (this._chromeEvents) {
      return;
    }
    this._chromeEvents = [
      [ this._gBrowser, "TabSwitchDone", () => this.onTabSwitchDone() ]
    ];
    for (let [ target, event, handler ] of this._chromeEvents) {
      target.addEventListener(event, handler);
    }
  },

  _unregisterChromeEvents() {
    if (!this._chromeEvents) {
      return;
    }
    for (let [ target, event, handler ] of this._chromeEvents) {
      target.removeEventListener(event, handler);
    }
    this._chromeEvents = null;
  },

  onTabSwitchDone() {
    console.log("TMP> tabsplit-control - onTabSwitchDone");
    let currentPanel = this._gBrowser.selectedTab.linkedPanel;
    if (currentPanel != this._state.selectedLinkedPanel) {
      this._store.update({
        type: "update_selected_linkedPanel",
        args: { selectedLinkedPanel: this._gBrowser.selectedTab.linkedPanel }
      });
    }
  },

  /* The global listeners end */
};

})(this);
