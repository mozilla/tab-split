/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const ID_TABSPLIT_BUTTON = "tabsplit-button";

if (!CustomizableUI.getPlacementOfWidget(ID_TABSPLIT_BUTTON)) {
  console.log('TMP> TabSplit - tabsplit.js - Creating customizable wisget')
  CustomizableUI.createWidget({
    id: ID_TABSPLIT_BUTTON,
    type: "button",
    tooltiptext: "Let's split tabs!!!",
    defaultArea: "nav-bar",
    localized: false,
    onCommand: () => console.log('TMP> TabSplit - tabsplit.js - Clicked tabsplit-button'),
  });
  // CustomizableUI.addWidgetToArea(ID_TABSPLIT_BUTTON, "nav-bar");
}




