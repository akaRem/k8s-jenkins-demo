#!/bin/bash

echo
echo 'ALL-IN-ONE JENKINS DEMO'
echo

echo '-- Removing prev. data items'
rm -rf tmp
rm -rf venv
rm -rf jenkins-jobs/jenkins.conf

echo '-- Destroying prev. cluster installation'
minikube config set WantReportErrorPrompt false
minikube stop
minikube delete
rm -rf ~/.minikube
rm -rf ~/.kube

echo '-- Deploying minikube cluster'
minikube start --memory 8192 --cpus 4 --kubernetes-version v1.12.0
minikube addons enable ingress
minikube addons enable kube-dns

echo '-- Displaying cluster details'
minikube status
kubectl config current-context
kubectl cluster-info

echo '-- Installing helm'
helm init
echo "Waiting for Tiller"
WAIT_TIMEOUT=30
SECONDS=0
until helm version
do
    if [ $SECONDS -gt $WAIT_TIMEOUT ]; then
        printf "\\nError: Timed out.\\n"
        exit 1
    fi
    printf '.'
    sleep 1
done
helm repo update

echo "-- Displaying cluster items"
kubectl get all --all-namespaces

echo '-- Installing Gitlab'
helm repo add gitlab "https://charts.gitlab.io/"
helm repo update
helm install --debug --name gitlab -f values/gitlab.yaml gitlab/gitlab

echo '-- Installing Jenkins'
helm install --debug --name jenkins-ci -f values/jenkins.yaml stable/jenkins

echo '-- Waiting for services'
WAIT_TIMEOUT=900
SECONDS=0
# FIXME: Helm status checks should be used here
until curl -s -k -f "https://gitlab.192.168.99.100.nip.io/users/sign_in" && curl -s -f "http://jenkins.192.168.99.100.nip.io"
do
    if [ $SECONDS -gt $WAIT_TIMEOUT ]; then
        printf "\\nError: Timed out. Some of services did not respond in %s seconds.\\n" ${WAIT_TIMEOUT}
        exit 1
    fi
    printf '.'
    sleep 10
done

echo '-- Configuring GitLab secrets'
./scripts/save_gl_password.sh
./scripts/save_gl_token.sh
# TODO: Keys don't work because of some problems with ssh access
# ./scripts/make_gl_keys.sh
# ./scripts/upload_key.sh

echo '-- Configuring Jenkins secrets'
./scripts/save_gl_root_creds_in_jenkins.sh

echo '-- Preparing JJB'
./scripts/print_jenkins_conf.sh > ./jenkins-jobs/jenkins.conf
./scripts/install_jjb.sh

echo '-- Deploying jobs'
./scripts/update_jenkins.sh

echo '-- Check connectivity'
./scripts/run_job_check_connectivity.sh

echo '-- Import repo'
./scripts/run_job_import_project.sh

echo '-- Run build'
./scripts/run_job_build_docker.sh
