#!/bin/bash

GIT_REMOTES=`git remote | grep dokku-sdk-docs`

if [[ -z "$GIT_REMOTES" ]]
then
  git remote add dokku-sdk-docs dokku@demos.aldeacomputer.com:sdk-docs
fi

REPO_CHANGES=`git status -s`
echo $REPO_CHANGES
if [[ ! -z $REPO_CHANGES ]]
then
  echo "please commit all the changes before deploy"
  exit 1
fi

CURRENT_BRANCH=`git rev-parse --abbrev-ref HEAD`

if [[ $CURRENT_BRANCH != 'main' ]]
then
  echo "only main branch can be deployed"
  exit 1
fi

git push dokku-sdk-docs main
