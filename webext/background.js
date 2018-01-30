browser.tabsplit.init().then(
  message => console.log(`tabsplit sez: "${message}"`)
);

/*
Commenting out the following causes the browserAction to not be installed.
Since the current implementation installs a button using chrome code,
let's just keep doing it that way for now.
*/
/*
browser.browserAction.onClicked.addListener(() => {
  browser.tabsplit.tabsplit().then(
    message => console.log(`tabsplit sez: "${message}"`)
  );
});
*/

/* to enable the above code, copy the below into manifest.json
*/
/*
  "browser_action": {
    "browser_style": true,
    "default_icon": "tabsplit-fox.png"
  }
*/
