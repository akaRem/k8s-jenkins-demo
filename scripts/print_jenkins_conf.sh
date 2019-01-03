#!/bin/bash
set -ex

JENKINS_ADDRESS="jenkins.192.168.99.100.nip.io/"

echo "\
[jenkins]
url=http://$JENKINS_ADDRESS
query_plugins_info=False

[job_builder]
ignore_cache=True
keep_descriptions=False
recursive=True"
