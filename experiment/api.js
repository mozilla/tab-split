
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;


class Impl {
  constructor() {
    this._browserCount = 0;
  }

  async init(context) {
    console.log("TMP > TabSplit - api - onNewBrowserCreated");

    let WM = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
    let chromeWindow = WM.getMostRecentWindow("navigator:browser");
    let tabbrowser = chromeWindow.document.getElementById("content");
    if (tabbrowser.getAttribute("data-tabsplit-tabbrowser-id")) {
      return chromeWindow;
    }

    if (this._browserCount === 0) {
      console.log("TMP > TabSplit - api - onNewBrowserCreated context.callOnClose");
      context.callOnClose({
        close: () => {
          console.log("TMP > TabSplit - api - close");
          this.destroy();
        }
      });
    }

    tabbrowser.setAttribute("data-tabsplit-tabbrowser-id", ++this._browserCount);
    console.log("TMP > TabSplit - api - onNewBrowserCreated - browserCount", this._browserCount);
    console.log("TMP > TabSplit - api - onNewBrowserCreated - load overlay tabsplit-init-overlay.xul");
    chromeWindow.document.loadOverlay(context.extension.getURL("chrome/overlay/tabsplit-init-overlay.xul"),
      (subj, topic, data) => console.log("TMP > TabSplit - api - onNewBrowserCreated - load overlay topic", topic));

    return chromeWindow;
  }

  async destroy() {
    console.log("TMP > TabSplit - api - onDestroy");
    let WM = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
    let chromeWindows = WM.getEnumerator("navigator:browser");
    while (chromeWindows.hasMoreElements()) {
      let win = chromeWindows.getNext();
      let tabbrowser = win.document.getElementById("content");
      if (win.TabSplit) {
        console.log("TMP > TabSplit - api - destroying data-tabsplit-tabbrowser-id =", tabbrowser.getAttribute("data-tabsplit-tabbrowser-id"), Date.now());
        win.TabSplit.control.destroy();
        delete win.TabSplit;
        console.log("TMP > TabSplit - api - destroyed at", Date.now());
      }
      tabbrowser.removeAttribute("data-tabsplit-tabbrowser-id");
      this._browserCount--;
    }
    return true;
  }
}


this.tabsplit = class API extends ExtensionAPI {
  getAPI(context) {
    const impl = new Impl();
    return {
      tabsplit: {
        init: async () => {
          await impl.init(context);
          return "init";
        }
      }
    }
  }
}

