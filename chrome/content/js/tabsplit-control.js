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
    this._view.init({
      store,
      utils,
      gBrowser,
      onTabSplitButtonClick: () => {
        console.log("TMP> tabsplit-control - Clicked onTabSplitButtonClick");
        this.splitTabs();
      }
    });
    this._store.init({
      utils,
    });

    // Getting `innerWidth` is a sync reflow operation plus 
    // we don't wanna block the browser startup so do `requestIdleCallback`.
    win.requestIdleCallback(() => {
      this._store.update({
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
    "#e07f76", "#e0ba76", "#9ed87f", "#7fd8d3", "#7bc2e5", "#7b7ee5", "#ce7be5", "#d8707b"
  ],

  splitTabs() {
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
        },
        {
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
};

})(this);
