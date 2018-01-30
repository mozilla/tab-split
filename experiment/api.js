
console.log('hello api');

class API extends ExtensionAPI {
  getAPI(context) {
    return {
      tabsplit: {
        async tabsplit() {
          console.log("Hello, Tab Split");
          return "Hello, world!";
        }
      }
    };
  }
}
