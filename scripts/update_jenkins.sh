#!/bin/bash

# shellcheck disable=SC1091
source ./venv/bin/activate
    # Render and apply all jobs from templates
    jenkins-jobs --conf ./jenkins-jobs/jenkins.conf update ./jenkins-jobs
deactivate
