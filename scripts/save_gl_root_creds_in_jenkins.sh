#!/bin/bash
set -ex

curl -f \
-H "$(curl -f --user admin:"$(cat ./tmp/vars/jenkins-admin-password)" 'http://jenkins.192.168.99.100.nip.io/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,":",//crumb)')" \
-d 'script=
import com.cloudbees.plugins.credentials.impl.*;
import com.cloudbees.plugins.credentials.*;
import com.cloudbees.plugins.credentials.domains.*;
import org.jenkinsci.plugins.plaincredentials.*;
import org.jenkinsci.plugins.plaincredentials.impl.*;
import com.cloudbees.plugins.credentials.common.*;
import com.cloudbees.jenkins.plugins.sshcredentials.impl.*;

import hudson.util.Secret

SystemCredentialsProvider.getInstance().getStore().getCredentials(Domain.global()).each {
    println it.toString()
}

def credentials = new UsernamePasswordCredentialsImpl(
    CredentialsScope.GLOBAL, // Scope
    "gl-root-login-passwd", // id
    "Login and password for GitLab", // description
    "root", // username
    "'"$(cat ./tmp/vars/gl-password)"'" // password
);
SystemCredentialsProvider.getInstance().getStore().addCredentials(Domain.global(), credentials)
' \
http://jenkins.192.168.99.100.nip.io/scriptText 2>&1
