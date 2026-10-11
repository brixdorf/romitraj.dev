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
| `npm run spotify` | Gets a fresh Spotify refresh token and saves it in `.env`. Needed once, and again every 6 months. See "The live widgets" below. |
| `npm run fonts` | Converts the licensed fonts into small web fonts. Run it after changing `src/_data/fonts.json` or adding a font file. |
| `npm run fonts:fallback` | Downloads and prepares the free fallback fonts. Already done; only needed again if the font list changes. |
| `npm run fit` | Measures the hero's big lines so each one fills its space. Run it after changing the headline's words. |
| `npm run speed` | Measures how quickly the home page shows its main content, with and without the headline's entrance. See "The headline's entrance" below. Like the check, it uses stand-ins for the weather and music services. |
| `npm run check` | Builds, looks for broken links, photographs every page in three browsers at three widths, and tests the hero's big lines, the page changes, the headline's entrance and the pictures. Run it before every commit. |

## Where things live

```
src/
  _data/        Facts and words: site.json (name, banner line, tagline, links, email, city),
                headline.json (the headline), home.json (all other home page text),
                about.json (the About page), pages.json (small labels on the inner pages, and the
                resume note), navigation.json (the page links),
                icons.json (icon drawings), fonts.json,
                weather.json (the words for the sky in the ticker),
                images.json (every picture: its source file, alt text and look),
                image-credits.json (who took each photo),
                blog.js (fetches the latest blog posts during the build),
                and three files written by scripts: fontVersions.json, fallbackFonts.json, textWidths.json
  _includes/    layouts/ (base.njk is the page shell, page.njk adds the giant page name for an
                inner page, project.njk is one project's page)
                partials/ (one per section: banner, hero, ticker, letter, about, projects, writing,
                footer; page-row, page-header and crumb for the inner pages; plus fonts and icon)
  assets/css/   main.css (the list), tokens.css (every value), base.css, components/ (one file per piece)
  assets/js/    main.js (the entry point), motion.js (animation timings),
                animations.js (tickers and movement tied to scroll), widgets.js (local time, year),
                intro.js (the headline's entrance when the home page opens; built into a small
                script of its own), shapes.js (shapes shared by the animations),
                transitions.js (page changes without a reload), scroll-memory.js (remembers
                how far each page was scrolled), page-changes.js (what moves
                during each kind of page change), split.js (cuts text into letters or lines)
  assets/fonts/ The free fallback fonts and their license files
  assets/icons/ The license of the icon set
  assets/img/source/  The photos and drawings the pictures are made from
  content/      The pages. index.njk is the home page, about.njk the About page, credits.njk the
                Credits page, resume.njk the
                resume note, projects.njk the list of projects. projects/ holds one Markdown
                file per project (its facts on top, its write-up below), plus
                projects.11tydata.js, the settings those files share.
server/         index.js: the small server behind npm start. api.js answers the widgets' two
                questions, weather.js asks Open-Meteo, spotify.js asks Spotify, cache.js
                keeps their answers for a while
scripts/        fonts.py (npm run fonts), fallback_fonts.py (npm run fonts:fallback),
                fit.mjs (npm run fit), check.mjs (npm run check), lib/site.mjs (shared helpers),
                images.mjs (turns the photos and drawings into the site's pictures, during
                every build), lib/paint.mjs (paints the texture behind the hero picture),
                lib/pictures.mjs (the check's tests of the pictures),
                lib/analytics.mjs (the check's test of the visitor counter),
                spotify.mjs (npm run spotify), lib/widgets.mjs (the check's tests of the
                widgets), lib/pretend.mjs (stand-ins for Open-Meteo and Spotify during the check),
                lib/letters.mjs, lib/walk.mjs and lib/entrance.mjs (the check's tests of the
                letters, the page changes and the headline's entrance), speed.mjs (npm run speed)
docs/           This guide and the decisions log
_site/          The built site. Made by the build, never edited by hand, never committed.
```

Every file starts with a comment saying what it does.

## How do I change...?

| I want to change | Open this file |
|---|---|
| My name, email, city, social links, blog address | `src/_data/site.json` |
| The words on the Credits page | `src/_data/pages.json` (`credits`) |
| A photographer's name, profile or what they are thanked for | `src/_data/image-credits.json` |
| The visitor counter's address or site number, or switching it off | `src/_data/site.json` (`analytics`) |
| The bio line in the top banner | `src/_data/site.json` (`banner`) |
| The headline's words (opening serif line, giant line, italic words, serif word) | `src/_data/headline.json`, then run `npm run fit` |
| The introduction sentence, the scroll note | `src/_data/home.json` |
| The ticker's small words, and how the weather is worded | `src/_data/home.json` (`ticker`) |
| The words for the sky ("partly cloudy") | `src/_data/weather.json` |
| The city whose weather and time are shown | `src/_data/site.json` (`city`, `latitude`, `longitude`, `timeZone`) |
| A picture: which photo or drawing it uses, its alt text, how it is cut and how dark it comes out | `src/_data/images.json` (see "Pictures" below) |
| Which picture a project shows | `image` at the top of the project's file |
| Which picture sits beside a page's giant name | `picture` at the top of the page's file |
| The page links and their descriptions (hero and footer) | `src/_data/navigation.json` |
| The intro letter, the about text, section headings, button labels, the footer sign-off | `src/_data/home.json` |
| A project's name, one-line description, tags, year, link or write-up | Its file in `src/content/projects/` (the six there now are samples) |
| The order of the projects | `order` at the top of each file in `src/content/projects/` |
| The text on the About page | `src/_data/about.json` |
| The resume note | `src/_data/pages.json` (`resume`) |
| The page for a missing address ("Lost at sea") | Its giant name: `src/content/404.njk` (`title`). Its other words: `src/_data/pages.json` (`lost`) |
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
| The color of the ring around whatever has keyboard focus | `src/assets/css/tokens.css` (`--color-focus` on paper, `--color-focus-on-ink` on the dark blocks) |
| How fast the tickers and scroll drift move | `src/assets/js/motion.js` |
| How a page change moves: how long, how far, in what order | `src/assets/js/motion.js` (`pageChange`) |
| How the headline slides in when the home page opens | `src/assets/js/motion.js` (`intro`, and the letter pace above it) |
| The words screen readers hear on a link that opens a new tab | `src/_data/site.json` (`newTabNote`) |
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
| Hero | Headline, ticker (weather, place, local time, what is playing), page links, the framed picture | `headline.json`, `home.json`, `navigation.json`, `images.json` (`hero`) |
| Letter | A short signed note on a dark block | `home.json` (`letter`) |
| About | Sliding heading, quote ticker, bio, card of links, a large drawing behind them | `home.json` (`about`), `site.json` (`elsewhere`), `images.json` (`diver`) |
| Projects | One row per project on a dark block | The files in `src/content/projects/`, `home.json` (`projects`) |
| Writing | The latest blog posts as cards | The blog's own feed, `home.json` (`writing`) |
| Shore | A band of stippled sea that sinks into the footer's dark (`shore.css`) | `images.json` (`swells`) |
| Footer | Site map, links, email, copyright, sign-off, and a compass half off the edge (on every page) | `navigation.json`, `site.json`, `home.json` (`footer`), `images.json` (`compass`) |

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
- **The giant page name** (`partials/page-header.njk`, used through `layouts/page.njk`), with a small framed picture beside it. A project's page has its own top instead: the project's name in very large serif letters.
- **"You are here"** at the top of the footer (`partials/crumb.njk`): the path from the home page down to the current page.

| Page | Its file | Its words |
|---|---|---|
| About | `src/content/about.njk` | `about.json` |
| Projects (the list) | `src/content/projects.njk` | The files in `src/content/projects/`, `pages.json` (`projects`) |
| One project | `src/_includes/layouts/project.njk` | The project's own file in `src/content/projects/` |
| Resume | `src/content/resume.njk` | `pages.json` (`resume`) |
| Credits | `src/content/credits.njk` | `pages.json` (`credits`), `image-credits.json` |
| A missing address ("Lost at sea") | `src/content/404.njk` | `pages.json` (`lost`), `navigation.json` |

### A page's settings

The top of a page's file (between the two `---` lines) sets:

| Setting | What it does |
|---|---|
| `title` | The name in the browser tab and in "You are here" |
| `heading` | The giant name on the page, if it should differ from the title |
| `headingSize: long` | Smaller giant letters, for a heading of several words |
| `frame: square` | A small square picture frame instead of a wide one |
| `picture` | Which picture from `images.json` goes in that frame. Without it the frame is empty |
| `frameTone: ink` | A dark frame, for a picture drawn in the paper colour (the compass) |
| `ruled: true` | A line under the header, with more room below it |
| `description` | The sentence search engines show |
| `entrance: true` | The giant name slides in letter by letter when the page is opened (only the page for a missing address uses it) |

On phones the giant name shrinks until its longest word fits the screen. This is worked out from the number of letters in that word, so no measuring step is needed.

### The page for a missing address

An address that leads nowhere (a mistyped address, an old link from another site) gets the site's own page, "Lost at sea", in place of a bare error: the giant name with the compass beside it, a card numbered 404 with a few words and three ways back (Home, Projects, About), and a close-up of the diver.

- **The page** is `src/content/404.njk`. The build writes it as `404.html`. Its giant name is the `title` at the top of that file; its other words are in `src/_data/pages.json` (`lost`); the picture is `searcher` in `images.json` (a crop of the diver drawing). The words beside Projects and About are the ones from `navigation.json`.
- **To look at it**, run `npm run dev` and open any address that does not exist, such as http://localhost:8080/nothing-here/.
- **It is sent with the status 404.** A status is the number a server sends before a page: 200 means "here it is", 404 means "there is no such page". The visitor sees the page either way; the number is what tells browsers and search engines not to treat the address as a real one. The live server does this in `server/index.js`, and `npm run dev` does the same by itself.
  - A missing picture, stylesheet or other file gets a plain `Not found` with the same status, not the page.
- **Its name slides in when the page opens**, letter by letter, like the home page's headline. It is the second page with an entrance, and uses the same small script (`entrance: true` at the top of its file asks for it). A missing page is almost never reached by a page change, so without this its letters would never move.
- **A link inside the site that leads to a missing page** also ends here, without a reload: the old page leaves, and "Lost at sea" arrives with its letters and cards, at the missing address. `npm run check` looks for broken links before every commit, so this should only happen with an old link or a typing mistake.
- **"You are here" on this page** links its last step to wherever the page is being shown (`here: ""` at the top of the file), because it has no address of its own.
- `npm run check` tests all of it in three browsers: the status, the page, the entrance, the ways back, and a link that leads to a missing page.

### The About page

Its three framed pictures are named in `src/content/about.njk` (`bust`, `jellyfish`, `swells`) and described in `images.json`. All of its text is in `src/_data/about.json`: the portrait's caption, four numbered cards (`who`, `tinkering`, `contact`, `toolbox`) and the labels for the latest blog post. The cards number themselves. The card of links is the same list as on the home page (`site.json`, `elsewhere`). The piece about the latest blog post comes from the blog's feed and is left out if the feed could not be read. The picture frames are empty until the images are built.

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
image: padlock
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
| `image` | The name of a picture in `images.json`. Optional | The frame beside the project on the Projects page |

- **To add a project:** copy an existing file, rename it, change the facts and the write-up. Give it the `order` number of the place it should take, and renumber the ones after it.
- **To remove a project:** delete its file.
- **To reorder:** change the `order` numbers. Two projects with the same number are sorted by name.
- The first six facts are required. If one is missing, the build stops and names the file and the fact.
- `image` is optional. On wide windows the Projects page has a frame beside every second project (the 2nd, 4th, 6th and so on), and it shows that project's picture. A project in an odd place has no frame, so a picture given to it is not shown anywhere. A project in an even place without a picture gets an empty frame.
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

## Page changes

Following a link to another page of this site does not reload the browser. The banner, the small row under it and the footer stay where they are; only the content between them is swapped, with an animation. A library called Taxi.js fetches the next page and does the swap. Without scripts, links simply load pages the ordinary way.

When a page is first opened nothing animates, with two exceptions: on the home page the headline slides in (see "The headline's entrance" below), and so does the giant name of the page for a missing address. The animations in this section only play when moving from one page to another.

### Which change gets which animation

Every page has a kind, written as `pageKind`. There are three that matter:

| Kind | Which pages | Where it is set |
|---|---|---|
| `home` | The home page | The top of `src/content/index.njk` |
| `project` | Each project's page | Once for all of them, in `src/content/projects/projects.11tydata.js` |
| `page` (and `list`) | Pages with a giant name on top: About, Resume, and Projects (`list`) | `layouts/page.njk` gives every page that uses it `page`; `projects.njk` says `list` |

Each kind leaves in its own way and arrives in its own way:

| Kind | Leaving | Arriving |
|---|---|---|
| Home | The headline's letters slide out of their lines one after another, then the rest of the top of the page goes piece by piece while the sections below fade in turn. | The headline's letters slide into their lines, then the navigation, the ticker, the note, the picture frame and the introduction follow. Coming from the Projects page the letters arrive one after another; coming from anywhere else they arrive together and the rest follows sooner. |
| A page with a giant name | The name's letters slide up and out while the cards fade as one. On the way to a project the letters leave faster and the cards drift aside. | The name's letters rise into place, then the picture frame appears, then the cards one by one, in the order they are written in the page. |
| A project | The name, description, facts, list of sections and write-up drop away in turn. | The name sharpens letter by letter, the description comes in line by line, then the facts, the list of sections and the write-up. |

Two exceptions:

- **The home page straight to a project** (a project row on the home page) is a plain fade, 0.2 seconds out and 0.2 seconds in. That is what the site this design follows does.
- **Visitors who have asked their system for less motion** always get the plain fade.

On the site this design follows, About is a plain fade in every direction. Here About and Resume move like the Projects page: that was Romit's choice.

### Where it lives

| File | What it holds |
|---|---|
| `src/assets/js/motion.js` (`pageChange`) | Every number: how long each piece takes, when it starts, how far it moves, on what curve. Change timings here. |
| `src/assets/js/page-changes.js` | One function per page leaving or arriving. Each one moves the pieces named in the templates. |
| `src/assets/js/transitions.js` | Sets up Taxi.js, picks how each kind of page leaves and arrives (`howToLeave` and `howToArrive`), and keeps the small row, the "You are here" line and the page description up to date. |
| `src/assets/js/scroll-memory.js` | Remembers how far down each page was scrolled, for the back and forward buttons and for reloads. |
| `src/assets/js/split.js` | Cuts a heading into letters, or a paragraph into its lines, for the length of an animation, then puts the text back. |
| The templates | Pieces that move are marked `data-part="..."` (for example `data-part="title"` or `data-part="card"`). The swapped content is the `<main data-taxi-view>` in `layouts/base.njk`. |

### Things to know

- **A new page that uses `layouts/page.njk` is choreographed without any setup**: its name's letters slide in and out. To make its content arrive piece by piece, put `data-part="cards"` on the box that holds the pieces and `data-part="card"` on each piece, as `about.njk` does. Pieces arrive in the order they are written. A page that uses neither that layout nor a `pageKind` gets the plain fade.
- **Scroll position.** Following a link starts the new page at the top. The browser's back and forward buttons return to where you were on that page, and a reload stays where it was. (The site this design follows does the same on a reload but jumps to the top on back and forward; returning to the old place was Romit's choice.)
- **A link that must load the ordinary way** (a download such as the future `resume.pdf`) needs `data-taxi-ignore` on it: `<a href="/resume.pdf" data-taxi-ignore>`. Links to other websites, email links and links to a section of the same page are left alone automatically.
- **The small row and "You are here" are in every page's HTML**, hidden on the home page, so the script can show, hide and refill them. Edit them in `partials/page-row.njk` and `partials/crumb.njk` as before.
- **The tickers and the scroll movement are restarted** for each new page, and the local time is filled in again.
- **After a change, keyboard focus moves to the new page's heading** and screen readers are told the page's name.
- **`npm run check` clicks through the page changes** in all three browsers: home to Projects, into a project, back out twice, to About, and back with the browser's back button. It reports a reload, a wrong page, animation pieces left behind, or the small row out of step. It then scrolls two pages and checks that back, forward and a reload return to the same place.
- **Nothing may move once a page change has finished.** `npm run check` watches each arrival and fails if any letter, any heading's box or the picture frame beside a page name is somewhere else just after the animation than during it, or if the finished page is laid out differently from a fresh load of the same page.
- **No letter may be cut by its own window.** While a heading slides, each letter is shown through a window (a clip-path from `shapes.js`) that opens around the letter's box: a tenth of the box's height above and below it, and half a letter-height to each side. Ink that reaches further out than that is cut off for as long as the animation runs. Two things follow. Anything drawn out of line, like the raised apostrophe, must be moved *inside* a box that stays in the line (see `.apostrophe` in `base.css`), not by moving the box. And `npm run check` photographs every sliding heading with its letters' windows fully open and fails if any ink is missing, naming the letter and where it is.
- **Headings are cut into single letters only while they move.** Afterwards the page's HTML is exactly as it was built. While they are cut, no letter may shift: each word stays whole, on the line where it ends up. `npm run check` tests this for every heading on every page at thirteen window widths in all three browsers, so a new project name or page name is covered automatically. If it ever reports "letters that move", the fix is in `src/assets/js/split.js`.

## The headline's entrance

When the home page is opened directly or reloaded, the headline slides in: the letters of the three big lines one after another, and the outlined italic words from the left. It is the same movement as arriving from the Projects page. Other pages have no entrance.

How it works:

1. A few lines of script in the head of the home page (`layouts/base.njk`) mark the page with the class `intro` before anything is drawn. The styles (`hero.css`) hide the headline while that mark is there, so it never flashes in place first.
2. A small script written into the home page after its content (`src/assets/js/intro.js`, built separately from the main script) waits for the headline's fonts, cuts the lines into letters, starts them sliding and removes the mark.
3. The letters then stay in the page. They sit exactly where the plain text would, so nothing looks different. The plain text is put back at the visitor's first click, tap, key press or turn of the wheel, when the window is resized, or when a link is followed.

Step 3 is there for loading speed, as is the separate small script. Browsers and search engines judge loading speed by Largest Contentful Paint: the moment the biggest piece of content was first drawn. Swapping the letters for plain text when the entrance ends counts as a big new piece drawn late, and waiting for the main script delays the start on phones. The first build did both and made that figure 840ms worse on a slow phone; the current one costs well under a tenth of a second (the numbers are in [decisions.md](decisions.md)).

It cannot leave the headline hidden:

- Visitors who asked their system for less motion get no entrance. The page is never marked.
- Without scripts the page is never marked either.
- The mark is removed after three seconds whatever happens, and at once if anything in the small script fails or the fonts cannot be fetched.

`npm run check` tests all of this in three browsers, and that the letters end exactly where a still page has them.

To measure the cost again, run `npm run speed`. It loads the home page nine times with the entrance and nine times without, on a simulated slow phone and on a fast laptop, and prints both figures and the difference. Run it after changing the entrance, the fonts or the top of the home page.

To change the entrance's pace, edit `letterTime` and `letterGap` at the top of `src/assets/js/motion.js`. They are shared with the page changes, so both stay in step. To switch the entrance off, remove the script in the head of `layouts/base.njk`.

## The Credits page

`/credits/` thanks the people and services the site rests on, in four numbered cards like the About page's:

1. **Design:** the sentence saying the design is based on henry.codes by Henry Desroches, with a link, and that the code, words and pictures are your own.
2. **Photographs:** every Unsplash photographer by name, linked to their Unsplash profile, with what they photographed.
3. **Weather:** "Weather data by Open-Meteo.com", linked to open-meteo.com, and a link to its licence (CC BY 4.0).
4. **Visits:** one sentence saying that visits are counted with Rybbit on your own server, without cookies, with a link to rybbit.com.

Where things are:

- The words are in `src/_data/pages.json` (`credits`). The cards are set in the serif font: use the curly apostrophe and no slashes.
- **The photographers come from `src/_data/image-credits.json`**, the same file the build uses to make sure every photo is on record. Each photo there has `photographer`, `profile` (their page on Unsplash, `https://unsplash.com/@name`), `subject` (how the page names the photo: "the whale's tail") and `url` (the photo's own page). The build stops if one is missing. A photographer with two photos is listed once, with both subjects.
- **When you replace a placeholder photo with your own**, delete its entry from `image-credits.json` and the photographer drops off the page. When none are left, the Photographs card can be deleted from `src/content/credits.njk`.
- The page is linked from the footer on every page ("Credits", under "Me"). It is not in the hero's list: in `src/_data/navigation.json` it is marked `"footerOnly": true`.

## Visitor counting

The live site counts its visitors with Rybbit, running on your own server at analytics.romitraj.dev. Nothing is counted on your own computer.

How it works:

- A few lines of script at the top of every page (`src/_includes/layouts/base.njk`) look at the address the page is being viewed at. Only if it is `romitraj.dev` do they add Rybbit's tag to the page's head, exactly as Rybbit's install page gives it:

  ```html
  <script src="https://analytics.romitraj.dev/api/script.js" data-site-id="4662ddf4f073" defer></script>
  ```

- So the counter is never loaded by `npm run dev`, `npm start` on your computer, or `npm run check`: those view the site at `localhost`. No setting has to be remembered when deploying, and a copy of the site at any other address counts nothing either.
- The address and the site number are in `src/_data/site.json` (`analytics`). To switch counting off, delete that `analytics` entry.

Page changes:

- **The tag is added once per visit.** Moving between pages swaps only the content; the head stays, so the counter's script is never loaded a second time.
- **Each page change counts once.** Rybbit counts a view when the page opens and whenever the browser's history is written to or stepped through. A page change writes to the history exactly once. The site's own note-taking for scroll positions (`scroll-memory.js`) also writes there, without changing the address; it does so in a way the counter does not see, because otherwise opening a page could count twice.
- **A jump within a page counts nothing.** On a project's page, clicking a line under "Contents" jumps to that section and adds `#section` to the address, so the section can be linked to and the back button returns from it. The browser announces such a jump with two events, and Rybbit would count a view for each jump and for each step back or forward between jumps. The same script in the head that adds the counter stops those two events from travelling any further when the address still belongs to the page being shown. The address, the jump itself and the back and forward buttons work exactly as before; only the counter no longer hears about it.
- For that, the content slot of every page says which page it holds (`data-path` on `<main>` in `base.njk`). Do not remove it.

`npm run check` tests all of this in three browsers without ever contacting the real counter: that nothing is loaded on this computer, and, with the test browser told it is looking at the live address and a stand-in in place of Rybbit's script, that the tag is right, the script runs once, every page change (by link and by the back button) counts once, and a jump to a section, back out of it and forward into it again count nothing while the address still shows the section.

The server sends no rule that limits which scripts may run (no Content-Security-Policy header), so nothing had to be allowed for analytics.romitraj.dev. If such a rule is ever added, on the server or in Cloudflare, it must allow scripts from and connections to `https://analytics.romitraj.dev`, and the small scripts written into each page.

## Hover and keyboard focus

What each kind of link does under the pointer, and when it is reached with the Tab key. All of it was measured on the design reference, link by link, in three browsers.

| Link | Under the pointer | With keyboard focus |
|---|---|---|
| Navigation links in the hero | A line draws under the name (0.2s) and the description sharpens | The same, plus the ring |
| Links in the footer, the "Elsewhere" lists, "You are here", the small row under the banner, the bold link that ends a card, the code link on a project's page | A line draws under the words (0.2s) | The ring only |
| A link inside a sentence (about text, cards, a project's write-up) | Turns grey at once | The ring only |
| "View all projects", "Read the blog" | Underlined at once | Underlined, plus the ring |
| The links at the bottom of the About page's first card, and "Read the post" | Underlined at once | The ring only |
| A writing card on the home page | Its outline darkens at once and a line draws under "Read more" (0.2s) | The same, with the ring around "Read more" |
| A project card on the Projects page | Its outline darkens at once and a line draws under "Read more" (0.2s) | Its outline darkens, plus the ring around "Read more" |
| A project row on the home page | The name opens near its middle and its faint copies sharpen (0.15s) | The ring only |
| A line in a project's "Contents" | Turns grey while a line draws under it (0.2s) | The ring only |
| The track's title in the ticker | Nothing (it is already underlined) | The ring only |

- **The ring** is a 2px dashed outline, 2px away from the link: mid grey on paper, a lighter warm grey on the dark blocks (the letter, the projects section, the footer). The rule is in `base.css` and the two colors are in `tokens.css` (`--color-focus`, `--color-focus-on-ink`). A new dark block needs one line in that rule in `base.css`, or its ring will be the pale one.
- **Its shape is the reference's; its colors are stronger.** The reference's ring is too faint to see easily, so this one uses greys that differ from their background by a little more than 3 to 1, the least that accessibility guidelines ask of a focus ring. `npm run check` works the two contrasts out from `tokens.css` and fails if either falls below 3 to 1, so a new color cannot quietly make the ring too faint again.
- **Lines that break around the tails of letters.** In the "Elsewhere" lists, a project's "Contents" and the Projects page's "Read more", the drawn line does not run through the tail of a g, p or y: it stops beside it. The letters carry an outline in the color of whatever is behind them, painted under the letters themselves, and the line sits under that outline. At rest the outline cannot be seen. The color behind is `--behind`: paper unless a block says otherwise, and the footer sets it to ink. If such a link is ever placed on another background, set `--behind` there to that background's color.

## Links that leave the site

Every link to another website opens in a new tab. The build does this by itself (`eleventy.config.js`, "linksThatLeave"): it goes over each finished page and gives every such link `target="_blank"`, `rel="noopener noreferrer"` (the new tab cannot reach back into this one, and the other site is not told where the visitor came from) and the words "(opens in a new tab)", hidden from the eye but read out by screen readers.

- It covers links written in templates, in the data files and in Markdown. There is nothing to remember when adding a link.
- "Another website" means any address that is not on romitraj.dev itself, so the blog (blog.romitraj.dev) counts.
- Links within the site, links to a section of the same page and email links are left alone.
- The hidden words are in `src/_data/site.json` (`newTabNote`).

## Pictures

Every picture on the site is made by the build from a file in `src/assets/img/source/`: either a photo (`.jpg`) or a drawing (`.svg`). The build turns each one into a tiny two-tone picture made of square pixel blocks, in the ink colour on the paper colour, and writes it into `_site/assets/img/`. The finished pictures are never committed; only the sources are.

The list of pictures is `src/_data/images.json`. One entry looks like this:

```json
"padlock": {
  "source": "padlock.jpg",
  "alt": "An old padlock hanging from a chain, with its key.",
  "across": 110,
  "shape": "17:10",
  "crop": { "x": 0.42, "y": 0.55, "zoom": 1.25 },
  "black": 0.32,
  "white": 0.78,
  "sharpen": 1
}
```

| Setting | What it does |
|---|---|
| `source` | The file in `src/assets/img/source/`. Two pictures may use the same file with different crops |
| `alt` | The short description screen readers read aloud. Every picture needs either this or `decorative` |
| `decorative` | `true` for a picture that is only decoration (the compass, the sea band). Screen readers pass over it in silence. The build stops if a picture has neither `alt` nor this, or both |
| `across` | How many pixel blocks wide the picture is. Fewer blocks are chunkier. The hero has 152, which is about 3px a block at laptop size |
| `shape` | Cuts the source to this shape, written width:height. Without it the source's own shape is kept |
| `crop` | Which part to keep: `x` and `y` are the middle of the part (0 is the left or top edge, 1 the right or bottom) and `zoom` enlarges it |
| `black`, `white` | Greys darker than `black` become solid ink and greys lighter than `white` solid paper (0 is black, 1 is white). What lies between becomes a checkerboard. Bring the two closer together for harder contrast; raise both to make the picture darker |
| `sharpen` | Crisper edges before the picture is reduced to two tones. 0 to 2 |
| `pattern` | `checker` (the default), `fine` (more steps, for smooth gradients in a drawing) or `grain` (scattered dots like stippling, used by the sea band) |
| `tones` | `ink` (the default) draws the dark parts in ink. `paper` draws the light parts in the paper colour and leaves the rest clear, for a picture that sits on a dark background (the compass) |
| `ground` | `paper` (the default), `clear` (see-through where the picture is light), or `texture` (the hero only: see below) |

Where each picture is shown:

| Picture | Source | Where |
|---|---|---|
| `hero` | whale-tail.jpg | The frame in the hero |
| `diver` | diver.svg | Behind the home page's about section |
| `swells` | swells.svg | The band above the footer on the home page, and the wide frame on the About page |
| `compass` | compass.svg | The footer on every page, and beside the About page's name |
| `servers` | server-rack.jpg | Beside the Projects page's name |
| `padlock`, `ship`, `crane` | padlock.jpg, container-ship.jpg, harbour-cranes.jpg | The frames on the Projects page (Hardened, Ship It, Dokploy Templates) |
| `bust`, `jellyfish` | marble-bust.jpg, diver.svg | The About page |
| `fluke` | whale-tail.jpg | Beside the Resume page's name |

### Changing a picture

- **To swap a photo:** put the new file in `src/assets/img/source/`, change `source` (and `alt`) in `images.json`, and add the photo to `image-credits.json`. Then adjust `crop`, `black` and `white` while `npm run dev` is running: the picture is redone each time you save.
- **A photo that works** has one clear subject with a strong outline against a plain background. Busy photos turn into noise.
- **To add a picture:** add an entry with a new name (with an `alt`, or `"decorative": true` if it is only ornament), then show it with `{% picture "name" %}` in a template, or name it as a project's `image` or a page's `picture`.
- **The photos there now are placeholders** from Unsplash. Replace them with your own when you have them.

### Credits

`src/_data/image-credits.json` lists the photographer, their Unsplash profile and the Unsplash page of every photo, and the Credits page is built from it (see "The Credits page"). The Unsplash License does not require credit, but the record is kept anyway, and the build stops if a photo is used without an entry. Before adding a photo from Unsplash, check that its page says "Free to use under the Unsplash License": photos marked Unsplash+ are paid and are not covered.

The drawings (`diver.svg`, `compass.svg`, `swells.svg`) were made for this site and need no credit. They are ordinary SVG files in shades of grey and can be edited in any drawing program. Do not put text in them: the build would draw it with whatever fonts the computer has, and the live server has different ones.

### The texture behind the hero picture

The hero picture alone sits on a faint surface like thick white paint. It is not a photo: `scripts/lib/paint.mjs` paints it during the build from a seed number, so it is the site's own. In `images.json`:

```json
"ground": "texture",
"texture": { "seed": 7, "strokes": 9 }
```

- Another `seed` gives a different surface; `strokes` is how many brush strokes cross it.
- The texture shows only behind the subject. Light spots enclosed by the subject (the foam in the sea) stay flat paper.
- Its tones were set to the measured ones (the average grey, how dark the deepest shadow goes). They are at the top of `paintTexture` in `paint.mjs`. It is too faint to judge by eye: `reference/scripts/texturecheck.mjs` in the private folder measures a screenshot.

### How they are shown

- **One pixel of the file is one block on the page.** The browser enlarges the file without smoothing (`image-rendering: pixelated` in `base.css`), which keeps the edges hard and the files tiny: all the pictures together weigh about 27 KB.
- **Nothing moves when a picture arrives.** Every picture is laid over a box whose size is already fixed by the styles, and its width and height are written into the page. `npm run check` tests this on every page in three browsers.
- **Pictures below the top of a page are fetched only when they come near the window.** The hero picture and the one beside a page's name are fetched at once.
- **At some window sizes a block is not a whole number of screen pixels**, so now and then one column of blocks is a pixel wider than its neighbours. This is how hard-edged pixel pictures behave at a fluid size.
- **The compass in the footer rises by 14 pixels** as the footer scrolls into view (`ornamentDistance` in `motion.js`), on tablets and laptops.

## The live widgets

The status ticker in the hero shows four things: the weather in Bangalore, the coordinates and city, the local time, and what is playing on Spotify.

```
21°C, CLEAR @ N 12° 58′ E 77° 35′ (BANGALORE, INDIA)  |  6:39 AM  |  Elastic Heart, Sia
```

(Each `|` stands for the short drawn line between two pieces, and Spotify's icon sits before the track.)

| Piece | Where it comes from | How fresh |
|---|---|---|
| Local time | Worked out in the visitor's browser | Every minute |
| Weather | The site's server asks Open-Meteo (`server/weather.js`) | The server keeps an answer for 15 minutes |
| Now playing | The site's server asks Spotify (`server/spotify.js`) | The server keeps an answer for 30 seconds |

How it fits together:

- The page never talks to Open-Meteo or Spotify itself. It asks this site's own server two small questions, `/api/weather` and `/api/now-playing` (`server/api.js`), and the server asks the services. That is what keeps the Spotify keys out of the page.
- Because the server keeps each answer for a while, a thousand visitors cause the same handful of requests as one.
- **Every piece fails quietly.** If a service is down, slow (more than 5 seconds), or its keys are missing or expired, the server answers "nothing" and the page hides that piece. The rest of the ticker carries on. Nothing is shown as an error.
- When nothing is playing (or it is paused, or it is a podcast), the last track played is shown instead. Screen readers hear "Now playing on Spotify:" or "Last played on Spotify:" before it.
- **Both work in `npm run dev` too**, as well as with `npm run build` and `npm start`.
- The weather needs no key and no account. Open-Meteo is free for sites without ads or subscriptions, up to 10,000 requests a day; this site makes at most 96.

These are there because Spotify's terms ask for them. Do not remove them:

- **Spotify's icon before the track** (at least 21px across), **the title linking to that track on Spotify** (it opens in a new tab), and **the title and artists written exactly as Spotify gives them**, not in the ticker's capitals. Spotify's design rules ask for all three wherever its content is shown.

The weather's source is credited on the Credits page ("Weather data by Open-Meteo.com", with links to Open-Meteo and to its CC BY 4.0 licence), not in the ticker. Open-Meteo's licence asks for that credit, so do not remove it from the Credits page while the weather is shown.

### Spotify: the first setup

This was done on 2026-10-11. The steps are here for a new computer or a new Spotify account.

1. **Create the app.** On https://developer.spotify.com/dashboard, logged in with the Spotify account whose listening should show, create an app. Any name and description. Under Redirect URIs enter exactly `http://127.0.0.1:8888/callback`. If asked which API you will use, tick Web API.
2. **Put its two keys in `.env`.** Copy `.env.example` to `.env` if there is none. In the dashboard open the app, then Settings. Paste the Client ID after `SPOTIFY_CLIENT_ID=` and the Client secret (behind "View client secret") after `SPOTIFY_CLIENT_SECRET=`. No spaces, no quotes.
3. **Get the refresh token.** Run `npm run spotify`. Your browser opens Spotify's approval page; click Agree. The script saves `SPOTIFY_REFRESH_TOKEN` in `.env` without showing it, tests it, and prints the last track you played and the date the token stops working.

What the three values are:

- The **Client ID** names the app. It is not secret (it appears in the approval page's address).
- The **Client secret** is the app's password. Keep it out of chats, screenshots and commits.
- The **refresh token** is your standing permission for the app to read what you are playing and what you played recently, and nothing else. Treat it like a password too.

Spotify's rules, as of October 2026:

- **The app only works while its owner has Spotify Premium.** If Premium lapses, the line hides until you resubscribe.
- **`localhost` is not accepted as a redirect address.** It must be `127.0.0.1`.
- An app that has not been through Spotify's review ("development mode") can be used by up to 5 accounts. This site needs only yours.

### Spotify: every 6 months

**A refresh token stops working 6 months after you approved the app, however often it is used.** When that happens the now-playing line quietly disappears from the site and the server's log says why. Nothing else breaks. Renewing it takes five minutes and has two halves: a new token on your PC, then the same token on the live site.

The current token was obtained on 2026-10-11 and lasts until about **2027-04-11**. Put a reminder in your calendar for a week before, and do these steps then.

**On your PC**

1. Open PowerShell in the site's folder:

   ```powershell
   cd "D:\My Codes\Personal Website\romitraj.dev"
   ```

2. Run:

   ```powershell
   npm run spotify
   ```

3. Your browser opens Spotify's approval page. Log in with your Spotify account if asked, and click **Agree**.
4. The browser shows a page saying **Saved**. Close it.
5. PowerShell prints three lines: that the token was saved, the last track you played (proof that it works), and the new end date. Write the new end date into your calendar.
6. Open the file to copy the new token:

   ```powershell
   notepad .env
   ```

   Select everything after `SPOTIFY_REFRESH_TOKEN=` on that line (a long string of letters and digits) and copy it. Do not change the file. Leave Notepad open until the next part is done.

**In Dokploy**

7. Open your Dokploy dashboard and log in.
8. Open the project that holds the site, then click the site's application (the one for romitraj.dev, not the fonts one).
9. Open the **Environment** tab. It shows the application's settings as lines of `NAME=value`.
10. Find the line that starts with `SPOTIFY_REFRESH_TOKEN=`. Replace everything after the `=` with the token you copied. Change nothing else, and leave no spaces or quotes around it.
11. Save the settings with the save button on that tab.
12. Go to the **General** tab and deploy the application again, so that the server restarts with the new token. A saved setting does nothing until the application has been deployed again.
13. Wait until the newest entry on the **Deployments** tab shows as finished.

**Check it**

14. Open https://romitraj.dev/api/now-playing in your browser. It should show a line with a track's title. An empty page means the server still has no working token: look at steps 10 to 12 again.
15. Open https://romitraj.dev and look for the track in the ticker.
16. Close Notepad without saving.

Notes:

- The tab names in steps 9, 12 and 13 are from Dokploy's documentation as of October 2026. It names the **Deploy** button but not the save button on the Environment tab: see "What Dokploy's documentation did not confirm" under "Deploying with Dokploy".
- The Client ID and Client secret do not change. Only the refresh token is renewed.
- If `npm run spotify` says the Client ID or secret is wrong, or Spotify's page shows an error about the redirect address, the app's settings on https://developer.spotify.com/dashboard have changed: see "Spotify: the first setup" above.
- If the Client secret ever leaks, open the app's Settings in Spotify's dashboard, rotate the secret, put the new one in `.env` and in Dokploy's Environment tab, then do all the steps above.

### If a widget is missing

| What you see | Likely cause | What to do |
|---|---|---|
| No now-playing line, locally | `.env` is missing one of the three Spotify values | Check `.env`; run `npm run spotify` |
| No now-playing line, after it worked for months | The refresh token is 6 months old | "Spotify: every 6 months" above |
| No now-playing line, and Premium has lapsed | Spotify switches the app off | Resubscribe |
| No weather | Open-Meteo is unreachable | Wait; it comes back by itself within a minute of the service returning |
| Neither, with `npm start` | The site was not built first | `npm run build`, then `npm start` |

To see what the server answers, open http://localhost:3000/api/weather or http://localhost:3000/api/now-playing while `npm start` is running. An empty page means "nothing to show".

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

## Comparing with the design reference

The private folder next door has scripts that measure the reference and this site in the same way and list the differences. They live in `../romitraj-private/reference/scripts/`, read rendered values only (sizes, colors, positions, timings as a browser reports them), and are never deployed. Build the site first; the scripts start it themselves, with the stand-in weather and music services.

```powershell
cd "..\romitraj-private\reference\scripts"
node compare.mjs out/compare
node compare-report.mjs out/compare
```

| Script | What it compares | Time |
|---|---|---|
| `compare.mjs`, then `compare-report.mjs` | Layout, spacing, type and color: about 150 pieces on four pages (home, About, Projects, one project), at 1440px, 768px and 390px, in three browsers | about 7 minutes |
| `compare-states.mjs`, then the same with `differences` | What 24 kinds of link do under the pointer and with keyboard focus, and how long each change takes | about 15 minutes |
| `compare-motion.mjs` | The two tickers' speeds, the gradient bar's loop, and how the scroll-tied movement follows the scroll position | about 15 minutes |
| `pagechange.mjs`, then `pagechange-compare.mjs` | Every page change as a timeline: what leaves, what arrives, when and for how long | about 2 minutes per site and browser |

- **Which piece is which** is written in `compare-map.mjs`: for each piece, where it is on the reference and where it is here. When a section of this site is rebuilt, update its lines there.
- **Reading the report.** Each line is one value of one piece: the reference's, this site's, and the browsers and widths it shows in. Many lines are not visible differences: the two sites are built differently (a margin there is a gap here), and their words are different lengths. A line matters when a size, a color, a gap between two pieces or an edge differs. [decisions.md](decisions.md) lists the differences that are there by choice.
- **After changing this site**, add `--only=here` to `compare.mjs` or `compare-states.mjs`: it measures this site again and keeps the reference's saved values, so the reference is not visited again.
- **The reference sits behind a bot check.** The scripts visit it with one browser at a time, one page at a time. Do not run two of them at once.

## Checking before a commit

```powershell
npm run check
```

It prints one line per step and ends with `Check passed.` or a list of problems. Besides broken links it reports: a missing address that is not answered with the status 404 and the "Lost at sea" page, that page failing to show or to slide in, a link to a missing page that ends anywhere else, a keyboard focus ring too faint to see (less than 3 to 1 against the paper or the ink), a file that fails to load, a script error, a page wider than its window, a fallback font being used, hero lines that no longer fit, page changes that do not work, anything that moves once a page change has finished, a scroll position that is not returned to, heading letters that would jump during a page change, a letter whose ink is cut by the window it slides in (a raised apostrophe, the tail of a comma), a headline entrance that flashes, ends out of place or leaves the headline hidden, and a picture whose description differs from the one in `images.json` (or that is described although it is marked as decoration), a picture without its size written into the page, one that weighs too much, would be smoothed, fails to load, moves the page as it loads, or sits differently from one browser to the next, and a weather or now-playing widget that shows the wrong thing, does not hide when its service is down, moves the page as it arrives, or lets a key slip into an answer, a visitor counter that is loaded on this computer or would count a page change twice on the live site, and drawn lines in the ticker that one browser paints thicker than another. The whole check runs against stand-ins for Open-Meteo and Spotify on your own computer (`scripts/lib/pretend.mjs`), so its screenshots always show "23°C, partly cloudy" and "Pretend Song", it works without an internet connection for those two, and your real keys are never used. It also prints how many picture files there are and what they weigh.

The photographs are taken with hover fades switched off and with fixed starting places for anything the site normally places at random, so the same page gives the same picture every time.

The screenshots go to `../romitraj-private/screenshots/`, in `laptop-1440`, `tablet-768` and `phone-390` folders, split by browser. The laptop and phone folders match the reference screenshots next door, so the two sets can be compared side by side. If that folder is not there, they go to `screenshots/` here, which git ignores.

Open a few of the pictures before committing. The same page should look the same in all three browsers.

## Deploying with Dokploy

The live site is two applications on your own server, both set up in Dokploy's dashboard:

| Application | Address | Built from | What it is |
|---|---|---|---|
| The site | https://romitraj.dev | `brixdorf/romitraj.dev` (public), branch `main` | The pages, and the two small questions the ticker asks |
| The fonts | https://fonts.romitraj.dev | `brixdorf/romitraj-private` (private), branch `main` | The licensed fonts, sent to the site and to nobody else |

Both are built by Railpack, Dokploy's builder that reads `package.json` and works out the rest. There is no Dockerfile and nothing to type on the server: every step below is a click in a dashboard.

**Nothing here has been done yet.** These are the steps for the first deployment, and for doing it again on a new server.

### What the server will do

Checked on 2026-10-11 with Railpack 0.40.1 (its own plan for each repository) and by building and starting clean copies of both repositories on Linux under Node.js 24.21.0, with no `.env` file and no private folder beside the site.

| | The site | The fonts |
|---|---|---|
| Node.js | 24.21.0, from `"engines": { "node": "24.x" }` in `package.json` | the same |
| Install | `npm install` | `npm install` (nothing to install) |
| Build | `npm run build` (about 3 seconds) | none |
| Start | `npm run start` | `npm run start` |
| Port inside the container | 3000 | 3000 |
| Settings to enter | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` | none |

- **No `PORT` setting is needed.** Both servers listen on 3000 unless told otherwise, and 3000 is what you enter as the container port.
- **The site works with none of the three settings.** Without them, or with a wrong one, the now-playing piece of the ticker stays hidden and everything else is as usual. The weather needs no setting.
- **The build needs the internet** for one thing: the list of your latest blog posts. If the blog cannot be reached, the build still succeeds and the section shows a link to the blog.
- **On the server the pages load the fonts from https://fonts.romitraj.dev.** That is why the fonts application comes first below.
- **The fonts go to romitraj.dev only.** A page on any other website that asks for one is refused, and browsers will not use a font for another site even if they get it. The server answers nothing but the seven font files: not the brief, not the original font files, not its own code.

### Before you start

- You can log in to your Dokploy dashboard, to Cloudflare, and to GitHub as `brixdorf`.
- Both repositories are pushed (`git status` in each folder says there is nothing to commit, and `git push` says everything is up to date).
- `npm run check` passed on the last commit.
- The three Spotify values are in `.env` on your PC. You will copy them from there in step 5. Never paste them anywhere but Dokploy's own page.

### Step 1: Cloudflare

Skip any part that is already as described. On 2026-10-11 both names already pointed at Cloudflare with the proxy on.

1. Log in to Cloudflare, click **Account Home**, and choose `romitraj.dev`.
2. Click **DNS**, then **Records**. There should be a record for `romitraj.dev` and one for `fonts`, both pointing at your server's address, both with the orange cloud (proxied). If `fonts` is missing: **Add Record**, type **A**, name `fonts`, your server's IPv4 address, proxy on, **Save**.
3. Click **SSL/TLS**, then **Overview**, then **Configure SSL/TLS Encryption**. Choose **Full (Strict)** and click **Save**.
4. You need your origin certificate and its private key as two blocks of text. An origin certificate is the one Cloudflare issues for the stretch between Cloudflare and your server.
   - **If you still have both** from when you set up the blog or the visitor counter, and the certificate covers `romitraj.dev` and `*.romitraj.dev`, use them.
   - **If you no longer have the private key** (Cloudflare shows it only once), make a new certificate: **SSL/TLS**, **Origin Server**, **Create Certificate**. Keep the option that lets Cloudflare generate the private key, make sure the hostnames are `romitraj.dev` and `*.romitraj.dev`, choose how long it is valid, and click **Create**. Copy the **Origin Certificate** and the **Private Key** (PEM format) into your password manager before closing the page.
   - Never put either block in a repository, a chat or a screenshot.

### Step 2: the certificate in Dokploy

If your Dokploy already holds this certificate (your other sites on `romitraj.dev` use it), skip this step.

1. Open your Dokploy dashboard and log in.
2. Open **Certificates** and click **Add Certificate**.
3. Give it a name, for example `cloudflare-origin-romitraj`.
4. Paste the certificate into the certificate field and the key into **Private Key**. (Dokploy's documentation calls the certificate field "Certificate Data" on one page and "Origin Certificate" on another.) Leave the optional server choice as it is.
5. Save it with the button at the bottom of the form.

### Step 3: GitHub in Dokploy

If Dokploy can already see both repositories, skip this step.

1. In Dokploy open **Git** and choose **Github**.
2. Click **Create Github App**, give it a name (it must be unique on GitHub, for example `dokploy-romitraj`), and click **Create Github App** again. GitHub opens; confirm, and you are sent back to Dokploy.
3. Click the **Install** button that has appeared.
4. On GitHub, choose the repositories Dokploy may read: select `romitraj.dev` and `romitraj-private` (or all repositories). Click **Install & Authorize**.
5. **If the app existed already** but cannot see one of the two repositories: on github.com open your **Settings**, then **Applications**, find the Dokploy app under installed GitHub Apps, click **Configure**, add the repository under repository access, and save.

### Step 4: the fonts application

1. In Dokploy, create a project for this site (for example `romitraj`), or open the one you want to use.
2. Inside the project, create a new service of the kind **Application**. Name it `fonts`.
3. Open the application. On the **General** tab, choose **Github** as the source, then:
   - **Repository:** `romitraj-private`
   - **Branch:** `main`
   - **Build path:** `/`
   
   Save the source settings.
4. Still on **General**, choose **Railpack** as the build type and save. Leave the **Railpack Version** field as it is.
5. Turn on **Auto Deploy** on the **General** tab, if it is not on already.
6. The **Environment** tab stays empty for this application.
7. Click **Deploy**.
8. Open the **Deployments** tab and open the newest entry to watch the build. It should mention Node 24, `npm install` and `npm run start`, and end without an error. This takes a minute or two.
9. Open the **Logs** tab. The last line should read `Font server running at http://localhost:3000`.
10. Open the **Domains** tab and click **Create Domain**:
    - **Host:** `fonts.romitraj.dev`
    - **Path:** `/`
    - **Container Port:** `3000`
    - **HTTPS:** on
    - **Certificate:** **None** (not Let's Encrypt: the certificate from step 2 is used)
    
    Click **Create**. A domain takes effect at once; no new deploy is needed.

**Check the fonts application**

| Open this | You should get |
|---|---|
| https://fonts.romitraj.dev/manuka-black.woff2 | A small file is downloaded or shown (8,692 bytes). This is the one address that proves it works. |
| https://fonts.romitraj.dev/ | The two words `Not found` |
| https://fonts.romitraj.dev/BRIEF.md | `Not found` |

### Step 5: the site application

1. In the same project, create another service of the kind **Application**. Name it `site`.
2. On the **General** tab, choose **Github** as the source:
   - **Repository:** `romitraj.dev`
   - **Branch:** `main`
   - **Build path:** `/`
   
   Save.
3. Choose **Railpack** as the build type and save.
4. Turn on **Auto Deploy**.
5. Open the **Environment** tab. Type these three lines, each followed by its value from the `.env` file on your PC (open it with `notepad .env` in the site's folder). No spaces around the `=`, no quotes:

   ```
   SPOTIFY_CLIENT_ID=
   SPOTIFY_CLIENT_SECRET=
   SPOTIFY_REFRESH_TOKEN=
   ```

   Save the settings with the save button on that tab. Close Notepad without saving.
6. Go back to **General** and click **Deploy**.
7. On the **Deployments** tab, watch the newest entry. It should mention Node 24, `npm install`, `npm run build` (with lines beginning `[11ty]`) and `npm run start`.
8. On the **Logs** tab the last line should read `Site running at http://localhost:3000`.
9. On the **Domains** tab click **Create Domain**:
   - **Host:** `romitraj.dev` (never `www.romitraj.dev`: Cloudflare already sends `www` to the plain name)
   - **Path:** `/`
   - **Container Port:** `3000`
   - **HTTPS:** on
   - **Certificate:** **None**
   
   Click **Create**.

**Check the site**

| Do this | You should see |
|---|---|
| Open https://romitraj.dev | The home page, with the headline in its tall heavy letters and the serif lines in the fine serif. If the text is in plainer fonts, the fonts application is not answering: check step 4. |
| Wait two seconds and look at the ticker | The weather, the coordinates, the time, and Spotify's icon with a track |
| Open https://romitraj.dev/api/weather | One short line with a temperature and a word for the sky |
| Open https://romitraj.dev/api/now-playing | One short line with a track's title. An empty page means the three settings are missing or wrong: check step 5.5, save, and deploy again. |
| Click Projects, a project, About, and use the back button | The pages change with their animations and without a reload |
| Open https://www.romitraj.dev | You end up on https://romitraj.dev |
| Open https://romitraj.dev/nothing-here/ | The "Lost at sea" page, its name sliding in |
| Open your Rybbit dashboard | Your own visit, counted once per page |
| Open the site on your phone | The same, in the phone arrangement |

### If something is wrong

| What you see | What it means | Where to look |
|---|---|---|
| The newest entry on **Deployments** ends in an error | The build failed | Read the last lines of that entry. A wrong Node version there (not 24) means an old Railpack: type `0.40.1` into **Railpack Version** on **General**, save, deploy again. |
| `404 page not found` | The server has no application for that address | The domain on the **Domains** tab: the host must be spelled exactly, with no `https://` |
| Cloudflare's page "Bad gateway" (502) | The application is not running, or the port is not 3000 | **Logs**, and **Container Port** on **Domains** |
| Cloudflare's page "Invalid SSL certificate" (526) | The server is not presenting the origin certificate | Step 2; that **Certificate** is **None** and **HTTPS** is on; and that the certificate covers the name. If it still shows, tell me: one page of Dokploy's documentation says its proxy may need pointing at a new certificate by hand. |
| Cloudflare's page "Web server is down" (521) or a timeout (522) | Cloudflare cannot reach the server at all | The DNS record's address in Cloudflare, and that the server is running |
| The site shows but the ticker has no track | The Spotify settings | **Environment**, then deploy again. See "If a widget is missing". |

### After the first deployment

- **Every `git push` to `main` deploys.** Push the site's repository and the site is rebuilt and restarted, usually within two minutes. Push the private repository and the fonts application restarts too, even when only the brief changed. That is harmless: browsers and Cloudflare keep the fonts for a year.
  - If you would rather the fonts application restart only when a font changes, Dokploy has a setting called **Watch Paths** for that. The paths would be `fonts/web/**`, `font-server.js`, `package.json` and `package-lock.json`. Its documentation does not say where the field is, so this is left for when we look at your dashboard together.
- **A changed setting does nothing until the next deploy.** After saving anything on the **Environment** tab, click **Deploy** on **General**.
- **Visitors get new files at once.** Pages are never kept by browsers or by Cloudflare. The stylesheet, the script, the pictures and the fonts may be kept, and each carries a fingerprint in its address (`main.css?v=...`) that changes when the file changes.
- **Push only what you have checked.** There is no test on the server: `npm run check` on your PC is the test.

### What Dokploy's documentation did not confirm

The steps above use the names in Dokploy's documentation as read on 2026-10-11 (Dokploy 0.30.8). Where it gives no name, the step describes the thing instead. These are the places to compare with your dashboard, so the wording here can be corrected:

1. **Creating a project and an application** (steps 4.1, 4.2, 5.1): the documentation does not name the buttons.
2. **Choosing the source and the build type** (steps 4.3, 4.4, 5.2, 5.3): it names the fields (Repository, Branch, Build path, Railpack Version) and that they are on **General**, but not the buttons that save them.
3. **The save button on the Environment tab** (step 5.5).
4. **Whether Auto Deploy is already on** for a new application (steps 4.5, 5.4). The documentation says it is a button on **General**.
5. **The certificate form** (step 2): the name of the certificate field and of its save button.
6. **Whether a certificate added in step 2 is used at once.** The Cloudflare page of the documentation says to add it and choose **None**; the certificates page says the proxy's configuration may need adjusting. The 526 line in the table above is how you would notice.
7. **Where Watch Paths is.**

## Secrets

Secret values (the three Spotify values: see "The live widgets") live in a file named `.env`, which git ignores. `.env.example` shows the names with empty values. Copy it to `.env` and fill it in. Never commit `.env`, and never paste its contents into a chat, an issue or a screenshot.

- To confirm git is ignoring it: `git check-ignore -v .env` should print a line naming `.gitignore`, and `git status` should never list `.env`.
- On the live server the same three values are entered in the host's settings instead of a file.
- `npm run check` never uses these values: it runs the site against stand-ins for Spotify and Open-Meteo.

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
- **Every 6 months:** renew the Spotify refresh token with `npm run spotify`, and copy the new value into the live site's settings ("Spotify: every 6 months"). The current one lasts until about 2027-04-11.
- **Yearly:** renew the domain, confirm the weather still shows and that Spotify Premium is still active, and check the expiry date of the Cloudflare origin certificate.

## Still to come

These parts of the guide are written when the matching part of the site is built:

- The resume itself. Until `resume.pdf` exists, the Resume page is a short note.
