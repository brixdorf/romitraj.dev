---
# SAMPLE PROJECT: a placeholder to replace with a real one.
title: Snip
description: A tiny URL shortener with click analytics.
tags:
  - Backend
  - Analytics
year: 2025
link: https://github.com/brixdorf/snip
order: 5
---
> **Sample project**
>
> This write-up is placeholder text for a sample project. Replace it with a real one.

A URL shortener is the "hello world" of back end projects. I built one anyway, and then kept going until it counted clicks.

## The problem

I wanted short links on my own domain, and I wanted to know whether anyone clicked them. I did not want to know who they were.

## The approach

A link is a short code and a long address. Asking for the code sends you to the address, and one row gets written: the code, the time, and the site you came from.

No cookies, no IP addresses, nothing that follows a person around. The numbers are still useful: which links get used, on which days, from where.

The codes are short on purpose. Six characters is enough for more links than I will ever make.

## The stack

- Node.js, with as few packages as I could manage
- SQLite, because one file is easy to back up
- A single page of charts drawn with plain SVG

## What I learned

Redirects are easy. Counting is not. Bots open every link they see, so my first week of numbers was mostly robots admiring my work.

Filtering them out taught me more about how the web really behaves than building the shortener did.
