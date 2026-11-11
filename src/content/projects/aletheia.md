---
title: Aletheia
description: Sends AI web agents through a website’s checkout to find its dark patterns.
tags:
  - Full stack
  - AI agents
  - Dark patterns
year: 2026
link: https://aletheia.romitraj.dev
order: 2
image: padlock
---

Aletheia goes through a website's checkout or sign-up the way a real customer would, stops before paying, and tells you which tricks it ran into.

## What it is

You describe a flow, like signing up for a plan on some site. Aletheia sends AI web agents through it, each in its own browser, and stops before any payment. Then it reports the dark patterns it found: drip pricing, hidden subscriptions, confirmshaming, pre-ticked consent and more.

Every finding comes with its proof: the exact quote, the step where it showed up, and a screenshot. I built it together with Abhijit P.

## Why it exists

Dark patterns are made so you don't notice them. A fee that only shows up on the last page, a box that was already ticked for you, a "No thanks" button worded to make you feel bad. One at a time they're easy to miss, and later they're hard to prove. I wanted something that walks the flow for you and keeps the receipts.

## How it works

The agents do the clicking. Deciding what counts as a dark pattern is the job of a rule-based judge, not the AI, and it only reports a finding it can back with a quote, a step and a screenshot.

For prices, it rebuilds the bill for each checkout from the pages it captured along the way. That's how it catches fees that are added late.

Runs wait in a queue, so it never asks the agent provider for more runs at once than it allows.

Built with: TypeScript, React, Hono, Bun, TinyFish Web Agents, Vitest and Playwright.

## What I learned

AI agents are good at getting through a messy website, but a judge has to give the same answer every time. Splitting the two, agents to walk and plain rules to judge, gave results I could test and trust.

I also learned that the proof matters more than the verdict. A finding without its quote and screenshot is just an opinion.
