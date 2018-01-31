Tab Split
=========

Tab Split is a Firefox Test Pilot experiment which allows you to see two tabs in the same window, side by side.

Currently, Tab Split is a legacy bootstrap extension. In the future, the implementation will be changed to be a webextension with an embedded Web Extension API Experiment.

Running
-------
Tab Split requires Node 8 and Firefox Nightly.

Running `npm install && npm run addon` inside the tab-split directory will start a Firefox Nightly instance with tab split loaded. Click on the tab split icon in the toolbar to try it out.

WebExtension API Experiment version
-----------------------------------

This branch contains an experimental version of Tab Split which is implemented using a WebExtension API Experiment. To run this, start Firefox Nightly, visit `about:debugging`, click `Load Temporary Add-on`, and navigate to `tab-split/experiment/schema.json`. Then click `Load Temporary Add-on` again, and navigate to `tab-split/webext/manifest.json`.

