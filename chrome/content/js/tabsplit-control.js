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

  init(view, store, gBrowser) {
    this._view = view;
    this._store = store;
    this._gBrowser = gBrowser;

    this._view.init({
      state: this._store,
      gBrowser: this._gBrowser,
      onTabSplitButtonCommand: () => console.log("TMP> Clicked onTabSplitButtonCommand")
    });

    // Getting `innerWidth` is sync reflow operation plus 
    // we don't wanna get on the way of the browser startup
    // so do `requestIdleCallback`.
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
};

})(this);
