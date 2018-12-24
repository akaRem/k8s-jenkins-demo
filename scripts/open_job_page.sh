#!/bin/bash
set -ex

JENKINS_IP="$(minikube ip)"
JENKINS_PORT="$(kubectl get --namespace default -o jsonpath="{.spec.ports[0].nodePort}" services jenkins-ci)"
JOB_NAME="demo.pipeline.alpine-oraclejdk8"

# Open page in browser
open "http://${JENKINS_IP}:${JENKINS_PORT}/job/${JOB_NAME}"
