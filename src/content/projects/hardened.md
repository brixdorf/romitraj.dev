---
# SAMPLE PROJECT: a placeholder to replace with a real one.
title: Hardened
description: Scripts that apply a server hardening checklist in one run.
tags:
  - Security
  - Shell
year: 2026
link: https://github.com/brixdorf/hardened
order: 2
image: padlock
---
> **Sample project**
>
> This write-up is placeholder text for a sample project. Replace it with a real one.

Every new server I rent gets the same twenty steps before I trust it. Hardened is those twenty steps in one command.

## The problem

A fresh server is on the internet for about a minute before strangers start guessing its password. I knew the checklist: no password logins, a firewall, automatic updates, a user that isn't root.

I also knew I skipped half of it whenever I was in a hurry, which was every time.

## The approach

One script per step, and one script that runs them in order. Each step checks whether it is already done before changing anything, so running the whole thing twice is safe.

At the end it prints a short report: what it changed, what was already fine, and what it refused to touch. I read that report more carefully than I ever read the checklist.

## The stack

- Plain shell scripts, so there is nothing to install first
- A firewall that only lets in what I name
- Key-only logins over SSH
- Automatic security updates

## What I learned

A script that changes how you log in can lock you out of the machine you are logged in to. I now test every change in a second session before closing the first.

Writing down the reason for each step also helped. Half of my old checklist turned out to be habits I had copied from a forum in 2019.
