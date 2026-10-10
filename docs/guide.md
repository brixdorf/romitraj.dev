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
  _data/        Facts and words: site.json (name, banner line, tagline, links, email, city),
                headline.json (the headline), home.json (all other home page text),
                about.json (the About page), pages.json (small labels on the inner pages, and the
                resume note), navigation.json (the page links),
                icons.json (icon drawings), fonts.json,
                blog.js (fetches the latest blog posts during the build),
                and three files written by scripts: fontVersions.json, fallbackFonts.json, textWidths.json
  _includes/    layouts/ (base.njk is the page shell, page.njk adds the giant page name for an
                inner page, project.njk is one project's page)
                partials/ (one per section: banner, hero, ticker, letter, about, projects, writing,
                footer; page-row, page-header and crumb for the inner pages; plus fonts and icon)
  assets/css/   main.css (the list), tokens.css (every value), base.css, components/ (one file per piece)
  assets/js/    main.js (the entry point), motion.js (animation timings),
                animations.js (tickers and movement tied to scroll), widgets.js (local time, year)
  assets/fonts/ The free fallback fonts and their license files
  assets/icons/ The license of the icon set
  content/      The pages. index.njk is the home page, about.njk the About page, resume.njk the
                resume note, projects.njk the list of projects. projects/ holds one Markdown
                file per project (its facts on top, its write-up below), plus
                projects.11tydata.js, the settings those files share.
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
| The page links and their descriptions (hero and footer) | `src/_data/navigation.json` |
| The intro letter, the about text, section headings, button labels, the footer sign-off | `src/_data/home.json` |
| A project's name, one-line description, tags, year, link or write-up | Its file in `src/content/projects/` (the six there now are samples) |
| The order of the projects | `order` at the top of each file in `src/content/projects/` |
| The text on the About page | `src/_data/about.json` |
| The resume note | `src/_data/pages.json` (`resume`) |
| The giant name at the top of an inner page | The top of that page's file in `src/content/` (`heading`, or `title` if there is no `heading`) |
| The line beside the version tag on inner pages | `src/_data/site.json` (`tagline`) |
| Small labels on inner pages ("Go home", "You are here", "Read more", "Contents") | `src/_data/pages.json` |
| How many blog posts the home page shows | `src/_data/home.json` (`writing.count`) |
| The links under "Elsewhere" (about card and footer) | `src/_data/site.json` (`elsewhere`) |
| The version tag (footer, and the small row on inner pages) | `src/_data/site.json` (`version`) |
| An icon's drawing, or a new icon | `src/_data/icons.json` |
| Where and how far things move as you scroll | `src/assets/js/motion.js` (`scroll`) |
| The city, country or coordinates in the status ticker | `src/_data/site.json` |
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

## The home page sections

The home page is a stack of sections, listed in order in `src/content/index.njk`. Each has its own file in `src/_includes/partials/` and its own stylesheet in `src/assets/css/components/`.

| Section | What it is | Its words |
|---|---|---|
| Hero | Headline, ticker, page links, picture frame | `headline.json`, `home.json`, `navigation.json` |
| Letter | A short signed note on a dark block | `home.json` (`letter`) |
| About | Sliding heading, quote ticker, bio, card of links | `home.json` (`about`), `site.json` (`elsewhere`) |
| Projects | One row per project on a dark block | The files in `src/content/projects/`, `home.json` (`projects`) |
| Writing | The latest blog posts as cards | The blog's own feed, `home.json` (`writing`) |
| Footer | Site map, links, email, copyright, sign-off (on every page) | `navigation.json`, `site.json`, `home.json` (`footer`) |

Things to know:

- **Formatting inside the words.** Some texts in `home.json` use small tags: `<i>` for the italic serif asides, `<del>` for a struck-out word, `<ins>` for the word that replaces it, `<br>` for a line break and `<a href="...">` for a link. `{email}` is replaced by the email address in `site.json`.
- **Apostrophes in serif text.** The letter, the about heading, project names and post titles are set in Louize, which has only the curly apostrophe (`’`). Blog titles are converted for you. In `home.json`, and in a project's `title`, type the curly one.
- **Projects.** Each file in `src/content/projects/` becomes a row on the home page, a card on the Projects page and a page of its own. The row's name opens near its middle on hover; where it opens is worked out from the name. See "Adding or changing a project" below.
- **Blog posts are fetched when the site is built**, not when someone visits. A new post appears on the home page after the next build (on the live site: after the next deploy). If the blog cannot be reached during a build, the section shows one sentence and a link instead, and the build still succeeds. While `npm run dev` is running, the feed is kept for an hour in `.cache/`.
- **Movement tied to scroll** (the sliding about heading, the bars beside the giant headings, the project rows) runs on tablets and laptops. It is off on phones and for visitors who asked their system for less motion; there, everything sits in its resting place.
- **Project rows start somewhere new on every page load**, so the section never looks quite the same twice. `npm run check` uses fixed starting places instead, so its screenshots match from one run to the next.

## The inner pages

Every page except the home page shares three pieces:

- **The small row under the banner** (`partials/page-row.njk`): the version tag, which links home and shows "Go home" beside it on hover; the tagline; and a link back ("Go home", or "All projects" on a project's page).
- **The giant page name** (`partials/page-header.njk`, used through `layouts/page.njk`), with a small empty picture frame until the images are built. A project's page has its own top instead: the project's name in very large serif letters.
- **"You are here"** at the top of the footer (`partials/crumb.njk`): the path from the home page down to the current page.

| Page | Its file | Its words |
|---|---|---|
| About | `src/content/about.njk` | `about.json` |
| Projects (the list) | `src/content/projects.njk` | The files in `src/content/projects/`, `pages.json` (`projects`) |
| One project | `src/_includes/layouts/project.njk` | The project's own file in `src/content/projects/` |
| Resume | `src/content/resume.njk` | `pages.json` (`resume`) |

### A page's settings

The top of a page's file (between the two `---` lines) sets:

| Setting | What it does |
|---|---|
| `title` | The name in the browser tab and in "You are here" |
| `heading` | The giant name on the page, if it should differ from the title |
| `headingSize: long` | Smaller giant letters, for a heading of several words |
| `frame: square` | A small square picture frame instead of a wide one |
| `ruled: true` | A line under the header, with more room below it |
| `description` | The sentence search engines show |

On phones the giant name shrinks until its longest word fits the screen. This is worked out from the number of letters in that word, so no measuring step is needed.

### The About page

All of its text is in `src/_data/about.json`: the portrait's caption, four numbered cards (`who`, `tinkering`, `contact`, `toolbox`) and the labels for the latest blog post. The cards number themselves. The card of links is the same list as on the home page (`site.json`, `elsewhere`). The piece about the latest blog post comes from the blog's feed and is left out if the feed could not be read. The picture frames are empty until the images are built.

The text there now is placeholder text. `<a href="...">` and `{email}` work as in `home.json`.

### Adding or changing a project

A project is one Markdown file in `src/content/projects/`. The file's name is the project's address: `snip.md` becomes `/projects/snip/`. The home page, the Projects page and the project's own page are all built from that one file.

The file has two parts. Between the two `---` lines at the top are the project's facts. Below them is the write-up.

```markdown
---
title: Snip
description: A tiny URL shortener with click analytics.
tags:
  - Backend
  - Analytics
year: 2025
link: https://github.com/brixdorf/snip
order: 5
---
The write-up starts here.
```

| Fact | What it is | Where it shows |
|---|---|---|
| `title` | The project's name | Everywhere, and in the browser tab |
| `description` | One sentence | The Projects page, the top of the project's page, search engines |
| `tags` | A short list, one per line, each starting with two spaces, a hyphen and a space | The Projects page and the project's page |
| `year` | A year | The Projects page and the project's page |
| `link` | The address of the code | "GitHub" on the project's page |
| `order` | A number: 1 comes first | Decides the project's place in both lists |

- **To add a project:** copy an existing file, rename it, change the facts and the write-up. Give it the `order` number of the place it should take, and renumber the ones after it.
- **To remove a project:** delete its file.
- **To reorder:** change the `order` numbers. Two projects with the same number are sorted by name.
- All six facts are required. If one is missing, the build stops and names the file and the fact.
- If a title or description contains a colon followed by a space, or starts with a quote mark, wrap it in double quotes: `title: "Snip: the sequel"`.
- A line starting with `#` between the `---` lines is a note to yourself and is never shown. The samples use one to say they are samples.

Writing the write-up:

- `## A heading` starts a numbered section. The sections are listed under "Contents" at the top of the page, and each entry there jumps to its section.
- A list (`- item`) and a link (`[words](address)`) work as usual.
- A quote makes a grey note with a bar beside it. Bold words on its first line become its label:

  ```markdown
  > **Sample project**
  >
  > This write-up is placeholder text.
  ```

- Straight quotes and apostrophes are turned into curly ones for you, because the serif font has no straight apostrophe.
- **Do not type a slash** in the running text: the serif font has none, and `npm run check` would report a fallback font. Write "test and deploy", not "test/deploy". The tags and the description are in a different font and can contain anything; the `title` is in the serif too, so it follows the same rule.

The six projects there now are samples, each marked with a note at the top of its file and a "Sample project" note on its page.

### Widths on the inner pages

The inner pages follow the same three arrangements as the home page (phone, tablet, laptop), with two extra steps, as on the site this design is modeled on: the grids of cards on the About and project pages stay in two columns up to 999px, and the list of projects stays in two columns up to 1099px.

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

The photographs are taken with hover fades switched off and with fixed starting places for anything the site normally places at random, so the same page gives the same picture every time.

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
- Images: where the photos go and how the build converts them. Until then every picture frame is empty, and the about section on the home page has no illustration.
- The resume itself. Until `resume.pdf` exists, the Resume page is a short note.
- Page changes that fade instead of reloading.
