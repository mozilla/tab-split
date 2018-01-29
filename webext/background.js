
function browseraction() {
  console.log("browseraction");
}


browser.browserAction.onClicked.addListener(browseraction);
 
