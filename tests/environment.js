const NodeEnvironment = require("jest-environment-node");

// TODO:
// const { Jenkins } = require("../src/jenkins");
// const { GitLab } = require("../src/gitlab");

// TestEnvironment is sandboxed. Each test suite will trigger setup/teardown in their own TestEnvironment.
class CustomEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    // TODO: Replace with new constructor because now these globals (per test) are mutable
    this.global.jenkins = global.jenkins;
    this.global.gitlab = global.gitlab;
    await super.setup();
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}
module.exports = CustomEnvironment;
