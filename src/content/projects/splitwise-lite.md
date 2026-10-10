---
# SAMPLE PROJECT: a placeholder to replace with a real one.
title: Splitwise-lite
description: A full-stack app for splitting rent and groceries with flatmates.
tags:
  - Full stack
  - Web app
year: 2026
link: https://github.com/brixdorf/splitwise-lite
order: 3
---
> **Sample project**
>
> This write-up is placeholder text for a sample project. Replace it with a real one.

Four flatmates, one fridge, and a spreadsheet nobody updated. I built a small app to replace the spreadsheet and most of the arguments.

## The problem

We split rent, groceries and the internet bill. The spreadsheet worked until someone sorted a column, and after that nobody trusted the totals.

The apps that already do this wanted accounts, friends lists and a subscription. We wanted a list and a number.

## The approach

You add an expense, say who paid and who it was for, and the app works out who owes whom. That is the whole product.

The one clever part is settling up. Instead of everyone paying everyone, it finds the smallest set of payments that clears every debt. With four people that is at most three transfers.

## The stack

- A React front end, because I wanted to learn it properly
- A Node.js API
- PostgreSQL, with every amount stored as whole paise
- Deployed on my own server

## What I learned

Never store money as a decimal number. My first version lost a few paise on every split, and my flatmates noticed before I did.

I also learned that the hard part of a shared app is not the code. It is getting four people to open it.
