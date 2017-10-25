/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var EXPORTED_SYMBOLS = ["TabSplit"];

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const URL_BASE = "chrome://tabsplit/content";
const ID_TABSPLIT_BUTTON = "tabsplit-button";

XPCOMUtils.defineLazyModuleGetters(this, {
  console: "resource://gre/modules/Console.jsm",
});

var TabSplit = {

  windows: [],

  init() {
    console.log("TMP > MozTabSplit init");

    let WM = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
    this._chromeWindow = WM.getMostRecentWindow("navigator:browser"); 
    this._chromeWindow.document.loadOverlay(URL_BASE + "/overlay/tabsplit-navbar-overlay.xul",
      (subj, topic, data) => {
        console.log("TMP > MozTabSplit loadOverlay topic =", topic);
        if (!this._chromeWindow.CustomizableUI.getPlacementOfWidget(ID_TABSPLIT_BUTTON)) {
          this._chromeWindow.CustomizableUI.addWidgetToArea(ID_TABSPLIT_BUTTON, "nav-bar", null);
        }
      });
    console.log("TMP > MozTabSplit _chromeWindow.document.loadOverlay tabsplit-navbar-overlay.xul");
    this._chromeWindow.addEventListener("load", () => this.init());
  },

  uninit() {
    this._chromeWindow.CustomizableUI.removeWidgetFromArea(ID_TABSPLIT_BUTTON);
    let button = this._chromeWindow.document.getElementById(ID_TABSPLIT_BUTTON);
    button && button.remove();
    this._chromeWindow = button = null;
    this._inited = false
  }
};

