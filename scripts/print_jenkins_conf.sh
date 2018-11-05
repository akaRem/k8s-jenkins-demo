#!/bin/bash
JENKINS_IP="$(minikube ip)"
JENKINS_PORT="$(kubectl get --namespace default -o jsonpath="{.spec.ports[0].nodePort}" services jenkins-ci)"

echo "\
[jenkins]
url=http://$JENKINS_IP:$JENKINS_PORT
query_plugins_info=False

[job_builder]
ignore_cache=True
keep_descriptions=False
recursive=True"
