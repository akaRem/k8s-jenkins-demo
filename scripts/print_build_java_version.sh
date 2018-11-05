#!/bin/bash

JENKINS_IP="$(minikube ip)"
JENKINS_PORT="$(kubectl get --namespace default -o jsonpath="{.spec.ports[0].nodePort}" services jenkins-ci)"
JOB_NAME="demo.pipeline.alpine-oraclejdk8"

# Get console output and grep for 3 lines right after
# `docker run alpine-oraclejdk8` — these lines contain JDK version
curl -s "http://${JENKINS_IP}:${JENKINS_PORT}/job/${JOB_NAME}/lastBuild/consoleText" \
    | grep 'docker run alpine-oraclejdk8' -A 3 \
    | tail -n 3
