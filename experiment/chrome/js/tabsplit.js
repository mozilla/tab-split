/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/**
 * @params win {Object} ChromeWindow
 */
console.log('tabsplit.js');
(function (win) {
"use strict";
console.log('tabsplit window', win);
if (!win.TabSplit) {
  console.error("Find no global TabSplit object, unable to init TabSplit feature");
  return;
}

// The structure overview:
// C = tabsplit-control
// V = tabsplit-view
// S = tabsplit-store
// 1. C wires up init
// 2. V listens to user actions/inputs and C listens to chrome global events
// 3. V notifies C user actions/inputs or C receives chrome global events
// 4. C translates user actions/inputs or Chrome global events into states
// 5. C passes state updates to S
// 6. S updates states
// 7. S notifies V new states
// 8. V updates the chrome UI
// 9. Back to (2)
win.TabSplit.control.init({ 
  view: TabSplit.view, 
  store: TabSplit.store, 
  utils: TabSplit.utils, 
  gBrowser: win.gBrowser
});

})(this);
