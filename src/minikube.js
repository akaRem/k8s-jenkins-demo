const os = require("os");
const path = require("path");

const HOME = os.homedir();

const { run, runSilent, runWithRetries, rimrafAsync } = require("./helpers");

class Minikube {
  constructor() {
    this.memory = 8192;
    this.cpus = 4;
    this.kubernetesVersion = "v1.12.0";

    this.enabledAddons = ["ingress", "kube-dns"];
  }

  async create() {
    await run("minikube", [
      "start",
      "--memory",
      this.memory.toString(),
      "--cpus",
      this.cpus.toString(),
      "--kubernetes-version",
      this.kubernetesVersion.toString()
    ]);
    await Promise.all(
      this.enabledAddons.map(addonName =>
        run("minikube", ["addons", "enable", addonName.toString()])
      )
    );
  }

  async destroy() {
    // TODO: handle missing cluster properly
    await run("minikube", ["config", "set", "WantReportErrorPrompt", "false"]);
    await runSilent("minikube", ["stop"]);
    await runSilent("minikube", ["delete"]);

    await Promise.all([
        rimrafAsync(path.join(HOME, ".minikube")),
        rimrafAsync(path.join(HOME, ".kube"))
    ]);
  }

  async recreate() {
    await this.destroy();
    return await this.create();
  }

  async initHelm() {
    await run("helm", ["init"]);
    // wait for Tiller
    await runWithRetries(1, 30)("helm", ["version"]);
    await run("helm", ["repo", "update"]);
  }

  async printInfo() {
    await run("minikube", ["status"]);
    await run("kubectl", ["config", "current-context"]);
    await run("kubectl", ["cluster-info"]);
  }

  async printItems() {
    await run("kubectl", ["get", "all", "--all-namespaces"]);
  }
}

module.exports = {
  Minikube
};
