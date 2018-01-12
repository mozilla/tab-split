module.exports = {
  "env": {
    "browser": true,
    "es6": true,
    "webextensions": true
  },

  "extends": [
    "eslint:recommended"
  ],

  "globals": {
    "TabSplit": false,
    "gBrowser": false
  },

  "parserOptions": {
    "ecmaVersion": 8
  },

  "root": true,

  "rules": {
    "eqeqeq": "off", // TODO: error
    "no-console": "off", // TODO: warn
    "no-unused-vars": ["error", {"vars": "all", "args": "none"}]
  }
};
