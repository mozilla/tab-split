
Tab Split
=========

Tab Split is a Firefox Test Pilot experiment which allows you to see two tabs in the same window, side by side.

Currently, Tab Split uses a WebExtension API Experiment. Currently there is a [bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1434076) which prevents us from using Embedded WebExtension API Experiments, so installation is a two step process.

Start Firefox Nightly, visit `about:debugging`, click `Load Temporary Add-on`, and navigate to `tab-split/experiment/schema.json`. Then click `Load Temporary Add-on` again, and navigate to `tab-split/webext/manifest.json`.

