const yargs = require("yargs");

const { mkdirpAsync, writeFileAsync, readFileAsync } = require("./src/helpers");

const workspace = require("./src/workspace");
const { Minikube } = require("./src/minikube");
const { GitLab } = require("./src/gitlab");
const { Jenkins } = require("./src/jenkins");

const cleanupWorkspace = async () => {
  console.log("-- Removing prev. data items");
  return await workspace.cleanup();
};

const destroyCluster = async () => {
  console.log("-- Destroying prev. cluster installation");
  return await new Minikube().destroy();
};

const deployCluster = async () => {
  console.log("-- Deploying minikube cluster");
  return await new Minikube().create();
};

const showClusterDetails = async () => {
  console.log("-- Displaying cluster details");
  return await new Minikube().printInfo();
};

const installHelm = async () => {
  console.log("-- Installing helm");
  return await new Minikube().initHelm();
};

const showClusterItems = async () => {
  console.log("-- Displaying cluster items");
  return await new Minikube().printItems();
};

const installGitLab = async () => {
  console.log("-- Installing Gitlab");
  return await new GitLab().create();
};

const installJenkins = async () => {
  console.log("-- Installing Jenkins");
  return await new Jenkins().create();
};

const configureGitLabSecrets = async () => {
  console.log("-- Configuring GitLab secrets");
  const gitLab = new GitLab();
  await mkdirpAsync("tmp/vars/");
  const password = await gitLab.getInitialRootPassword();
  await writeFileAsync("tmp/vars/gl-password", password);
  const token = await gitLab.getOAuthToken();
  await writeFileAsync("tmp/vars/gl-token", token);
};

const configureJenkinsSecrets = async () => {
  console.log("-- Configuring Jenkins secrets");

  const password = await readFileAsync("./tmp/vars/gl-password");
  await new Jenkins().addPasswordCredentials({
    // TODO: get vars from yaml
    credentialsId: "gl-root-login-passwd",
    description: "Login and password for GitLab",
    username: "root",
    password
  });
};

const prepareJJB = async () => {
  console.log("-- Preparing JJB");
  await new Jenkins().initJJB();
};

const deployJobs = async () => {
  console.log("-- Deploying jobs");
  await new Jenkins().updateJobs();
};

const checkConnectivity = async () => {
  console.log("-- Check connectivity");
  const jenkins = new Jenkins();
  await jenkins.buildAndWaitForSuccess("test-connectivity-to-gl", 300);
};

const importRepo = async () => {
  console.log("-- Import repo");
  const jenkins = new Jenkins();
  await jenkins.buildAndWaitForSuccess(
    "demo.import.docker-alpine-oraclejdk8",
    600
  );
};

const runBuild = async () => {
  console.log("-- Run build");
  const jenkins = new Jenkins();
  const build = await jenkins.buildAndWaitForSuccess(
    "demo.pipeline.alpine-oraclejdk8",
    600
  );

  const buildLog = await jenkins.getBuildLog(
    "demo.pipeline.alpine-oraclejdk8",
    build.id
  );

  const javaVersion = buildLog
    .split("\n")
    .find(_ => _.startsWith("java version"));
  console.log(javaVersion);
  const javaRuntime = buildLog
    .split("\n")
    .find(_ => _.startsWith("Java(TM) SE Runtime Environment"));
  console.log(javaRuntime);
  const javaHorSpot = buildLog
    .split("\n")
    .find(_ => _.startsWith("Java HotSpot(TM)"));
  console.log(javaHorSpot);
};

if (require.main === module) {
  yargs
    .usage("$0 <cmd> [args]")
    .showHelpOnFail(true)
    .demandCommand()
    .command(
      "clean",
      "Clean workspace data and items",
      () => {},
      async () => {
        await cleanupWorkspace();
      }
    )
    .command("minikube", "Minikube ...", yargs => {
      yargs
        .showHelpOnFail(true)
        .demandCommand()
        .command(
          "destroy",
          "Completely destroy local Minikube cluster",
          () => {},
          async () => {
            await destroyCluster();
          }
        )
        .command(
          "deploy",
          "Deploy fresh Minikube cluster",
          () => {},
          async () => {
            await destroyCluster();
          }
        )
        .command(
          "info",
          "Display cluster information",
          () => {},
          async () => {
            await showClusterDetails();
          }
        )
        .command(
          "items",
          "Display cluster items",
          () => {},
          async () => {
            await showClusterItems();
          }
        );
    })

    .command("helm", "Helm ...", yargs => {
      yargs
        .showHelpOnFail(true)
        .demandCommand()
        .command(
          "deploy",
          "Deploy Helm",
          () => {},
          async () => {
            await installHelm();
          }
        );
    })
    .command("gitlab", "GitLab ...", yargs => {
      yargs
        .showHelpOnFail(true)
        .demandCommand()
        .command(
          "deploy",
          "Deploy GitLab into minikube",
          () => {},
          async () => {
            await installGitLab();
          }
        )
        .command(
          "get-secrets",
          "Extract GitLab secrets from cluster",
          () => {},
          async () => {
            await configureGitLabSecrets();
          }
        );
    })
    .command(
      "jenkins",
      "Jenkins ...",
      yargs => {
        yargs
          .showHelpOnFail(true)
          .demandCommand()
          .command(
            "deploy",
            "Deploy Jenkins into minikube",
            () => {},
            async () => {
              await installJenkins();
            }
          )
          .command(
            "add-secrets",
            "Add secrets to Jenkins (users, accounts, ...)",
            () => {},
            async () => {
              await configureJenkinsSecrets();
            }
          );
      },
      async () => {
        await installJenkins();
      }
    )
    .command("jjb", "Jenkins Job Builder ...", yargs => {
      yargs
        .showHelpOnFail(true)
        .demandCommand()
        .command(
          "install",
          "Install JJB and its dependencies locally",
          () => {},
          async () => {
            await prepareJJB();
          }
        )
        .command(
          "apply",
          "Apply JJB to Jenkins (configure jobs and views)",
          () => {},
          async () => {
            await deployJobs();
          }
        );
    })
    .command("example", "Examples ...", yargs => {
      yargs
        .showHelpOnFail(true)
        .demandCommand()

        .command(
          "demo",
          "Demo: Run full sample deployment",
          () => {},
          async () => {
            await cleanupWorkspace();
            await destroyCluster();
            await deployCluster();
            await showClusterDetails();
            await installHelm();
            await showClusterItems();
            await Promise.all([installGitLab(), installJenkins()]);
            await configureGitLabSecrets();
            await configureJenkinsSecrets();
            await prepareJJB();
            await deployJobs();
            await checkConnectivity();
            await importRepo();
            await runBuild();
          }
        )
        .command("run-job", "Run and wait for sample builds ...", yargs => {
          yargs
            .showHelpOnFail(true)
            .demandCommand()
            .command(
              "connectivity",
              "Check jenkins -> gitlab connectivity",
              () => {},
              async () => {
                await checkConnectivity();
              }
            )
            .command(
              "import-repo",
              "Upstream sourcecode import",
              () => {},
              async () => {
                await importRepo();
              }
            )
            .command(
              "build-java",
              "Build oracle-java docker image",
              () => {},
              async () => {
                await runBuild();
              }
            );
        });
    })
    .help().argv;
}
