#!/bin/bash
set -ex

mkdir -p tmp/vars/
ssh-keygen -b 2048 -t rsa -q -N "" -f tmp/vars/id_rsa
