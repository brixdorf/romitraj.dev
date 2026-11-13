# Guide

The manual for romitraj.dev: how to run it, where things live, and how to change them. If you are back after a long break, start here, then skim [decisions.md](decisions.md) for the reasons behind the choices.

## What you need

| Tool                     | Needed for                              | Notes                                                                                                                                                                                                       |
| ------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite+ (the `vp` command) | Everything                              | Install it once from https://viteplus.dev. It brings Node.js and pnpm, and picks the Node.js version that `engines` in `package.json` asks for (`26.x`, the current LTS line). See "Node.js version" below. |
| pnpm                     | Everything                              | The package manager: it installs the packages listed in `package.json`. Its version is named there too (`packageManager`), and Vite+ provides it.                                                           |
| Python 3                 | `pnpm run fonts` only                   | Nothing to install by hand: the first run makes a `.venv` folder in the project and installs the two packages it needs into it (see "Fonts").                                                               |
| The `playwright` toolbox | Every command that opens a test browser | Playwright, the tool that drives the test browsers, does not support Fedora. Those commands run inside an Ubuntu container instead. See "Test browsers on Fedora" below.                                    |

First time on a new computer, in a terminal:

```bash
cd ~/"My Codes/Personal Website/romitraj.dev"
pnpm install
```

## Everyday commands

These are the only commands you need. Type them in a terminal (Konsole) in the site's folder. The ones marked "browser" open a test browser, so on Fedora they run inside the toolbox (see "Test browsers on Fedora").

| Command                   | What it does                                                                                                                                                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run dev`            | Runs the site at http://localhost:8080 and reloads the browser whenever you save a file. Stop it with Ctrl+C.                                                                                                                                                                                  |
| `pnpm run build`          | Builds the finished site into `_site/`.                                                                                                                                                                                                                                                        |
| `pnpm start`              | Serves `_site/` the way the live server does, at http://localhost:3000. Run `pnpm run build` first.                                                                                                                                                                                            |
| `pnpm run lint`           | Checks that the code is tidy and has no obvious mistakes (Vite+: Oxfmt and Oxlint). Takes a second. See "Formatting, linting and tests".                                                                                                                                                       |
| `pnpm run format`         | Tidies the code's layout for you, then does the same check.                                                                                                                                                                                                                                    |
| `pnpm test`               | Runs the small tests of the helper scripts (Vite+: Vitest). Takes a few seconds.                                                                                                                                                                                                               |
| `pnpm run smoke`          | Browser. A quick check: builds the site, opens every page in Chromium at three widths, and reports a page that fails to load or any script error. About 20 seconds.                                                                                                                            |
| `pnpm run links`          | Looks for dead links on every page of the site, inside it and out. Add an address to check another website, such as your blog. See "Dead links".                                                                                                                                               |
| `pnpm run check`          | Browser. The full check: builds, looks for broken links, photographs every page in three browsers at three widths, and tests the hero's big lines, the page changes, the headline's entrance and the pictures. The three browsers run at the same time. Run it before pushing a visual change. |
| `pnpm run spotify`        | Gets a fresh Spotify refresh token and saves it in `.env`. Needed once, and again every 6 months. See "The live widgets" below.                                                                                                                                                                |
| `pnpm run fonts`          | Converts the licensed fonts into small web fonts. Run it after changing `src/_data/fonts.json` or adding a font file.                                                                                                                                                                          |
| `pnpm run fonts:fallback` | Downloads and prepares the free fallback fonts. Already done; only needed again if the font list changes.                                                                                                                                                                                      |
| `pnpm run fit`            | Browser. Measures the hero's big lines so each one fills its space. Run it after changing the headline's words.                                                                                                                                                                                |
| `pnpm run speed`          | Browser. Measures how quickly the home page shows its main content, with and without the headline's entrance. See "The headline's entrance" below. Like the check, it uses stand-ins for the weather, the music and the blog's feed.                                                           |
| `pnpm run share`          | Browser. Makes the share image (the card apps show beside a shared link) and retakes the README's screenshot. See "The site's icon and the share image".                                                                                                                                       |

### Test browsers on Fedora

Playwright does not support Fedora, so the commands marked "browser" run inside a toolbox: a small Ubuntu 24.04 system living in a container on your computer, named `playwright`, which shares your home folder. Put the command inside this line:

```bash
toolbox run -c playwright bash -lc 'cd ~/"My Codes/Personal Website/romitraj.dev" && pnpm run smoke'
```

- **The browsers themselves** are installed once, and again after every update of Playwright (the versions belong together):

  ```bash
  toolbox run -c playwright bash -lc 'cd ~/"My Codes/Personal Website/romitraj.dev" && pnpm exec playwright install chromium firefox webkit'
  ```

  They are kept in `~/.cache/ms-playwright`. Old versions are removed by the same command.

- **Chromium starts with font hinting off** (`launchOptions` in `scripts/lib/site.mjs`). On Linux, Chromium rounds the width of every letter to whole pixels, so its lines of text came out a pixel shorter or longer than in Firefox, WebKit, or Chrome on Windows and macOS, and a long write-up could wrap one line differently. With hinting off it lays text out like the others. Every script that starts a test browser uses this setting.

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
                blog.js (fetches the latest blog posts during the build, with server/blog.js),
                and three files written by scripts: fontVersions.json, fallbackFonts.json, textWidths.json
  _includes/    layouts/ (base.njk is the page shell, page.njk adds the giant page name for an
                inner page, project.njk is one project's page)
                partials/ (one per section: banner, hero, ticker, letter, about, projects, writing,
                footer; page-row, page-header and crumb for the inner pages; plus fonts and icon)
  assets/css/   main.css (the list), tokens.css (every value), base.css, components/ (one file per piece)
  assets/js/    main.js (the entry point), motion.js (animation timings),
                animations.js (tickers and movement tied to scroll), widgets.js (local time, year,
                weather, the track, the blog's posts), posts.js (brings the blog's posts on
                the home page and the About page up to date),
                copy.js (the copy button beside the gpg command on the About page),
                compass.js (the hero's 3D compass, drawn with WebGL), compass-model.js (its
                shapes), compass-motion.js (how it leans, turns and settles),
                intro.js (the headline's entrance when the home page opens; built into a small
                script of its own), shapes.js (shapes shared by the animations),
                transitions.js (page changes without a reload), scroll-memory.js (remembers
                how far each page was scrolled), page-changes.js (what moves
                during each kind of page change), split.js (cuts text into letters or lines)
  assets/files/ Files visitors download as they are: resume.pdf (published at /resume.pdf) and
                romitraj-pgp-public.asc (the OpenPGP key, published at /romitraj-pgp-public.asc
                and in the Web Key Directory). See "The resume" and "The OpenPGP key"
  assets/fonts/ The free fallback fonts and their license files
  assets/icons/ The license of the icon set
  assets/img/source/  The photos and drawings the pictures are made from, and hero-compass.png,
                the still picture of the hero's compass (made by pnpm run share)
  content/      The pages. index.njk is the home page, about.njk the About page, credits.njk the
                Credits page, resume.njk the
                Resume page, projects.njk the list of projects. projects/ holds one Markdown
                file per project (its facts on top, its write-up below), _template.md (a
                project to copy, never built), and projects.11tydata.js, the settings those
                files share.
server/         index.js: the small server behind pnpm start. files.js: how each file is sent
                (its type, how long it may be kept). wkd.js: the headers for the OpenPGP key's
                Web Key Directory. api.js answers the page's three
                questions, weather.js asks Open-Meteo, spotify.js asks Spotify, blog.js reads
                the blog's feed (for the build too), cache.js keeps their answers for a while
scripts/        python.mjs (runs the two font scripts with the project's own Python, in .venv),
                fonts.py (pnpm run fonts), fallback_fonts.py (pnpm run fonts:fallback),
                fit.mjs (pnpm run fit), check.mjs (pnpm run check), lib/site.mjs (shared helpers),
                images.mjs (turns the photos and drawings into the site's pictures,
                during every build),
                lib/pictures.mjs (the check's tests of the pictures), lib/formats.mjs (saves
                each pixel picture as PNG, JPEG XL and AVIF and picks what the page offers),
                lib/compass.mjs (the check's test of the hero's compass), lib/compass-still.mjs
                (draws the compass's still picture, for pnpm run share),
                lib/analytics.mjs (the check's test of the visitor counter),
                spotify.mjs (pnpm run spotify), lib/widgets.mjs and lib/posts.mjs (the check's tests
                of the widgets and of the list of blog posts), lib/pretend.mjs (stand-ins for
                Open-Meteo, Spotify and the blog's feed during the check),
                lib/letters.mjs, lib/walk.mjs and lib/entrance.mjs (the check's tests of the
                letters, the page changes and the headline's entrance), speed.mjs (pnpm run speed),
                icons.mjs (makes the site's icon files during every build), share.mjs (pnpm run share),
                lib/lost.mjs and lib/head.mjs (the check's tests of the page for a missing address,
                the icon and the preview tags), smoke.mjs (pnpm run smoke), links.mjs and
                lib/links.mjs (pnpm run links), lib/bundle.mjs (bundles the CSS and JavaScript
                with Vite+, during every build), lib/venv.mjs (the font scripts' Python
                environment), lib/projects.mjs (the checks on a project's facts),
                lib/credits.mjs (the pictures the Credits page thanks),
                lib/mailto.mjs (email links with a subject filled in),
                lib/downloads.mjs and lib/pgp.mjs (publish the resume and the OpenPGP key
                during every build), lib/photo.mjs (turns a photo into grey JPEG XL, AVIF
                and JPEG files), lib/saying.mjs (the check's test of the About page quote's
                entrance). Files ending in .test.mjs (and .test.js in server/)
                are the tests (pnpm test).
docs/           This guide and the decisions log
package.json    The packages, the commands, and the Node.js and pnpm versions
pnpm-lock.yaml  The exact version of every package, written by pnpm. Commit it, never edit it
pnpm-workspace.yaml  pnpm's settings
vite.config.js  Vite+'s settings: how the code is formatted and linted, where the tests are
_site/          The built site. Made by the build, never edited by hand, never committed.
```

Every file starts with a comment saying what it does.

## How do I change...?

| I want to change                                                                                 | Open this file                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| My name, email, city, social links, blog address                                                 | `src/_data/site.json`                                                                                                                                                              |
| The words on the Credits page                                                                    | `src/_data/pages.json` (`credits`)                                                                                                                                                 |
| A photo's photographer, title, collection or licence on the Credits page                         | `src/_data/image-credits.json`                                                                                                                                                     |
| The visitor counter's address or site number, or switching it off                                | `src/_data/site.json` (`analytics`)                                                                                                                                                |
| The bio line in the top banner                                                                   | `src/_data/site.json` (`banner`)                                                                                                                                                   |
| The headline's words (opening serif line, giant line, italic words, serif word)                  | `src/_data/headline.json`, then run `pnpm run fit`                                                                                                                                 |
| The introduction sentence, the scroll note                                                       | `src/_data/home.json`                                                                                                                                                              |
| The ticker's small words, and how the weather is worded                                          | `src/_data/home.json` (`ticker`)                                                                                                                                                   |
| The words for the sky ("partly cloudy")                                                          | `src/_data/weather.json`                                                                                                                                                           |
| The city whose weather and time are shown                                                        | `src/_data/site.json` (`city`, `latitude`, `longitude`, `timeZone`)                                                                                                                |
| The portrait on the About page                                                                   | Replace `src/assets/img/source/portrait.jpg` (keep the name); its framing is `portrait` in `src/_data/images.json`                                                                 |
| A search description, a tab name, a screen-reader label                                          | The page's own file (`title`, `description`); `src/_data/site.json` (`description`, `newTabNote`); `src/_data/home.json` and `src/_data/pages.json` (the labels ending in `Label`) |
| A picture: which photo or drawing it uses, its alt text, how it is cut and how dark it comes out | `src/_data/images.json` (see "Pictures" below)                                                                                                                                     |
| Which picture a project shows                                                                    | `image` at the top of the project's file                                                                                                                                           |
| Which picture sits beside a page's giant name                                                    | `picture` at the top of the page's file                                                                                                                                            |
| The page links and their descriptions (hero and footer)                                          | `src/_data/navigation.json`                                                                                                                                                        |
| The intro letter, the about text, section headings, button labels, the footer sign-off           | `src/_data/home.json`                                                                                                                                                              |
| A project's name, one-line description, tags, year, link or write-up                             | Its file in `src/content/projects/`                                                                                                                                                |
| A new project                                                                                    | Copy `src/content/projects/_template.md` (see "Adding or changing a project")                                                                                                      |
| The resume                                                                                       | Replace `src/assets/files/resume.pdf` (keep the name); the card's words are in `src/_data/pages.json` (`resume`)                                                                   |
| The OpenPGP key                                                                                  | Replace `src/assets/files/romitraj-pgp-public.asc` (keep the name). See "The OpenPGP key"                                                                                          |
| The quote under the About page's name                                                            | `src/_data/about.json` (`quote`)                                                                                                                                                   |
| The order of the projects                                                                        | `order` at the top of each file in `src/content/projects/`                                                                                                                         |
| The text on the About page                                                                       | `src/_data/about.json`                                                                                                                                                             |
| The hero's 3D compass: its shapes (case, face, rose, needle, ring)                               | `src/assets/js/compass-model.js`, then run `pnpm run share` (see "The hero's compass")                                                                                             |
| The compass's resting pose, how far it leans and turns, its needle's spring, its contrast        | `src/assets/js/motion.js` (`compass`), then run `pnpm run share`                                                                                                                   |
| The site's icon (the compass in the browser tab)                                                 | `src/assets/icons/site-icon.svg`; its colors follow `tokens.css`                                                                                                                   |
| The picture shown when a link is shared                                                          | Run `pnpm run share`; its description is `shareImageAlt` in `src/_data/site.json`                                                                                                  |
| The page for a missing address ("Lost in oblivion")                                              | Its giant name: `src/content/404.njk` (`title`). Its other words: `src/_data/pages.json` (`lost`)                                                                                  |
| The giant name at the top of an inner page                                                       | The top of that page's file in `src/content/` (`heading`, or `title` if there is no `heading`)                                                                                     |
| The line beside the version tag on inner pages                                                   | `src/_data/site.json` (`tagline`)                                                                                                                                                  |
| Small labels on inner pages ("Go home", "You are here", "Read more", "Contents")                 | `src/_data/pages.json`                                                                                                                                                             |
| How many blog posts the home page shows                                                          | `src/_data/home.json` (`writing.count`)                                                                                                                                            |
| The links under "Elsewhere" (about card and footer)                                              | `src/_data/site.json` (`elsewhere`)                                                                                                                                                |
| The version tag (footer, and the small row on inner pages)                                       | `src/_data/site.json` (`version`)                                                                                                                                                  |
| An icon's drawing, or a new icon                                                                 | `src/_data/icons.json`                                                                                                                                                             |
| Where and how far things move as you scroll                                                      | `src/assets/js/motion.js` (`scroll`)                                                                                                                                               |
| The city, country or coordinates in the status ticker                                            | `src/_data/site.json`                                                                                                                                                              |
| How fast the ticker moves, and how much it slows under the pointer                               | `src/assets/js/motion.js`                                                                                                                                                          |
| How the code is laid out (quotes, line length), which lint rules run, where the tests are        | `vite.config.js`                                                                                                                                                                   |
| The oldest browser versions the CSS and JavaScript are written for                               | `scripts/lib/bundle.mjs` (`browsers`)                                                                                                                                              |
| pnpm's settings (exact versions, install scripts)                                                | `pnpm-workspace.yaml`                                                                                                                                                              |
| A color                                                                                          | `src/assets/css/tokens.css`                                                                                                                                                        |
| The colors of the gradient bar                                                                   | `src/assets/css/tokens.css` (the four `--color-bar` lines)                                                                                                                         |
| Which fonts are used for what                                                                    | `src/assets/css/tokens.css` (the `--font` lines)                                                                                                                                   |
| Spacing, corner size, line thickness                                                             | `src/assets/css/tokens.css`                                                                                                                                                        |
| How fast a hover or the gradient bar moves                                                       | `src/assets/css/tokens.css` (the `--duration` lines)                                                                                                                               |
| The color of the ring around whatever has keyboard focus                                         | `src/assets/css/tokens.css` (`--color-focus` on paper, `--color-focus-on-ink` on the dark blocks)                                                                                  |
| How fast the tickers and scroll drift move                                                       | `src/assets/js/motion.js`                                                                                                                                                          |
| How a page change moves: how long, how far, in what order                                        | `src/assets/js/motion.js` (`pageChange`)                                                                                                                                           |
| How the headline slides in when the home page opens                                              | `src/assets/js/motion.js` (`intro`, and the letter pace above it)                                                                                                                  |
| The words screen readers hear on a link that opens a new tab                                     | `src/_data/site.json` (`newTabNote`)                                                                                                                                               |
| The list of font files, or which ones load first                                                 | `src/_data/fonts.json`, then run `pnpm run fonts`                                                                                                                                  |
| Which free font stands in for a licensed one                                                     | `src/_data/fonts.json` (`fallback`) and the recipes at the top of `scripts/fallback_fonts.py`, then run `pnpm run fonts:fallback`                                                  |
| Which sections the home page has, and their order                                                | `src/content/index.njk`                                                                                                                                                            |
| The page title or description shown in browser tabs and search results                           | `src/_data/site.json`, or the top of the page's own file                                                                                                                           |
| The browser's toolbar color on phones                                                            | `src/_data/site.json` (`themeColor`). Keep it the same as `--color-ink` in `tokens.css`.                                                                                           |

This table grows as sections are built.

## The headline

The sentence at the top of the home page is set in five pieces, all in `src/_data/headline.json`:

| Piece                            | Where it shows                                                                                                                    | Font                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `full`                           | Nowhere on screen. It is the page's main heading for screen readers and search engines.                                           | none                  |
| `opening` (`plain` and `italic`) | The serif line across the full width, above the giant line                                                                        | Louize Display        |
| `giant`                          | The giant black line. Each entry is one line on tablets; on laptops they run together, and on phones they run down the left edge. | Manuka                |
| `flourish`                       | The outlined italic words that overlap the giant line                                                                             | Louize Display Italic |
| `serif`                          | The very large serif word                                                                                                         | Louize Display        |

Read top to bottom, the opening line, giant line, italic words and serif word should make the whole sentence.

The small grey line in the top banner is separate. It is the bio line, it shows on every page, and it lives in `src/_data/site.json` (`banner`).

Three things to know when changing it:

- **Run `pnpm run fit` afterwards.** The opening line, the giant line and the serif word are sized to fill their space exactly. `pnpm run fit` measures the new words and saves the numbers to `src/_data/textWidths.json`. If you forget, `pnpm run check` tells you.
- **Shorter lines are bigger.** A line always fills the same width, so fewer letters means larger letters and a taller hero.
- **Manuka has few characters.** Letters, digits, comma, hyphen and full stop only. An apostrophe in the giant line works anyway: the site draws it with Manuka's comma, raised into place. Other punctuation would be borrowed from the fallback font, and `pnpm run check` would report it.

The layout has three arrangements, chosen by window width: phone (under 600px), tablet (600 to 899px) and laptop (900px and wider).

## The home page sections

The home page is a stack of sections, listed in order in `src/content/index.njk`. Each has its own file in `src/_includes/partials/` and its own stylesheet in `src/assets/css/components/`.

| Section   | What it is                                                                                              | Its words                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Hero      | Headline, ticker (weather, place, local time, what is playing), page links, the 3D compass in its frame | `headline.json`, `home.json`, `navigation.json`, `images.json` (`hero`)           |
| Letter    | A short signed note on a dark block                                                                     | `home.json` (`letter`)                                                            |
| About     | Sliding heading, quote ticker, bio, card of links, a big black globe behind them                        | `home.json` (`about`), `site.json` (`elsewhere`), `images.json` (`globe`)         |
| Projects  | One row per project on a dark block                                                                     | The files in `src/content/projects/`, `home.json` (`projects`)                    |
| Writing   | The latest blog posts as cards, kept up to date by the server                                           | The blog's own feed, `home.json` (`writing`)                                      |
| Night sky | A band of stippled sky that darkens into the footer, stars and a star chart's arcs (`night-sky.css`)    | `images.json` (`nightsky`)                                                        |
| Footer    | Site map, links, email, copyright, sign-off, and a compass half off the edge (on every page)            | `navigation.json`, `site.json`, `home.json` (`footer`), `images.json` (`compass`) |

Things to know:

- **Formatting inside the words.** Some texts in `home.json` use small tags: `<i>` for the italic serif asides, `<del>` for a struck-out word, `<ins>` for the word that replaces it, `<br>` for a line break and `<a href="...">` for a link. `{email}` is replaced by the email address in `site.json`.
- **Apostrophes in serif text.** The letter, the about heading, project names and post titles are set in Louize, which has only the curly apostrophe (`’`). Blog titles are converted for you. In `home.json`, and in a project's `title`, type the curly one.
- **Projects.** Each file in `src/content/projects/` becomes a row on the home page, a card on the Projects page and a page of its own. The row's name opens near its middle on hover; where it opens is worked out from the name. See "Adding or changing a project" below.
- **Blog posts: a new post shows up by itself, with no deploy**, both in the home page's list and in the About page's piece about the latest post. The site is built with the latest posts, and the live server reads the blog's feed again every 30 minutes (`server/blog.js`). Both pages ask it for the posts (`/api/posts`) and put newer ones in place (`src/assets/js/posts.js`). So within about half an hour of publishing, a visitor sees the new post.
  - **Nothing on the page jumps when that happens.** New posts may take a line more or less, which would push everything after them. So a piece is only changed while it is out of sight below the window: as the page opens, or as soon as the visitor scrolls back up above it (or the window is resized so that it is below). Even then the change is tried first and undone at once if anything in sight moved; the screen is not redrawn in between, so nobody sees the try. A page arriving through a link inside the site is not on the screen yet, so it gets the newer posts straight away. A piece that already says the same is not touched.
  - **On a laptop the About page's piece starts near the bottom of the first screen.** Someone who opens the About page directly and can already see it keeps the built one for that visit; arriving from another page of the site, or on a tablet or phone, they get the newer one.
  - **If the feed cannot be read**, the server keeps answering with the last list it did read, and each page keeps what it has. If the page's script does not run, what it was built with stays.
  - If the blog cannot be reached during a build, the home page's section shows one sentence and a link instead, and the About page leaves its piece out; the build still succeeds. Once the server reads the feed, the pages fill them in.
  - While `pnpm run dev` is running, the build keeps the feed for an hour in `.cache/` (the pages still ask the blog for newer posts).
- **Movement tied to scroll** (the sliding about heading, the bars beside the giant headings, the project rows) runs on tablets and laptops. It is off on phones and for visitors who asked their system for less motion; there, everything sits in its resting place.
- **Project rows start somewhere new on every page load**, so the section never looks quite the same twice. `pnpm run check` uses fixed starting places instead, so its screenshots match from one run to the next.

## The inner pages

Every page except the home page shares three pieces:

- **The small row under the banner** (`partials/page-row.njk`): the version tag, which links home and shows "Go home" beside it on hover; the tagline; and a link back ("Go home", or "All projects" on a project's page).
- **The giant page name** (`partials/page-header.njk`, used through `layouts/page.njk`), with a small framed picture beside it. A project's page has its own top instead: the project's name in very large serif letters.
- **"You are here"** at the top of the footer (`partials/crumb.njk`): the path from the home page down to the current page.

| Page                                   | Its file                            | Its words                                                       |
| -------------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| About                                  | `src/content/about.njk`             | `about.json`                                                    |
| Projects (the list)                    | `src/content/projects.njk`          | The files in `src/content/projects/`, `pages.json` (`projects`) |
| One project                            | `src/_includes/layouts/project.njk` | The project's own file in `src/content/projects/`               |
| Resume                                 | `src/content/resume.njk`            | `pages.json` (`resume`)                                         |
| Credits                                | `src/content/credits.njk`           | `pages.json` (`credits`), `image-credits.json`                  |
| A missing address ("Lost in oblivion") | `src/content/404.njk`               | `pages.json` (`lost`), `navigation.json`                        |

### A page's settings

The top of a page's file (between the two `---` lines) sets:

| Setting             | What it does                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `title`             | The name in the browser tab and in "You are here"                                                               |
| `heading`           | The giant name on the page, if it should differ from the title                                                  |
| `headingSize: long` | Smaller giant letters, for a heading of several words                                                           |
| `frame: square`     | A small square picture frame instead of a wide one                                                              |
| `picture`           | Which picture from `images.json` goes in that frame. Without it the frame is empty                              |
| `frameTone: ink`    | A dark frame, for a picture drawn in the paper colour (the compass)                                             |
| `ruled: true`       | A line under the header, with more room below it                                                                |
| `description`       | The sentence search engines show                                                                                |
| `entrance: true`    | The giant name slides in letter by letter when the page is opened (only the page for a missing address uses it) |

On phones the giant name shrinks until its longest word fits the screen. This is worked out from the number of letters in that word, so no measuring step is needed.

### The page for a missing address

An address that leads nowhere (a mistyped address, an old link from another site) gets the site's own page, "Lost in oblivion", in place of a bare error: the giant name with the compass beside it, a card numbered 404 with a few words and three ways back (Home, Projects, About), and a framed oil lantern, captioned “The search party hasn’t found it either.”

- **The page** is `src/content/404.njk`. The build writes it as `404.html`. Its giant name is the `title` at the top of that file; its other words are in `src/_data/pages.json` (`lost`); the picture is `lantern` in `images.json`, and its caption is `caption` in `pages.json` (`lost`). The words beside Projects and About are the ones from `navigation.json`.
- **To look at it**, run `pnpm run dev` and open any address that does not exist, such as http://localhost:8080/nothing-here/.
- **It is sent with the status 404.** A status is the number a server sends before a page: 200 means "here it is", 404 means "there is no such page". The visitor sees the page either way; the number is what tells browsers and search engines not to treat the address as a real one. The live server does this in `server/index.js`, and `pnpm run dev` does the same by itself.
  - A missing picture, stylesheet or other file gets a plain `Not found` with the same status, not the page.
- **Its name slides in when the page opens**, letter by letter, like the home page's headline. It is the second page with an entrance, and uses the same small script (`entrance: true` at the top of its file asks for it). A missing page is almost never reached by a page change, so without this its letters would never move.
- **A link inside the site that leads to a missing page** also ends here, without a reload: the old page leaves, and "Lost in oblivion" arrives with its letters and cards, at the missing address. `pnpm run check` looks for broken links before every commit, so this should only happen with an old link or a typing mistake.
- **"You are here" on this page** links its last step to wherever the page is being shown (`here: ""` at the top of the file), because it has no address of its own.
- `pnpm run check` tests all of it in three browsers: the status, the page, the entrance, the ways back, and a link that leads to a missing page.

### The About page

Its three framed pictures are named in `src/content/about.njk` (`portrait`, `hourglass`, `nightsky`) and described in `images.json`. The portrait is a grey photo, not pixel art (see "Photos" under "Pictures"). All of its text is in `src/_data/about.json`: the quote under the page's name (`quote`), the portrait's caption, six numbered cards (`who`, `tinkering` (titled "Whereabouts"), `contact`, `watching`, `reading`, `toolbox`), and the words around the latest blog post and the OpenPGP key. The cards number themselves. The card of links is the same list as on the home page (`site.json`, `elsewhere`). The piece about the latest blog post comes from the blog's feed and is brought up to date while the page is open (see "Blog posts" under "The home page sections"); its words around the post are `latest` in `about.json`. If the feed could not be read during the build, the piece is left out until the page gets the post from the server. The picture frames are empty until the images are built.

`<a href="...">` and `{email}` work as in `home.json`.

- **What you watched last and what you are reading** are two small cards, "Last Movie or Series I watched" and "Currently Reading" (`watching` and `reading` in `about.json`). When either changes, change its `text`. Each ends with "Suggest me", a link that opens an email to you with `subject` already filled in (the subject is never shown on the page, so a slash is fine there; the titles are in the serif font, which has none). The link is made by the `mailto` filter (`scripts/lib/mailto.mjs`).
- **The toolbox** is a table of two columns, area and skills, matching the skills on the resume. Add a row as `["Area", "Skills"]`. A table of three columns works too: the third is shown as a grey aside.
- **The quote** (Epictetus) sits right under "About the human", in large serif letters (`--type-saying` in `tokens.css`). Its two halves, `plain` and `italic`, are two lines, the second slanted. It is in the large serif, so no straight apostrophe and no slash. It echoes the "Who" card, which says you keep learning about the things you think you already know.
  - **It has an entrance:** when the page is opened, its two lines slide up into place one after the other, solid, through a window at their top edge, as the page's name does when it arrives (`entrance: saying` at the top of `about.njk`; see "The headline's entrance"). Arriving from another page, the same happens while the name is still sliding in (`pageIn` in `page-changes.js`, `pageChange.pageIn.saying` in `motion.js`). The page's name itself does not move on opening. No entrance for visitors who asked for less motion.
- **The Contact card shows the OpenPGP key**: its fingerprint, key ID, algorithms ("Ed25519 (signing) and Curve25519 (encryption)") and expiry date, a "Download key" button, and the command that fetches it from the domain, in a framed box where one click selects all of it, with a small "Copy" button beside it.
  - **The copy button** (`src/assets/js/copy.js`) copies the command and shows "Copied" for 1.5 seconds (`copied` in `motion.js`), filled with ink like a button under the pointer. It is a real button, so the Tab key reaches it and Enter or Space presses it; screen readers hear "Copy the command", then "Copied". It needs scripts, so it is hidden without them, and the box can still be selected by hand. Its words are `copy`, `copied` and `copyLabel` in `about.json` (`contact.key`). The facts are read from the key file itself during the build, so they cannot drift from the key; only their labels are in `about.json` (`contact.key`). See "The OpenPGP key".

### Adding or changing a project

A project is one Markdown file in `src/content/projects/`. The file's name is the project's address: `watchsheet.md` becomes `/projects/watchsheet/`. The home page, the Projects page and the project's own page are all built from that one file.

The file has two parts. Between the two `---` lines at the top are the project's facts. Below them is the write-up.

```markdown
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

The write-up starts here.
```

| Fact          | What it is                                                                      | Where it shows                                                    |
| ------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `title`       | The project's name                                                              | Everywhere, and in the browser tab                                |
| `description` | One sentence                                                                    | The Projects page, the top of the project's page, search engines  |
| `tags`        | A short list, one per line, each starting with two spaces, a hyphen and a space | The Projects page and the project's page                          |
| `year`        | A year, or words such as `2026 to now`                                          | The Projects page and the project's page                          |
| `link`        | Optional. The address of the code on GitHub, or of the project running live     | "Code: GitHub", or "Live:" and the address, on the project's page |
| `order`       | A number: 1 comes first                                                         | Decides the project's place in both lists                         |
| `image`       | The name of a picture in `images.json`. Optional                                | The frame beside the project on the Projects page                 |

- **To add a project:** copy `_template.md` in the same folder and rename the copy (lowercase, hyphens: `my-new-thing.md`). Fill in the facts and the four sections, and delete the lines starting with `#`. Give it the `order` number of the place it should take, and renumber the ones after it. The template itself is never built into a page (`eleventy.config.js` ignores it).
- **To remove a project:** delete its file.
- **To reorder:** change the `order` numbers. Two projects with the same number are sorted by name.
- `title`, `description`, `tags`, `year` and `order` are required. If one is missing, the build stops and names the file and the fact (`scripts/lib/projects.mjs`).
- `link` is optional. A link to `github.com` shows as "Code: GitHub"; any other link as "Live:" with its address (`aletheia.romitraj.dev`). Without a link that line is left out (My Homelab has none).
- `image` is optional. On wide windows the Projects page has a frame beside every second project (the 2nd, 4th, 6th and so on), and it shows that project's picture. A project in an odd place has no frame, so a picture given to it is not shown anywhere. A project in an even place without a picture gets an empty frame.
- If a title or description contains a colon followed by a space, or starts with a quote mark, wrap it in double quotes: `title: "Watchsheet: the sequel"`.
- A line starting with `#` between the `---` lines is a note to yourself and is never shown.

Writing the write-up:

- Every write-up opens with a line or two, then has four sections: "What it is", "Why it exists", "How it works" (ending with "Built with:" and the tools) and "What I learned". The template has them.
- `## A heading` starts a numbered section. The sections are listed under "Contents" at the top of the page, and each entry there jumps to its section.
- A list (`- item`) and a link (`[words](address)`) work as usual.
- A quote makes a grey note with a bar beside it. Bold words on its first line become its label:

  ```markdown
  > **Note**
  >
  > This project is still growing.
  ```

- Straight quotes and apostrophes are turned into curly ones for you, because the serif font has no straight apostrophe.
- **Do not type a slash** in the running text: the serif font has none, and `pnpm run check` would report a fallback font. Write "test and deploy", not "test/deploy". The tags and the description are in a different font and can contain anything; the `title` is in the serif too, so it follows the same rule.

### Widths on the inner pages

The inner pages follow the same three arrangements as the home page (phone, tablet, laptop), with two extra steps, as on the site this design is modeled on: the grids of cards on the About and project pages stay in two columns up to 999px, and the list of projects stays in two columns up to 1099px.

## Page changes

Following a link to another page of this site does not reload the browser. The banner, the small row under it and the footer stay where they are; only the content between them is swapped, with an animation. A library called Taxi.js fetches the next page and does the swap. Without scripts, links simply load pages the ordinary way.

When a page is first opened nothing animates, with two exceptions: on the home page the headline slides in (see "The headline's entrance" below), and so does the giant name of the page for a missing address. The animations in this section only play when moving from one page to another.

### Which change gets which animation

Every page has a kind, written as `pageKind`. There are three that matter:

| Kind                | Which pages                                                          | Where it is set                                                                     |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `home`              | The home page                                                        | The top of `src/content/index.njk`                                                  |
| `project`           | Each project's page                                                  | Once for all of them, in `src/content/projects/projects.11tydata.js`                |
| `page` (and `list`) | Pages with a giant name on top: About, Resume, and Projects (`list`) | `layouts/page.njk` gives every page that uses it `page`; `projects.njk` says `list` |

Each kind leaves in its own way and arrives in its own way:

| Kind                     | Leaving                                                                                                                                                            | Arriving                                                                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                     | The headline's letters slide out of their lines one after another, then the rest of the top of the page goes piece by piece while the sections below fade in turn. | The headline's letters slide into their lines, then the navigation, the ticker, the note, the picture frame and the introduction follow. Coming from the Projects page the letters arrive one after another; coming from anywhere else they arrive together and the rest follows sooner. |
| A page with a giant name | The name's letters slide up and out while the cards fade as one. On the way to a project the letters leave faster and the cards drift aside.                       | The name's letters rise into place, then the picture frame appears, then the cards one by one, in the order they are written in the page.                                                                                                                                                |
| A project                | The name, description, facts, list of sections and write-up drop away in turn.                                                                                     | The name sharpens letter by letter, the description comes in line by line, then the facts, the list of sections and the write-up.                                                                                                                                                        |

Two exceptions:

- **The home page straight to a project** (a project row on the home page) is a plain fade, 0.2 seconds out and 0.2 seconds in. That is what the site this design follows does.
- **Visitors who have asked their system for less motion** always get the plain fade.

On the site this design follows, About is a plain fade in every direction. Here About and Resume move like the Projects page: that was Romit's choice.

### Where it lives

| File                                     | What it holds                                                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/assets/js/motion.js` (`pageChange`) | Every number: how long each piece takes, when it starts, how far it moves, on what curve. Change timings here.                                                                          |
| `src/assets/js/page-changes.js`          | One function per page leaving or arriving. Each one moves the pieces named in the templates.                                                                                            |
| `src/assets/js/transitions.js`           | Sets up Taxi.js, picks how each kind of page leaves and arrives (`howToLeave` and `howToArrive`), and keeps the small row, the "You are here" line and the page description up to date. |
| `src/assets/js/scroll-memory.js`         | Remembers how far down each page was scrolled, for the back and forward buttons and for reloads.                                                                                        |
| `src/assets/js/split.js`                 | Cuts a heading into letters, or a paragraph into its lines, for the length of an animation, then puts the text back.                                                                    |
| The templates                            | Pieces that move are marked `data-part="..."` (for example `data-part="title"` or `data-part="card"`). The swapped content is the `<main data-taxi-view>` in `layouts/base.njk`.        |

### Things to know

- **A new page that uses `layouts/page.njk` is choreographed without any setup**: its name's letters slide in and out. To make its content arrive piece by piece, put `data-part="cards"` on the box that holds the pieces and `data-part="card"` on each piece, as `about.njk` does. Pieces arrive in the order they are written. A page that uses neither that layout nor a `pageKind` gets the plain fade.
- **Scroll position.** Following a link starts the new page at the top. The browser's back and forward buttons return to where you were on that page, and a reload stays where it was. (The site this design follows does the same on a reload but jumps to the top on back and forward; returning to the old place was Romit's choice.)
- **A link that must load the ordinary way** (a download, such as the resume or the OpenPGP key) needs `data-taxi-ignore` on it: `<a href="{{ downloads.resume }}" data-taxi-ignore>`. Links to other websites, email links and links to a section of the same page are left alone automatically.
- **The small row and "You are here" are in every page's HTML**, hidden on the home page, so the script can show, hide and refill them. Edit them in `partials/page-row.njk` and `partials/crumb.njk` as before.
- **The tickers and the scroll movement are restarted** for each new page, and the local time is filled in again.
- **After a change, keyboard focus moves to the new page's heading** and screen readers are told the page's name.
- **`pnpm run check` clicks through the page changes** in all three browsers: home to Projects, into a project, back out twice, to About, and back with the browser's back button. It reports a reload, a wrong page, animation pieces left behind, or the small row out of step. It then scrolls two pages and checks that back, forward and a reload return to the same place.
- **Nothing may move once a page change has finished.** `pnpm run check` watches each arrival and fails if any letter, any heading's box or the picture frame beside a page name is somewhere else just after the animation than during it, or if the finished page is laid out differently from a fresh load of the same page.
- **No letter may be cut by its own window.** While a heading slides, each letter is shown through a window (a clip-path from `shapes.js`) that opens around the letter's box: a tenth of the box's height above and below it, and half a letter-height to each side. Ink that reaches further out than that is cut off for as long as the animation runs. Two things follow. Anything drawn out of line, like the raised apostrophe, must be moved _inside_ a box that stays in the line (see `.apostrophe` in `base.css`), not by moving the box. And `pnpm run check` photographs every sliding heading with its letters' windows fully open and fails if any ink is missing, naming the letter and where it is.
- **Headings are cut into single letters only while they move.** Afterwards the page's HTML is exactly as it was built. While they are cut, no letter may shift: each word stays whole, on the line where it ends up. `pnpm run check` tests this for every heading on every page at thirteen window widths in all three browsers, so a new project name or page name is covered automatically. If it ever reports "letters that move", the fix is in `src/assets/js/split.js`.

## The headline's entrance

When the home page is opened directly or reloaded, the headline slides in: the letters of the three big lines one after another, and the outlined italic words from the left. It is the same movement as arriving from the Projects page.

Two other pages have an entrance of their own, through the same small script: the page for a missing address (its giant name, `entrance: true`) and the About page (only its quote, `entrance: saying`: a page can name the pieces that enter, and the others stay still). The rest have none.

How it works:

1. A few lines of script in the head of the home page (`layouts/base.njk`) mark the page with the class `intro` before anything is drawn. The styles (`hero.css`) hide the headline while that mark is there, so it never flashes in place first.
2. A small script written into the home page after its content (`src/assets/js/intro.js`, built separately from the main script) waits for the headline's fonts, cuts the lines into letters, starts them sliding and removes the mark.
3. The letters then stay in the page. They sit exactly where the plain text would, so nothing looks different. The plain text is put back at the visitor's first click, tap, key press or turn of the wheel, when the window is resized, or when a link is followed.

Step 3 is there for loading speed, as is the separate small script. Browsers and search engines judge loading speed by Largest Contentful Paint: the moment the biggest piece of content was first drawn. Swapping the letters for plain text when the entrance ends counts as a big new piece drawn late, and waiting for the main script delays the start on phones. The first build did both and made that figure 840ms worse on a slow phone; the current one costs well under a tenth of a second (the numbers are in [decisions.md](decisions.md)).

It cannot leave the headline hidden:

- Visitors who asked their system for less motion get no entrance. The page is never marked.
- Without scripts the page is never marked either.
- The mark is removed after three seconds whatever happens, and at once if anything in the small script fails or the fonts cannot be fetched.

`pnpm run check` tests all of this in three browsers, and that the letters end exactly where a still page has them.

To measure the cost again, run `pnpm run speed`. It loads the home page nine times with the entrance and nine times without, on a simulated slow phone and on a fast laptop, and prints both figures and the difference. Run it after changing the entrance, the fonts or the top of the home page.

To change the entrance's pace, edit `letterTime` and `letterGap` at the top of `src/assets/js/motion.js`. They are shared with the page changes, so both stay in step. To switch the entrance off, remove the script in the head of `layouts/base.njk`.

## The Credits page

`/credits/` thanks the people and services the site rests on, in four numbered cards like the About page's:

1. **Design:** the sentence saying the design is based on henry.codes by Henry Desroches, with a link, and that the code and words are your own.
2. **Photographs:** your sentence, "A huge thanks to these great folks for their breathtaking photos:", then every photo the pictures are made from: what it shows, its title (linked to its page), who took it, where it is shared and its licence. Your own portrait is not listed.
3. **Weather:** "Weather data by Open-Meteo.com", linked to open-meteo.com, and a link to its licence (CC BY 4.0).
4. **Visits:** one sentence saying that visits are counted with Rybbit on your own server, without cookies, with a link to rybbit.com.

Where things are:

- The words are in `src/_data/pages.json` (`credits`). The cards are set in the serif font: use the curly apostrophe and no slashes.
- **The photos come from `src/_data/image-credits.json`**, the same file the build uses to make sure every source picture is on record. Each one there has `subject` (how the page names it: "the black globe"), `title` (the photo's title on its page, with the object's date where the museum gives one), `photographer` (who took or drew it), `collection` (where it is shared: Unsplash, Pixabay, or the Smithsonian museum that keeps the object), `licence` (`Unsplash License`, `Pixabay Content License`, `Public domain` or `CC0`: the build refuses anything else) and `url` (its own page). The build stops if one is missing (`scripts/lib/credits.mjs`, tested).
- **A picture that needs no credit** (your portrait, and the still of the hero's compass, which this site draws itself) is marked `"credit": false` in `images.json` and has no entry in `image-credits.json`, so the page never names it.
- The page is linked from the footer on every page ("Credits", under "Me"). It is not in the hero's list: in `src/_data/navigation.json` it is marked `"footerOnly": true`.

## The resume

The Resume page (`/resume/`) is one card, without a number or title: a line, the email line, a link that opens the PDF and a button that downloads it.

- **The PDF** is `src/assets/files/resume.pdf`. The build copies it to `/resume.pdf`, a plain address with nothing after it. **To update it, replace that file, keeping its name,** and rebuild.
- **It opens in the browser**, readable there, rather than downloading at once: the server sends it as `application/pdf` with `Content-Disposition: inline` (`server/files.js`). The "Download PDF" button asks the browser to save it instead (the `download` attribute).
- **A new version shows at once** although the address never changes: the server tells browsers and Cloudflare to check with it each time (`Cache-Control: no-cache`), and answers "not modified" with no body when they already have the latest version (an ETag: a short tag that changes with the file). See "How files are sent".
- The card's words are in `src/_data/pages.json` (`resume`).
- Both links load the PDF the ordinary way, not as a page change (`data-taxi-ignore` in `src/content/resume.njk`).

## The OpenPGP key

Your public OpenPGP key (for encrypted email to hi@romitraj.dev) is on the site in two ways:

1. **On the About page**, in the Contact card: the fingerprint, the key ID, the algorithms of its two parts (Ed25519 for signing, Curve25519 for encryption), the expiry date, a "Download key" button (`/romitraj-pgp-public.asc`, a plain address) and the command below.
2. **In a Web Key Directory (WKD)**, so that anyone can fetch it straight from your domain with:

   ```bash
   gpg --locate-external-keys hi@romitraj.dev
   ```

   Email programs that support WKD (Thunderbird, Proton Mail and others) find it the same way.

How it works:

- **One file is the source:** `src/assets/files/romitraj-pgp-public.asc`, the armored key as `gpg --armor --export` gives it. During every build, `scripts/lib/pgp.mjs` reads it and:
  - writes it to `/romitraj-pgp-public.asc` for the download link;
  - writes the key in binary form (what `gpg --dearmor` gives) to `/.well-known/openpgpkey/hu/aeii9rmagouy1owpp7e5ftpxjof7h41n`, the address WKD's "direct method" gives `hi@romitraj.dev` (the part before the `@`, hashed);
  - writes an empty `/.well-known/openpgpkey/policy`, which says the directory exists;
  - reads the facts the Contact card shows from the key itself (each part's algorithm and use come from the key's own flags), so they always match it;
  - stops the build if the key has no user ID for the email address in `site.json`.
- **The server** (`server/wkd.js`, through `server/files.js`) sends the two WKD files as `application/octet-stream` with `Access-Control-Allow-Origin: *` (any website may read them), as the WKD standard asks. The address also works with `?l=hi` on the end, which GnuPG adds.
- **`openpgpkey.romitraj.dev` must not exist.** GnuPG first tries the "advanced method" at that name, and only falls back to the direct method above when the name does not resolve. Checked on 2026-11-12: it has no address (Cloudflare answers it exactly as it answers any made-up name). **Never add a DNS record for `openpgpkey`, and never add a wildcard (`*`) record**, or the lookup stops working.
- **To check it after deploying**, in a terminal (the first line makes a throwaway key store, so your own is not touched):

  ```bash
  export GNUPGHOME="$(mktemp -d)"
  gpg --auto-key-locate clear,nodefault,wkd --locate-external-keys hi@romitraj.dev
  rm -rf "$GNUPGHOME"; unset GNUPGHOME
  ```

  It should print your key, with the fingerprint shown on the About page.

- **When the key changes** (a new expiry date, a new subkey, a new key): export the public key again with `gpg --armor --export hi@romitraj.dev > src/assets/files/romitraj-pgp-public.asc`, rebuild, check the Contact card, commit and deploy. **The current key expires on 2029-09-28**: extend it (`gpg --quick-set-expire`) well before then, and replace the file.

## Visitor counting

The live site counts its visitors with Rybbit, running on your own server at analytics.romitraj.dev. Nothing is counted on your own computer.

How it works:

- A few lines of script at the top of every page (`src/_includes/layouts/base.njk`) look at the address the page is being viewed at. Only if it is `romitraj.dev` do they add Rybbit's tag to the page's head, exactly as Rybbit's install page gives it:

  ```html
  <script
    src="https://analytics.romitraj.dev/api/script.js"
    data-site-id="4662ddf4f073"
    defer
  ></script>
  ```

- So the counter is never loaded by `pnpm run dev`, `pnpm start` on your computer, or `pnpm run check`: those view the site at `localhost`. No setting has to be remembered when deploying, and a copy of the site at any other address counts nothing either.
- The address and the site number are in `src/_data/site.json` (`analytics`). To switch counting off, delete that `analytics` entry.

Page changes:

- **The tag is added once per visit.** Moving between pages swaps only the content; the head stays, so the counter's script is never loaded a second time.
- **Each page change counts once.** Rybbit counts a view when the page opens and whenever the browser's history is written to or stepped through. A page change writes to the history exactly once. The site's own note-taking for scroll positions (`scroll-memory.js`) also writes there, without changing the address; it does so in a way the counter does not see, because otherwise opening a page could count twice.
- **A jump within a page counts nothing.** On a project's page, clicking a line under "Contents" jumps to that section and adds `#section` to the address, so the section can be linked to and the back button returns from it. The browser announces such a jump with two events, and Rybbit would count a view for each jump and for each step back or forward between jumps. The same script in the head that adds the counter stops those two events from travelling any further when the address still belongs to the page being shown. The address, the jump itself and the back and forward buttons work exactly as before; only the counter no longer hears about it.
- For that, the content slot of every page says which page it holds (`data-path` on `<main>` in `base.njk`). Do not remove it.

`pnpm run check` tests all of this in three browsers without ever contacting the real counter: that nothing is loaded on this computer, and, with the test browser told it is looking at the live address and a stand-in in place of Rybbit's script, that the tag is right, the script runs once, every page change (by link and by the back button) counts once, and a jump to a section, back out of it and forward into it again count nothing while the address still shows the section.

The server sends no rule that limits which scripts may run (no Content-Security-Policy header), so nothing had to be allowed for analytics.romitraj.dev. If such a rule is ever added, on the server or in Cloudflare, it must allow scripts from and connections to `https://analytics.romitraj.dev`, and the small scripts written into each page.

## Hover and keyboard focus

What each kind of link does under the pointer, and when it is reached with the Tab key. All of it was measured on the design reference, link by link, in three browsers.

| Link                                                                                                                                                                                   | Under the pointer                                                     | With keyboard focus                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------- |
| Navigation links in the hero                                                                                                                                                           | A line draws under the name (0.2s) and the description sharpens       | The same, plus the ring                               |
| Links in the footer, the "Elsewhere" lists, "You are here", the small row under the banner, the bold link that ends a card, the code link on a project's page, the key's download link | A line draws under the words (0.2s)                                   | The ring only                                         |
| A link inside a sentence (about text, cards, a project's write-up)                                                                                                                     | Turns grey at once                                                    | The ring only                                         |
| "View all projects", "Read the blog"                                                                                                                                                   | Underlined at once                                                    | Underlined, plus the ring                             |
| The links at the bottom of the About page's first card, and "Read the post"                                                                                                            | Underlined at once                                                    | The ring only                                         |
| A writing card on the home page                                                                                                                                                        | Its outline darkens at once and a line draws under "Read more" (0.2s) | The same, with the ring around "Read more"            |
| A project card on the Projects page                                                                                                                                                    | Its outline darkens at once and a line draws under "Read more" (0.2s) | Its outline darkens, plus the ring around "Read more" |
| A project row on the home page                                                                                                                                                         | The name opens near its middle and its faint copies sharpen (0.15s)   | The ring only                                         |
| A line in a project's "Contents"                                                                                                                                                       | Turns grey while a line draws under it (0.2s)                         | The ring only                                         |
| The track's title in the ticker                                                                                                                                                        | Nothing (it is already underlined)                                    | The ring only                                         |

- **The ring** is a 2px dashed outline, 2px away from the link: mid grey on paper, a lighter warm grey on the dark blocks (the letter, the projects section, the footer). The rule is in `base.css` and the two colors are in `tokens.css` (`--color-focus`, `--color-focus-on-ink`). A new dark block needs one line in that rule in `base.css`, or its ring will be the pale one.
- **Its shape is the reference's; its colors are stronger.** The reference's ring is too faint to see easily, so this one uses greys that differ from their background by a little more than 3 to 1, the least that accessibility guidelines ask of a focus ring. `pnpm run check` works the two contrasts out from `tokens.css` and fails if either falls below 3 to 1, so a new color cannot quietly make the ring too faint again.
- **Lines that break around the tails of letters.** In the "Elsewhere" lists, a project's "Contents" and the Projects page's "Read more", the drawn line does not run through the tail of a g, p or y: it stops beside it. The letters carry an outline in the color of whatever is behind them, painted under the letters themselves, and the line sits under that outline. At rest the outline cannot be seen. The color behind is `--behind`: paper unless a block says otherwise, and the footer sets it to ink. If such a link is ever placed on another background, set `--behind` there to that background's color.

## The site's icon and the share image

Two things every page carries for the world outside the page.

### The icon

The small picture in a browser tab, in bookmarks and on a phone's home screen is a compass: the one in the footer, reduced to a ring, four long points, four short points and a hub. (It was a water drop for a few hours on 2026-10-11; you chose the compass from three options.)

- **The drawing** is this site's own: `src/assets/icons/site-icon.svg`, on a 64 by 64 grid. Its sizes were chosen so that at 16 pixels the ring is exactly one pixel thick and sits on whole pixels. Each shape in the file says what it is with a class (`ring`, `mark` for the points, `hub`), and the build colors them.
- **The build makes every file from it** (`scripts/icons.mjs`), in the site's ink and paper colors from `tokens.css`:

  | File                                               | What it is                                                       | Who uses it                                                                |
  | -------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
  | `favicon-light.svg`                                | The ink compass as a drawing                                     | Light tabs in Chrome, Edge, Firefox, and Safari from version 26            |
  | `favicon-dark.svg`                                 | The paper compass as a drawing                                   | Dark tabs in the same browsers                                             |
  | `favicon.ico`                                      | The ink compass at 16 and 32 pixels, in the old icon format      | Older Safari, and anything that looks for an icon without reading the page |
  | `apple-touch-icon.png`                             | A paper compass on an ink square, 180 pixels                     | An iPhone or iPad home screen                                              |
  | `icon-192.png`, `icon-512.png`, `site.webmanifest` | The same square at two sizes, and the small file that names them | An Android home screen                                                     |

- **How the tab icon follows light and dark** (the way GitHub does it): every page names `favicon-light.svg`, and a short script in its head (`src/_includes/layouts/base.njk`) asks the browser whether it is set to light or dark ("prefers-color-scheme"). In dark it puts `favicon-dark.svg` in its place, and it swaps them again the moment you switch, with no reload. Without scripts the ink compass stays. The script follows the browser's light or dark setting (or the system's, when the browser follows the system); a custom-colored browser theme is not something a page can see.
- **Why the first version did not switch:** it was one drawing with a rule inside it for dark tabs. Chrome and Edge draw a tab icon once, when the page loads, and keep that picture: the rule is only looked at again after a reload, and their store of icons can keep the old picture even then. Safari ignores such a rule altogether. A script that changes the page's icon line is something all of them notice at once.
- **To change the icon**, edit or replace `site-icon.svg` (keep the 64 by 64 grid and the three class names: anything marked `ring` or `mark` takes the main color, anything marked `hub` the other) and rebuild. The README's title icon (`docs/readme/compass-light.svg` and `compass-dark.svg`) is a copy of the same drawing in each color and has to be changed by hand. To change its colors, change the ink and paper colors in `tokens.css`; the whole site follows.
- **Browsers keep icons for a long time.** Each icon's address carries a fingerprint, so a new icon is fetched at once, but a tab that is already open may show the old one until it is reloaded.
- **To see it**, look at the tab of http://localhost:8080 while `pnpm run dev` runs. To see the dark version, switch your system (or the browser) to its dark appearance: the tab changes at once.

### The share image

When a link to the site is pasted into WhatsApp, LinkedIn, X or a similar app, the app shows a preview card: a picture, the page's title and its description.

- **The picture** is `src/assets/img/share.png`, 1200 by 630 pixels: the headline in the site's own type beside the hero's compass at rest, on its painted backdrop, with the gradient bar's colors along the top. Every page uses the same picture.
- **The title and description are each page's own**: the same `title` and `description` that sit at the top of the page's file (for a project, its title and description).
- **The tags** that the apps read are written into every page's head by `src/_includes/layouts/base.njk`: the Open Graph tags (`og:title`, `og:description`, `og:url`, `og:image` and a few more), which nearly every app reads, and X's own (`twitter:card` and the rest). Addresses in them are full addresses, starting with `https://romitraj.dev`, because the apps do not know which site a tag came from.
- **To make the picture again**, run:

  ```bash
  pnpm run share
  ```

  It first draws the hero's compass at rest with the site's own WebGL code and saves it as `src/assets/img/source/hero-compass.png` (see "The hero's compass"). Then it builds the site, draws the card in a real browser with the licensed fonts, and saves it. It also retakes `docs/screenshot.png`, the picture at the top of the README, from the site running on this computer (so that one shows the weather and the track of the moment). Run it after changing the headline, the fonts, the colors or the compass, look at the three pictures, and commit them.

- **Why it is a command and not part of the build:** the card needs the licensed fonts, which are on your computer and not on the live server.
- **The words describing the picture** for people who cannot see it are `shareImageAlt` in `src/_data/site.json`.
- **To preview the card once the site is live:** paste the page's address into LinkedIn's Post Inspector (https://www.linkedin.com/post-inspector/, free, needs a LinkedIn login). It shows the card and the tags it read, and asks LinkedIn to fetch the page afresh. For WhatsApp, send the link to yourself. Apps keep a card for days, so an old one may linger after a change.

`pnpm run check` confirms on every built page that the icon files are named and exist, that the tags carry the page's own title, description and full address, and that the share image is 1200 by 630 pixels and light enough; and in each browser that the page names the ink compass while the browser is light and the paper compass while it is dark, that it swaps them as soon as the browser changes (with no reload), that the right one stays after a page change and the ink one without scripts, and that each drawing is what it should be.

## Links that leave the site

Every link to another website opens in a new tab. The build does this by itself (`eleventy.config.js`, "linksThatLeave"): it goes over each finished page and gives every such link `target="_blank"`, `rel="noopener noreferrer"` (the new tab cannot reach back into this one, and the other site is not told where the visitor came from) and the words "(opens in a new tab)", hidden from the eye but read out by screen readers.

- It covers links written in templates, in the data files and in Markdown. There is nothing to remember when adding a link.
- "Another website" means any address that is not on romitraj.dev itself, so the blog (blog.romitraj.dev) counts.
- Links within the site, links to a section of the same page and email links are left alone.
- The hidden words are in `src/_data/site.json` (`newTabNote`).

## The hero's compass

The picture in the hero is an old pocket compass in 3D, drawn in the same two-tone pixels and the same 3-pixel blocks as every other picture. It has a polished case with rounded edges, a knurled bezel, a crown and a bow on top, a dial with a track of marks and a raised rose, a blued needle with a jewelled cap, a domed glass, and a back with a raised boss and two turned grooves. Only the compass shows: there is nothing behind it but the paper.

How it moves (Romit's request, 2026-11-12, with Resend's 3D cube as the model):

- **It does not react to the mouse moving over it.**
- **Left alone, it turns on its own:** it holds still for a moment after it appears (so it first matches the still picture exactly), then eases into a slow tumble, mostly about its upright, around an axis that wanders a little, so you see its face, its edge and its back in turn.
- **Click or touch it and drag, and it turns any way you drag, all the way round,** as far as you drag. Let go and it carries on with the speed it had, then slows back to its own pace.
- On a phone, a finger on the compass turns it instead of scrolling the page. That is only true on a round handle over the compass (`.hero__grip` in `hero.css`, `touch-action: none`); a finger anywhere else in the frame scrolls as usual. The mouse pointer shows a hand there.
- Its needle always swings back toward north (up the window), pulled hardest when the dial faces you and barely when it is edge on, and the pivot drags it along a little when the case spins on its face. So it wobbles as the compass tumbles.

How it works:

- **WebGL**, the graphics part of every browser, draws it in two steps. No library: a few hundred lines of the site's own code.
  1. It draws the compass three times finer than the frame's blocks, into a picture the browser keeps out of sight, in smooth shades of grey. Polished metal reflects a soft studio: a large soft light above on the left, a narrow light on the right, a dim room. That reflection is what makes metal look like metal, and the highlights slide over the case as it turns. Painted parts (the dial, the rose) take the light softly. The bezel and the crown get fine grooves, the dial is a little darker under the bezel's rim, the needle casts a soft shadow on the dial, the glass adds its reflections and dulls the dial a little toward its rim, and the back catches a broad light from behind you so its grooves show.
  2. It averages each block's nine samples and turns the result into ink or paper with the four by four pattern the build calls `fine` (sixteen steps between ink and paper, so curved metal shades smoothly). Where less than half a block is covered, it stays clear: paper.
  - The canvas is exactly as many pixels as the hero's picture has blocks (152 by 190), enlarged without smoothing like the other pictures. The still picture is stretched to the frame the same way (`object-fit: fill` in `hero.css`), not cut to fit like other pictures: the frame is a fraction of a pixel away from four by five, and cut to fit, Firefox showed the two a pixel apart.
  - The compass turns about the middle of the whole thing, case, crown and bow together, and the view reaches far enough across (`view` in `motion.js`) that it never leaves the frame, whichever way it turns. That is why it sits a little smaller in the frame than it did when it could only lean.
  - `src/assets/js/compass-model.js`: the shapes, as triangles: the case and its back, the bezel, the crown and the bow, the dial with its marks and rose, the needle, and the glass. Each corner has a tone from 0 (ink) to 1 (paper), what it is made of (painted or polished metal) and, for knurled metal, how many grooves run around it. Tested by `pnpm test`.
  - `src/assets/js/compass-motion.js`: the turning, as plain numbers: how it turns on its own, how a drag turns it and how it coasts after, and the needle's swing. Tested by `pnpm test`.
  - `src/assets/js/compass.js`: the drawing (the lights, the materials, the two steps), the drag, and starting and stopping it.
  - `src/assets/js/motion.js` (`compass`): every number: the resting pose, `idle` (how fast it turns on its own, how long it waits first, how slowly it eases in, how much its axis wanders), `drag` (how far a pixel of dragging turns it, the fastest throw, how long a throw takes to slow down), `view`, the needle's spring, and the two thresholds that turn shading into ink or paper.
- **The still picture comes first.** Every visitor first gets the still picture, `hero` in `images.json`, made from `src/assets/img/source/hero-compass.png`: the compass at rest, drawn by the same code. Once the page has loaded and the browser has a moment to spare, the canvas is laid over it and takes its place, block for block the same, and a moment later it starts to turn. So the compass costs nothing in loading speed.
- **Where it cannot run, the still picture stays:** without scripts, without WebGL, for visitors who asked their system for less motion (and the moment they ask for it), and if the graphics card ever drops the drawing.
- **Screen readers** read the still picture's description; it stays in the page, unseen, and the canvas and the handle are hidden from them.
- **It sleeps when it can:** it draws nothing while the hero is out of sight or the tab is in the background. It is stopped and its canvas removed when you leave the home page, and started again when you come back.

To change it:

1. Change the shapes in `compass-model.js` or the numbers in `motion.js` (`compass`), and look at it with `pnpm run dev`.
2. Run `pnpm run share`: it draws the new still picture (and the share image and the README's screenshot) from the same code. Commit the three pictures with the change, or the still and the live compass will no longer match.

The look is the reference's pixel style at the level of finish of a modern product site: it was set against Resend's 3D cube (resend.com), looked at only, never copied. See `docs/decisions.md`.

`pnpm run check` tests it in three browsers, with the page's clock stopped and moved on by hand so the result never depends on how busy the computer is: that the canvas takes the still picture's place exactly, without moving the frame; that its first drawing is the still picture (at most 1% of the blocks may differ, since each browser's graphics round the shading slightly differently); that only plain paper surrounds it; that moving the mouse over it changes nothing; that it turns on its own and keeps turning; that a drag turns it and it carries on after; that a finger on it turns it rather than scrolling; that it starts again after a page change and leaves no canvas elsewhere; and that with less motion, without scripts and without WebGL only the still picture shows.

## Pictures

Every picture on the site is made by the build from a file in `src/assets/img/source/`: a photo of an old machine or instrument (`.jpg`), your portrait (`.jpg`), a drawing (`.svg`), or the still of the hero's compass (`.png`, see "The hero's compass"). The build turns each one into a tiny two-tone picture made of square pixel blocks, in the ink colour on the paper colour, and writes it into `_site/assets/img/`. The one exception is a picture marked `"kind": "photo"` (the portrait), which stays a photo: see "Photos" below. The finished pictures are never committed; only the sources are.

The list of pictures is `src/_data/images.json`. One entry looks like this:

```json
"theodolite": {
  "source": "theodolite.jpg",
  "alt": "An old surveyor’s theodolite on a wooden tripod: a small brass telescope on a round stand, the kind used to map new land.",
  "across": 96,
  "shape": "4:5",
  "crop": { "x": 0.5, "y": 0.5, "zoom": 1.1 },
  "black": 0.25,
  "white": 0.7,
  "stretch": true,
  "cutout": 0.03
}
```

| Setting          | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`         | The file in `src/assets/img/source/`. Two pictures may use the same file with different crops                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `alt`            | The short description screen readers read aloud. Every picture needs either this or `decorative`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `decorative`     | `true` for a picture that is only decoration (the footer's compass, the night sky band). Screen readers pass over it in silence. The build stops if a picture has neither `alt` nor this, or both                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `across`         | How many pixel blocks wide the picture is. Fewer blocks are chunkier. Most have 74 to 288; the hero has 152, about 3px a block at laptop size                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `shape`          | Cuts the source to this shape, written width:height. Without it the source's own shape is kept                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `crop`           | Which part to keep: `x` and `y` are the middle of the part (0 is the left or top edge, 1 the right or bottom) and `zoom` enlarges it. A `zoom` below 1 shows the whole photo smaller, with room around it in the photo’s own ground colour: for an object that a wide frame would otherwise cut. Then `x` and `y` name the point of the photo that sits in the middle of the frame, as far as the room allows (the photo is moved, never cut): the knight emblem's `x` of 0.475 moves it right of the middle, its helmet clear of the card of links                                                                                                                                                             |
| `black`, `white` | Greys darker than `black` become solid ink and greys lighter than `white` solid paper (0 is black, 1 is white). What lies between becomes a checkerboard. Bring the two closer together for harder contrast; raise both to make the picture darker                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `sharpen`        | Crisper edges before the picture is reduced to two tones. 0 to 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `gamma`          | Above 1 darkens the middle greys before the picture is reduced to two tones, below 1 lightens them. No picture uses it at the moment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `cutout`         | Removes a plain backdrop around an object, so only the object is drawn, on paper, as the reference cuts out its subjects. The number is how far apart two neighbouring greys of the backdrop may be (0.03 suits most photos on a plain wall or table). The backdrop is found from the photo’s edges inward, so a light spot inside the object stays (`plainBackdrop` in `scripts/images.mjs`). Used by every photo here, all shot on plain grounds. A large object with smooth highlights may need a smaller number, or the search creeps along a highlight into the object; a bigger one (an earlier engine photo tried 0.06) eats into the object itself. It also cuts a black backdrop away like a white one |
| `pattern`        | `checker` (the default), `fine` (more steps, for smooth gradients in a drawing) or `grain` (scattered dots like stippling, used by the night sky band)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `tones`          | `ink` (the default) draws the dark parts in ink. `paper` draws the light parts in the paper colour and leaves the rest clear, for a picture that sits on a dark background (the compass)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `despeckle`      | `true` removes lone specks of ink: a block with no ink touching it and almost none near it. Used by the portrait, whose cut-out left a faint outline that turned into scattered dots. Even tones, lines and edges are kept (`removeSpecks` in `scripts/images.mjs`)                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `kind`           | `"photo"` keeps the picture a photo, in shades of grey, instead of pixel art. See "Photos" below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `credit`         | `false` for a picture that needs no entry in `image-credits.json` (the portrait, the hero's compass). Every other photo needs one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `ground`         | `paper` (the default) or `clear` (see-through where the picture is light)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `stretch`        | `true` spreads the photo's greys over the whole range from black to white first (a photo on a grey backdrop often has no true black or white)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `fade`           | Fades the picture into the paper toward its edges, in an oval, like the vignettes in old books. A number is the share of the way from the middle over which it fades (0.12 is a soft edge). Or `{ "amount", "x", "y", "size" }`: `x` and `y` move the oval's middle (0 to 1) and `size` below 1 makes it smaller, with paper all round. No picture uses it at the moment (`fadeKeeps`)                                                                                                                                                                                                                                                                                                                          |
| `repeat`         | Repeats the picture side by side, as one motif makes a band, the way the reference repeats its thorn branch: `{ "count", "gap", "part" }`, with `gap` the space between copies as a share of one copy's width and `part` the piece of the source to repeat (`x`, `y`, `width`, `height`, as shares). The band is then cropped to the frame like any picture. Used by the rows of theodolites and typewriters (`repeatLayout`, `partRegion`)                                                                                                                                                                                                                                                                     |

Where each picture is shown:

| Picture         | Source                                                         | Where                                                                             |
| --------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `hero`          | hero-compass.png (drawn by the site, see "The hero's compass") | The frame in the hero, under the 3D compass                                       |
| `armour`        | armour.png, a drawn knight's emblem                            | Behind the home page's about section, large                                       |
| `nightsky`      | night-sky.svg                                                  | The band above the footer on the home page, and the wide frame on the About page  |
| `compass`       | compass.svg                                                    | The footer on every page, and beside the About page's name and the missing page's |
| `theodolites`   | theodolite.jpg, its head repeated                              | Beside the Projects page's name                                                   |
| `magnifier`     | magnifying-glass.jpg, an old magnifying glass                  | The frame beside Aletheia on the Projects page                                    |
| `computer`      | computer.jpg, an Apple Lisa 2 (1980s)                          | The frame beside My Homelab on the Projects page                                  |
| `portrait`      | portrait.jpg (a photo)                                         | The About page                                                                    |
| `camera`        | camera.jpg, a Kodak box camera                                 | The About page's small frame, beside the portrait                                 |
| `keys`          | key.jpg, an ornate skeleton key, repeated                      | Beside the Resume page's name                                                     |
| `theodoliterow` | theodolite.jpg, its head repeated in a longer row              | Beside the Credits page's name                                                    |
| `theodolite`    | theodolite.jpg, the whole instrument on its tripod             | The page for a missing address                                                    |

**How they fit together** (Romit's request, 2026-11-12, starting fresh: "look at henry.codes and see how all of Henry's images work so well together", with one rule: **no living things in any picture**). The reference's pictures are photos of hard, man-made things (a stone gargoyle, a suit of armour, a spiked collar, barbed wire, a city skyline), each cut out of its background, drawn in heavy black with bright highlights, and one spiky motif is repeated as a band in every wide strip. This site does the same with its own family: **photos of old machines and instruments, shot on plain white or grey grounds** (a surveyor's theodolite, a Kodak box camera, a magnifying glass, an early Apple computer, a skeleton key), several of them museum photos. They are used the same three ways: one big shape behind the about text that grabs the eye at once (since 2026-11-13 a knight's emblem, Romit's choice: see below), single objects in the small frames, and one object repeated as a band in the wide strips (a row of theodolites, and on the Resume page a row of keys). A new picture should come from the same family: an old machine or instrument, no people, animals or plants, on a plain ground.

**The one exception is the big piece** (Romit, 2026-11-13: "a medieval knight's armour", from Unsplash or any similar site, and later that day his pick of three pictures he supplied): a drawn knight's emblem from Pixabay, a closed helmet with a plume between two spiked shoulder guards. It is the same kind of subject as the reference's own picture there, chosen by Romit knowingly; the picture is a different one, licensed and credited. It is drawn smaller than its frame and moved right (`zoom` 0.63, `x` 0.475, `y` 0.746), so the whole emblem shows, on laptops its helmet stands in the open between the text and the card of links, and on tablets its left spike stays clear of the text; on phones the card covers most of it, as it covered the pictures before.

**What works and what does not** (learnt choosing these, about sixty tried): a dark object with a strong outline on a plain light ground works best; the backdrop is cut away and only the object is drawn. An object in a room, on a dark ground, or close-up machinery with no outline turns to mush. A light part the same grey as the backdrop disappears with it (a pair of binoculars lost its white strap and became two blobs). A big piece needs its whole shape in its top half, because on laptops only that half shows, and it must be striking, not merely clear: a plain desk globe was tried there and found bland. Frames change shape with the window (a strip runs from about 3 to 7.5 times as wide as tall), and the picture is cropped to fill them: a band suits a strip at any width, and an object in the middle with room around it suits a frame.

### Changing a picture

- **To swap a picture:** put the new file in `src/assets/img/source/`, change `source` (and `alt`) in `images.json`, and add it to `image-credits.json`. Then adjust `crop`, `black` and `white` while `pnpm run dev` is running: the picture is redone each time you save.
- **Where to find more:** Unsplash (unsplash.com), where the Smithsonian also shares its museum photos (unsplash.com/@smithsonian, "Public Domain & Unsplash License"). Searching for an object with "white background" finds the plain-ground photos that work here. Check the photo's page says "Free to use under the Unsplash License" (not Unsplash+, which is paid), and write down its title, the photographer and the address of its page. For a Smithsonian photo, its description names the object, its date and the museum.
- **To add a picture:** add an entry with a new name (with an `alt`, or `"decorative": true` if it is only ornament), then show it with `{% picture "name" %}` in a template, or name it as a project's `image` or a page's `picture`.
- **The pictures are free to use** (the Unsplash License, the Pixabay Content License for the knight's emblem, or public domain for the Smithsonian's); the portrait is yours and needs no credit (`"credit": false`).

### Photos

A picture marked `"kind": "photo"` (the About page's portrait) stays a photo. `scripts/lib/photo.mjs` turns it into shades of grey (baked into the files, not a filter in the styles), cuts it to its `shape` and `crop`, and makes it at each of its `widths` (240, 480, 720 and 960 pixels) in three formats:

- **JPEG XL and AVIF**, two newer formats that make much smaller files than JPEG. Browsers that know them take one; the page lists the smaller of the two first (for the portrait AVIF: 24 KB against JPEG XL's 32 KB at 480 pixels).
- **JPEG**, last, for any browser that knows neither.

**Same quality in every format.** Each format is saved at the lowest quality setting whose result still scores `target` (0.98) on SSIM, a standard measure of how close a picture is to the original (1 is identical). So the three look the same and only their sizes differ. The search tries a few settings, which takes about 25 seconds for the portrait; the results are kept in `.cache/photos/` and reused until the photo or its settings change, so later builds take a second.

**Sharp on every screen.** The page tells the browser how wide the photo is shown (`sizes`, in `src/content/about.njk`), and the browser fetches the smallest file that is still sharp there: 240 pixels on an ordinary laptop screen, 480 on a sharper one, 720 on a phone.

To change the portrait, replace `src/assets/img/source/portrait.jpg` (keep the name) and rebuild. To change its framing, change `crop` in `images.json`. On phones and tablets its frame is square and shows its top, the face (`about-page.css`).

JPEG XL is made by `@jsquash/jxl` (the libjxl encoder, as WebAssembly), AVIF and JPEG by sharp. Safari and Chrome (from version 155) show JPEG XL; Firefox is still switching it on; every current browser shows AVIF.

### Credits

`src/_data/image-credits.json` lists, for every source picture, what it shows, its title, artist, year, the collection that keeps it, its licence and its page, and the Credits page is built from it (see "The Credits page"). Public domain and CC0 need no credit, but the record is kept anyway, and the build stops if a picture is used without an entry or with any other licence.

The drawings (`compass.svg`, `night-sky.svg`) were made for this site and need no credit. They are ordinary SVG files in shades of grey and can be edited in any drawing program. Do not put text in them: the build would draw it with whatever fonts the computer has, and the live server has different ones.

### How they are shown

- **Three formats, the smallest offered first.** Each pixel picture is saved without any loss as PNG, JPEG XL and AVIF (`scripts/lib/formats.mjs`). Each file is read back and must give exactly the same pixels, or it is not used. The page offers the formats that came out smaller than the PNG, smallest first, in a `<picture>` tag, with the PNG last for every other browser. In practice JPEG XL wins for most pictures (about a third smaller than PNG), the PNG for the two busiest ones, and AVIF never: for two-tone pixel art it comes out two to three times larger than the PNG. Browsers that show JPEG XL (Safari, and Chrome from version 155) take it; Firefox takes the PNG. The `pnpm run build` log does not print the sizes; `node scripts/images.mjs` does.
- **One pixel of the file is one block on the page.** The browser enlarges the file without smoothing (`image-rendering: pixelated` in `base.css`), which keeps the edges hard and the files tiny. (A photo is the exception: it is shown smooth, at the width that suits the screen.)
- **Nothing moves when a picture arrives.** Every picture is laid over a box whose size is already fixed by the styles, and its width and height are written into the page. `pnpm run check` tests this on every page in three browsers.
- **Pictures below the top of a page are fetched only when they come near the window.** The hero picture and the one beside a page's name are fetched at once.
- **At some window sizes a block is not a whole number of screen pixels**, so now and then one column of blocks is a pixel wider than its neighbours. This is how hard-edged pixel pictures behave at a fluid size.
- **The compass in the footer rises by 14 pixels** as the footer scrolls into view (`ornamentDistance` in `motion.js`), on tablets and laptops.

## The live widgets

The status ticker in the hero shows four things: the weather in Bangalore, the coordinates and city, the local time, and what is playing on Spotify.

```
21°C, CLEAR @ N 12° 58′ E 77° 35′ (BANGALORE, INDIA)  |  6:39 AM  |  Elastic Heart, Sia
```

(Each `|` stands for the short drawn line between two pieces, and Spotify's icon sits before the track.)

| Piece                                       | Where it comes from                                        | How fresh                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Local time                                  | Worked out in the visitor's browser                        | Every minute                                                                              |
| Weather                                     | The site's server asks Open-Meteo (`server/weather.js`)    | The server keeps an answer for 15 minutes                                                 |
| Now playing                                 | The site's server asks Spotify (`server/spotify.js`)       | The server keeps an answer for 30 seconds                                                 |
| The blog's posts (home page and About page) | The site's server reads the blog's feed (`server/blog.js`) | The server keeps the list for 30 minutes; see "Blog posts" under "The home page sections" |

How it fits together:

- The page never talks to Open-Meteo, Spotify or the blog itself. It asks this site's own server three small questions, `/api/weather`, `/api/now-playing` and `/api/posts` (`server/api.js`), and the server asks the services. That is what keeps the Spotify keys out of the page.
- Because the server keeps each answer for a while, a thousand visitors cause the same handful of requests as one.
- **Every piece fails quietly.** If a service is down, slow (more than 5 seconds), or its keys are missing or expired, the server answers "nothing" and the page hides that piece. The rest of the ticker carries on. Nothing is shown as an error.
- When nothing is playing (or it is paused, or it is a podcast), the last track played is shown instead. Screen readers hear "Now playing on Spotify:" or "Last played on Spotify:" before it.
- **All three work in `pnpm run dev` too**, as well as with `pnpm run build` and `pnpm start`.
- The weather needs no key and no account. Open-Meteo is free for sites without ads or subscriptions, up to 10,000 requests a day; this site makes at most 96.

These are there because Spotify's terms ask for them. Do not remove them:

- **Spotify's icon before the track** (at least 21px across), **the title linking to that track on Spotify** (it opens in a new tab), and **the title and artists written exactly as Spotify gives them**, not in the ticker's capitals. Spotify's design rules ask for all three wherever its content is shown.

The weather's source is credited on the Credits page ("Weather data by Open-Meteo.com", with links to Open-Meteo and to its CC BY 4.0 licence), not in the ticker. Open-Meteo's licence asks for that credit, so do not remove it from the Credits page while the weather is shown.

### Spotify: the first setup

This was done on 2026-10-11. The steps are here for a new computer or a new Spotify account.

1. **Create the app.** On https://developer.spotify.com/dashboard, logged in with the Spotify account whose listening should show, create an app. Any name and description. Under Redirect URIs enter exactly `http://127.0.0.1:8888/callback`. If asked which API you will use, tick Web API.
2. **Put its two keys in `.env`.** Copy `.env.example` to `.env` if there is none. In the dashboard open the app, then Settings. Paste the Client ID after `SPOTIFY_CLIENT_ID=` and the Client secret (behind "View client secret") after `SPOTIFY_CLIENT_SECRET=`. No spaces, no quotes.
3. **Get the refresh token.** Run `pnpm run spotify`. Your browser opens Spotify's approval page; click Agree. The script saves `SPOTIFY_REFRESH_TOKEN` in `.env` without showing it, tests it, and prints the last track you played and the date the token stops working.

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

1. Open a terminal in the site's folder:

   ```bash
   cd ~/"My Codes/Personal Website/romitraj.dev"
   ```

2. Run:

   ```bash
   pnpm run spotify
   ```

3. Your browser opens Spotify's approval page. Log in with your Spotify account if asked, and click **Agree**.
4. The browser shows a page saying **Saved**. Close it.
5. The terminal prints three lines: that the token was saved, the last track you played (proof that it works), and the new end date. Write the new end date into your calendar.
6. Open the file to copy the new token:

   ```bash
   kwrite .env
   ```

   Select everything after `SPOTIFY_REFRESH_TOKEN=` on that line (a long string of letters and digits) and copy it. Do not change the file. Leave the editor open until the next part is done.

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
16. Close the editor without saving.

Notes:

- The tab names in steps 9, 12 and 13 are from Dokploy's documentation as of October 2026. The save button on the Environment tab is easy to find (see "What your dashboard showed" under "Deploying with Dokploy").
- The Client ID and Client secret do not change. Only the refresh token is renewed.
- If `pnpm run spotify` says the Client ID or secret is wrong, or Spotify's page shows an error about the redirect address, the app's settings on https://developer.spotify.com/dashboard have changed: see "Spotify: the first setup" above.
- If the Client secret ever leaks, open the app's Settings in Spotify's dashboard, rotate the secret, put the new one in `.env` and in Dokploy's Environment tab, then do all the steps above.

### If a widget is missing

| What you see                                                                 | Likely cause                                                                | What to do                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No now-playing line, locally                                                 | `.env` is missing one of the three Spotify values                           | Check `.env`; run `pnpm run spotify`                                                                                                                                                                                                                                                                         |
| No now-playing line, after it worked for months                              | The refresh token is 6 months old                                           | "Spotify: every 6 months" above                                                                                                                                                                                                                                                                              |
| No now-playing line, and Premium has lapsed                                  | Spotify switches the app off                                                | Resubscribe                                                                                                                                                                                                                                                                                                  |
| No weather                                                                   | Open-Meteo is unreachable                                                   | Wait; it comes back by itself within a minute of the service returning                                                                                                                                                                                                                                       |
| Neither, with `pnpm start`                                                   | The site was not built first                                                | `pnpm run build`, then `pnpm start`                                                                                                                                                                                                                                                                          |
| A new blog post is not on the home page or the About page after half an hour | The server could not read the feed, and keeps showing the last list it read | Open https://blog.romitraj.dev/rss.xml: the post must be in it. The server tries again every 5 minutes. If the post is there, check Cloudflare's IP Access rule for your server ("Deploying with Dokploy", step 1.5): without it Bot Fight Mode blocks the server, for example after its IP address changed. |

To see what the server answers, open http://localhost:3000/api/weather, http://localhost:3000/api/now-playing or http://localhost:3000/api/posts while `pnpm start` is running. An empty page means "nothing to show".

## Fonts

The site uses four licensed font families. Their files are not in this repository.

### The licensed fonts

- The original files live in `../romitraj-private/fonts/source/`. Nothing ever edits them.
- `pnpm run fonts` and `pnpm run fonts:fallback` run Python scripts (`scripts/fonts.py`, `scripts/fallback_fonts.py`) through `scripts/python.mjs`. The first time, and whenever `scripts/requirements.txt` changes, it makes a Python environment in `.venv` inside the project and installs the two packages listed there (fontTools and brotli) into it, without keeping pip's download cache. Nothing is installed anywhere else. To start afresh, delete `.venv`.
- `pnpm run fonts` reads the list in `src/_data/fonts.json`, keeps only Latin characters, and writes small WOFF2 files to `../romitraj-private/fonts/web/`. Running it twice gives identical files.
- It also prints which everyday characters each font cannot draw. Read that list: two of the families have small character sets (see "Missing characters" below).
- It writes a short fingerprint of every file to `src/_data/fontVersions.json`. The pages add it to each font's address (`manuka-black.woff2?v=e281303c`). When a font changes, its fingerprint changes, so browsers fetch the new file instead of a saved old one. Do not edit this file by hand; commit it whenever it changes.

After `pnpm run fonts` changes anything, commit both repositories: the fonts in the private one, `fontVersions.json` in this one.

### Where the pages load them from

The address is chosen automatically:

- On a computer that has `../romitraj-private/fonts/web/`, the build copies the fonts into `_site/fonts/` and the pages load them from `/fonts/`. This covers `pnpm run dev`, `pnpm run build` with `pnpm start`, and `pnpm run check`.
- Anywhere else, including the live server, the pages load them from the font site named in `site.json` (`fontsUrl`).
- To force an address, set `FONT_BASE_URL` in `.env`.

### How they appear on screen

- The four fonts used at the top of the page are preloaded: the browser starts fetching them straight away. Which ones is set by `"preload": true` in `fonts.json`.
- While a licensed font is still arriving, its text stays hidden instead of showing in a different font first. With preloading this is normally too short to notice. On a very slow connection the text appears a moment after the lines and boxes around it.
- If a font has not arrived after about 3 seconds, or fails, the fallback font is shown.

### The fallback fonts

Free fonts under the SIL Open Font License, kept in `src/assets/fonts/` with their license files: Anton stands in for Manuka, Cormorant for Louize and Louize Display, Inter Tight for Neue Montreal.

- They are a safety net. A browser only fetches one when a licensed font fails to load or lacks a character. `pnpm run check` reports a problem if that ever happens.
- Each is scaled to take up the same space as the font it stands in for, so the page keeps its shape. The numbers are in `src/_data/fallbackFonts.json`, written by `pnpm run fonts:fallback`. Do not edit that file by hand.
- To see the safety net yourself: add the line `FONT_BASE_URL=http://localhost:9/` to `.env`, run `pnpm run dev`, and look at the page. Remove the line afterwards.

### Missing characters

The licensed files as supplied do not contain every character:

- **Manuka** has letters, digits, comma, hyphen and full stop only. No apostrophe, quotes, question mark, exclamation mark, colon or ampersand.
- **Louize and Louize Display** have no straight apostrophe (`'`) and no slash. They do have the curly apostrophe (`’`), curly double quotes, the en dash and the ellipsis. In text set in these fonts, type the curly apostrophe.
- **Neue Montreal** is complete.

A character a font lacks is drawn from its fallback font, which looks slightly different. `pnpm run fonts` lists the gaps every time it runs.

### The font site

The live site loads the licensed fonts from fonts.romitraj.dev, a small server in the private repository (`font-server.js`). It sends only the `.woff2` files in `fonts/web/`, tells browsers that only https://romitraj.dev may use them, and turns away requests that come from other websites. Setting it up in Dokploy is covered with the rest of deployment.

### Adding or swapping a font

Put the file in `../romitraj-private/fonts/source/`, add or edit its entry in `src/_data/fonts.json` (including which fallback file stands in for it), run `pnpm run fonts`, then `pnpm run fonts:fallback`, and reload.

## Comparing with the design reference

The private folder next door has scripts that measure the reference and this site in the same way and list the differences. They live in `../romitraj-private/reference/scripts/`, read rendered values only (sizes, colors, positions, timings as a browser reports them), and are never deployed. Build the site first; the scripts start it themselves, with the stand-in weather and music services.

```bash
cd ../romitraj-private/reference/scripts
pnpm install    # once
toolbox run -c playwright bash -lc 'cd ~/"My Codes/Personal Website/romitraj-private/reference/scripts" && node compare.mjs out/compare && node compare-report.mjs out/compare'
```

| Script                                                 | What it compares                                                                                                                                    | Time                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `compare.mjs`, then `compare-report.mjs`               | Layout, spacing, type and color: about 150 pieces on four pages (home, About, Projects, one project), at 1440px, 768px and 390px, in three browsers | about 7 minutes                      |
| `compare-states.mjs`, then the same with `differences` | What 24 kinds of link do under the pointer and with keyboard focus, and how long each change takes                                                  | about 15 minutes                     |
| `compare-motion.mjs`                                   | The two tickers' speeds, the gradient bar's loop, and how the scroll-tied movement follows the scroll position                                      | about 15 minutes                     |
| `pagechange.mjs`, then `pagechange-compare.mjs`        | Every page change as a timeline: what leaves, what arrives, when and for how long                                                                   | about 2 minutes per site and browser |

- **Which piece is which** is written in `compare-map.mjs`: for each piece, where it is on the reference and where it is here. When a section of this site is rebuilt, update its lines there.
- **Reading the report.** Each line is one value of one piece: the reference's, this site's, and the browsers and widths it shows in. Many lines are not visible differences: the two sites are built differently (a margin there is a gap here), and their words are different lengths. A line matters when a size, a color, a gap between two pieces or an edge differs. [decisions.md](decisions.md) lists the differences that are there by choice.
- **After changing this site**, add `--only=here` to `compare.mjs` or `compare-states.mjs`: it measures this site again and keeps the reference's saved values, so the reference is not visited again.
- **The reference sits behind a bot check.** The scripts visit it with one browser at a time, one page at a time. Do not run two of them at once.

## Checking before a commit

Before every commit, three quick ones (a few seconds each, plus about 20 for the smoke check):

```bash
pnpm run lint
pnpm test
toolbox run -c playwright bash -lc 'cd ~/"My Codes/Personal Website/romitraj.dev" && pnpm run smoke'
```

Before pushing anything that changes how the site looks or moves, the full check:

```bash
toolbox run -c playwright bash -lc 'cd ~/"My Codes/Personal Website/romitraj.dev" && pnpm run check'
```

It prints one line per step and ends with `Check passed.` or a list of problems. Besides broken links it reports: a page without the site's icon or without the tags for its preview card (or with the wrong title, description or address in them), a share image of the wrong size, a tab icon that is not the ink compass on light and the paper compass on dark, a missing address that is not answered with the status 404 and the page for a missing address, that page failing to show or to slide in, a link to a missing page that ends anywhere else, a keyboard focus ring too faint to see (less than 3 to 1 against the paper or the ink), a file that fails to load, a script error, a page wider than its window, a fallback font being used, hero lines that no longer fit, page changes that do not work, anything that moves once a page change has finished, a scroll position that is not returned to, heading letters that would jump during a page change, a letter whose ink is cut by the window it slides in (a raised apostrophe, the tail of a comma), a headline entrance that flashes, ends out of place or leaves the headline hidden, a hero compass that does not take the still picture's place, differs from it at rest, does not move or does not stop, or shows where it should not, and a picture whose description differs from the one in `images.json` (or that is described although it is marked as decoration), a picture without its size written into the page, one that weighs too much, would be smoothed, fails to load, moves the page as it loads, or sits differently from one browser to the next, and a weather or now-playing widget that shows the wrong thing, does not hide when its service is down, moves the page as it arrives, or lets a key slip into an answer, a list of blog posts or an About page's latest post that is not brought up to date, moves anything in sight when it is, forgets the last good list while the feed is failing, or is replaced when nothing changed, a visitor counter that is loaded on this computer or would count a page change twice on the live site, and drawn lines in the ticker that one browser paints thicker than another. The whole check, the build included, runs against stand-ins for Open-Meteo, Spotify and the blog's feed on your own computer (`scripts/lib/pretend.mjs`), so its screenshots always show "23°C, partly cloudy", "Pretend Song" and five stand-in blog posts, it works without an internet connection for those three, and your real keys are never used. It also prints how many picture files there are and what they weigh.

It runs Chromium, Firefox and WebKit at the same time, each through every test in turn, and prints each browser's results in one piece when that browser is done.

The photographs are taken with hover fades switched off and with fixed starting places for anything the site normally places at random, so the same page gives the same picture every time.

The screenshots go to `../romitraj-private/screenshots/`, in `laptop-1440`, `tablet-768` and `phone-390` folders, split by browser. The laptop and phone folders match the reference screenshots next door, so the two sets can be compared side by side. If that folder is not there, they go to `screenshots/` here, which git ignores.

Open a few of the pictures before committing. The same page should look the same in all three browsers.

## Formatting, linting and tests

Three tools from Vite+, all set up in `vite.config.js`:

- **Oxfmt, the formatter**, lays out the code the same way everywhere (indents, quotes, line breaks). `pnpm run format` does it for you. It covers the JavaScript, CSS, JSON, YAML and Markdown files, not the Nunjucks templates. Three files the scripts write themselves are left alone (`fontVersions.json`, `fallbackFonts.json`, `textWidths.json`).
- **Oxlint, the linter**, looks for likely mistakes: a variable that is never used, a promise nobody waits for, and so on. When it is wrong about a line, a comment just above that line says so, with the reason (`split.js` has one).
- **Vitest, the test runner**, runs the small tests in the files ending in `.test.mjs`, each next to the file it tests (`scripts/lib/links.test.mjs` tests `scripts/lib/links.mjs`). Tests import from `vite-plus/test`, never from `vitest`; the linter enforces that.

`pnpm run lint` runs the first two and changes nothing; `pnpm test` runs the tests once. Both should pass before every commit.

**Write the test first.** For any change to the code: a test that fails, then the code that makes it pass. Never change a test to make broken code pass.

The full check (`pnpm run check`) and the smoke check are tests too, but of the whole site in real browsers. Vitest is for the pieces that can be tested on their own.

## Dead links

```bash
pnpm run links
```

It builds the site, serves it on your computer for a moment, reads every page (the page for a missing address too), and asks for every address any page points to, once each: links to other pages, links to other websites, pictures, stylesheets, scripts, the preview card's picture, and jumps to a section (`#the-problem` must be a section that exists). Then it prints:

- **Dead links**, with the pages they are on: a page that answers "not found", a website whose name does not exist, or a jump to a section that is not there. The command ends with an error when there are any.
- **Could not be sure**: websites that turn programs away (LinkedIn, Unsplash's profile pages, Figma and others answer a program with a refusal, or ask it to prove it is a person), or had trouble at that moment. Open those in a browser yourself. They are not counted as dead.

Links to `https://romitraj.dev/...` (the share image, the address in the preview card) are checked against the build on your computer, so a page you have not pushed yet counts as there.

**Any other website**, as it is live:

```bash
pnpm run links https://blog.romitraj.dev
pnpm run links https://romitraj.dev
```

It reads every page of that website it can reach from the address you give, and checks every link on them the same way. It does not open a browser, so it needs no toolbox.

- It asks each website at most three things at a time, waits up to 15 seconds for an answer, and tries a failed one once more.
- The full check also looks for broken links, but only between this site's own pages and files, and without the internet. This command goes further: other websites, and any website you give it.
- The code is `scripts/links.mjs` (the command) and `scripts/lib/links.mjs` (finding links and judging answers), with its tests in `scripts/lib/links.test.mjs`.

## How the CSS and JavaScript are bundled

Before every build, `scripts/lib/bundle.mjs` uses Vite+ (Vite, with Rolldown for the scripts and Lightning CSS for the styles) to make:

- `assets/css/main.css`: `src/assets/css/main.css` and every file it imports, as one minified file;
- `assets/js/main.js`: `src/assets/js/main.js` and everything it imports, as one minified script (with a source map while `pnpm run dev` runs, so the browser's tools can show the original files);
- the headline's entrance (`src/assets/js/intro.js`), which is written straight into the pages.

Each is written for Chrome and Edge 115, Firefox 115 and Safari 16.4 or newer: newer CSS, such as nesting, is rewritten so those versions understand it. The list is `browsers` in `bundle.mjs`. This was done by esbuild until 2026-11-11; [decisions.md](decisions.md) says why it changed and how the two were compared.

## How files are sent

`server/files.js` decides, for every file the live server sends, its type and how long it may be kept:

- **A file asked for with a fingerprint** (`main.css?v=1a2b3c4d`: the stylesheet, the scripts, the icons, the pictures) may be kept for an hour by browsers and Cloudflare. A changed file gets a new fingerprint, so a new address.
- **Everything with a plain address** (every page, `/resume.pdf`, `/romitraj-pgp-public.asc`, the Web Key Directory) is checked with the server on every visit (`no-cache`), so a new version shows at once. The server sends an ETag with each file; when the browser already has that version, the answer is a short "not modified" (304) with no body.
- **Links a visitor follows or downloads have plain addresses**, with no `?v=` in them.
- **A PDF opens in the browser** (`Content-Disposition: inline`).

`server/files.test.js` tests all of this (`pnpm test`).

## Deploying with Dokploy

The live site is two applications on your own server, both set up in Dokploy's dashboard:

| Application | Address                    | Built from                                           | What it is                                              |
| ----------- | -------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| The site    | https://romitraj.dev       | `brixdorf/romitraj.dev` (public), branch `main`      | The pages, and the two small questions the ticker asks  |
| The fonts   | https://fonts.romitraj.dev | `brixdorf/romitraj-private` (private), branch `main` | The licensed fonts, sent to the site and to nobody else |

Both are built by Railpack, Dokploy's builder that reads `package.json` and works out the rest. There is no Dockerfile and nothing to type on the server: every step below is a click in a dashboard.

**Both applications are live** (checked 2026-11-06). These are the steps they were set up with, for doing it again on a new server.

### What the server will do

Checked on 2026-11-11 (and again on 2026-11-13 for the start command) by reading Railpack's code (versions 0.15.4, Dokploy's default, and 0.43.0, the newest) and by installing, building and starting a clean copy of the site the way Railpack does, with no `.env` file and no private folder beside it. (First checked on 2026-10-11 with Railpack 0.40.1 and npm.)

|                           | The site                                                                                | The fonts                                   |
| ------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------- |
| Node.js                   | 26, from `"engines": { "node": "26.x" }` in `package.json`                              | the same                                    |
| Package manager           | pnpm 12.18.0, from `"packageManager"` in `package.json`, for the install and build only | the same                                    |
| Install                   | `pnpm install --frozen-lockfile --prefer-offline`                                       | the same (nothing to install)               |
| Build                     | `pnpm run build` (about 3 seconds)                                                      | none                                        |
| Start                     | `node server/index.js`, from `railpack.json`                                            | `node font-server.js`, from `railpack.json` |
| Port inside the container | 3000                                                                                    | 3000                                        |
| Settings to enter         | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`                   | none                                        |

- **The finished server has Node.js but no pnpm** (found 2026-11-13, when both applications crashed on start with "pnpm: command not found"). Railpack uses pnpm to install and build, then copies only Node.js, the packages and the built files into what runs. So each repository has a small `railpack.json` that starts the server with `node` itself: the same file `pnpm start` runs on your computer. Keep the two in step: a test (`server/start.test.js`) fails if the site's ever differ or name pnpm. The server needs nothing else: only Node.js's own modules, the built `_site/` and `src/_data/`.
- **Nothing changes in Dokploy for pnpm, Node.js 26 or Vite+** (the switch of 2026-11-11). Railpack reads the Node.js line and pnpm's version from `package.json` and picks the install command from `pnpm-lock.yaml` by itself. The first deployment after the switch takes a little longer, as it fetches Node.js 26, pnpm and the new packages once.
- **No `PORT` setting is needed.** Both servers listen on 3000 unless told otherwise, and 3000 is what you enter as the container port.
- **The site works with none of the three settings.** Without them, or with a wrong one, the now-playing piece of the ticker stays hidden and everything else is as usual. The weather needs no setting.
- **The build needs the internet** for one thing: the list of your latest blog posts. If the blog cannot be reached, the build still succeeds and the section shows a link to the blog, until the running server reads the feed and the page fills in the cards. A new post needs no deploy: see "Blog posts" under "The home page sections". Cloudflare must let your server read the feed: see step 1.5.
- **On the server the pages load the fonts from https://fonts.romitraj.dev.** That is why the fonts application comes first below.
- **The fonts go to romitraj.dev only.** A page on any other website that asks for one is refused, and browsers will not use a font for another site even if they get it. The server answers nothing but the seven font files: not the brief, not the original font files, not its own code.

### Before you start

- You can log in to your Dokploy dashboard, to Cloudflare, and to GitHub as `brixdorf`.
- Both repositories are pushed (`git status` in each folder says there is nothing to commit, and `git push` says everything is up to date).
- `pnpm run check` passed on the last commit.
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
5. **Let your server read the blog's feed.** Bot Fight Mode is on for the domain, and it blocks programs that are not browsers, including your own server when it reads `https://blog.romitraj.dev/rss.xml` for the build and for the live posts. Custom rules and WAF skip rules cannot get past Bot Fight Mode; an IP Access rule can.
   - Open the **Security rules** page (under **Security**). The IP Access rules page is hidden in the new dashboard: add `/ip-access-rules` to the end of that page's address in the address bar and press Enter.
   - Add a rule for your server's IP address (the one the DNS records point at) with the action **Allow**.
   - **If your server's IP address ever changes, update this rule.** Otherwise the posts stop updating, and since the site quietly keeps the last list it read, nothing looks broken.

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
5. Check that **Auto Deploy** on the **General** tab is on. It starts switched on for a new application.
6. The **Environment** tab stays empty for this application.
7. Click **Deploy**.
8. Open the **Deployments** tab and open the newest entry to watch the build. It should mention Node 26, pnpm (`pnpm install`) and the start command `node font-server.js`, and end without an error. This takes a minute or two.
9. Open the **Logs** tab. The last line should read `Font server running at http://localhost:3000`.
10. Open the **Domains** tab and click **Create Domain**:
    - **Host:** `fonts.romitraj.dev`
    - **Path:** `/`
    - **Container Port:** `3000`
    - **HTTPS:** on
    - **Certificate:** **None** (not Let's Encrypt: the certificate from step 2 is used)

    Click **Create**. A domain takes effect at once; no new deploy is needed.

**Check the fonts application**

| Open this                                     | You should get                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| https://fonts.romitraj.dev/manuka-black.woff2 | A small file is downloaded or shown (8,692 bytes). This is the one address that proves it works. |
| https://fonts.romitraj.dev/                   | The two words `Not found`                                                                        |
| https://fonts.romitraj.dev/BRIEF.md           | `Not found`                                                                                      |

### Step 5: the site application

1. In the same project, create another service of the kind **Application**. Name it `site`.
2. On the **General** tab, choose **Github** as the source:
   - **Repository:** `romitraj.dev`
   - **Branch:** `main`
   - **Build path:** `/`

   Save.

3. Choose **Railpack** as the build type and save.
4. Check that **Auto Deploy** is on (it starts switched on).
5. Open the **Environment** tab. Type these three lines, each followed by its value from the `.env` file on your PC (open it with `kwrite .env` in the site's folder). No spaces around the `=`, no quotes:

   ```
   SPOTIFY_CLIENT_ID=
   SPOTIFY_CLIENT_SECRET=
   SPOTIFY_REFRESH_TOKEN=
   ```

   Save the settings with the save button on that tab. Close the editor without saving.

6. Go back to **General** and click **Deploy**.
7. On the **Deployments** tab, watch the newest entry. It should mention Node 26, `pnpm install`, `pnpm run build` (with lines beginning `[11ty]`) and the start command `node server/index.js`.
8. On the **Logs** tab the last line should read `Site running at http://localhost:3000`.
9. On the **Domains** tab click **Create Domain**:
   - **Host:** `romitraj.dev` (never `www.romitraj.dev`: Cloudflare already sends `www` to the plain name)
   - **Path:** `/`
   - **Container Port:** `3000`
   - **HTTPS:** on
   - **Certificate:** **None**

   Click **Create**.

**Check the site**

| Do this                                                   | You should see                                                                                                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open https://romitraj.dev                                 | The home page, with the headline in its tall heavy letters and the serif lines in the fine serif. If the text is in plainer fonts, the fonts application is not answering: check step 4. |
| Wait two seconds and look at the ticker                   | The weather, the coordinates, the time, and Spotify's icon with a track                                                                                                                  |
| Open https://romitraj.dev/api/weather                     | One short line with a temperature and a word for the sky                                                                                                                                 |
| Open https://romitraj.dev/api/now-playing                 | One short line with a track's title. An empty page means the three settings are missing or wrong: check step 5.5, save, and deploy again.                                                |
| Open https://romitraj.dev/api/posts                       | A line listing your latest blog posts                                                                                                                                                    |
| Click Projects, a project, About, and use the back button | The pages change with their animations and without a reload                                                                                                                              |
| Open https://www.romitraj.dev                             | You end up on https://romitraj.dev                                                                                                                                                       |
| Open https://romitraj.dev/nothing-here/                   | The "Lost in oblivion" page, its name sliding in                                                                                                                                         |
| Run the WKD check in "The OpenPGP key"                    | Your key, with the fingerprint shown on the About page                                                                                                                                   |
| Open your Rybbit dashboard                                | Your own visit, counted once per page                                                                                                                                                    |
| Open the site on your phone                               | The same, in the phone arrangement                                                                                                                                                       |

### If something is wrong

| What you see                                                    | What it means                                                            | Where to look                                                                                                                                                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The newest entry on **Deployments** ends in an error            | The build failed                                                         | Read the last lines of that entry. A wrong Node version there (not 26), or npm where pnpm should be, means an old Railpack: type `0.43.0` into **Railpack Version** on **General**, save, deploy again. |
| **Logs** shows `pnpm: command not found`                        | The start command asks for pnpm, which the finished server does not have | `railpack.json` in that repository must exist and start with `node` (see "What the server will do"); then deploy again.                                                                                 |
| `404 page not found`                                            | The server has no application for that address                           | The domain on the **Domains** tab: the host must be spelled exactly, with no `https://`                                                                                                                 |
| Cloudflare's page "Bad gateway" (502)                           | The application is not running, or the port is not 3000                  | **Logs**, and **Container Port** on **Domains**                                                                                                                                                         |
| Cloudflare's page "Invalid SSL certificate" (526)               | The server is not presenting the origin certificate                      | Step 2; that **Certificate** is **None** and **HTTPS** is on; and that the certificate covers the name. (A newly added certificate was used at once on the first deployment, with no extra step.)       |
| Cloudflare's page "Web server is down" (521) or a timeout (522) | Cloudflare cannot reach the server at all                                | The DNS record's address in Cloudflare, and that the server is running                                                                                                                                  |
| The site shows but the ticker has no track                      | The Spotify settings                                                     | **Environment**, then deploy again. See "If a widget is missing".                                                                                                                                       |

### After the first deployment

- **Every `git push` to `main` deploys.** Push the site's repository and the site is rebuilt and restarted, usually within two minutes. Push the private repository and the fonts application restarts too, even when only the brief changed. That is harmless: browsers and Cloudflare keep the fonts for a year.
  - If you would rather the fonts application restart only when a font changes, Dokploy has a setting called **Watch Paths** for that. The paths would be `fonts/web/**`, `font-server.js`, `package.json`, `pnpm-lock.yaml` and `railpack.json`. It is not set (your choice, 2026-11-06), and where the field is has not been checked.
- **A changed setting does nothing until the next deploy.** After saving anything on the **Environment** tab, click **Deploy** on **General**.
- **Visitors get new files at once.** Pages are never kept by browsers or by Cloudflare. The stylesheet, the script, the pictures and the fonts may be kept, and each carries a fingerprint in its address (`main.css?v=...`) that changes when the file changes.
- **Push only what you have checked.** There is no test on the server: the checks on your PC (see "Checking before a commit") are the test.

### What your dashboard showed

The steps above use the names in Dokploy's documentation as read on 2026-10-11 (Dokploy 0.30.8). Where it gives no name, the step describes the thing instead. On the first deployment (reported 2026-11-06) your dashboard matched:

1. **The buttons** that create a project and an application, save the source and the build type on **General**, and save the **Environment** tab were easy to find, so the steps do not name them.
2. **Auto Deploy** starts switched on for a new application.
3. **The certificate** added in step 2 worked as described and was used at once, with **None** chosen on each domain and no extra step.
4. **Watch Paths** is not set, and where its field is has not been checked (see "After the first deployment").

## Secrets

Secret values (the three Spotify values: see "The live widgets") live in a file named `.env`, which git ignores. `.env.example` shows the names with empty values. Copy it to `.env` and fill it in. Never commit `.env`, and never paste its contents into a chat, an issue or a screenshot.

- To confirm git is ignoring it: `git check-ignore -v .env` should print a line naming `.gitignore`, and `git status` should never list `.env`.
- On the live server the same three values are entered in the host's settings instead of a file.
- `pnpm run check` never uses these values: it runs the site against stand-ins for Spotify, Open-Meteo and the blog's feed.

## Node.js version

The live server uses the Node.js version named under `engines` in `package.json`. This project follows the newest LTS line (the long-term support releases Node.js recommends for real sites). That is 26 today (since 2026-11-11; it was 24 before).

On your computer, Vite+ reads the same line and uses a matching Node.js by itself, downloading it the first time.

A new LTS line arrives every October. Check https://nodejs.org/en/about/previous-releases, and once a newer line is listed as LTS, change `engines` in `package.json` here and in the font server's `package.json`, run the checks, and commit.

## Maintenance routine

- **Every few months:** check the official sources for newer stable versions and run `pnpm outdated`. Update a package with `pnpm add <package>@<version>` (or `pnpm add -D` for one under `devDependencies`), run the quick checks, look at the site, commit. Before pushing a visual change, run the full check. Record each version you move to in [decisions.md](decisions.md), with the date and where you checked.
  - Packages: `pnpm view <package> version`
  - pnpm itself: change `packageManager` in both repositories' `package.json`.
  - After updating Playwright, install its browsers again (see "Test browsers on Fedora").
  - Python packages: change the version numbers in `scripts/requirements.txt`; the next `pnpm run fonts` installs them by itself.
  - Python packages: https://pypi.org
  - Never move to a beta, alpha, RC, canary, nightly or `next` release. Before a new major version, read its upgrade guide first.
- **GitHub security alerts:** turn on Dependabot alerts in the repository's settings on GitHub, so GitHub emails you when a dependency has a security problem.
- **Node.js:** move to the new LTS line each October, as described above.
- **Every few months:** look for dead links: `pnpm run links`, and `pnpm run links https://blog.romitraj.dev` for the blog.
- **Before 2029-09-28:** extend your OpenPGP key's expiry date and replace the key file ("The OpenPGP key").
- **Every 6 months:** renew the Spotify refresh token with `pnpm run spotify`, and copy the new value into the live site's settings ("Spotify: every 6 months"). The current one lasts until about 2027-04-11.
- **Yearly:** renew the domain, confirm the weather still shows and that Spotify Premium is still active, and check the expiry date of the Cloudflare origin certificate.
