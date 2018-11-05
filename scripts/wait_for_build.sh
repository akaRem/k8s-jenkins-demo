#!/bin/bash

JENKINS_IP="$(minikube ip)"
JENKINS_PORT="$(kubectl get --namespace default -o jsonpath="{.spec.ports[0].nodePort}" services jenkins-ci)"
JOB_NAME="demo.pipeline.alpine-oraclejdk8"
WAIT_TIMEOUT=600

SECONDS=0
# Wait for line `[Pipeline] End of Pipeline` or die with timeout
until curl -s "http://${JENKINS_IP}:${JENKINS_PORT}/job/${JOB_NAME}/lastBuild/consoleText" \
        | grep -q '\[Pipeline\] End of Pipeline'
do
    if [ $SECONDS -gt $WAIT_TIMEOUT ]; then
        printf "\\nError: Timed out.\\n"
        exit 1
    fi
    printf '.'
    sleep 1
done

printf "\\nFinished.\\n"
exit 0
