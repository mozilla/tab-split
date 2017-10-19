/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services", "resource://gre/modules/Services.jsm");

const ID_TABSPLIT_BUTTON = "tabsplit-button";
const URL_BASE = "chrome://tabsplit/content";

// XPCOMUtils.defineLazyModuleGetter(this, "TabSplit", `${URL_BASE}/module/TabSplit.jsm`);

const startupObserver = { // "browser-delayed-startup-finished"
  register() {
    Services.obs.addObserver(this, "sessionstore-windows-restored", false);
    Services.obs.addObserver(this, "browser-delayed-startup-finished", false);
  },

  unregister() {
    Services.obs.removeObserver(this, "sessionstore-windows-restored", false);
  },

  observe(subj, topic, data) {
    // this.unregister();
    console.log("TMP > MozTabSplit observe", topic);
    TabSplit.init();
  }
};

const TabSplit = {
  _inited: false,

  init() {
    if (this._inited) {
      return;
    }
    this._inited = true;
    console.log("TMP > MozTabSplit init");

    let WM = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
    this._chromeWindow = WM.getMostRecentWindow("navigator:browser"); 
    // this._chromeWindow.document.loadOverlay(URL_BASE + "/overlay/tabsplit-navbar-overlay.xul",
    //   (subj, topic, data) => {
    //     console.log("TMP > MozTabSplit loadOverlay topic =", topic);
    //     if (!this._chromeWindow.CustomizableUI.getPlacementOfWidget(ID_TABSPLIT_BUTTON)) {
    //       this._chromeWindow.CustomizableUI.addWidgetToArea(ID_TABSPLIT_BUTTON, "nav-bar", null);
    //     }
    //   });
    // console.log("TMP > MozTabSplit _chromeWindow.document.loadOverlay tabsplit-navbar-overlay.xul");
  },

  uninit() {
    if (!this._inited) {
      return;
    }
    this._chromeWindow.CustomizableUI.removeWidgetFromArea(ID_TABSPLIT_BUTTON);
    let button = this._chromeWindow.document.getElementById(ID_TABSPLIT_BUTTON);
    button && button.remove();
    this._chromeWindow = button = null;
    this._inited = false
  }
};

function startup(data, reason) {
  console.log("TMP> MozTabSplit startup with reason =", reason);
  // if (reason === APP_STARTUP) {
  //   startupObserver.register();
  //   return;
  // }
  startupObserver.register();
  TabSplit.init();
}

function shutdown(data, reason) {
  console.log("TMP> MozTabSplit shutdown with reason =", reason);
}

function install(data, reason) {
  console.log("TMP> MozTabSplit install with reason =", reason);
}

function uninstall(data, reason) {
  console.log("TMP> MozTabSplit uninstall with reason =", reason);
  TabSplit.uninit();
}
