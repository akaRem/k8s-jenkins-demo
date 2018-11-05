#!/bin/bash

JENKINS_IP="$(minikube ip)"
JENKINS_PORT="$(kubectl get --namespace default -o jsonpath="{.spec.ports[0].nodePort}" services jenkins-ci)"
JOB_NAME="demo.pipeline.alpine-oraclejdk8"

# Get console output and grep for `Finished: <status>` status
curl -s "http://${JENKINS_IP}:${JENKINS_PORT}/job/${JOB_NAME}/lastBuild/consoleText" \
    | grep 'Finished:' \
    | cut -d ' ' -f 2
