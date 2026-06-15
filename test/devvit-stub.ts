// Minimal stand-in for @devvit/public-api so the pure modules can be imported
// in tests without the Devvit runtime. Only the symbols referenced at module
// load time need to exist; nothing here is actually invoked by the tests.

export const Devvit = {
  addSettings() {},
};

export const SettingScope = {
  Installation: "installation",
  App: "app",
};

export default Devvit;
