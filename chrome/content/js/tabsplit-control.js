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
        value: win.innerWidth
      }, {
        type: "update_selected_linkedPanel",
        value: this._gBrowser.selectedTab.linkedPanel
      });
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
      let newGroup = {};
      // TODO: A temp way to pick out a color
      this._currentTabColorIndex = (this._currentTabColorIndex + 1) % this._tabColors.length;
      newGroup.color = this._tabColors[this._currentTabColorIndex];
      newGroup.layout = "column_split";
      newGroup.tabs = [
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
        value: newGroup
      });
    }, { once: true });
    this._gBrowser.selectedTab = rightTab;
  },

  /* The store listeners */

  onStateChange(store, tabGroupsDiff) {
    this._state = store.getState();
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

  _chromeEvents: [ "TabSwitchDone" ],

  _registerChromeEvents() {
    for (let event of this._chromeEvents) {
      this._gBrowser.addEventListener(event, this);
    }
  },

  _unregisterChromeEvents() {
    for (let event of this._chromeEvents) {
      this._gBrowser.removeEventListener(event, this);
    }
  },

  handleEvent(e) {
    console.log("TMP> tabsplit-control - handleEvent - chrome event of", e.type);
    switch (e.type) {
      case "TabSwitchDone":
        let currentPanel = this._gBrowser.selectedTab.linkedPanel;
        if (currentPanel != this._state.selectedLinkedPanel) {
          this._store.update({
            type: "update_selected_linkedPanel",
            value: currentPanel
          });
        }
        break;
    }
  }, 

  /* The global listeners end */
};

})(this);
