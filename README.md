# k8s jenkins demo

This is sample project to demonstrate Jenkins running inside k8s which can
allocate slaves dynamically and build docker images.

The idea is following:

1. Deploy k8s cluster with minikube
2. Install Helm into cluster
3. Deploy Jenkins using Helm
4. Configure jobs using JJB
5. Build Oracle Java 8 Docker Image, where:
   - slaves are allocated automatically using k8s jenkins plugin
   - image is build using DinD technology
   - image is produced as small as possible and as reliable as possible
6. Entire procedure may be executed via single bash scenario

The demo expect you to have some experience with k8s and also with jenkins and
Jenkins Job Builder.
But since there are a lot of options to deploy cluster, and Minikube deployment
may be something new and specific, this demo covers it with additional details which may be obvious for experienced users.

This document is not the only documentation you have. Most of the files are
commented quite well.

## TL;DR

To run demo (this script will destroy your local minikube cluster if it exists)

```bash
./demo.sh
```

This will make all the steps described in this document. You may examine scripts
and start demo in background while reading documentation.

Suggested option is to read document and perform mentioned actions and use
`demo.sh` only if something will go wrong.

## Supported platforms

This demo have been tested on macOS 10.14 Mojave.
It should be applicable for linux platforms but wasn't tested.

On macOS problems may occur in case of bad combination of required software
and utilities and/or in case if some required utilities are missing in this
document.

Please feel free to file a bug if you faced such problems.

## Prequisites

Check official documentation to install the following software:

- minikube
- kubernetes-cli
- kubernetes-helm
- VirtualBox
- virtualenv
- bash
- jq

You may use homebrew, dnf, apt or other package management systems to install
requirements.

## Project structure

The project layout is following:

```txt
./
    jenkins-jobs/           JJB folder
        templates/*         job templates used for demo
        project.yaml        JJB project definition
        jenkins.conf        [autogenerated] JJB config file
    scripts/*               helper scripts
    values/jenkins.yaml     Helm custom values
    venv/*                  [autogenerated]  python virtual environment
    demo.sh                 All-in-one script to run entire demo
    README.md               This file
```

Some resource are autogenerated (and excluded from git index).

## Bootstrapping

### Clean up old data

To completely remove current cluster (if you have any) the following snippet
may be used.

**WARNING: This will completele remove any data and VMs from current minikube
cluster.**

```bash
minikube stop
minikube delete
rm -rf ~/.minikube
rm -rf ~/.kube
```

### Create new cluster

At the time this demo was recorded v1.12.0 is the latest k8s release.

```bash
minikube start --memory 8192 --cpus 4 --kubernetes-version v1.12.0
```

It will take some time to spin the cluster, expected output is something like

```txt
Starting local Kubernetes v1.12.0 cluster...
Starting VM...
Downloading Minikube ISO
 170.78 MB / 170.78 MB [============================================] 100.00% 0s
Getting VM IP address...
Moving files into cluster...
Downloading kubelet v1.12.0
Downloading kubeadm v1.12.0
Finished Downloading kubeadm v1.12.0
Finished Downloading kubelet v1.12.0
Setting up certs...
Connecting to cluster...
Setting up kubeconfig...
Starting cluster components...
Kubectl is now configured to use the cluster.
Loading cached images from config file.
```

We need to add some addons for cluster (which will be used for gitlab deployment)

```bash
minikube addons enable ingress
minikube addons enable kube-dns
```

To check that cluster is running successfully, `status` command may be used:

```bash
minikube status
```

Expected output

```txt
minikube: Running
cluster: Running
kubectl: Correctly Configured: pointing to minikube-vm at 192.168.99.100
```

(VM IP may be different)

### Configure kubectl

Make sure that your kubectl points to minikube cluster

```bash
kubectl config current-context
```

The expected output is

```txt
minikube
```

To list all contexts and set required (minikube) use the following commands:

```bash
kubectl config get-contexts
kubectl config use-context minikube
```

The final verification that we are using freshly deployed minikube cluster is

```bash
kubectl cluster-info
```

The output should include URLs which contain IP that we saw in last step of
create new cluster section. (In this example it's "192.168.99.100").

```txt
Kubernetes master is running at https://192.168.99.100:8443
CoreDNS is running at https://192.168.99.100:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.
```

### Configere k8s helm

Once we have k8s running and we are sure that current context is minikube
cluster, we may install helm, simply

```bash
helm init
```

This will configure some rc files and install Tiller in our cluster.

By default, Tiller is deployed with an insecure 'allow unauthenticated users'
policy. Which is absolutely fine for our purposes.

### Cluster verification

At this step cluster is bootstrapped and ready for experiments.

To list all what we have at this point, simply

```bash
kubectl get all --all-namespaces
```

We may expect to see something like this

```txt
NAMESPACE     NAME                                        READY   STATUS    RESTARTS   AGE
kube-system   pod/coredns-576cbf47c7-n5fcf                1/1     Running   0          25m
kube-system   pod/etcd-minikube                           1/1     Running   0          24m
kube-system   pod/kube-addon-manager-minikube             1/1     Running   0          24m
kube-system   pod/kube-apiserver-minikube                 1/1     Running   0          24m
kube-system   pod/kube-controller-manager-minikube        1/1     Running   0          24m
kube-system   pod/kube-proxy-4s2sv                        1/1     Running   0          25m
kube-system   pod/kube-scheduler-minikube                 1/1     Running   0          24m
kube-system   pod/kubernetes-dashboard-5bb6f7c8c6-5pf92   1/1     Running   0          25m
kube-system   pod/storage-provisioner                     1/1     Running   0          25m
kube-system   pod/tiller-deploy-845cffcd48-c45qj          1/1     Running   0          4m16s

NAMESPACE     NAME                           TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)         AGE
default       service/kubernetes             ClusterIP   10.96.0.1      <none>        443/TCP         25m
kube-system   service/kube-dns               ClusterIP   10.96.0.10     <none>        53/UDP,53/TCP   25m
kube-system   service/kubernetes-dashboard   ClusterIP   10.96.89.93    <none>        80/TCP          25m
kube-system   service/tiller-deploy          ClusterIP   10.101.17.75   <none>        44134/TCP       4m16s

NAMESPACE     NAME                        DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
kube-system   daemonset.apps/kube-proxy   1         1         1       1            1           <none>          25m

NAMESPACE     NAME                                   DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
kube-system   deployment.apps/coredns                1         1         1            1           25m
kube-system   deployment.apps/kubernetes-dashboard   1         1         1            1           25m
kube-system   deployment.apps/tiller-deploy          1         1         1            1           4m16s

NAMESPACE     NAME                                              DESIRED   CURRENT   READY   AGE
kube-system   replicaset.apps/coredns-576cbf47c7                1         1         1       25m
kube-system   replicaset.apps/kubernetes-dashboard-5bb6f7c8c6   1         1         1       25m
kube-system   replicaset.apps/tiller-deploy-845cffcd48          1         1         1       4m16s
```

Or launch dashboard with

```bash
minikube dashboard
```

Which will open fancy webapp in default browser.

## Installing services

Make sure that helm repositories are up-to-date with:

```bash
helm repo update
```

Helm does not provide much details, so we enable `--debug` flag to see if
something will go wrong.

There are also some problems with timeout (default 300) for deployments which
is handled by adding respective `--timeout` value

Deployment process may be also observed from k8s dashboard.

Deployment procedure is not verbose, but once it completed, a lot of useful
information related to created resources is printed to console.

### Installing GitLab

We will install gitlab via helm using gitlab/gitlab chart from charts.gitlab.io.

```bash
helm repo add gitlab https://charts.gitlab.io/
helm repo update
helm install --debug --name gitlab -f values/gitlab.yaml gitlab/gitlab
```

You may add `--wait --timeout 600` in order to wait for installation completed.

values/gitlab.yaml represents minimal recommended configuration for local development.
This conffig expects that:

    - minikube is running on 192.168.99.100
    - nip.io is reachable (see gitlab docs)

To open gitlab in browser use [http://gitlab.192.168.99.100.nip.io](http://gitlab.192.168.99.100.nip.io) (and accept self-signet cert)

To login use `root` for user and password that may be discovered by command

```bash
kubectl get secret gitlab-gitlab-initial-root-password -ojsonpath={.data.password} | base64 --decode ; echo
```

### Installing jenkins

We will install jenkins via helm using stable/jenkins chart.

```bash
helm install --debug --name jenkins-ci -f values/jenkins.yaml stable/jenkins
```

You may add `--wait --timeout 600` in order to wait for installation completed.

To open Jenkins in browser visit [http://jenkins.192.168.99.100.nip.io](jenkins.192.168.99.100.nip.io)

### Uploading jenkins jobs

Jenkins content (e.g jobs and views) will be managed via Jenkins Jobs Builder —
this utility is very helpful in management high amount of similar jobs.
This approach is overkill for this demo, but it's very useful anyways.

#### Prepare JJB config

First of all we need to configure conf file since exact jenkins url may differ
from installation to installation.

Jenkins IP and port inside cluster is available with commands:

```bash
kubectl get nodes --namespace default -o jsonpath="{.items[0].status.addresses[0].address}"
kubectl get --namespace default -o jsonpath="{.spec.ports[0].nodePort}" services jenkins-ci
```

Which will print out our single-node ip and single-node jenkins port exposed in
cluster. But since we are not part of the cluster, for us jenkins is available
on jenkins.192.168.99.100.nip.io

Conf file may be filled manually, but this repo contains useful bash script
which will print-out our config.

```bash
./scripts/print_jenkins_conf.sh > ./jenkins-jobs/jenkins.conf
```

#### Installing JJB

We need to init python virtualenv and install JJB:

```bash
virtualenv venv
source ./venv/bin/activate
pip install jenkins-job-builder==2.6.0
```

or just use prepared script

```bash
./scripts/install_jjb.sh
```

#### Updating jenkins

After conf file is created, we may easily update jenkins content using
`jenkins-jobs --conf ./jenkins-jobs/jenkins.conf update ./jenkins-jobs` or

```bash
./scripts/update_jenkins.sh
```

This bash script is again, nothing special, just runs one command

## Check config

Checking services

During jenkins update stage we also added job to test connectivity, which will
test that GL is visible for jenkins.
To run it

```bash
./scripts/run_job_check_connectivity.sh
```

## Running sample builds

First of all we need to import repository from upstream

```bash
./scripts/run_job_import_project.sh
```

Once we have everything configured and ready, we may open Jenkins web page and
start the build manually and wait for results or use couple of prepared scripts:

To trigger build, wait for its completion and check output:

```bash
./scripts/run_job_build_docker.sh
```

To look at Jenkins page related to the job:

```bash
./scripts/open_job_page.sh
```

## Conclusions

After passing through this demo we have:

- k8s cluster in minikube which was successfully deployed with Helm to manage
  deployments
- Basic GitLAb instance
- Basic Jenkins instance with k8s plugin which is able to communicate with
  GitLab
- easily extendable job templates for building docker images
- sucessfull build of Oracle JDK 8 container

## TODO

There are some problems with GitLab:

- clone via ssh does not work
- It's impossible to turn off ssl for unknown reasons. It's possibly fixed in
  GitLab helm chart as of 1.4+
- GitLab initial password for root does not work
- inline credentials are used instead of credential manager
