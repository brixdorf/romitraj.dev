---
title: My Homelab
description: A cloud server that runs this website, my blog and the rest of my apps.
tags:
  - Self-hosting
  - Servers
  - Networking
year: 2026 to now
order: 4
image: hammers
---

One cloud server that runs most of what I put on the internet, this website included.

## What it is

A cloud server at OVHcloud that runs my own apps: this website, my blog with Remark42 for comments, Watchsheet, a habit tracker, and Rybbit for counting visits without cookies.

## Why it exists

I'd rather run my own things than rent a separate service for each one. And the best way I know to learn how servers work is to be the one responsible for one.

## How it works

Cloudflare sits in front of everything for DNS and proxying. On the server, Traefik routes each request to the right app, and Dokploy builds and runs every app as a Docker container straight from its Git repository.

The server runs Ubuntu. SSH only accepts keys, a ufw firewall keeps everything else closed, and fail2ban blocks addresses that keep failing to log in.

Built with: OVHcloud, Ubuntu Server, Docker, Dokploy, Traefik and Cloudflare.

## What I learned

Setting an app up takes an afternoon. Keeping it running is the real job.

Every layer in front of an app can surprise you. Cloudflare's bot protection once blocked my own server from reading my own blog's feed, until I added a rule to let it through.
