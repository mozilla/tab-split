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

  PX_VERTICAL_SPLITTER_WIDTH: 8,

  // Hold the state got from the store
  _state: {},

  // The vertical splitter
  _vSplitter: null,

  // <xul:tabpanels anonid="panelcontainer">
  _panelContainer: null,

  /**
   * @params params {Object}
   *    - store {Objec} TabSplit.store
   *    - utils {Object} TabSplit.utils
   *    - gBrowser {XULELement} <tabbrowser>
   *    - onTabSplitButtonClick {Function}
   */
  init(params) {
    let { store, utils, gBrowser, onTabSplitButtonClick } = params;
    this._utils = utils;
    this._gBrowser = gBrowser;
    this._store = store;
    this._addButtonToNavBar(onTabSplitButtonClick);
    this._store.subscribe(this.onStateChange);
  },

  _addButtonToNavBar(onClick) {
    if (!CustomizableUI.getPlacementOfWidget(this.ID_TABSPLIT_BUTTON)) {
      console.log('TMP> tabsplit-view - Creating customizable wisget');
      CustomizableUI.createWidget({
        id: this.ID_TABSPLIT_BUTTON,
        type: "button",
        tooltiptext: "Let's split tabs!!!",
        defaultArea: "nav-bar",
        localized: false,
        onCommand: e => {
          this._initTabbrowser(); // Lazy init.
          onClick(e);
        }
      });
      // Explicitly put the button on the nav bar
      CustomizableUI.addWidgetToArea("tabsplit-button", "nav-bar")
    }
  },

  _initTabbrowser() {
    if (this._gBrowser.getAttribute("data-tabsplit-tabbrowser-init") == "true") {
      return;
    }
    this._gBrowser.setAttribute("data-tabsplit-tabbrowser-init", "true");
    console.log("TMP> tabsplit-view - _initTabbrowser");

    // The `-moz-stack` display enables rendering multiple web pages at the same time.
    // Howevre, the active web page may be covered by inactive pages on top of the stack
    // so have to hide inactive pages to reveal the active page.
    let selectedPanel = this._gBrowser.selectedTab.linkedPanel;
    let boxes = this._utils.getNotificationboxes();
    boxes.forEach(box => {
      if (box.id != selectedPanel) {
        box.style.visibility = "hidden";
      }
    });
    this._panelContainer = document.getAnonymousElementByAttribute(this._gBrowser, "anonid", "panelcontainer");
    this._panelContainer.style.display = "-moz-stack";

    // Append the splitter
    let appContent = this._gBrowser.parentNode;
    this._vSplitter = document.createElement("vbox");
    this._vSplitter.classList.add("tabsplit-vertical-splitter");
    this._vSplitter.style.width = this.PX_VERTICAL_SPLITTER_WIDTH + "px";
    appContent.classList.add("tabsplit-spliter-container");
    appContent.appendChild(this._vSplitter);
  },

  _refreshPanelStack() {
    console.log("TMP> tabsplit-view - _refreshPanelStack");

    let selectedPanel = this._state.selectedLinkedPanel;
    let selectedGroup = this._utils.getTabGroupByLinkedPanel(selectedPanel, this._state);
    let activePanels = [ selectedPanel ];
    if (selectedGroup) {
      // Now the selected tab is in one tab-split group,
      // so there are multiple active panels.
      activePanels = selectedGroup.tabs.map(tab => tab.linkedPanel);
    }

    let boxes = this._utils.getNotificationboxes();
    boxes.forEach(box => {
      let browser = this._utils.getBrowserByNotificationbox(box);
      let isActive = browser.docShellIsActive;
      // Below only set the docShell state when finding the inconsistency,
      // because that operation is expensive.
      console.log("TMP> tabsplit-view - _refreshPanelStack - box.id, isActive =", box.id, isActive);
      if (activePanels.includes(box.id)) {
        box.style.visibility = "visible";
        if (isActive == false) {
          console.log("TMP> tabsplit-view - _refreshPanelStack - set docShellIsActive to true for ", box.id);
          browser.docShellIsActive = true;
        }
      } else {
        box.style.visibility = "hidden";
        if (isActive == true) {
          browser.docShellIsActive = false;
        }
      }
    });
  },

  _setTabGroupFocus() {
    let selectedPanel = this._state.selectedLinkedPanel;
    let selectedGroup = this._utils.getTabGroupByLinkedPanel(selectedPanel, this._state);
    if (selectedGroup) {
      console.log("TMP> tabsplit-view - _switchFocus");
      selectedGroup.tabs.forEach(tabState => {
        let box = this._utils.getNotificationboxByLinkedPanel(tabState.linkedPanel);
        if (tabState.linkedPanel == selectedPanel) {
          box.classList.add("tabsplit-focus");
        } else {
          box.classList.remove("tabsplit-focus");
        }
      });
    }
  },

  _setTabGroupStyle(id) {
    let group = this._state.tabGroups[id];
    group && group.tabs.forEach(tabState => {
      let tab = this._utils.getTabByLinkedPanel(tabState.linkedPanel);

      // TODO: Could remove!!
      // let line = this._getTabLine(tab);
      // line.style.display = "none";

      tab.setAttribute("data-tabsplit-tab-group-id", group.id);
      tab.style.borderTop = `2px solid ${group.color}`;
    });
  },

  _getTabLine(tab) { // TODO: Could remove!!
    let tabStack = document.getAnonymousNodes(tab)[0];
    return tabStack.querySelector(".tab-line");
  },

  _refreshTabDistributions() {
    console.log("TMP> tabsplit-view - _refreshTabDistributions");
    let selectedPanel = this._state.selectedLinkedPanel;
    let selectedGroup = this._utils.getTabGroupByLinkedPanel(selectedPanel, this._state);
    if (selectedGroup) {
      let areas = selectedGroup.tabs.map(tabState => {
        let { linkedPanel, position, distribution } = tabState;
        return {
          position,
          distribution,
          box: this._utils.getNotificationboxByLinkedPanel(linkedPanel),
        };
      });
      if (areas[0].position != "left") {
        areas = [ areas[1], areas[0] ]; // Always make the left area go first
      }
      let [ left, right ] = areas;

      // Resize the notificationboxs
      let availableWidth = this._state.windowWidth - this.PX_VERTICAL_SPLITTER_WIDTH;
      left.width = availableWidth * left.distribution;
      right.width = availableWidth - left.width;
      left.box.style.marginRight = (this._state.windowWidth - left.width) + "px";
      right.box.style.marginLeft = (this._state.windowWidth - right.width) + "px";
      // Position the splitter
      this._vSplitter.style.left = left.width + "px";
      this._vSplitter.style.display = "block";
    } else {
      // No tab being split is selceted so no splitter either.
      this._vSplitter.style.display = "none";
    }
  },

  async _orderTabPositions() {
    let tabGroupIds = this._state.tabGroupIds;
    if (tabGroupIds.length <= 0) {
      return;
    }
    console.log("TMP> tabsplit-view - _orderTabPositions");
    // Organize tabs order on the browser UI so that
    // 1. pinned tabs come first
    // 2. tabs split per tab groups' order come next, a left tab comes before a right tab.
    // 3. other usual tabs come finally
    //
    // Firstly, calculate the expected indexes for tabs split
    let expIndex = this._utils.getLastPinnedTabIndex();
    let expectations = [];
    tabGroupIds.forEach(id => {
      let [ t0, t1 ] = this._state.tabGroups[id].tabs;
      if (t0.position == "left") {
        expectations.push([ t0.linkedPanel, ++expIndex ]);
        expectations.push([ t1.linkedPanel, ++expIndex ]);
      } else {
        expectations.push([ t1.linkedPanel, ++expIndex ]);
        expectations.push([ t0.linkedPanel, ++expIndex ]);
      }
    });

    // Second, move tabs to right positions if not as expected
    for (let i = 0; i < expectations.length; i++) {
      await new Promise(resolve => {
        let [ linkedPanel, pos ] = expectations[i];
        if (this._gBrowser.visibleTabs[pos].linkedPanel == linkedPanel) {
          resolve();
          return;
        }
        let tab = this._utils.getTabByLinkedPanel(linkedPanel);
        tab.addEventListener("TabMove", resolve, { once: true });
        this._gBrowser.moveTabTo(tab, pos);
      });
    }
  },

  update(newState, tabGroupsDiff) {
    console.log("TMP> tabsplit-view - new state comes", newState, tabGroupsDiff);
    let oldState = this._state;
    this._state = newState;
    
    if (this._gBrowser.getAttribute("data-tabsplit-tabbrowser-init") != "true") {
      console.log("TMP> tabsplit-view - Not yet init the tabbrowser");
      return; // Not yet init the tabbrowser
    }

    let changes = new Set();
    if (this._state.windowWidth !== oldState.windowWidth) {
      changes.add("windowWidth");
    }
    if (this._state.selectedLinkedPanel !== oldState.selectedLinkedPanel) {
      changes.add("selectedLinkedPanel");
    }

    let { added, removed, updated } = tabGroupsDiff;
    if (removed.length > 0) {
      // TODO: Recover tabs
    }

    added.forEach(id => this._setTabGroupStyle(id));

    if (updated.length > 0) {
      // TODO: Maybe this is useless
    }

    // TODO: When clicking another visible browser,
    // the selceted browser should change accordingly <= the control's duty
    this._refreshPanelStack();
    this._setTabGroupFocus();


    if (changes.add("windowWidth")) {
      // TODO: Maybe this is useless
    }

    this._refreshTabDistributions();
    this._orderTabPositions();
  },

  onStateChange(store, tabGroupsDiff) {
    win.requestAnimationFrame(() => TabSplit.view.update(store.getState(), tabGroupsDiff));
  }
};

})(this);
