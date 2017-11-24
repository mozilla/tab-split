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

  PX_COLUMN_SPLITTER_WIDTH: 8,

  MIN_TAB_SPLIT_DISTRIBUTION: 0.1,

  // Hold the state got from the store
  _state: null,

  // The column splitter
  _cSplitter: null,

  // <xul:tabpanels anonid="panelcontainer">
  _panelContainer: null,

  /**
   * @params params {Object}
   *    - store {Objec} TabSplit.store
   *    - utils {Object} TabSplit.utils
   *    - gBrowser {XULELement} <tabbrowser>
   *    - listener {Object} a object with event handling functions
   */
  init(params) {
    let { store, utils, gBrowser, listener } = params;
    this._utils = utils;
    this._gBrowser = gBrowser;
    this._store = store;
    this._listener = listener;
    this._state = this._store.getState();
    this._store.subscribe(this);
    this._addTabSplitButton();
  },

  _addTabSplitButton(onClick) {
    if (!CustomizableUI.getPlacementOfWidget(this.ID_TABSPLIT_BUTTON)) {
      console.log('TMP> tabsplit-view - _addTabSplitButton');
      CustomizableUI.createWidget({
        id: this.ID_TABSPLIT_BUTTON,
        type: "button",
        tooltiptext: "Let's split tabs!!!",
        defaultArea: "nav-bar",
        localized: false,
        onCommand: e => this._listener.onTabSplitButtonClick()
      });
      // Explicitly put the button on the nav bar
      CustomizableUI.addWidgetToArea("tabsplit-button", "nav-bar")
    }
  },

  _removeTabSplitButton() {
    console.log('TMP> tabsplit-view - _removeTabSplitButton');
    CustomizableUI.removeWidgetFromArea(this.ID_TABSPLIT_BUTTON);
    CustomizableUI.destroyWidget(this.ID_TABSPLIT_BUTTON);
  },

  _initTabbrowser() {
    console.log("TMP> tabsplit-view - _initTabbrowser");

    // The `-moz-stack` display enables rendering multiple web pages at the same time.
    // Howevre, the active web page may be covered by inactive pages on top of the stack
    // so have to hide inactive pages to reveal the active page.
    let selectedPanel = this._state.selectedLinkedPanel;
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
    appContent.classList.add("tabsplit-spliter-container");
    this._cSplitter = document.createElement("vbox");
    this._cSplitter.classList.add("tabsplit-column-splitter");
    this._cSplitter.style.width = this.PX_COLUMN_SPLITTER_WIDTH + "px";
    appContent.appendChild(this._cSplitter);
    this._cSplitter.addEventListener("mousedown", e => {
      this._listener.onMouseDownOnSplitter(e);
      win.addEventListener("mouseup", e => this._listener.onMouseUpOnSplitter(e), { once: true });
    });
    
    this._gBrowser.setAttribute("data-tabsplit-tabbrowser-init", "true");
  },

  _refreshTabbrowser() {
    console.log("TMP> tabsplit-view - _refreshTabbrowser");

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
      console.log("TMP> tabsplit-view - _refreshTabbrowser - box.id, isActive =", box.id, isActive);
      if (activePanels.includes(box.id)) {
        box.style.visibility = "visible";
        if (isActive == false) {
          console.log("TMP> tabsplit-view - _refreshTabbrowser - set docShellIsActive to true for ", box.id);
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

  _uninitTabbrowser() {
    console.log("TMP> tabsplit-view - _uninitTabbrowser");
    // Clear the display stack
    this._panelContainer.style.display = "";
    this._panelContainer = null;
    let selectedPanel = this._gBrowser.selectedTab.linkedPanel;
    let boxes = this._utils.getNotificationboxes();
    boxes.forEach(box => {
      let browser = this._utils.getBrowserByNotificationbox(box);
      browser.docShellIsActive = box.id == selectedPanel;
      box.style.visibility = "";
    });

    this._cSplitter.remove();
    this._cSplitter = null;

    let appContent = this._gBrowser.parentNode;
    appContent.classList.remove("tabsplit-spliter-container");

    this._gBrowser.removeAttribute("data-tabsplit-tabbrowser-init");
  },

  _addSplitPageClickListener(linkedPanel) {
    if (!this._NotificationboxClickHandlers) {
      this._NotificationboxClickHandlers = {};
    }
    if (this._NotificationboxClickHandlers[linkedPanel]) {
      return;
    }
    let box = this._utils.getNotificationboxByLinkedPanel(linkedPanel);
    if (box) {
      this._NotificationboxClickHandlers[linkedPanel] = 
        () => this._listener.onClickPageSplit(linkedPanel);
      box.addEventListener("click", this._NotificationboxClickHandlers[linkedPanel]);
    }
  },

  _removeSplitPageClickListener(linkedPanel) {
    if (!this._NotificationboxClickHandlers || !this._NotificationboxClickHandlers[linkedPanel]) {
      return;
    }
    let box = this._utils.getNotificationboxByLinkedPanel(linkedPanel);
    if (box) {
      box.removeEventListener("click", this._NotificationboxClickHandlers[linkedPanel]);
    }
  },

  _clearSplitPageClickListeners() {
    this._gBrowser.visibleTabs.forEach(tab => this._removeSplitPageClickListener(tab.linkedPanel));
    this._NotificationboxClickHandlers = null;
  },

  _setTabGroupFocus() {
    let selectedPanel = this._state.selectedLinkedPanel;
    let selectedGroup = this._utils.getTabGroupByLinkedPanel(selectedPanel, this._state);
    if (selectedGroup) {
      console.log("TMP> tabsplit-view - _setTabGroupFocus");
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

  _clearTabGroupFocus() {
    console.log("TMP> tabsplit-view - _clearTabGroupFocus");
    let boxes = this._utils.getNotificationboxes();
    boxes.forEach(box => box.classList.remove("tabsplit-focus"));
  },

  _initTab(id) {
    if (!this._tabListeners) {
      this._tabListeners = {};
    }
    let color = this._state.tabGroups[id].color;
    let tabStates = this._state.tabGroups[id].tabs;
    let len = tabStates.length;
    for (let i = 0; i < len; i++) {
      let tab = this._utils.getTabByLinkedPanel(tabStates[i].linkedPanel);
      if (tab.hasAttribute("data-tabsplit-tab-group-id")) {
        // ok, we are facing re-init tab request, uninit fisrt.
        this._uninitTab(tab);
      }
      tab.setAttribute("data-tabsplit-tab-group-id", id);
      tab.classList.add("tabsplit-tab");
      if (i == 0) {
        tab.classList.add("tabsplit-tab-first");
      } else if (i == len - 1) {
        tab.classList.add("tabsplit-tab-last");
      }
      tab.style.borderColor = color;
      this._tabListeners[tab.linkedPanel] = e => this._listener.onClosingTabBeingSplit(e);
      tab.addEventListener("TabClose", this._tabListeners[tab.linkedPanel]);
    }
  },

  _uninitTab(tab) {
    if (!tab.hasAttribute("data-tabsplit-tab-group-id")) {
      return;
    }
    console.log("TMP> tabsplit-view - _uninitTab");
    tab.removeAttribute("data-tabsplit-tab-group-id");
    tab.classList.remove("tabsplit-tab", "tabsplit-tab-first", "tabsplit-tab-last");
    tab.style.borderColor = "";
    tab.removeEventListener("TabClose", this._tabListeners[tab.linkedPanel]);
    delete this._tabListeners[tab.linkedPanel];
  },

  _uninitTabsAll() {
    console.log("TMP> tabsplit-view - _uninitTabsAll");
    this._gBrowser.visibleTabs.forEach(tab => this._uninitTab(tab));
    this._tabListeners = null;
  },

  _refreshTabDistributions() {
    console.log("TMP> tabsplit-view - _refreshTabDistributions");
    let selectedPanel = this._state.selectedLinkedPanel;
    let selectedGroup = this._utils.getTabGroupByLinkedPanel(selectedPanel, this._state);
    if (selectedGroup) {
      let areas = selectedGroup.tabs.map(tabState => {
        let { linkedPanel, distribution } = tabState;
        return {
          distribution,
          box: this._utils.getNotificationboxByLinkedPanel(linkedPanel),
        };
      });
      let [ left, right ] = areas;
      // Resize the notificationboxs
      let availableWidth = this._state.windowWidth - this.PX_COLUMN_SPLITTER_WIDTH;
      left.width = availableWidth * left.distribution;
      right.width = availableWidth - left.width;
      left.box.style.marginRight = (this._state.windowWidth - left.width) + "px";
      right.box.style.marginLeft = (this._state.windowWidth - right.width) + "px";
      // Position the splitter
      this._cSplitter.style.left = left.width + "px";
      this._cSplitter.style.display = "block";
    } else {
      // No tab being split is selceted so no splitter either.
      this._cSplitter.style.display = "none";
    }
  },

  _clearTabDistributions() {
    console.log("TMP> tabsplit-view - _clearTabDistributions");
    let boxes = this._utils.getNotificationboxes();
    boxes.forEach(box => box.style.marginLeft = box.style.marginRight = "");
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
      expectations.push([ t0.linkedPanel, ++expIndex ]);
      expectations.push([ t1.linkedPanel, ++expIndex ]);
    });

    // Second, move tabs to right positions if not as expected
    for (let i = 0; i < expectations.length; i++) {
      await new Promise(resolve => {
        let [ linkedPanel, pos ] = expectations[i];
        let actualTab = this._gBrowser.visibleTabs[pos];
        let expectedTab = this._utils.getTabByLinkedPanel(linkedPanel);
        if (!expectedTab || (actualTab && expectedTab.linkedPanel == actualTab.linkedPanel)) {
          resolve();
          return;
        }
        expectedTab.addEventListener("TabMove", resolve, { once: true });
        this._gBrowser.moveTabTo(expectedTab, pos);
      });
    }
  },

  async update(newState, tabGroupsDiff) {
    console.log("TMP> tabsplit-view - new state comes", newState, tabGroupsDiff);

    if (this._state.status == "status_destroyed") {
      throw "The current status is destroyed, please init again before updating any view";
    }

    let oldState = this._state;
    this._state = newState;
    let { status, windowWidth, selectedLinkedPanel } = this._state;
    if (status != oldState.status) {
      switch (status) {
        case "status_inactive":
          this._uninitTabbrowser();
          this._uninitTabsAll();
          this._clearTabGroupFocus();
          this._clearTabDistributions();
          this._clearSplitPageClickListeners();
          return;

        case "status_destroyed":
          // TODO: Destroy
          return;

        case "status_active":
          this._initTabbrowser();
          break;
      }
    } else if (status == "status_inactive") {
      // The current status is inactive
      // so return after saving the new state
      // but we still leave a message in case of debugging.
      console.warn(
        "Updating view under the inactive status has no effect. " +
        "If you really want to update view, please activate the status first."
      );
      return;
    }

    let changes = new Set();
    if (windowWidth !== oldState.windowWidth) {
      changes.add("windowWidth");
    }
    if (selectedLinkedPanel !== oldState.selectedLinkedPanel) {
      changes.add("selectedLinkedPanel");
    }

    let { added, removed, updated } = tabGroupsDiff;

    if (removed.length) {
      removed.forEach(id => {
        let group = oldState.tabGroups[id];
        group.tabs.forEach(tabState => {
          let tab = this._utils.getTabByLinkedPanel(tabState.linkedPanel);
          // It's possible to find no tab because the tab was closed
          if (tab) {
            this._uninitTab(tab);
            this._removeSplitPageClickListener(tabState.linkedPanel)
          }
        });
      });
      this._clearTabGroupFocus();
      this._clearTabDistributions();
    }

    added.forEach(id => { 
      this._initTab(id);
      let group = this._state.tabGroups[id];
      group.tabs.forEach(tabState => this._addSplitPageClickListener(tabState.linkedPanel));
    });

    if (updated.length > 0) {
      // TODO: Maybe this is useless
    }

    // TODO: When clicking another visible browser,
    // the selceted browser should change accordingly <= the control's duty
    this._refreshTabbrowser();
    this._setTabGroupFocus();

    if (changes.add("windowWidth")) {
      // TODO: Maybe this is useless
    }

    this._refreshTabDistributions();
    this._orderTabPositions();
  },

  onStateChange(store, tabGroupsDiff) {
    console.log("TMP> tabsplit-view - onStateChange");
    let state = store.getState();
    win.requestAnimationFrame(() => this.update(state, tabGroupsDiff));
  }
};

})(this);
