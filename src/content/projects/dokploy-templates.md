---
# SAMPLE PROJECT: a placeholder to replace with a real one.
title: Dokploy Templates
description: Ready-made templates for deploying common apps with Dokploy.
tags:
  - DevOps
  - Templates
year: 2025
link: https://github.com/brixdorf/dokploy-templates
order: 6
---
> **Sample project**
>
> This write-up is placeholder text for a sample project. Replace it with a real one.

I deploy everything with Dokploy, and I kept setting up the same apps from scratch. These templates are the setups I wish I had found on day one.

## The problem

Getting an app running is usually a few minutes of work. Getting it running properly takes an evening: storage that survives a restart, a database with a real password, a domain, backups.

I did that evening of work for every app, and then did it again on the next server.

## The approach

Each template is one file that describes an app the way I actually run it, with the boring parts already filled in. You pick one, set two or three values, and deploy.

Every template has a short note on top: what it is, what to change, and what will hurt if you skip it.

## The stack

- Docker Compose files, one per app
- Environment variables for anything secret
- A test that starts every template and checks that it answers

## What I learned

A template nobody tests rots quickly. Apps change their settings between versions, and a file that worked in March can fail in June. The test that starts each one caught three broken templates in its first week.

It also made me read the documentation of apps I had been running for years. I found a few surprises.
