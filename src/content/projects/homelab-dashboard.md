---
# SAMPLE PROJECT: a placeholder to replace with a real one.
title: Homelab Dashboard
description: A self-hosted status page for every service on a home server.
tags:
  - Self-hosting
  - Monitoring
year: 2026
link: https://github.com/brixdorf/homelab-dashboard
order: 1
---
> **Sample project**
>
> This write-up is placeholder text for a sample project. Replace it with a real one.

I run more services at home than one person needs. This is the page that tells me which of them are still alive.

It started as a browser tab I kept open and turned into a small app that checks everything every minute, so I don't have to.

## The problem

My home server runs a media server, a password manager, a few bots and whatever I installed last weekend and forgot about. When something died, I found out days later, usually from a family member.

I wanted one page that answers a single question: is everything up?

## The approach

Each service gets a tiny health check: a web address to ask, and what a good answer looks like. A small worker asks all of them once a minute and writes the results to a database.

The page itself is plain HTML that reads those results. Green means fine. Red means I have plans for the evening.

I kept the checks boring on purpose. A dashboard that goes down more often than the things it watches is not a dashboard.

## The stack

- Node.js for the worker and the page
- SQLite for the history of every check
- Docker to run it next to everything else
- A phone notification when something stays red for five minutes

## What I learned

Monitoring is mostly deciding what "broken" means. A slow answer, a wrong answer and no answer are three different problems, and my first version treated them as one.

I also learned that the dashboard needs a check of its own. I found that out the obvious way.
