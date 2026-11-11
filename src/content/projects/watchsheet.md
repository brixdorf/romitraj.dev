---
title: Watchsheet
description: A logbook for the football matches you watch, with stats for each season.
tags:
  - Full stack
  - Data sync
  - Football
year: 2026
link: https://watchsheet.romitraj.dev
order: 3
---

Watchsheet is a logbook for the football I watch. Tick off a match, rate it if you like, and over a season it adds up.

## What it is

A multi-user app where you log the matches you watch, rate them, and see stats for each season: watching streaks, your most-watched teams and more. Each account keeps its own log, and you can export all of it as CSV or JSON.

There are no passwords. You sign in with a one-time code sent to your email. There's also an admin screen for keeping an eye on things.

## Why it exists

I follow football across a lot of leagues and competitions, and I wanted a record of what I actually watched without keeping a spreadsheet.

## How it works

Fixtures and scores come from a football data API and are synced into a SQLite database. Everything you do in the app, from browsing to stats, is a query on that database, so nothing you click ever waits on the API.

The sync is built around a small free API tier. It counts every request before sending it, stops cleanly when the day's budget is used up, and picks up where it left off the next time. Teams and competitions people follow are refreshed first.

The sign-in codes go out by email through Resend.

Built with: React, Node.js, Express.js, SQLite, Vite and Resend.

## What I learned

A hard limit is a design input, not an error to handle at the end. Once the sync was built around the daily budget, running out of requests stopped being a problem and became a normal part of the day.

Passwordless sign-in turned out to be simpler for everyone: nothing for people to remember, and no passwords for me to look after.
