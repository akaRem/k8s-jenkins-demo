#!/bin/bash
set -e

virtualenv venv
# shellcheck disable=SC1091
source ./venv/bin/activate
    pip install jenkins-job-builder==2.6.0
deactivate
