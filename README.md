

Tab Split
=========

Tab Split is a Firefox Test Pilot experiment which allows you to see two tabs in the same window, side by side.

Currently, Tab Split uses an Embedded WebExtension API Experiment. There is a [bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1434076) which prevents us from using any WebExtension apis, so the  implementation just calls into the API Experiment from the WebExtension and does everything using XPCOM and XUL code.

To test, run `npm run build`, then load Firefox Nightly, visit `about:debugging`, click `Load Temporary Add-on`, and navigate to `tab-split/webext/manifest.json`.

To iteratively develop, you can run `npm run watch` and press the `reload` button in `about:debugging` after making any changes.

