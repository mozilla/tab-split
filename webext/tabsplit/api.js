this.tabsplit = class API extends ExtensionAPI {
  getAPI(context) {
    return {
      tabsplit: {
        async tabsplit() {
          console.log('asdfasdfasdf');
          return "tabsplitttt";
        }
      }
    };
  }
}
