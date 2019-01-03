const fs = require("fs");
const path = require("path");

const yaml = require("js-yaml");
const ini = require("ini");
const k8s = require("@kubernetes/client-node");
const JenkinsAPI = require("jenkins");
const nunjucks = require("nunjucks");
const {
  writeFileAsync,
  run,
  runSilent,
  sleep,
  b64decode
} = require("./helpers");

class Jenkins {
  constructor() {
    this.installationTimeout = 900;
    this.valuesFile = "values/jenkins.yaml";
    this.chartName = "stable/jenkins";
    this.releaseName = "jenkins-ci";
    this.k8sNamespace = "default";
    this.customChartRepo = null;
    this.chartValues = yaml.safeLoad(fs.readFileSync(this.valuesFile));
    this.confPathJJB = "./jenkins-jobs/jenkins.conf";
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

  async getCredentials() {
    // TODO: mv as class- or module-level constants
    const SECRET_FIELDNAMES = {
      USER: "jenkins-admin-user",
      PASSWORD: "jenkins-admin-password"
    };

    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    const k8sApi = kc.makeApiClient(k8s.Core_v1Api);

    // TODO: figure out how to pass query params instead of filtering
    const res = await k8sApi.listNamespacedSecret(this.k8sNamespace);
    const secret = res.body.items.find(
      item => item.metadata.name == this.releaseName
    );

    const jenkinsUser = b64decode(secret.data[SECRET_FIELDNAMES.USER]);
    const jenkinsPassword = b64decode(secret.data[SECRET_FIELDNAMES.PASSWORD]);
    return { jenkinsUser, jenkinsPassword };
  }

  getAPI() {
    const jenkinsPort = "80";
    const jenkinsHost = this.chartValues.Master.HostName;
    const jenkinsUrlScheme = "http";
    const api = new JenkinsAPI({
      // baseUrl: `${jenkinsUrlScheme}://${jenkinsUser}:${jenkinsToken}@${jenkinsHost}:${jenkinsPort}`,
      baseUrl: `${jenkinsUrlScheme}://${jenkinsHost}:${jenkinsPort}`,
      crumbIssuer: true,
      promisify: true
    });

    return api;
  }

  async applyGroovyScript(script) {
    return new Promise((resolve, reject) => {
      this.getAPI()._post(
        {
          path: "/scriptText",
          type: "form",
          body: Buffer.from(`script=${script}`)
        },
        (err, res) => {
          if (err) {
            return reject(err);
          } else if (res.statusCode !== 200) {
            return reject(res.statusCode);
          } else {
            return resolve(res.body);
          }
        }
      );
    });
  }

  async addPasswordCredentials({
    credentialsId,
    description,
    username,
    password
  }) {
    const templateData = {
      credentialsId,
      description,
      username,
      password
    };

    const script = nunjucks.render(
      path.join(__dirname, "templates/createUserCredentials.groovy.njk"),
      templateData
    );
    await this.applyGroovyScript(script);
  }

  async initJJB() {
    const jenkinsPort = "80";
    const jenkinsHost = this.chartValues.Master.HostName;
    const jenkinsUrlScheme = "http";

    await writeFileAsync(
      this.confPathJJB,
      ini.stringify({
        jenkins: {
          url: `${jenkinsUrlScheme}://${jenkinsHost}:${jenkinsPort}`,
          query_plugins_info: false
        },
        job_builder: {
          ignore_cache: true,
          keep_descriptions: false,
          recursive: true
        }
      })
    );
    await run("virtualenv", ["venv"]);
    await run("venv/bin/pip", ["install", "jenkins-job-builder==2.6.0"]);
  }
  async updateJobs() {
    await run("./venv/bin/jenkins-jobs", [
      "--conf",
      this.confPathJJB,
      "update",
      "./jenkins-jobs"
    ]);
  }

  async findBuildByQueueId(jobName, queueId) {
    const api = this.getAPI();
    console.log(`Searching for build`);
    let buildIdToScan = "lastBuild";
    let selectedBuildQueueId = null;
    let selectedBuild;
    while (selectedBuildQueueId !== queueId) {
      selectedBuild = await api.build.get(jobName, buildIdToScan);
      selectedBuildQueueId = selectedBuild.queueId;
      if (selectedBuild.previousBuild) {
        buildIdToScan = selectedBuild.previousBuild.number;
      }
    }
    console.log(`BuildId is: ${selectedBuild.id}`);
    return selectedBuild.id;
  }

  async waitForBuildCompletion(jobName, buildId, timeout) {
    const api = this.getAPI();

    console.log(`Waiting for build completion`);
    const timedOut = { value: false };
    const timeoutId = setTimeout(() => (timedOut.value = true), timeout * 1000);
    try {
      let build;
      do {
        build = await api.build.get(jobName, buildId);
        await sleep(5);
        process.stdout.write(".");
      } while (build.building && !timedOut.value);
      console.log();
      if (timedOut.value === true) {
        console.log(`Build is not completed in given time`);
        throw "timed out";
      }
      console.log(`Build result is ${build.result}`);
      if (!build.result === "SUCESS") {
        throw build.result;
      }
      return build;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async buildAndWaitForSuccess(jobName, timeout) {
    const api = this.getAPI();
    console.log(`Triggering build ${jobName}`);
    let queueId = await api.job.build(jobName);

    console.log(`Build is scheduled with queueId: ${queueId}`);
    console.log(`Waiting for build to be drained from queue`);
    while ((await api.queue.list()).find(item => item.id === queueId)) {
      await sleep(1);
      process.stdout.write(".");
    }
    console.log();

    const buildId = await this.findBuildByQueueId(jobName, queueId);

    return await this.waitForBuildCompletion(jobName, buildId, timeout);
  }

  async getBuildLog(jobName, buildId) {
    return await this.getAPI().build.log(jobName, buildId);
  }
}

module.exports = {
  Jenkins
};
