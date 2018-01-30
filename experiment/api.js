
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

let browserCount = 0;

class API extends ExtensionAPI {
  getAPI(context) {
    return {
      tabsplit: {
        async init() {
          console.log("TMP > TabSplit - bootstrap - onNewBrowserCreated");
      
          let WM = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
          let chromeWindow = WM.getMostRecentWindow("navigator:browser");
          let tabbrowser = chromeWindow.document.getElementById("content");
          if (tabbrowser.getAttribute("data-tabsplit-tabbrowser-id")) {
            return false;
          }
      
          tabbrowser.setAttribute("data-tabsplit-tabbrowser-id", ++browserCount);
          console.log("TMP > TabSplit - bootstrap - onNewBrowserCreated - browserCount", browserCount);
          console.log("TMP > TabSplit - bootstrap - onNewBrowserCreated - load overlay tabsplit-init-overlay.xul");
          chromeWindow.document.loadOverlay("resource://extension-tabsplit-api/chrome/overlay/tabsplit-init-overlay.xul",
            (subj, topic, data) => console.log("TMP > TabSplit - bootstrap - onNewBrowserCreated - load overlay topic", topic));
  
          return true;
        },

        async tabsplit() {
          
          return true;
        },

        async destroy() {
          console.log("TMP > TabSplit - bootstrap - onDestroy");
          let WM = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
          let chromeWindows = WM.getEnumerator("navigator:browser");
          while (chromeWindows.hasMoreElements()) {
            let win = chromeWindows.getNext();
            let tabbrowser = win.document.getElementById("content");
            if (win.TabSplit) {
              console.log("TMP > TabSplit - bootstrap - destroying data-tabsplit-tabbrowser-id =", tabbrowser.getAttribute("data-tabsplit-tabbrowser-id"), Date.now());
              win.TabSplit.control.destroy();
              delete win.TabSplit;
              console.log("TMP > TabSplit - bootstrap - destroyed at", Date.now());
            }
            tabbrowser.removeAttribute("data-tabsplit-tabbrowser-id");
            browserCount--;
          }
          return true;
        }
      }
    }
  }
}
