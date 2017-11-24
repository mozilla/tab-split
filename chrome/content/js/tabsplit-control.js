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

  MS_MAX_IDLE_DURATION: 1000 * 60 * 10, // 10 mins

  _lastTimeBeingActive: -1,

  /**
   * @params params {Object}
   *    - view {Objec} TabSplit.view
   *    - store {Objec} TabSplit.store
   *    - utils {Object} TabSplit.utils
   *    - gBrowser {XULELement} <tabbrowser>
   */
  init(params) {
    let { view, store, utils, gBrowser } = params;
    this._view = view;
    this._store = store;
    this._utils = utils;
    this._gBrowser = gBrowser;

    this._utils.init({
      gBrowser
    });
    this._store.init({
      utils,
    });
    this._view.init({
      store,
      utils,
      gBrowser,
      listener: this
    });
    this._state = this._store.getState();
    this._store.subscribe(this);
  },

  activate() {
    return new Promise(resolve => {
      console.log("TMP> tabsplit-control - activate");
      if (this._state.status == "status_active") {
        console.log("TMP> tabsplit-control - activate - already active");
        resolve();
        return;
      }
      this._lastTimeBeingActive = Date.now();
      
      // Make sure seeing the view successfully inits the tabbrowser
      let obs = new MutationObserver(mutations => {
        if (this._gBrowser.getAttribute("data-tabsplit-tabbrowser-init") !== "true") {
          return;
        }
        obs.disconnect();
        // TODO: Setup listeners to the chrome global event
        this._registerChromeEvents();
        // TODO: Override the chrome global behavior
        resolve();
      });
      obs.observe(this._gBrowser, { attributes: true });

      this._store.update({
        type: "set_active"
      },{
        type: "update_window_width",
        args: { windowWidth: win.innerWidth }
      }, {
        type: "update_selected_linkedPanel",
        args: { selectedLinkedPanel: this._gBrowser.selectedTab.linkedPanel }
      });
    });
  },

  deactivate() {
    this._lastTimeBeingActive = -1;
    this._unregisterChromeEvents();
    this._store.update({
      type: "set_inactive"
    });
  },

  _currentTabColorIndex: -1,

  _tabColors: [ 
    "#d8707b", "#ce7be5", "#7b7ee5", "#7bc2e5", "#7fd8d3", "#9ed87f", "#e0ba76", "#e07f76" 
  ],

  splitTabs() {
    console.log("TMP> tabsplit-control - splitTabs");
    let leftTab = this._gBrowser.selectedTab;
    let rightTab = this._gBrowser.addTab("about:newtab");
    this._gBrowser.addEventListener("TabSwitchDone", () => {
      let newTabGroup = {};
      // TODO: A temp way to pick out a color
      this._currentTabColorIndex = (this._currentTabColorIndex + 1) % this._tabColors.length;
      newTabGroup.color = this._tabColors[this._currentTabColorIndex];
      newTabGroup.layout = "column_split";
      newTabGroup.tabs = [
        {
          linkedPanel: leftTab.linkedPanel,
          col: 0,
          distribution: 0.5
        }, {
          linkedPanel: rightTab.linkedPanel,
          col: 1,
          distribution: 0.5
        }
      ];
      this._store.update({
        type: "add_tab_group",
        args: { newTabGroup }
      });
    }, { once: true });
    this._gBrowser.selectedTab = rightTab;
  },

  unsplitTab(tabGroupId) {
    let group = this._state.tabGroups[tabGroupId];
    if (group) {
      console.log("TMP> tabsplit-control - unsplitTab");
      this._store.update({
        type: "remove_tab_group",
        args: { id: group.id }
      });
    }
  },

  _startDraggingColumnSplitter() {
    if (this.onDraggingColumnSplitter) {
      return;
    } 
    console.log("TMP> tabsplit-control - _startDraggingColumnSplitter");
    this.onDraggingColumnSplitter = e => {
      let mousePosX = e.clientX;
      win.requestAnimationFrame(() => {
        // Cannot drag the splitter and the window at the same time
        // so safe to assume the window width is unchanged here and
        // don't have to make a sync flow call of window.innerWidth.
        let availableWidth = this._state.windowWidth - this._view.PX_COLUMN_SPLITTER_WIDTH;
        // Make sure no distribution is smaller than the min distribution
        let minDistribution = this._view.MIN_TAB_SPLIT_DISTRIBUTION;
        let leftDistribution = mousePosX / availableWidth;
        let rightDistribution = 1 - leftDistribution;
        if (leftDistribution < minDistribution) {
          leftDistribution = minDistribution;
          rightDistribution = 1 - leftDistribution;
        } else if (rightDistribution < minDistribution) {
          rightDistribution = minDistribution;
          leftDistribution = 1 - rightDistribution;
        }

        let currentGroup = this._utils.getTabGroupByLinkedPanel(this._state.selectedLinkedPanel, this._state);
        if (currentGroup.tabs[0].distribution == leftDistribution) {
          return; // ok, no distribution changed
        }
        this._store.update({
          type: "update_tab_distibutions",
          args: {
            id: currentGroup.id,
            distributions: [ leftDistribution, rightDistribution ]
          }
        });
      });
    };
    win.addEventListener("mousemove", this.onDraggingColumnSplitter);
  },

  _stopDraggingColumnSplitter() {
    if (!this.onDraggingColumnSplitter) {
      return;
    }
    console.log("TMP> tabsplit-control - _stopDraggingColumnSplitter");
    win.removeEventListener("mousemove", this.onDraggingColumnSplitter);
    this.onDraggingColumnSplitter = null;
  },

  /* The store listeners */

  onStateChange(store, tabGroupsDiff) {
    this._state = store.getState();
    let { status, tabGroupIds } = this._state;
    if (tabGroupIds && tabGroupIds.length > 0) {
      this._lastTimeBeingActive = Date.now();
    } else {
      // Consider users used our tabsplit feature happily for 1 hr,
      // then users didn't use in the next 3 hrs.
      // In this case we should put ourselves into the inactive state 
      // so no redundant burden and risk to manipulate with tab browsing behavior.
      if (status == "status_active" &&
          Date.now() - this._lastTimeBeingActive > this.MS_MAX_IDLE_DURATION) {
        console.log("TMP> tabsplit-control - onStateChange - put into inactive");
        this.deactivate();
        return;
      }
    }
  },

  /* The store listeners end */

  /* The view listeners */

  async onTabSplitButtonClick() {
    console.log("TMP> tabsplit-control - Clicked onTabSplitButtonClick");
    let status = this._state.status;
    if (status != "status_destroyed" && status == "status_inactive") {
      await this.activate(); // Lazy active
      console.log("TMP> tabsplit-control - activate done");
    }
    this.splitTabs();
  },

  onMouseDownOnSplitter() {
    console.log("TMP> tabsplit-control - onMouseDownOnSplitter");
    this._startDraggingColumnSplitter();
  },

  onMouseUpOnSplitter() {
    console.log("TMP> tabsplit-control - onMouseUpOnSplitter");
    this._stopDraggingColumnSplitter();
  },

  onClickWebPageSplit(linkedPanel) {
    if (linkedPanel != this._state.selectedLinkedPanel) {
      gBrowser.selectedTab = this._utils.getTabByLinkedPanel(linkedPanel);
    }
  },

  async onCloseTabBeingSplit(e) {
    let closedPanel = e.target.linkedPanel;
    let groupId = e.target.getAttribute("data-tabsplit-tab-group-id");
    if (this._state.selectedLinkedPanel == closedPanel) {
      // For a whole tab closing operation, we will see 2 chrome events:
      // 1. the "TabClose" event for the tab being closed, which the view tells through this event
      // 2. the "TabSwitchDone" event, which is fired for when switching to another tab
      // We cannot guarantee which event comes first so if see the selected tab is still the tab closed,
      // we should wait until seeing the tab switching done, then proceed.
      // This is to ensure when updating the store and the view, the selceted tab state is finalized.
      console.log("TMP> tabsplit-control - onCloseTabBeingSplit - waiting TabSwitchDone");
      await new Promise(resolve => {
        let listener = {
          onStateChange(store) {
            if (store.getState().selectedLinkedPanel != closedPanel) {
              store.unsubscribe(listener);
              resolve();
            }
          }
        };
        this._store.subscribe(listener);
      });
    }
    this.unsplitTab(groupId);
  },

  /* The view listeners end */

  /* The global listeners */

  _chromeEvents: null,

  _registerChromeEvents() {
    if (this._chromeEvents) {
      return;
    }
    this._chromeEvents = [
      [ this._gBrowser, "TabSwitchDone", () => this.onTabSwitchDone() ],
      [ win, "resize", () => this.onWindowResize() ]
    ];
    for (let [ target, event, handler ] of this._chromeEvents) {
      target.addEventListener(event, handler);
    }
  },

  _unregisterChromeEvents() {
    if (!this._chromeEvents) {
      return;
    }
    for (let [ target, event, handler ] of this._chromeEvents) {
      target.removeEventListener(event, handler);
    }
    this._chromeEvents = null;
  },

  onTabSwitchDone() {
    console.log("TMP> tabsplit-control - onTabSwitchDone");
    let currentPanel = this._gBrowser.selectedTab.linkedPanel;
    if (currentPanel != this._state.selectedLinkedPanel) {
      this._store.update({
        type: "update_selected_linkedPanel",
        args: { selectedLinkedPanel: currentPanel }
      });
    }
  },

  onWindowResize() {
    win.requestAnimationFrame(() => {
      this._store.update({
        type: "update_window_width",
        args: { windowWidth: win.innerWidth }
      });
    });
  },

  /* The global listeners end */
};

})(this);
