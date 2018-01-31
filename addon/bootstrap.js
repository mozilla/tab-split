/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global APP_SHUTDOWN, Components, Services, XPCOMUtils */
/* eslint no-unused-vars: ["error", {"vars": "all", "args": "none", "varsIgnorePattern": "(startup|shutdown|install|uninstall)"}] */

"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services", "resource://gre/modules/Services.jsm");

const startupObserver = {
  register() {
    Services.obs.addObserver(this, "sessionstore-windows-restored", false);
    Services.obs.addObserver(this, "browser-delayed-startup-finished", false);
  },

  unregister() {
    Services.obs.removeObserver(this, "sessionstore-windows-restored");
    Services.obs.removeObserver(this, "browser-delayed-startup-finished");
  },

  observe(subj, topic, data) {
    console.log("TMP > TabSplit - startupObserver - observe", topic);
    TabSplit.onNewBrowserCreated();
  }
};

const TabSplit = {

  _browserCount: 0,

  onNewBrowserCreated() {
    console.log("TMP > TabSplit - bootstrap - onNewBrowserCreated");

    const WM = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    const chromeWindow = WM.getMostRecentWindow("navigator:browser");
    const tabbrowser = chromeWindow.document.getElementById("content");
    if (tabbrowser.getAttribute("data-tabsplit-tabbrowser-id")) {
      return;
    }

    tabbrowser.setAttribute("data-tabsplit-tabbrowser-id", ++this._browserCount);
    console.log("TMP > TabSplit - bootstrap - onNewBrowserCreated - browserCount", this._browserCount);
    console.log("TMP > TabSplit - bootstrap - onNewBrowserCreated - load overlay tabsplit-init-overlay.xul");
    chromeWindow.document.loadOverlay("chrome://tabsplit/content/overlay/tabsplit-init-overlay.xul",
      (subj, topic, data) => console.log("TMP > TabSplit - bootstrap - onNewBrowserCreated - load overlay topic", topic));
  },

  onDestroy() {
    console.log("TMP > TabSplit - bootstrap - onDestroy");
    const WM = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    const chromeWindows = WM.getEnumerator("navigator:browser");
    while (chromeWindows.hasMoreElements()) {
      const win = chromeWindows.getNext();
      const tabbrowser = win.document.getElementById("content");
      if (win.TabSplit) {
        console.log("TMP > TabSplit - bootstrap - destroying data-tabsplit-tabbrowser-id =", tabbrowser.getAttribute("data-tabsplit-tabbrowser-id"), Date.now());
        win.TabSplit.control.destroy();
        delete win.TabSplit;
        console.log("TMP > TabSplit - bootstrap - destroyed at", Date.now());
      }
      tabbrowser.removeAttribute("data-tabsplit-tabbrowser-id");
      this._browserCount--;
    }
  }
};


function startup(data, reason) {
  console.log("TMP> TabSplit startup with reason =", reason);
  startupObserver.register();
  TabSplit.onNewBrowserCreated();
}

function shutdown(data, reason) {
  console.log("TMP> TabSplit shutdown with reason =", reason);
  startupObserver.unregister();
  if (reason !== APP_SHUTDOWN) {
    console.log("TMP> TabSplit shutdown to destroy");
    TabSplit.onDestroy();
  }
}

function install(data, reason) {
  console.log("TMP> TabSplit install with reason =", reason);
}

function uninstall(data, reason) {
  console.log("TMP> TabSplit uninstall with reason =", reason);
  startupObserver.unregister();
  TabSplit.onDestroy();
}
