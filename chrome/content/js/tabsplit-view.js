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

TabSplit.view = {
  ID_TABSPLIT_BUTTON: "tabsplit-button",

  /**
   * @params params {Object}
   *    - store {Objec} TabSplit.store
   *    - utils {Object} TabSplit.utils
   *    - gBrowser {XULELement} <tabbrowser>
   *    - onTabSplitButtonCommand {Function}
   */
  init(params) {
    let { store, utils, gBrowser, onTabSplitButtonCommand } = params;
    this._utils = utils;
    this._gBrowser = gBrowser;
    this._store = store;
    this._addButtonToNavBar(onTabSplitButtonCommand);
    this._store.subscribe(this.onStateChange);
  },

  _addButtonToNavBar(onClick) {
    if (!CustomizableUI.getPlacementOfWidget(this.ID_TABSPLIT_BUTTON)) {
      console.log('TMP> TabSplit - tabsplit-view - Creating customizable wisget');
      CustomizableUI.createWidget({
        id: this.ID_TABSPLIT_BUTTON,
        type: "button",
        tooltiptext: "Let's split tabs!!!",
        defaultArea: "nav-bar",
        localized: false,
        onCommand: e => {
          console.log('TMP> TabSplit - tabsplit-view - Clicked tabsplit-button');
          onClick && onClick(e);
        },
      });
      // Need to explicitly put the button on the nav bar
      CustomizableUI.addWidgetToArea("tabsplit-button", "nav-bar")
    }
  },

  update(state, tabGroupsDiff) {
    console.log("TMP> TabSplit - tabsplit-view - state updated", state, tabGroupsDiff);
  },

  onStateChange(store, tabGroupsDiff) {
    win.requestAnimationFrame(() => TabSplit.view.update(store.getState(), tabGroupsDiff));
  }
};

})(this);
