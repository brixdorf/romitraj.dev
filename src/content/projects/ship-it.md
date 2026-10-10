---
# SAMPLE PROJECT: a placeholder to replace with a real one.
title: Ship It
description: A CI/CD pipeline that tests, builds and deploys a container on every push.
tags:
  - DevOps
  - CI/CD
year: 2026
link: https://github.com/brixdorf/ship-it
order: 4
---
> **Sample project**
>
> This write-up is placeholder text for a sample project. Replace it with a real one.

Push code, get a running app. Ship It is the pipeline I copy into every new project so I never deploy by hand again.

## The problem

My old way of deploying was a list of commands in a notes app. It worked as long as I ran them in the right order, on the right machine, without getting distracted.

I got distracted.

## The approach

Every push runs the same four steps: test, build, publish, deploy. If one fails, the rest don't run, and the old version stays up.

The build makes one container image and tags it with the commit it came from. Deploying means telling the server to run that exact image. Rolling back means telling it to run the previous one.

## The stack

- GitHub Actions for the pipeline
- Docker for the image
- A container registry to keep every build
- A small health check that decides whether a deploy counts as done

## What I learned

The pipeline should be the only way to deploy. The first time I fixed something by hand on the server, the next push quietly undid it.

Fast feedback matters more than I expected too. Once the whole run took under three minutes, I stopped batching changes and started shipping small ones.
