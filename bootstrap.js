/* globals ADDON_DISABLE */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const WM = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);

function startup(data, reason) {
  console.log("TMP> MozTabSplit Startup");
  let chromeWindow = WM.getMostRecentWindow('navigator:browser');
  console.log("TMP > chromeWindow.document.loadOverlay =", chromeWindow.document.loadOverlay);
}

function shutdown(data, reason) {
}

function install(data, reason) {}

function uninstall(data, reason) {}

