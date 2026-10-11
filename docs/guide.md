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
| `npm run speed` | Measures how quickly the home page shows its main content, with and without the headline's entrance. See "The headline's entrance" below. |
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
  content/      The pages. index.njk is the home page, about.njk the About page, resume.njk the
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

On phones the giant name shrinks until its longest word fits the screen. This is worked out from the number of letters in that word, so no measuring step is needed.

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

When a page is first opened nothing animates, with one exception: on the home page the headline slides in (see "The headline's entrance" below). The animations in this section only play when moving from one page to another.

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

`src/_data/image-credits.json` lists the photographer and the Unsplash page of every photo. The Unsplash License does not require credit, but the record is kept anyway, and the build stops if a photo is used without an entry. Before adding a photo from Unsplash, check that its page says "Free to use under the Unsplash License": photos marked Unsplash+ are paid and are not covered.

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

One thing is still owed:

- **A credit for Open-Meteo.** Its data is under the CC BY 4.0 licence, and its terms ask for a link to open-meteo.com where the data is shown. The home page deliberately carries no such words or link: the credit is to go on a page of its own, which is not built yet. Until that page exists the weather is shown without credit, so build it before the site goes live. The sentence to use is "Weather data by Open-Meteo.com", linking to https://open-meteo.com/.

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

- The tab names in steps 9, 12 and 13 are from Dokploy's documentation as of October 2026. Its documentation does not name the save and deploy buttons, so they are described here instead of named; they will be filled in when the deployment part of this guide is written.
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

## Checking before a commit

```powershell
npm run check
```

It prints one line per step and ends with `Check passed.` or a list of problems. Besides broken links it reports: a file that fails to load, a script error, a page wider than its window, a fallback font being used, hero lines that no longer fit, page changes that do not work, anything that moves once a page change has finished, a scroll position that is not returned to, heading letters that would jump during a page change, a letter whose ink is cut by the window it slides in (a raised apostrophe, the tail of a comma), a headline entrance that flashes, ends out of place or leaves the headline hidden, and a picture whose description differs from the one in `images.json` (or that is described although it is marked as decoration), a picture without its size written into the page, one that weighs too much, would be smoothed, fails to load, moves the page as it loads, or sits differently from one browser to the next, and a weather or now-playing widget that shows the wrong thing, does not hide when its service is down, moves the page as it arrives, or lets a key slip into an answer, and drawn lines in the ticker that one browser paints thicker than another. The whole check runs against stand-ins for Open-Meteo and Spotify on your own computer (`scripts/lib/pretend.mjs`), so its screenshots always show "23°C, partly cloudy" and "Pretend Song", it works without an internet connection for those two, and your real keys are never used. It also prints how many picture files there are and what they weigh.

The photographs are taken with hover fades switched off and with fixed starting places for anything the site normally places at random, so the same page gives the same picture every time.

The screenshots go to `../romitraj-private/screenshots/`, in `laptop-1440`, `tablet-768` and `phone-390` folders, split by browser. The laptop and phone folders match the reference screenshots next door, so the two sets can be compared side by side. If that folder is not there, they go to `screenshots/` here, which git ignores.

Open a few of the pictures before committing. The same page should look the same in all three browsers.

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

- Deployment with Dokploy, step by step.
- A page that credits Open-Meteo for the weather ("Weather data by Open-Meteo.com", linking to https://open-meteo.com/). It is owed under Open-Meteo's licence and should exist before the site goes live. See "The live widgets".
- The resume itself. Until `resume.pdf` exists, the Resume page is a short note.
