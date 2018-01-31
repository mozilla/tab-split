/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/**
 * @params win {Object} ChromeWindow
 */
(function(win) {
"use strict";

if (!win.TabSplit) {
  win.TabSplit = {};
}
const TabSplit = win.TabSplit;

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
    const { view, store, utils, gBrowser } = params;
    this._view = view;
    this._store = store;
    this._utils = utils;
    this._gBrowser = gBrowser;
    this._isClosingTab = false;

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
      if (this._state.status === "status_active") {
        console.log("TMP> tabsplit-control - activate - already active");
        resolve();
        return;
      }
      this._lastTimeBeingActive = Date.now();

      // Make sure seeing the view successfully inits the tabbrowser
      const obs = new MutationObserver(mutations => {
        if (this._gBrowser.getAttribute("data-tabsplit-tabbrowser-init") !== "true") {
          return;
        }
        obs.disconnect();
        this._registerChromeEvents();
        this._overrideChromeBehaviors();
        resolve();
      });
      obs.observe(this._gBrowser, { attributes: true });

      this._store.update({
        type: "set_active"
      }, {
        type: "update_tabbrowser_width",
        args: { tabbrowserWidth: this._gBrowser.boxObject.width }
      }, {
        type: "update_selected_linkedPanel",
        args: { selectedLinkedPanel: this._gBrowser.selectedTab.linkedPanel }
      });
    });
  },

  _cleanUp() {
    this._lastTimeBeingActive = -1;
    this._unregisterChromeEvents();
    this._restoreChromeBehaviors();
  },

  deactivate() {
    this._cleanUp();
    this._store.update({
      type: "set_inactive"
    });
  },

  destroy() {
    this._cleanUp();
    this._store.update({
      type: "set_destroyed"
    });
    this._gBrowser = this._utils = this._view = this._store = null;
  },

  _currentTabColorIndex: -1,

  _tabColors: [
    "#d8707b", "#ce7be5", "#7b7ee5", "#7bc2e5", "#7fd8d3", "#9ed87f", "#e0ba76", "#e07f76"
  ],

  splitTab() {
    // Notice here we cannot rely on this._state
    // because we do lazy active so the state may not be active.
    const leftTab = this._gBrowser.selectedTab;
    if (leftTab.getAttribute("data-tabsplit-tab-group-id")) {
      return; // The tab has been split already
    }
    console.log("TMP> tabsplit-control - splitTab");

    const rightTab = this._gBrowser.addTab("about:newtab");
    this._gBrowser.addEventListener("TabSwitchDone", () => {
      const newTabGroup = {};
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
    const group = this._state.tabGroups[tabGroupId];
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
    const windowWidth = window.innerWidth;
    this.onDraggingColumnSplitter = e => {
      const mousePosX = e.clientX;
      win.requestAnimationFrame(() => {
        // Cannot drag the splitter and other place at the same time
        // so safe to assume the widths are unchanged here and
        // don't have to make a sync flow call to get the widths again.
        const availableWidth = this._state.tabbrowserWidth - this._view.PX_COLUMN_SPLITTER_WIDTH;
        // When the side bar is on, the window would be like
        // |      |             |            |
        // | side |  tab A page | tab B page |
        // | bar  |             |            |
        // |      |             |            |
        // so have to substract the side bar's width
        const sideBarWidth = windowWidth - this._state.tabbrowserWidth;
        let leftDistribution = (mousePosX - sideBarWidth) / availableWidth;
        let rightDistribution = 1 - leftDistribution;
        // Make sure no distribution is smaller than the min distribution
        const minDistribution = this._view.MIN_TAB_SPLIT_DISTRIBUTION;
        if (leftDistribution < minDistribution) {
          leftDistribution = minDistribution;
          rightDistribution = 1 - leftDistribution;
        } else if (rightDistribution < minDistribution) {
          rightDistribution = minDistribution;
          leftDistribution = 1 - rightDistribution;
        }

        const currentGroup = this._utils.getTabGroupByLinkedPanel(this._state.selectedLinkedPanel, this._state);
        if (currentGroup.tabs[0].distribution === leftDistribution) {
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
    console.log("TMP> tabsplit-control - onStateChange", this._state);
    const { status, tabGroupIds } = this._state;
    if (status === "status_active" && tabGroupIds && tabGroupIds.length > 0) {
      console.log("TMP> tabsplit-control - onStateChange - update _lastTimeBeingActive");
      this._lastTimeBeingActive = Date.now();
    } else {
      // Consider users used our tabsplit feature happily for 1 hr,
      // then users didn't use in the next 3 hrs.
      // In this case we should put ourselves into the inactive state
      // so no redundant burden and risk to manipulate with tab browsing behavior.
      if (status === "status_active" &&
          Date.now() - this._lastTimeBeingActive > this.MS_MAX_IDLE_DURATION) {
        console.log("TMP> tabsplit-control - onStateChange - put into inactive");
        this.deactivate();
        return;
      }
    }

    if (status === "status_destroyed") {
      console.log("TMP> tabsplit-control - TabSplit:OnDestory - get status_destroyed at", Date.now());
    }
  },
  /* The store listeners end */

  /* The view listeners */
  async onCommandSplitTab() {
    console.log("TMP> tabsplit-control - Clicked onCommandSplitTab");
    if (this._gBrowser.selectedTab.pinned) {
      // Now don't support split a pinned tab.
      // And notice here we cannot rely on this._state
      // because we do lazy active so the state may not be active.
      return;
    }

    const status = this._state.status;
    if (status !== "status_destroyed" && status === "status_inactive") {
      await this.activate(); // Lazy active
      console.log("TMP> tabsplit-control - activate done");
    }
    this.splitTab();
  },

  onCommandUnsplitTabsAll() {
    if (this._state.tabGroupIds.length > 0) {
      this._store.update({ type: "remove_all_tab_groups" });
    }
  },

  onCommandSplitOption(splitOption) {
    let leftDistribution = 0;
    switch (splitOption) {
      case "vertical-2:1":
        leftDistribution = 0.67;
        break;

      case "vertical-1:1":
        leftDistribution = 0.5;
        break;

      case "vertical-1:2":
        leftDistribution = 0.33;
        break;

      default:
        return;
    }

    const tab = this._utils.getTabByLinkedPanel(this._state.selectedLinkedPanel);
    const groupId = tab.getAttribute("data-tabsplit-tab-group-id");
    if (!groupId) {
      return;
    }
    this._store.update({
      type: "update_tab_distibutions",
      args: {
        id: groupId,
        distributions: [ leftDistribution, 1 - leftDistribution ]
      }
    });
  },

  onMouseDownOnSplitter() {
    console.log("TMP> tabsplit-control - onMouseDownOnSplitter");
    this._startDraggingColumnSplitter();
  },

  onMouseUpOnSplitter() {
    console.log("TMP> tabsplit-control - onMouseUpOnSplitter");
    this._stopDraggingColumnSplitter();
  },

  onClickPageSplit(linkedPanel) {
    if (linkedPanel !== this._state.selectedLinkedPanel) {
      console.log("TMP> tabsplit-control - onClickPageSplit", linkedPanel);
      gBrowser.selectedTab = this._utils.getTabByLinkedPanel(linkedPanel);
    }
  },

  onViewUpdateError(stateFromView) {
    console.log("TMP> tabsplit-control - onViewUpdateError at", stateFromView.status);
    // Manipulating the tab behavior isn't trival and low risk.
    // When seeing view update error, we will deactivate or destroy ourselves
    // so at least, to some degree, we ensure user can keep using Firefox normally.
    switch (stateFromView.status) {
      case "status_active":
        this.deactivate();
        return;

      case "status_inactive":
        this.destroy();

    }
  },
  /* The view listeners end */

  /* The global listeners */
  _chromeEvents: null,

  _registerChromeEvents() {
    if (this._chromeEvents) {
      return;
    }

    // This is not beatiful but in order to detect the resize of the tabbrowser
    // we have to append an iframe so able to receive the resize event.
    // The window resize event is not enough for us because when the side bar opens
    // the tabbrowser will be resized but the winodw will not.
    this._iframeForResize = document.createElementNS("http://www.w3.org/1999/xhtml", "iframe");
    this._iframeForResize.sandbox.add(); // Disallow all permissions
    this._iframeForResize.id = "tabsplit-iframe-for-resize";
    this._gBrowser.parentNode.appendChild(this._iframeForResize);

    this._chromeEvents = [
      [ this._iframeForResize, "resize", () => this.onResize() ],
      [ this._gBrowser, "TabSwitchDone", () => this.onTabSwitchDone() ],
      [ this._gBrowser.tabContainer, "dragstart", e => this.onDragStart(e) ],
      [ this._gBrowser.tabContainer, "TabPinned", e => this.onTabPinned(e) ],
      [ this._gBrowser.tabContainer, "TabUnpinned", () => this.onTabUnpinned() ],
      [ this._gBrowser.tabContainer, "TabClose", e => this.onClosingTabBeingSplit(e) ],
    ];
    for (const [ target, event, handler ] of this._chromeEvents) {
      target.addEventListener(event, handler);
    }
  },

  _unregisterChromeEvents() {
    if (!this._chromeEvents) {
      return;
    }
    for (const [ target, event, handler ] of this._chromeEvents) {
      target.removeEventListener(event, handler);
    }
    this._iframeForResize.remove();
    this._iframeForResize = null;
    this._chromeEvents = null;
  },

  onTabSwitchDone() {
    console.log("TMP> tabsplit-control - onTabSwitchDone");
    const currentPanel = this._gBrowser.selectedTab.linkedPanel;
    // While closing tab, the tab closing event will handle the TabSwitch event.
    if (!this._isClosingTab && currentPanel !== this._state.selectedLinkedPanel) {
      this._store.update({
        type: "update_selected_linkedPanel",
        args: { selectedLinkedPanel: currentPanel }
      });
    }
  },

  onTabPinned(e) {
    const id = e.target.getAttribute("data-tabsplit-tab-group-id");
    if (id) {
      this.unsplitTab(id);
    }
  },

  onTabUnpinned() {
    console.log("TMP> tabsplit-control - onTabUnpinned");
    // The tabs' position orders will be affected when unpinning a tab
    // so we have to force updating to have them back in line again.
    this._view.forceUpdate();
  },

  onDragStart(e) {
    const tab = e.target;
    console.log("TMP> tabsplit-control - onDragStart", tab.linkedPanel);
    // The tabs' position orders will be affected when dragging a tab
    // so we have to force updating to have them back in line again.
    tab.addEventListener("TabMove", () => this._view.forceUpdate(), { once: true });
  },

  async onClosingTabBeingSplit(e) {
    const tabClosing = e.target;
    const groupId = tabClosing.getAttribute("data-tabsplit-tab-group-id");
    if (!groupId) {
      return;
    }
    console.log("TMP> tabsplit-control - onClosingTabBeingSplit -", tabClosing);

    this._isClosingTab = true;
    const promises = [];

    // For a whole tab closing job, we will see 2 operations:
    // 1. Switch to another tab if it is the current selected tab being closed
    // 2. Remove the tab from the DOM tree
    // We must wait these operations done then proceed to make sure the state correct.
    if (this._state.selectedLinkedPanel === tabClosing.linkedPanel) {
      promises.push(new Promise(resolve => {
        this._gBrowser.addEventListener("TabSwitchDone", resolve, { once: true });
      }));
    }
    if (this._gBrowser.tabContainer.querySelector(`tab[linkedpanel=${tabClosing.linkedPanel}]`)) {
      promises.push(new Promise(resolve => {
        const obs = new MutationObserver(mutations => {
          for (const m of mutations) {
            const nodes = Array.from(m.removedNodes);
            const found = !!nodes.find(node => node.linkedPanel === tabClosing.linkedPanel);
            if (found) {
              obs.disconnect();
              resolve();
              break;
            }
          }
        });
        obs.observe(this._gBrowser.tabContainer, { childList: true, subtree: true });
      }));
    }
    await Promise.all(promises);

    this._store.update({
      type: "update_selected_linkedPanel",
      args: { selectedLinkedPanel: this._gBrowser.selectedTab.linkedPanel }
    }, {
      type: "remove_tab_group",
      args: { id: groupId }
    });
    this._isClosingTab = false;
  },

  onResize() {
    win.requestAnimationFrame(() => {
      console.log("TMP> tabsplit-control - onResize");
      this._store.update({
        type: "update_tabbrowser_width",
        args: { tabbrowserWidth: this._gBrowser.boxObject.width }
      });
    });
  },
  /* The global listeners end */

  /* Override the chrome behaviours */
  _chromeBehaviors: null,

  _overrideChromeBehaviors() {
    if (this._chromeBehaviors) {
      return;
    }
    this._chromeBehaviors = [
      {
        targetHolder: gBrowser,
        targetName: "_getSwitcher",
        target: gBrowser._getSwitcher,
        proxyHandler: this._getGetSwitcherProxy(),
      }
    ];
    for (const { targetHolder, targetName, target, proxyHandler } of this._chromeBehaviors) {
      targetHolder[targetName] = new Proxy(target, proxyHandler);
    }
  },

  _restoreChromeBehaviors() {
    if (!this._chromeBehaviors) {
      return;
    }
    for (const { targetHolder, targetName, target } of this._chromeBehaviors) {
      targetHolder[targetName] = target;
    }
    this._chromeBehaviors = null;
  },

  _getGetSwitcherProxy() {
    const proxy = {};
    proxy.apply = (_getSwitcher, thisArg, args) => {
      console.log("TMP> tabsplit-control - _getSwitcher proxy", _getSwitcher.name);
      // The switcher will be destroyed so we override everytime.
      const switcher = _getSwitcher.call(thisArg, ...args);
      switcher.setTabState = new Proxy(switcher.setTabState, this._getSetTabStateProxy());
      return switcher;
    };
    return proxy;
  },

  _getSetTabStateProxy() {
    const proxy = {};
    proxy.apply = (setTabState, thisArg, args) => {
      console.log("TMP> tabsplit-control - setTabState proxy", setTabState.name);
      const state = args[1];
      const switcher = thisArg;
      if (state === switcher.STATE_UNLOADING) {
        const tab = args[0];
        const unloadingTabGroupId = tab.getAttribute("data-tabsplit-tab-group-id");
        const requestedTabGroupId = switcher.requestedTab ?
          switcher.requestedTab.getAttribute("data-tabsplit-tab-group-id") : "";
        if (requestedTabGroupId && requestedTabGroupId === unloadingTabGroupId && !tab.closing) {
          // The unloading tab is in the same tab group as the tab being switched to
          // and the unloading tab is not being closed. In this case we don't want to unload it
          // but should still change the state without actions, because the switcher's `unloadNonRequiredTabs`
          // will keep trying to unload tabs not in the unloaded state.
          switcher.setTabStateNoAction(tab, switcher.STATE_UNLOADED);
          return;
        }
      }
      return setTabState.call(switcher, ...args);
    };
    return proxy;
  },
  /* Override the chrome behaviours end */
};

})(this);
