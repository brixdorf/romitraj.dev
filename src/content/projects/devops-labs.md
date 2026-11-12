---
title: DevOps Labs
description: A self-hosted practice platform with hands-on DevOps labs in a real Linux terminal.
tags:
  - DevOps
  - Containers
  - Self-hosted
year: 2026
link: https://github.com/brixdorf/devops-labs
order: 1
---

A place to practise DevOps on real machines instead of just reading about it. You pick a lab, get a terminal in your browser, do the task, and it tells you what you got right.

## What it is

DevOps Labs is a free practice platform that runs on your own computer. It has hands-on labs across many DevOps topics: Linux, Docker, Kubernetes, Terraform, CI and CD, GitOps and more.

Each lab gives you a task and a real Linux terminal in the browser. When you think you're done, you submit, and a checker looks at what you actually did and tells you what passed and what didn't. If you're stuck, there's a hint, an approach and the full solution.

## Why it exists

Reading about DevOps only gets you so far. You learn it by typing commands into a real machine and watching what happens. I wanted a place to do that for free, on my own computer, with something that checks the work and lets me start over as often as I like.

## How it works

Everything runs in Docker. When you launch a lab, the app starts it as its own isolated container through the Docker Engine API, and the terminal in your browser talks to it over WebSockets.

Some labs need more than one machine. Those get fresh helper services for the session: a Git server with a CI runner, an image registry, a small k3s Kubernetes cluster, or Prometheus and Grafana. When the session ends, all of it goes away, so every attempt starts clean.

Every tool version is pinned and every download is checked against its checksum, so a lab behaves the same every time it's built. A test suite rebuilds every image, runs browser tests, and passes each lab's reference solution through its own checker. If a checker can't pass its own solution, the lab is broken.

Built with: Node.js, Express.js, WebSockets, the Docker Engine API, xterm.js, Vite and Playwright.

## What I learned

Writing the task is the easy part. Writing a fair checker is the hard part: it has to accept every correct answer, not just the one I had in mind, and say clearly why a wrong one is wrong.

I also learned that "it works on my machine" isn't good enough when the machine is the product. Pinning versions and verifying downloads is what makes a lab the same for everyone.
