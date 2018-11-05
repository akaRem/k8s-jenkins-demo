#!/bin/bash

JENKINS_IP="$(minikube ip)"
JENKINS_PORT="$(kubectl get --namespace default -o jsonpath="{.spec.ports[0].nodePort}" services jenkins-ci)"
JOB_NAME="demo.pipeline.alpine-oraclejdk8"

# hit "build button" on Job page
curl "http://$JENKINS_IP:$JENKINS_PORT/job/${JOB_NAME}/build"
