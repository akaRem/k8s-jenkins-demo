#!/bin/bash
set -e

JENKINS_ADDRESS="jenkins.$(minikube ip).nip.io"
JOB_NAME="test-connectivity-to-gl"

# hit "build button" on Job page
echo "Triggering $JOB_NAME"
curl "http://$JENKINS_ADDRESS/job/${JOB_NAME}/build"

# wait build to be popped from queue
# TODO: curl for queue contents
sleep 10

WAIT_TIMEOUT=600

SECONDS=0
# Wait for line `[Pipeline] End of Pipeline` or die with timeout
echo "Waiting for completion"
until curl -s -f "http://$JENKINS_ADDRESS/job/${JOB_NAME}/lastBuild/consoleText" \
        | grep -q '\[Pipeline\] End of Pipeline'
do
    if [ $SECONDS -gt $WAIT_TIMEOUT ]; then
        printf "\\nError: Timed out.\\n"
        exit 1
    fi
    printf '.'
    sleep 5
done

printf "\\nFinished.\\n"

# Get console output and grep for `Finished: <status>` status
curl -s "http://$JENKINS_ADDRESS/job/${JOB_NAME}/lastBuild/consoleText" \
    | grep 'Finished:' \
    | cut -d ' ' -f 2
