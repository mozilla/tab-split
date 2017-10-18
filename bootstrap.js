/* globals ADDON_DISABLE */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const URL_BASE = "chrome://tabsplit/content/";

const startupObserver = {
  register() {
    Services.obs.addObserver(this, "sessionstore-windows-restored", false);
  },

  unregister() {
    Services.obs.removeObserver(this, "sessionstore-windows-restored", false);
  },

  observe() {
    this.unregister();
    tabSplit.init();
  }
};

const ID_TABSPLIT_BUTTON = "tabsplit-button";

const tabSplit = {
  _inited: false,

  init() {
    if (this._inited) {
      return;
    }
    this._inited = true;
    console.log("TMP > MozTabSplit init");

    let WM = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
    this._chromeWindow = WM.getMostRecentWindow("navigator:browser"); 
    this._chromeWindow.document.loadOverlay(URL_BASE + "overlay/tabsplit-navbar-overlay.xul",
      (subj, topic, data) => {
        console.log("TMP > MozTabSplit loadOverlay topic =", topic);
        if (!this._chromeWindow.CustomizableUI.getPlacementOfWidget(ID_TABSPLIT_BUTTON)) {
          this._chromeWindow.CustomizableUI.addWidgetToArea(ID_TABSPLIT_BUTTON, "nav-bar", null);
        }
      });
    console.log("TMP > MozTabSplit _chromeWindow.document.loadOverlay tabsplit-navbar-overlay.xul");
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
  if (reason === APP_STARTUP) {
    startupObserver.register();
    return;
  }
  tabSplit.init();
}

function shutdown(data, reason) {
}

function install(data, reason) {}

function uninstall(data, reason) {
  console.log("TMP> MozTabSplit uninstall with reason =", reason);
  tabSplit.uninit();
}
