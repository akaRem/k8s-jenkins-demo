const { rimrafAsync } = require("./helpers");

async function cleanup() {
  return await Promise.all([
    rimrafAsync("./tmp"),
    rimrafAsync("./venv"),
    rimrafAsync("./jenkins-jobs/jenkins.conf")
  ]);
}

module.exports = {
  cleanup
};
