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

  /**
   * @params params {Object}
   *    - gBrowser {XULELement} <tabbrowser>
   */
TabSplit.utils = {
  init(params) {
    this._gBrowser = params.gBrowser;
  },

  getLastPinnedTabIndex() {
    // `i` is the 1st not pinned tab.
    let i = this._gBrowser.visibleTabs.findIndex(tab => {
      return !tab.pinned || tab.hasAttribute("data-tabsplit-tab-group-id");
    });
    return i - 1;
  },

  getTabByLinkedPanel(linkedPanel) {
    return this._gBrowser.visibleTabs.find(tab => tab.linkedPanel == linkedPanel);
  },

  getTabGroupByLinkedPanel(linkedPanel, state) {
    let id = null;
    let visibleTabs = this._gBrowser.visibleTabs;
    for (let i = visibleTabs.length - 1; i >= 0; i--) {
      if (visibleTabs[i].linkedPanel == linkedPanel) {
        id = visibleTabs[i].getAttribute("data-tabsplit-tab-group-id");
        break;
      }
    }
    return id ? state.tabGroups[id] : null;
  },

  getNotificationboxByLinkedPanel(linkedPanel) {
    return document.getAnonymousElementByAttribute(this._gBrowser, "id", linkedPanel);
  },

  getNotificationboxes() {
    if (!this._panelContainer) {
      this._panelContainer = document.getAnonymousElementByAttribute(this._gBrowser, "anonid", "panelcontainer");
    }
    let length = this._panelContainer.children.length;
    let boxes = [];
    for (let i = 0; i < length; i++) {
      let child = this._panelContainer.children[i];
      if (child && (child.tagName == "notificationbox" || child.tagName == "xul:notificationbox")) {
        boxes.push(child);
      }
    }
    return boxes;
  },

  getBrowserByNotificationbox(box) {
    return box.getElementsByTagName("browser")[0] || box.getElementsByTagName("xul:browser")[0];
  }
};

})(this);
