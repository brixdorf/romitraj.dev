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

These are the only commands you need. All of them work in Windows PowerShell.

| Command | What it does |
|---|---|
| `npm run dev` | Runs the site at http://localhost:8080 and reloads the browser whenever you save a file. Stop it with Ctrl+C. |
| `npm run build` | Builds the finished site into `_site/`. |
| `npm start` | Serves `_site/` the way the live server does, at http://localhost:3000. Run `npm run build` first. |
| `npm run fonts` | Converts the licensed fonts into small web fonts. Run it after changing `src/_data/fonts.json` or adding a font file. |
| `npm run fonts:fallback` | Downloads and prepares the free fallback fonts. Already done; only needed again if the font list changes. |
| `npm run fit` | Measures the hero's big lines so each one fills its space. Run it after changing the headline's words. |
| `npm run check` | Builds, looks for broken links, photographs every page in three browsers at three widths, and confirms the hero's big lines fit. Run it before every commit. |

## Where things live

```
src/
  _data/        Facts and words: site.json (name, banner line, links, email, city), headline.json (the headline),
                home.json (other home page text), navigation.json (the page links), fonts.json,
                and three files written by scripts: fontVersions.json, fallbackFonts.json, textWidths.json
  _includes/    layouts/ (base.njk is the page shell, notice.njk is a short "coming soon" page)
                partials/ (banner, hero, ticker, fonts)
  assets/css/   main.css (the list), tokens.css (every value), base.css, components/ (one file per piece)
  assets/js/    main.js (the entry point), motion.js (animation timings),
                animations.js (the tickers), widgets.js (the local time)
  assets/fonts/ The free fallback fonts and their license files
  content/      The pages. index.njk is the home page; about.md, projects.md and resume.njk
                are short notices until the real pages are written.
server/         index.js: the small server behind npm start
scripts/        fonts.py (npm run fonts), fallback_fonts.py (npm run fonts:fallback),
                fit.mjs (npm run fit), check.mjs (npm run check), lib/site.mjs (shared helpers)
docs/           This guide and the decisions log
_site/          The built site. Made by the build, never edited by hand, never committed.
```

Every file starts with a comment saying what it does.

## How do I change...?

| I want to change | Open this file |
|---|---|
| My name, email, city, social links, blog address | `src/_data/site.json` |
| The bio line in the top banner | `src/_data/site.json` (`banner`) |
| The headline's words (opening serif line, giant line, italic words, serif word) | `src/_data/headline.json`, then run `npm run fit` |
| The introduction sentence, the scroll note, the note inside the picture frame | `src/_data/home.json` |
| The page links and their descriptions | `src/_data/navigation.json` |
| The city, country or coordinates in the status ticker | `src/_data/site.json` |
| The text on a page that is not written yet | That page's file in `src/content/` |
| How fast the ticker moves, and how much it slows under the pointer | `src/assets/js/motion.js` |
| A color | `src/assets/css/tokens.css` |
| The colors of the gradient bar | `src/assets/css/tokens.css` (the four `--color-bar` lines) |
| Which fonts are used for what | `src/assets/css/tokens.css` (the `--font` lines) |
| Spacing, corner size, line thickness | `src/assets/css/tokens.css` |
| How fast a hover or the gradient bar moves | `src/assets/css/tokens.css` (the `--duration` lines) |
| How fast the tickers, scroll drift and page fade move | `src/assets/js/motion.js` |
| The list of font files, or which ones load first | `src/_data/fonts.json`, then run `npm run fonts` |
| Which free font stands in for a licensed one | `src/_data/fonts.json` (`fallback`) and the recipes at the top of `scripts/fallback_fonts.py`, then run `npm run fonts:fallback` |
| Which sections the home page has, and their order | `src/content/index.njk` |
| The page title or description shown in browser tabs and search results | `src/_data/site.json`, or the top of the page's own file |
| The browser's toolbar color on phones | `src/_data/site.json` (`themeColor`). Keep it the same as `--color-ink` in `tokens.css`. |

This table grows as sections are built.

## The headline

The sentence at the top of the home page is set in five pieces, all in `src/_data/headline.json`:

| Piece | Where it shows | Font |
|---|---|---|
| `full` | Nowhere on screen. It is the page's main heading for screen readers and search engines. | none |
| `opening` (`plain` and `italic`) | The serif line across the full width, above the giant line | Louize Display |
| `giant` | The giant black line. Each entry is one line on tablets; on laptops they run together, and on phones they run down the left edge. | Manuka |
| `flourish` | The outlined italic words that overlap the giant line | Louize Display Italic |
| `serif` | The very large serif word | Louize Display |

Read top to bottom, the opening line, giant line, italic words and serif word should make the whole sentence.

The small grey line in the top banner is separate. It is the bio line, it shows on every page, and it lives in `src/_data/site.json` (`banner`).

Three things to know when changing it:

- **Run `npm run fit` afterwards.** The opening line, the giant line and the serif word are sized to fill their space exactly. `npm run fit` measures the new words and saves the numbers to `src/_data/textWidths.json`. If you forget, `npm run check` tells you.
- **Shorter lines are bigger.** A line always fills the same width, so fewer letters means larger letters and a taller hero.
- **Manuka has few characters.** Letters, digits, comma, hyphen and full stop only. An apostrophe in the giant line works anyway: the site draws it with Manuka's comma, raised into place. Other punctuation would be borrowed from the fallback font, and `npm run check` would report it.

The layout has three arrangements, chosen by window width: phone (under 600px), tablet (600 to 899px) and laptop (900px and wider).

## Fonts

The site uses four licensed font families. Their files are not in this repository.

### The licensed fonts

- The original files live in `../romitraj-private/fonts/source/`. Nothing ever edits them.
- `npm run fonts` reads the list in `src/_data/fonts.json`, keeps only Latin characters, and writes small WOFF2 files to `../romitraj-private/fonts/web/`. Running it twice gives identical files.
- It also prints which everyday characters each font cannot draw. Read that list: two of the families have small character sets (see "Missing characters" below).
- It writes a short fingerprint of every file to `src/_data/fontVersions.json`. The pages add it to each font's address (`manuka-black.woff2?v=e281303c`). When a font changes, its fingerprint changes, so browsers fetch the new file instead of a saved old one. Do not edit this file by hand; commit it whenever it changes.

After `npm run fonts` changes anything, commit both repositories: the fonts in the private one, `fontVersions.json` in this one.

### Where the pages load them from

The address is chosen automatically:

- On a computer that has `../romitraj-private/fonts/web/`, the build copies the fonts into `_site/fonts/` and the pages load them from `/fonts/`. This covers `npm run dev`, `npm run build` with `npm start`, and `npm run check`.
- Anywhere else, including the live server, the pages load them from the font site named in `site.json` (`fontsUrl`).
- To force an address, set `FONT_BASE_URL` in `.env`.

### How they appear on screen

- The four fonts used at the top of the page are preloaded: the browser starts fetching them straight away. Which ones is set by `"preload": true` in `fonts.json`.
- While a licensed font is still arriving, its text stays hidden instead of showing in a different font first. With preloading this is normally too short to notice. On a very slow connection the text appears a moment after the lines and boxes around it.
- If a font has not arrived after about 3 seconds, or fails, the fallback font is shown.

### The fallback fonts

Free fonts under the SIL Open Font License, kept in `src/assets/fonts/` with their license files: Anton stands in for Manuka, Cormorant for Louize and Louize Display, Inter Tight for Neue Montreal.

- They are a safety net. A browser only fetches one when a licensed font fails to load or lacks a character. `npm run check` reports a problem if that ever happens.
- Each is scaled to take up the same space as the font it stands in for, so the page keeps its shape. The numbers are in `src/_data/fallbackFonts.json`, written by `npm run fonts:fallback`. Do not edit that file by hand.
- To see the safety net yourself: add the line `FONT_BASE_URL=http://localhost:9/` to `.env`, run `npm run dev`, and look at the page. Remove the line afterwards.

### Missing characters

The licensed files as supplied do not contain every character:

- **Manuka** has letters, digits, comma, hyphen and full stop only. No apostrophe, quotes, question mark, exclamation mark, colon or ampersand.
- **Louize and Louize Display** have no straight apostrophe (`'`) and no slash. They do have the curly apostrophe (`’`), curly double quotes, the en dash and the ellipsis. In text set in these fonts, type the curly apostrophe.
- **Neue Montreal** is complete.

A character a font lacks is drawn from its fallback font, which looks slightly different. `npm run fonts` lists the gaps every time it runs.

### The font site

The live site loads the licensed fonts from fonts.romitraj.dev, a small server in the private repository (`font-server.js`). It sends only the `.woff2` files in `fonts/web/`, tells browsers that only https://romitraj.dev may use them, and turns away requests that come from other websites. Setting it up in Dokploy is covered with the rest of deployment.

### Adding or swapping a font

Put the file in `../romitraj-private/fonts/source/`, add or edit its entry in `src/_data/fonts.json` (including which fallback file stands in for it), run `npm run fonts`, then `npm run fonts:fallback`, and reload.

## Checking before a commit

```powershell
npm run check
```

It prints one line per step and ends with `Check passed.` or a list of problems. Besides broken links it reports: a file that fails to load, a script error, a page wider than its window, a fallback font being used, and hero lines that no longer fit.

The screenshots go to `../romitraj-private/screenshots/`, in `laptop-1440`, `tablet-768` and `phone-390` folders, split by browser. The laptop and phone folders match the reference screenshots next door, so the two sets can be compared side by side. If that folder is not there, they go to `screenshots/` here, which git ignores.

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

- Spotify setup for the now-playing widget, and the weather. Both will appear in the status ticker.
- Deployment with Dokploy, step by step.
- Images: where the photos go and how the build converts them. Until then the hero's picture frame is empty.
- The rest of the home page (letter, about, projects, writing, footer) and the real About, Projects and Resume pages.
- The small row with the site label, home link and tagline that sits under the banner on every page except the home page.
