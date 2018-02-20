module.exports = {
  "env": {
    "browser": true,
    "es6": true,
    "node": true,
    "webextensions": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:mozilla/recommended"
  ],
  "globals": {
    "TabSplit": false,
    "gBrowser": false
  },
  "parserOptions": {
    "ecmaVersion": 8,
    "sourceType": "module"
  },
  "plugins": [
    "mozilla"
  ],
  "root": true,
  "rules": {
    "mozilla/use-services": "off", // TODO: warn?

    "eqeqeq": "warn", // TODO: error
    "indent": ["off", 2, {"SwitchCase": 1}], // TODO: error
    "no-console": "off", // TODO: warn
    "no-throw-literal": "warn", // TODO: error
    "no-unused-vars": ["error", {"vars": "all", "args": "none"}],
    "no-var": "error",
    "no-warning-comments": "warn",
    "prefer-const": "error",
    "valid-jsdoc": "off", // TODO: warn
  }
};
