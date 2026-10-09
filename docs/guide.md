# Guide

The manual for romitraj.dev: how to run it, where things live, and how to change them. If you are back after a long break, start here, then skim [decisions.md](decisions.md) for the reasons behind the choices.

## What you need

| Tool | Needed for | Notes |
|---|---|---|
| Node.js 24 (the current LTS line) | Everything | `package.json` asks for `24.x`. See "Node.js version" below. |
| Python, with `fonttools` and `brotli` | `npm run fonts` only | Install the two packages once: `python -m pip install -r scripts/requirements.txt` |
| Playwright's browsers | `npm run check` only | Install once: `npx playwright install chromium firefox webkit` |

First time on a new computer, in PowerShell:

```powershell
cd "D:\My Codes\Personal Website\romitraj.dev"
npm install
```

## Everyday commands

These five are the only commands you need. All of them work in Windows PowerShell.

| Command | What it does |
|---|---|
| `npm run dev` | Runs the site at http://localhost:8080 and reloads the browser whenever you save a file. Stop it with Ctrl+C. |
| `npm run build` | Builds the finished site into `_site/`. |
| `npm start` | Serves `_site/` the way the live server does, at http://localhost:3000. Run `npm run build` first. |
| `npm run fonts` | Converts the licensed fonts into small web fonts. Run it after changing `src/_data/fonts.json` or adding a font file. |
| `npm run check` | Builds, looks for broken links, and photographs every page in three browsers at two widths. Run it before every commit. |

## Where things live

```
src/
  _data/        Facts and lists: site.json (name, links, email), fonts.json (the fonts)
  _includes/    layouts/ (the page shell) and partials/ (reusable pieces)
  assets/css/   main.css (the list), tokens.css (every value), base.css, components/
  assets/js/    main.js (the entry point), motion.js (animation timings)
  content/      The pages. index.njk is the home page.
server/         index.js: the small server behind npm start
scripts/        fonts.py (npm run fonts), check.mjs (npm run check)
docs/           This guide and the decisions log
_site/          The built site. Made by the build, never edited by hand, never committed.
```

Every file starts with a comment saying what it does.

## How do I change...?

| I want to change | Open this file |
|---|---|
| My name, bio line, email, city, social links, blog address | `src/_data/site.json` |
| A color | `src/assets/css/tokens.css` |
| The colors of the gradient bar | `src/assets/css/tokens.css` (the four `--color-bar` lines) |
| Which fonts are used for what | `src/assets/css/tokens.css` (the `--font` lines) |
| Spacing, corner size, line thickness | `src/assets/css/tokens.css` |
| How fast a hover or the gradient bar moves | `src/assets/css/tokens.css` (the `--duration` lines) |
| How fast the tickers, scroll drift and page fade move | `src/assets/js/motion.js` |
| The list of font files, or which ones load first | `src/_data/fonts.json`, then run `npm run fonts` |
| The text on the home page | `src/content/index.njk` |
| The page title or description shown in browser tabs and search results | `src/_data/site.json`, or the top of the page's own file |
| The browser's toolbar color on phones | `src/_data/site.json` (`themeColor`). Keep it the same as `--color-ink` in `tokens.css`. |

This table grows as sections are built.

## Fonts

The site uses four licensed font families. Their files are not in this repository.

- The original files live in `../romitraj-private/fonts/source/`. Nothing ever edits them.
- `npm run fonts` reads the list in `src/_data/fonts.json`, keeps only Latin characters, and writes small WOFF2 files to `../romitraj-private/fonts/web/`.
- The page loads those files from a "font base" address, chosen automatically:
  - On a computer that has `../romitraj-private/fonts/web/`, the build copies the fonts into `_site/fonts/` and the pages load them from `/fonts/`. This covers `npm run dev`, `npm run build` with `npm start`, and `npm run check`.
  - Anywhere else, including the live server, the pages load them from the address in `site.json` (`fontsUrl`).
  - To force an address, set `FONT_BASE_URL` in `.env`.
- If a licensed font fails to load, the page falls back to the next font in its list in `tokens.css`. The site still builds and runs without the licensed fonts.

To add or swap a font: put the file in `../romitraj-private/fonts/source/`, add or edit its entry in `src/_data/fonts.json`, run `npm run fonts`, and reload.

## Checking before a commit

```powershell
npm run check
```

It prints one line per step and ends with `Check passed.` or a list of problems. The screenshots go to `../romitraj-private/screenshots/`, in the same `laptop-1440` and `phone-390` folders, split by browser, as the reference screenshots next door, so the two sets can be compared side by side. If that folder is not there, they go to `screenshots/` here, which git ignores.

Open a few of the pictures before committing. The same page should look the same in all three browsers.

## Secrets

Secret values (the Spotify keys, once that widget exists) live in a file named `.env`, which git ignores. `.env.example` shows the names with empty values. Copy it to `.env` and fill it in. Never commit `.env`.

## Node.js version

The live server uses the Node.js version named under `engines` in `package.json`. This project follows the newest LTS line (the long-term support releases Node.js recommends for real sites). That is 24 today.

A new LTS line arrives every October. Check https://nodejs.org/en/about/previous-releases, and once a newer line is listed as LTS, change `engines` in `package.json` here and in the font server's `package.json`, run `npm run check`, and commit.

If your computer has a different Node.js version than `engines` asks for, `npm install` prints an `EBADENGINE` warning. It is a warning, not an error.

## Maintenance routine

- **Every few months:** check the official sources for newer stable versions and run `npm outdated`. Update one package at a time, run `npm run check`, look at the site, commit. Record each version you move to in [decisions.md](decisions.md), with the date and where you checked.
  - npm packages: `npm view <package> version`
  - Python packages: https://pypi.org
  - Never move to a beta, alpha, RC, canary, nightly or `next` release. Before a new major version, read its upgrade guide first.
- **GitHub security alerts:** turn on Dependabot alerts in the repository's settings on GitHub, so GitHub emails you when a dependency has a security problem.
- **Node.js:** move to the new LTS line each October, as described above.
- **Yearly:** renew the domain, confirm the Spotify and weather widgets still work, and check the expiry date of the Cloudflare origin certificate.

## Still to come

These parts of the guide are written when the matching part of the site is built:

- Spotify setup for the now-playing widget.
- Deployment with Dokploy, step by step.
- Images: where the photos go and how the build converts them.
- The pages beyond the temporary home page.
