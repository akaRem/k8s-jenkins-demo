#!/bin/bash
set -ex
curl -k -f \
    -X POST \
    -H "Authorization: Bearer $(cat tmp/vars/gl-token)" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "ssh-key",
        "key": "'"$(cat tmp/vars/id_rsa.pub)"'"
        }' \
    "https://gitlab.192.168.99.100.nip.io/api/v4/user/keys/"
