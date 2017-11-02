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

TabSplit.utils = {
  getTabByLinkedPanel(linkedPanel, gBrowser) {
    return gBrowser.visibleTabs.find(tab => tab.linkedPanel == linkedPanel);
  },

  getTabGroupIdByLinkedPanel(linkedPanel, tabGroups) {
    let target = tabGroups.find(group => {
      let [ t0, t1 ] = group.tabs;
      return t0.linkedPanel == linkedPanel || t1.linkedPanel == linkedPanel;
    });
    return target ? target.id : null;
  },
};

})(this);
