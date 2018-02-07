module.exports = {
  "env": {
    "browser": true,
    "es6": true,
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
    "ecmaVersion": 8
  },
  "plugins": [
    "mozilla"
  ],
  "root": true,
  "rules": {
    "eqeqeq": "warn", // TODO: error
    "indent": ["off", 2, {"SwitchCase": 1}], // TODO: error
    "no-console": "off", // TODO: warn
    "no-throw-literal": "warn", // TODO: error
    "no-unused-vars": ["error", {"vars": "all", "args": "none"}],
    "no-var": "error",
    "no-warning-comments": "warn",
    "prefer-const": "error",
    "valid-jsdoc": "warn",
  }
};
