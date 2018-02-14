

console.log('tabsplit webextension starting up');

async function init() {
  console.log('calling init');
  const message = await browser.tabsplit.init();
  console.log(`init sez: "${message}"`);
}

init();

