#!/bin/bash

echo
echo 'ALL-IN-ONE JENKINS DEMO'
echo

echo '-- Destroying prev. cluster installation'
minikube config set WantReportErrorPrompt false
minikube stop
minikube delete
rm -rf ~/.minikube
rm -rf ~/.kube
minikube start --memory 4000 --cpus 4 --kubernetes-version v1.12.0

echo '-- Displaying cluster details'
minikube status
kubectl config current-context
kubectl cluster-info

echo '-- Installing helm'
helm init
sleep 30  # dummy wait for tiller
helm repo update

echo "-- Displaying cluster items"
kubectl get all --all-namespaces

echo '-- Installing Jenkins'
helm install --debug --name jenkins-ci --wait --timeout 900 -f values/jenkins.yaml stable/jenkins

echo '-- Preparing JJB'
./scripts/print_jenkins_conf.sh > ./jenkins-jobs/jenkins.conf
./scripts/install_jjb.sh

echo '-- Deploying jobs'
./scripts/update_jenkins.sh

echo '-- Triggering build'
./scripts/trigger_build.sh

echo '-- Waiting for build completion'
./scripts/wait_for_build.sh

echo '-- Displaying build results'
./scripts/print_build_status.sh
./scripts/print_build_java_version.sh

echo '-- Opening browser window'
./scripts/open_job_page.sh
