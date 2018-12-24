#!/bin/bash
set -ex

curl -k -f https://gitlab.192.168.99.100.nip.io/oauth/token \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
            "grant_type"    : "password",
            "username"      : "root",
            "password"      : "'"$(cat tmp/vars/gl-password)"'"
         }' \
    | jq '.access_token' \
    | sed 's/"//g' \
    > "tmp/vars/gl-token"
