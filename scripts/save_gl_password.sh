#!/bin/bash
set -ex
mkdir -p tmp/vars/
kubectl get secret 'gitlab-gitlab-initial-root-password' '-ojsonpath={.data.password}' \
    | base64 --decode \
    > 'tmp/vars/gl-password'
