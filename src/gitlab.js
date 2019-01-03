const fs = require("fs");
const yaml = require("js-yaml");
const fetch = require("node-fetch");
const k8s = require("@kubernetes/client-node");

const { run, runSilent, sleep, b64decode } = require("./helpers");

class GitLab {
  constructor() {
    this.installationTimeout = 900;
    this.valuesFile = "values/gitlab.yaml";
    this.chartName = "gitlab/gitlab";
    this.releaseName = "gitlab";
    this.k8sNamespace = "default";
    this.customChartRepo = {
      name: "gitlab",
      url: "https://charts.gitlab.io/"
    };
    this.chartValues = yaml.safeLoad(fs.readFileSync(this.valuesFile));
  }

  async status() {
    const res = await run("helm", ["list", "--all", "--output", "json"]);
    const data = JSON.parse(res);
    const chartData = data.Releases.find(
      _ => _.Name === this.releaseName.toString()
    );
    if (chartData) {
      return chartData.Status;
    }
  }

  async create() {
    if (this.customChartRepo) {
      await run("helm", [
        "repo",
        "add",
        this.customChartRepo.name,
        this.customChartRepo.url
      ]);
      await run("helm", ["repo", "update"]);
    }

    await run("helm", [
      "install",
      "--debug",
      "--wait",
      "--timeout",
      this.installationTimeout.toString(),
      "--name",
      this.releaseName.toString(),
      "-f",
      this.valuesFile.toString(),
      this.chartName.toString()
    ]);
  }

  async destroy() {
    // FIXME: check that it exists (helm list --all --output json)
    await runSilent("helm", ["del", "--purge", this.releaseName.toString()]);
    // FIXME: check deletion status (helm list --all --output json)
    await sleep(5);
  }

  async recreate() {
    await this.destroy();
    await this.create();
  }
  async getInitialRootPassword() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    const k8sApi = kc.makeApiClient(k8s.Core_v1Api);
    const res = await k8sApi.listNamespacedSecret("default");
    const secret = res.body.items.find(
      _ => _.metadata.name === "gitlab-gitlab-initial-root-password"
    );

    return b64decode(secret.data.password);
  }
  async getOAuthToken() {
    const _OLD_NODE_TLS_REJECT_UNAUTHORIZED =
      process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      return await fetch(
        `https://gitlab.${this.chartValues.global.hosts.domain}/oauth/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            grant_type: "password",
            username: "root",
            password: await this.getInitialRootPassword()
          })
        }
      )
        .then(_ => _.json())
        .then(_ => _.access_token);
    } finally {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = _OLD_NODE_TLS_REJECT_UNAUTHORIZED;
    }
  }
}

module.exports = {
  GitLab
};
