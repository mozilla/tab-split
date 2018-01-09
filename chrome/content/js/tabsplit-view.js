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

  // The #tabsplit-menupanel
  _menuPanel: null,

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

  async _addTabSplitButton() {
    console.log('TMP> tabsplit-view - _addTabSplitButton');
    let buttonForThisWindow = win.document.getElementById(this.ID_TABSPLIT_BUTTON);
    if (!buttonForThisWindow) {
      await new Promise(resolve => {
        let listener = {
          onWidgetAfterCreation: () => {
            console.log('TMP> tabsplit-view - _addTabSplitButton - onWidgetAfterCreation');
            CustomizableUI.removeListener(listener);
            resolve();
          }
        };
        CustomizableUI.addListener(listener);

        let w = CustomizableUI.createWidget({
          id: this.ID_TABSPLIT_BUTTON,
          type: "button",
          tooltiptext: "Let's split tabs!!!",
          defaultArea: "nav-bar",
          localized: false,
          onCommand: e => {
            console.log('TMP> tabsplit-view - _addTabSplitButton - onCommand', e.target);
          },
        });
        console.log('TMP> tabsplit-view - _addTabSplitButton - createWidget', w.id);
        // Explicitly put the button on the nav bar
        CustomizableUI.addWidgetToArea(this.ID_TABSPLIT_BUTTON, "nav-bar");
      });
    }
    buttonForThisWindow = win.document.getElementById(this.ID_TABSPLIT_BUTTON);
    buttonForThisWindow.addEventListener("command", async e => {
      let tab = this._utils.getTabByLinkedPanel(this._state.selectedLinkedPanel);
      // When the status is inactive and the button is clicked,
      // we notify the outside listener that a user is commanding to split tab
      // so the outside listener can know time to activate and split tabs.
      if (this._state.status == "status_inactive" || !tab.getAttribute("data-tabsplit-tab-group-id")) {
        this._listener.onCommandSplitTab();
        return;
      }

      // If the status is active and the current selected tab is being splitted,
      // let's open menu panel to offer more options to users.
      if (!this._menuPanel) {
        await this._addMenuPanel();
      }
      if (this._menuPanel.state == "closed") {
        let anchor = win.document.getAnonymousElementByAttribute(e.target, "class", "toolbarbutton-icon");
        this._menuPanel.openPopup(anchor, "bottomcenter topright", 0, 0, false, null);
      } else if (this._menuPanel.state == "open") {
        this._menuPanel.hidePopup();
      }
    });
    buttonForThisWindow.setAttribute(
      "data-tabsplit-tabbrowser-id", this._gBrowser.getAttribute("data-tabsplit-tabbrowser-id"));
    console.log('TMP> tabsplit-view - _addTabSplitButton - buttonForThisWindow =', buttonForThisWindow);
  },

  _removeTabSplitButton() {
    console.log('TMP> tabsplit-view - _removeTabSplitButton');
    CustomizableUI.removeWidgetFromArea(this.ID_TABSPLIT_BUTTON);
    CustomizableUI.destroyWidget(this.ID_TABSPLIT_BUTTON);
  },

  async _addMenuPanel() {
    if (this._menuPanel) {
      return;
    }
    await new Promise(resolve => {
      win.document.loadOverlay("chrome://tabsplit/content/overlay/tabsplit-menupanel-overlay.xul", resolve);
    });
    console.log('TMP> tabsplit-view - tabsplit-menupanel-overlay.xul loaded');

    this._menuPanel = win.document.getElementById("tabsplit-menupanel");
    this._menuPanel.addEventListener("click", e => {
      this._menuPanel.hidePopup();
      if (e.target.id == "tabsplit-menupanel-unsplit-all-button") {
        this._listener.onCommandUnsplitTabsAll();
      } else if (e.target.classList.contains("tabsplit-menupanel-split-option")) {
        this._listener.onCommandSplitOption(e.target.getAttribute("data-tabsplit-split-option"));
      }
    });
  },

  _removeMenuPanel() {
    if (this._menuPanel) {
      this._menuPanel.remove();
      this._menuPanel = null;
    }
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
    gBrowser.mPanelContainer.style.display = "-moz-stack"; // <xul:tabpanels anonid="panelcontainer">
    this._gBrowser.setAttribute("data-tabsplit-tabbrowser-init", "true");
  },

  _refreshTabbrowser(selectedTabGroup) {
    let activePanels = [ this._state.selectedLinkedPanel ];
    if (selectedTabGroup) {
      // Now the selected tab is in one tab-split group,
      // so there are multiple active panels.
      activePanels = selectedTabGroup.tabs.map(tab => tab.linkedPanel);
    }
    console.log("TMP> tabsplit-view - _refreshTabbrowser - activePanels =", activePanels);

    let boxes = this._utils.getNotificationboxes();
    boxes.forEach(box => {
      let browser = this._utils.getBrowserByNotificationbox(box);
      if (activePanels.includes(box.id)) {
        box.style.visibility = "visible";
        // Why don't use the tabbrowser's switcher here is because
        // the switcher is for tab switching and will be destroyed after switching,
        // and we refresh after tab switching and not switching tab here either.
        // Just setting the docShell state is enough.
        if (!browser.docShellIsActive) {
          // To activate the docShell isn't cheap so only do this when not active.
          browser.docShellIsActive = true;
        }
      } else {
        box.style.visibility = "hidden";
        browser.docShellIsActive = false;
      }
    });
  },

  _uninitTabbrowser() {
    console.log("TMP> tabsplit-view - _uninitTabbrowser");
    // Clear the display stack
    gBrowser.mPanelContainer.style.display = "";
    let selectedPanel = this._gBrowser.selectedTab.linkedPanel;
    let boxes = this._utils.getNotificationboxes();
    boxes.forEach(box => {
      let browser = this._utils.getBrowserByNotificationbox(box);
      browser.docShellIsActive = box.id === selectedPanel;
      box.style.visibility = "";
    });
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
      delete this._NotificationboxClickHandlers[linkedPanel];
    }
  },

  _clearSplitPageClickListeners() {
    this._gBrowser.visibleTabs.forEach(tab => this._removeSplitPageClickListener(tab.linkedPanel));
    this._NotificationboxClickHandlers = null;
  },

  _setTabGroupFocus(selectedTabGroup) {
    let selectedPanel = this._state.selectedLinkedPanel;
    if (selectedTabGroup) {
      console.log("TMP> tabsplit-view - _setTabGroupFocus");
      selectedTabGroup.tabs.forEach(tabState => {
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
    let color = this._state.tabGroups[id].color;
    let tabStates = this._state.tabGroups[id].tabs;
    let len = tabStates.length;
    for (let i = 0; i < len; i++) {
      let tab = this._utils.getTabByLinkedPanel(tabStates[i].linkedPanel);
      tab.setAttribute("data-tabsplit-tab-group-id", id);
      tab.classList.add("tabsplit-tab");
      if (i == 0) {
        tab.classList.add("tabsplit-tab-first");
      } else if (i == len - 1) {
        tab.classList.add("tabsplit-tab-last");
      }
      tab.style.borderColor = color;
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
  },

  _uninitTabsAll() {
    console.log("TMP> tabsplit-view - _uninitTabsAll");
    this._gBrowser.visibleTabs.forEach(tab => this._uninitTab(tab));
  },

  _refreshTabDistributions(selectedTabGroup) {
    console.log("TMP> tabsplit-view - _refreshTabDistributions");
    if (!this._cSplitter) {
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
    }

    let selectedPanel = this._state.selectedLinkedPanel;
    if (selectedTabGroup) {
      let areas = selectedTabGroup.tabs.map(tabState => {
        let { linkedPanel, distribution } = tabState;
        return {
          distribution,
          box: this._utils.getNotificationboxByLinkedPanel(linkedPanel),
        };
      });
      let [ left, right ] = areas;
      // Resize the notificationboxs
      let availableWidth = this._state.tabbrowserWidth - this.PX_COLUMN_SPLITTER_WIDTH;
      left.width = availableWidth * left.distribution;
      right.width = availableWidth - left.width;
      left.box.style.marginRight = (this._state.tabbrowserWidth - left.width) + "px";
      right.box.style.marginLeft = (this._state.tabbrowserWidth - right.width) + "px";
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
    
    let appContent = this._gBrowser.parentNode;
    appContent.classList.remove("tabsplit-spliter-container");
    if (this._cSplitter) {
      this._cSplitter.remove();
      this._cSplitter = null;
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
      throw "The current status is destroyed, please init TabSplit.view again before updating any view";
    }

    try {
      let oldState = this._state;
      this._state = newState;

      let { status, selectedLinkedPanel } = this._state;
      if (status != oldState.status) {
        switch (status) {
          case "status_inactive":
          case "status_destroyed":
            this._uninitTabbrowser();
            this._uninitTabsAll();
            this._clearTabGroupFocus();
            this._clearTabDistributions();
            this._clearSplitPageClickListeners();
            if (status == "status_destroyed") {
              this._removeMenuPanel();
              this._removeTabSplitButton();
              this._listener = this._gBrowser = this._utils = this._store = null;
              console.log("TMP> tabsplit-view - go status_destroyed at", Date.now());
            }
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

      let selectedTabGroup = this._utils.getTabGroupByLinkedPanel(
                               this._state.selectedLinkedPanel, this._state);

      this._refreshTabbrowser(selectedTabGroup);
      this._setTabGroupFocus(selectedTabGroup);
      this._refreshTabDistributions(selectedTabGroup);
      // await so can catch the error if there was any.
      await this._orderTabPositions();
    } catch (e) {
      console.error(e);
      this._listener.onViewUpdateError(this._state);
    }
  },

  /**
   * Call this method when want to update the view but no state has changed.
   * Usually should avoid calling this unless encountering the situation like
   * the chrome UI's changes affects us on UI but not on the state.
   */
  refresh() {
    win.requestAnimationFrame(() => {
      let added = [];
      let removed = added;
      let updated = added;
      this.update(this._state, { added, removed, updated });
    });
  },

  onStateChange(store, tabGroupsDiff) {
    console.log("TMP> tabsplit-view - onStateChange");
    let state = store.getState();
    if (state.status == "status_destroyed") {
      // On seeing the destroyed status,
      // we just want to destroy asap so no `requestAnimationFrame`
      this.update(state, tabGroupsDiff);
      return;
    }
    win.requestAnimationFrame(() => this.update(state, tabGroupsDiff));
  }
};

})(this);
