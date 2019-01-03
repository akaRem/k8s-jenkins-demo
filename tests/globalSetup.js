// this script is executed once before test suite

const { mkdirpAsync, writeFileAsync } = require("../src/helpers");

const workspace = require("../src/workspace");
const { Minikube } = require("../src/minikube");
const { Jenkins } = require("../src/jenkins");
const { GitLab } = require("../src/gitlab");

module.exports = async globalConfig => {
  // TODO: add env var to disable cluster recreation..

  await Promise.all([workspace.cleanup(), new Minikube().destroy()]);

  global.minikube = new Minikube();
  await minikube.create();
  await minikube.initHelm();
  await Promise.all([new Jenkins().destroy(), new GitLab().destroy()]);
  global.jenkins = new Jenkins();
  global.gitlab = new GitLab();

  await Promise.all([jenkins.create(), gitlab.create()]);
  const gitlabPassword = await gitlab.getInitialRootPassword();
  const gitlabToken = await gitlab.getOAuthToken();
  await mkdirpAsync("tmp/vars/");
  await writeFileAsync("tmp/vars/gl-password", gitlabPassword);
  await writeFileAsync("tmp/vars/gl-token", gitlabToken);

  await jenkins.addPasswordCredentials({
    // TODO: read some vars from yaml
    credentialsId: "gl-root-login-passwd",
    description: "Login and password for GitLab",
    username: "root",
    password: gitlabPassword
  });
  await jenkins.initJJB();
  await jenkins.updateJobs();
};
