console.log('welcome to tabsplit');

browser.tabsplit.tabsplit().then(
  message => console.log(`tabsplit sez: "${message}"`)
);

function buttonclick() {
  console.log('buttonclick');
}

browser.browserAction.onClicked.addListener(buttonclick);
