# Tab Split Metrics

Metrics collections and analysis plan for the Tab Split experiment for [Firefox Test Pilot](https://testpilot.firefox.com).

## Analysis

Quantitative data collected in this experiment will be used to answer the following high-level questions:

* How often do users split.
* In any given session, what amount of active time is spent in a split?
* Are splitters already heavy tab users?
* Do splitters have wide screen devices?
* What are common split ratios?
* Do users understand the basic functionality of tab split
  * Splitting and unsplitting
  * Dragging
  * Changing orientation
  * Giving feedback

## Collections

### Custom Dimensions
* `cd1` - orientation of split. One of `horizontal` or `vertical`.
* `cd2` - width of browser window.
* `cd3` - height of browser window.
* `cd4`- integer % ratio of split width or height for current split.
* `cd5`- count of currently open non-split tabs
* `cd6` - count of currently open splits (increment/decrement by pair)
* `cd7` - total tab open events in browser session.
* `cd8` - total `split-start` events in browser session.
* `cd9` - total orientation toggles from vertical to horizontal (count should decrement if user toggles back to vertical)
* `cd10` - max concurrent splits in a browser session.
* `cd11` - active ticks in browser session (can probably get passed in from [telemetry](https://firefox-source-docs.mozilla.org/toolkit/components/telemetry/telemetry/data/main-ping.html#info))
* `cd12` - active ticks in session with a vertically split tab focused
* `cd13` - active ticks in session with a horizontally split tab focused

### Events

#### `toolbar actions`
```
ec: toolbar-actions,
ea: toolbar-click,
el: start-split
ev: {integer count of this event since browser start}
cd2,
cd3,
cd5,
cd6
```

```
ec: toolbar-actions,
ea: toolbar-click,
el: open-menu
ev: {integer count of this event since browser start}
cd1,
cd2,
cd3,
cd4,
cd5,
cd6
```

```
ec: toolbar-actions,
ea: toolbar-menu-click
el: give-feedback
cd6,
cd8,
cd11,
cd12,
cd13
```

```
ec: toolbar-actions,
ea: toolbar-menu-click,
el: change-orientation,
ev: {integer count of this event since browser start}
cd1, // note this should record value AFTER change
cd2,
cd3,
cd5,
cd6
```

```
ec: toobar-actions,
ea: toolbar-menu-click,
el: unsplit-tabs,
ev: {integer count of this event since browser start},
cd1,
cd2,
cd3,
cd5, // note this should record value AFTER state change
cd6 // note this should record value AFTER state change
```


### `split-select-actions`
_invoked on the split 'new tab' UI_
```
ec: split-select-actions,
ea: select-tab,
el: {new-tab || open-tab},
ev: {integer id of index of selected button}
cd5,
cd6

```

```
ec: split-select-actions,
ea: button-click
el: give-feedback
cd6,
cd8,
cd11,
cd12,
cd13
```

### `split-actions`
_should be invoked when a user finishes a drag resize in a split_

_note: we might want to invoke this when a user completes some other action, like giving focus back to split tab content_
```
ec: split-actions
ea: drag-resize
el: end
ev: {integer count of this event since browser start}
cd1,
cd2,
cd3,
cd4
```

### `browser-session` actions
```
ec: browser-session,
ea: session-start, //ed. note:  this would be sent on next session start, but maybe we could fire it on session end?
el: report-card,
cd7,
cd8,
cd9,
cd10,
cd11,
cd12,
cd13

```


