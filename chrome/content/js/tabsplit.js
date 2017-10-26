/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/**
 * @params win {Object} ChromeWindow
 */
(function (win) {
"use strict";

if (!win.TabSplit) {
  console.error("Find no global TabSplit object, unable to init TabSplit feature");
  return;
}

// The structure overview:
// C = tabsplit-control
// V = tabsplit-view
// S = tabsplit-store
// 1. C wires up init
// 2. V listens to user action/input or
//    C listens to Chrome global tab-related events
// 3. V notifies C user action/input or
//    C receives Chrome global tab-related events
// 4. C translates user action/input or Chrome global tab-related events into states
// 5. C passes store updates to S
// 6. S updates states
// 7. S notifies V new states
// 8. V updates itself
// 9. Back to (2)
win.TabSplit.control.init(TabSplit.view, TabSplit.store, win.gBrowser);

})(this);
