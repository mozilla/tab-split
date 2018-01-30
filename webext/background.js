console.log('welcome to tabsplit');

browser.tabsplit.tabsplit().then(
  message => console.log(`tabsplit sez: "${message}"`)
);

