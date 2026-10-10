# Decisions

A dated log of what was chosen and why. Newest entries at the top. Add an entry whenever something important is chosen or changed, and whenever a version is verified.

## 2026-10-10: About, projects and resume pages

### Versions verified

| What | Version | Source | Used for |
|---|---|---|---|
| Phosphor Icons (`@phosphor-icons/core`) | 2.1.1 (unchanged) | `npm view @phosphor-icons/core version`; drawing copied from the published package | One more drawing: the bent arrow in "You are here" on phones and tablets |

No new packages. Eleventy's own Markdown library does the write-ups.

### Decisions

- **Every page except the home page gets the same frame**, measured on the design reference's inner pages: a small row under the banner (version tag, tagline, back link), the page's name in giant letters with a small picture frame, and a "You are here" line at the top of the footer. The row is hidden on the home page, as on the reference.
- **The small row sits a fixed distance below the banner** instead of a fixed distance from the top of the page. The reference's banner line is longer and wraps onto more lines on narrow windows; measuring from the banner keeps the same gap under it here whatever the banner's height.
- **Two more switch points on the inner pages, where the reference has them.** Its grids of cards stay in two columns up to 999px and its list of case studies up to 1099px, although its headers switch at 900px like the home page. The room above a page name also shrinks from 64px to 48px at 1099px. These pages do the same. Both were found by stepping the reference's window one pixel at a time.
- **The About page's heading is "About the human"**, the same words as the about section on the home page.
- **The About page's cards:** Who, Tinkering, Contact and Toolbox, plus the card of links and a short piece about the latest blog post. The reference has a card about conference talks with a video beside it, and a table of awards. Romit has neither, so the second card is about what he is tinkering with, the piece beside it is the newest post from the blog's feed (left out if the feed cannot be read), and the table lists tools. All of the text is placeholder text in `about.json`.
- **A card's parts spread out when the card is stretched**, as on the reference: the card beside the portrait is as tall as the two rows of frames next to it, and the spare room is shared between its title, text and links.
- **The table is a real table.** On narrow windows its rows are stacked, each starting with a small grey label, and the column names are hidden from view but still read out. The reference swaps its table for a different list there; that list was not measured, so this is a simple stand-in.
- **Empty picture frames stand where the reference has illustrations** (beside the page names, the portrait, two frames on the About page, three beside the project cards). They are filled in the image conversion step. Decorative frames are hidden from screen readers.
- **The list of projects is one wide card per project**, with every second card narrower to leave room for a frame: first on the right with the frame to its left, then on the left with the frame to its right. The reference arranges its cards around its illustrations in the same spirit; the exact pattern here is this site's own. The whole card is the link target, and "Read more" gets its underline on hover.
- **A project's page has no logo above its name.** The reference shows each client's logo there. These are personal projects without logos, so the name stands alone, at the same size and in the same place.
- **A project is one Markdown file** in `src/content/projects/`: its facts (title, description, tags, year, link, order) at the top, its write-up below. The home page's rows, the Projects page's cards and the project's own page are all built from that file, through one list (`projectList`) made in `eleventy.config.js`. A first build of this step kept the facts in `projects.json` and only the write-up in Markdown, joined by file name; Romit chose one file per project instead, so adding, changing or removing a project never means touching two places. `projects.json` is gone. Every built page came out byte for byte the same after the move.
  - **The order is a number in each file** (`order`). A data file kept the order by position; separate files have no position, and sorting by name or year would not give the order Romit wants to show.
  - **A missing fact stops the build** with a message naming the file and the fact, instead of publishing a card with a hole in it.
  - **The facts are called `tags`, which Eleventy also reads.** Eleventy groups pages by their tags behind the scenes. Nothing uses those groups, and they do no harm. The site's own list is named `projectList` so it can never clash with a tag.
- **Section headings in a write-up number themselves and build the "Contents" list.** Two small filters in `eleventy.config.js` read the headings out of the finished write-up and give each one an address to jump to. No extra package.
- **Markdown turns straight quotes into curly ones**, because the serif fonts have no straight apostrophe. Only that one feature of the Markdown library's typography option is on. Its other swaps are off, so nothing can turn hyphens into long dashes.
- **A Markdown quote is a note**: grey text beside a thick pale bar, with its first bold words as a label. The sample write-ups use it to say they are samples.
- **List bullets are drawn by the styles.** Safari draws a bullet as a letter from the text's font, and the serif has no bullet letter, so Safari alone fetched the fallback font on every project page. The browser's own bullet is now invisible and set in the text font, and a small drawn dot sits in its place, identical in all three engines. The list is still announced as a list.
- **Giant names shrink on phones by letter count.** The longest word's number of letters is passed to the styles, which shrink the type until that word fits (assuming 0.37 of the type size per letter for Manuka and 0.5 for Louize Display, both a little generous). The hero's lines are measured in a real browser instead (`npm run fit`) because they must fill their space exactly; these only have to fit, so no measuring step was added. If a name ever overflows, `npm run check` reports the page as wider than its window.
- **The straight arrows are letters; the bent one is an icon.** Neue Montreal has left, right and slanted arrows, but not the bent arrow the reference uses in "You are here" on narrow windows, so that one is a Phosphor drawing.
- **The tagline is this site's own sentence** ("A small corner of the internet, kept by Romit Raj Sahu"), in `site.json`.
- **The notice layout is gone.** It existed for pages that were not written yet; none are left.
- **`npm run check` switches hover fades off while it photographs.** Chromium briefly changes the page's width while it takes a full-page picture. The "Go home" label beside the version tag is always visible on phones and hidden elsewhere, so that moment made it fade out again in the middle of the photograph. Real visitors never see this. With fades off, the pictures show every page at rest.

### Not built yet

- The pictures for all the empty frames, and the resume itself (`resume.pdf`).
- Scroll-tied movement on the inner pages. None was measured on the reference's inner pages, so none was added.

### Known issues

- **The About page's placeholder text makes claims about Romit** (tools, interests) that are guesses. `about.json` says so in its first line.

## 2026-10-10: Letter, about, projects, writing and footer

### Versions verified

| What | Version | Source | Used for |
|---|---|---|---|
| gsap | 3.15.0 | `npm view gsap version` | Movement tied to scroll (with its ScrollTrigger plugin) |
| Phosphor Icons (`@phosphor-icons/core`) | 2.1.1 | `npm view @phosphor-icons/core version`; drawings copied from the published package | The heart and the link icons |

Licenses: GSAP is under its standard "no charge" license (https://gsap.com/standard-license). Phosphor Icons is MIT; its license text is kept in `src/assets/icons/LICENSE-phosphor.txt`. Only six drawings are used, copied into `src/_data/icons.json`, so the package itself is not installed.

### Decisions

- **Movement tied to scroll follows rules measured on the design reference**, and was checked against it number by number in three browsers:
  - The about heading slides in from the right by half the window's width. It starts when the heading's top reaches the bottom of the window and ends when its bottom reaches the middle, on a quadratic ease-out curve.
  - The bars beside the two giant headings grow from nothing to full length on the same rule.
  - Each project row slides to rest from one side between the same two moments, at an even pace, and fades away as it leaves through the top of the window.
  - All of it trails the scroll by about a second. It runs on tablets and laptops only, as on the reference. For visitors who asked for less motion it is switched off and everything sits in its resting place.
- **Project rows start from new random positions on every page load**, as on the reference: each row begins somewhere between half a row to the left and a quarter of a row to the right of its resting place (`rowOffsetRange` in `motion.js`). An earlier build used fixed positions on every visit; Romit chose to match the reference. While `npm run check` photographs the pages, a fixed list is used instead (`rowOffsetsForChecks`), so two runs of the check give the same pictures and can be compared. The check switches this on by setting `window.steadyMotion` before the page's scripts run.
- **Rows respond to scroll, not to the pointer.** An earlier reading suggested rows drifted at their own speeds as the page scrolled. Measuring directly showed one slide per row, tied to that row's position, and nothing tied to the pointer.
- **A project name opens near its middle on hover**, always inside a word, at a point worked out from the name. The gap is 1.47 times the type size (113px at laptop width, the same as the reference), and the faint copies beside the name sharpen.
- **The bars are drawn by the styles and driven by one number.** The script only changes a value called `--bar` from 0 to 1; the styles turn that into the bar's length. Without scripts the bar is simply full length.
- **Blog posts are fetched during the build**, from the blog's feed, with two tries. If the feed cannot be reached the section shows a sentence and a link, and the build still succeeds. The feed has a title, link, date and description per post, so cards show a label, the date and the title. It has no categories or reading times, which the reference's cards show.
- **The writing section shows up to six posts** (`writing.count` in `home.json`), which fills two rows of three on laptops. The blog has five posts today, so one place is empty until a sixth is published; it then fills in at the next build with no change here. Romit chose six over five for that reason.
- **No dark "featured" card.** The reference's first card is black because that one article has its own look. It is not a rule of the design.
- **A short page per project instead of dead links.** Each project row leads to `/projects/<slug>/`, a notice page with the description, until full write-ups exist.
- **No Now block in the about section**, and no Now link in the footer, following the earlier decision to drop the Now page.
- **The copyright line is plain:** the year and the name. The blog's own footer line was not reused because it repeats the design reference's wording. The sign-off "made with (heart) in the Open Web" is as on the blog. The heart is an icon in the text color, read out as "love".
- **The year in the copyright line is set by the build and kept current by a script**, so it is right even if the site was last built in an earlier year.
- **The serif has no copyright sign**, so that one character is set in the text font.
- **The version tag is "ver. fw26"** with a small drawn diamond before it, echoing the diamond-shaped full stop of the serif.
- **Placeholders in text.** `{email}` in `home.json` is filled in from `site.json`, so the address is still written in one place.
- **Icons are a small data file and a helper**, not a package: six drawings, each drawn in the color and size of the text around it.

### Not built yet

- The about section's illustration and the footer's ornament. Both are pictures on the reference; they wait for the image conversion step.
- The dark band of dither that leads into the footer on the reference. It is also a picture.
- Full write-up pages for projects, the designed list of projects, and the real About and Resume pages.

### Known issues

- **The bundled script grew to about 116 KB** (about 46 KB when compressed in transit), almost all of it GSAP.
- **Building needs the network** to show blog posts. Without it the build still succeeds and shows the link instead.

## 2026-10-10: Banner, hero and navigation

Nothing was installed in this step. Bangalore's coordinates were checked on 2026-10-09 against two sources: Wikipedia (12.9789, 77.5917) and Open-Meteo's place search (12.97194, 77.59369). Both give N 12° 58′, E 77° 35′, which is what the ticker shows. `site.json` stores 12.97 and 77.59.

### How the headline is set

The banner carries the bio line: A LIFELONG EXPLORER *WHO PROCRASTINATES A LOT.* The whole headline sits inside the hero, in four pieces read top to bottom:

| Piece | Words | How it is sized |
|---|---|---|
| Opening serif line | WHAT WE KNOW *IS A DROP,* | Fills the full width |
| Giant line (Manuka) | WHAT WE DON'T KNOW | Fills the full width |
| Outlined italic words | is an | A fixed share of the width, overlapping the giant line |
| Large serif word | OCEAN. | Fills eight columns, beside the picture |

Two versions were built and compared side by side in the browser:

- **Version A:** the first half of the sentence as the small grey banner line, the bio line inside the introduction sentence.
- **Version B (chosen):** the bio line in the banner, the whole sentence inside the hero, with a new full-width serif line above the giant line.

Romit chose version B. What it gains: the bio line is on every page, and the sentence reads in one place instead of starting in the banner. What it costs: one more line than the design reference has between the gradient bar and the giant line, so the headline block is 526px tall at laptop width against the reference's 400px, and everything below starts lower.

The giant line has 18 characters where the reference's has 12, so its letters are about two thirds as tall. The serif word is short, so it is about twice as tall.

### Decisions

- **No Now page.** Romit removed it on 2026-10-10: the "Now" link is gone from the "Me" group, the page is deleted, and it is no longer planned. The navigation now has four links: Projects, Blog, About, Resume.

- **Big lines are sized by measurement, not by hand.** `npm run fit` opens the built page in a browser, measures how wide each big line runs in units of its own font size, and saves the numbers to `src/_data/textWidths.json`. The styles divide the available width by that number. Changing the headline's words needs one command, not trial and error. `npm run check` reports when the numbers are out of date.
- **The apostrophe in DON'T is Manuka's own comma, raised.** Manuka has no apostrophe. A small build step swaps each apostrophe in the giant line for an empty marker, and the styles fill it with a comma lifted to the top of the letters. The marker is a self-contained box on purpose: as plain inline text, one browser tightened the spacing around it in one drawing pass and not in another.
- **Widths inside the hero are measured from the hero, not the window** (CSS container units, `cqw`). The window's width includes the scrollbar on some computers, which would make the giant line slightly too wide there.
- **Three arrangements, switching at 600px and 900px**, exactly where the reference switches. On tablets the picture is as wide as the space the first headline line leaves free.
- **The picture frame keeps its 4:5 shape, and ends level with the introduction on wide windows.** This is the reference's own rule. At 1440px and 1920px the introduction's last line ends 12px below the frame, exactly as on the reference. An earlier build left a 36px gap under the frame at 1440px; it closed when the navigation lost a row (the Now link) and the scroll note was shortened to fit beside the shorter list. On narrower laptop windows the left side runs longer than the frame, on the reference as well: 60px here against 44px there at 1280px, 154px against 131px at 1024px. At 1366px there is an 11px gap here; going by the reference's numbers (it was not measured at that width) it would have none. Stretching the frame would close these, but it would no longer be 4:5.
- **Long dashes are drawn, not typed.** The separators in the ticker and before each navigation description are thin drawn lines the width of a long dash. They look the same and keep the project's rule of never typing that character.
- **The ticker runs on the browser's built-in animation engine** (the Web Animations API), with no library. It moves at 41px per second and slows to a fifth of that under the pointer or keyboard focus, as measured on the reference. Its content is repeated as many times as the line needs, and the copies are hidden from screen readers and from the Tab key.
- **The local time is the first live widget.** It is written by a script for the site's time zone, and its piece of the ticker stays hidden unless the script fills it in. Without scripts the ticker shows the coordinates and sits still.
- **Navigation descriptions start faint and blurred**, as on the reference, and sharpen on hover or keyboard focus. Trade-off: on touch screens, which have no hover, they stay faint. Screen readers always read them.
- **Pages that are not written yet get a short notice page** (About, Projects, Resume), so no link on the home page leads nowhere. Each is replaced when its real page is built.
- **`npm run check` also photographs a tablet width (768px)**, since the tablet arrangement is its own layout, and reports script errors and pages wider than their window.

### Not built yet

- The picture in the hero's frame. It needs the image conversion step.
- Now playing and weather in the ticker. They need the server endpoints.
- The small row under the banner with the site label, home link and tagline. On the reference it is hidden on the home page and shows on every other page, so it is built with the first real inner page.

## 2026-10-09: Fonts

### Versions verified

| What | Version | Source |
|---|---|---|
| Anton, Cormorant, Inter Tight (fallback fonts) | Snapshot `51303ca9e8ac9dcea7b12d307ba568fd0e6fcfca` of github.com/google/fonts, its newest commit on 2026-10-09 | https://api.github.com/repos/google/fonts/commits/main |

The snapshot is written into `scripts/fallback_fonts.py`, so a rerun downloads exactly the same files. To take newer versions, look up the newest commit and change that one line.

### Decisions

- **Text stays hidden while a licensed font loads (`font-display: block`), and the four fonts at the top of the page are preloaded.** The alternative, showing a fallback font first and swapping, makes headlines visibly change shape. Tested with the fonts delayed by 2.5 seconds: the text was hidden, then appeared in the right font, and no fallback file was fetched. Trade-off: on a very slow connection the lines and boxes are drawn before the text, and move a little when it arrives.
- **Fallback fonts are fetched only when needed.** In Chromium, Firefox and WebKit, a normal page load fetched none of them. They load when a licensed font fails or lacks a character.
- **Each fallback is scaled to match the font it stands in for** (`size-adjust` and the three `-override` settings in `@font-face`), measured by `scripts/fallback_fonts.py`. With the font site switched off, the test page kept its layout: the headline was 1296px wide instead of 1305px, with the same line breaks and positions. Anton needed the most scaling (69.7%), because Manuka is much narrower.
- **Fallbacks are named by role** ("Manuka Fallback", "Louize Display Fallback" and so on) instead of by their own names. Cormorant stands in for two families with different widths, so the same file is set up twice with different scaling.
- **Variable fonts are cut to single weights.** Cormorant and Inter Tight come as files that hold a range of weights. The script takes weight 400 (and 600 for the bold stand-in) so each file is small: 24 to 46 KB.
- **Every converted font has a fingerprint in its address** (`?v=` plus 8 characters from `src/_data/fontVersions.json`). This lets the font site tell browsers to keep fonts for a year, while a changed font is still fetched at once.
- **Conversion is repeatable.** The scripts keep each font's original date instead of stamping today's, so converting twice gives byte-identical files and unchanged fingerprints.
- **`npm run fonts:fallback` is a sixth command.** It is rarely needed, but keeping it as a script means the fallback fonts can be rebuilt exactly, years from now.
- **The font site (`font-server.js`, in the private repository)** answers only `.woff2` file names from one folder. It sends `Access-Control-Allow-Origin: https://romitraj.dev`, so browsers refuse to use the fonts on any other website, and it answers 403 to requests whose `Referer` is another site. Tested in three browsers by imitating both addresses locally: fonts loaded on romitraj.dev; on another site they failed, with and without a hidden `Referer`.
- **`npm run check` reports a problem when a fallback font is used.** That is the sign that a licensed font failed or a character is missing.

### Known issues

- **The licensed files have small character sets.** Manuka: letters, digits, comma, hyphen, full stop, and nothing else. Louize and Louize Display: no straight apostrophe and no slash, but they do have the curly apostrophe. This is how the files were supplied; the conversion removed nothing visible. The headline "WHAT WE DON'T KNOW" needs an apostrophe Manuka does not have. Decided: when the hero is built, that apostrophe is drawn from Manuka's own comma, raised into place, so it matches the letters.
- **`Louize Display` regular is preloaded but not yet used** on the temporary home page, so browsers may log a note about an unused preload. It goes away when the real hero is built.

## 2026-10-09: Project skeleton

### Versions verified

Each version was looked up on the day, from the source listed, and is the latest stable release.

| What | Version | Source | Used for |
|---|---|---|---|
| Node.js (newest LTS line) | 24 (24.21.0, "Krypton") | https://nodejs.org/dist/index.json | `engines` in `package.json` |
| @11ty/eleventy | 3.1.6 | `npm view @11ty/eleventy version` | Builds the pages |
| esbuild | 0.28.2 | `npm view esbuild version` | Bundles CSS and JavaScript |
| playwright | 1.64.0 | `npm view playwright version` | `npm run check` (dev only) |
| fonttools | 4.66.1 | https://pypi.org/pypi/fonttools/json | `npm run fonts` |
| brotli | 1.2.0 | https://pypi.org/pypi/brotli/json | WOFF2 compression for `npm run fonts` |
| Python | 3.15.0 is the latest | https://www.python.org/downloads/ | See the note below |

Not installed yet, on purpose: GSAP (3.15.0 today) and Taxi.js (`@unseenco/taxi`, 2.0.0 today). They are added, and verified again, in the steps that first use them.

Notes:

- **Node.js on this computer is 26.7.0, not 24.** Node.js 26 is the current release line and has not been promoted to LTS yet. `engines` stays at `24.x` because the live server should run an LTS release. The build and the server were both run under Node.js 24.21.0 as well as 26.7.0, and behave the same. When 26 is listed as LTS, move `engines` to `26.x`.
- **Python on this computer is 3.14.8.** The font script ran correctly with it. 3.15.0 is newer; upgrading is optional and only affects `npm run fonts`.

### Design decisions

All of these come from measuring the design reference, not from copying its code.

- **Light paper with dark ink sections.** The page is off-white `#fafafa` with warm ink `#2a2722`. Some sections flip the two. One light theme, no dark mode.
- **No WebGL and no reveal animations.** The reference has neither, so this site has neither. Motion is limited to: two endless tickers, the drifting gradient bar, sideways drift tied to scroll, quick hovers, and a fade between pages.
- **Gradient bar in the Dusk colors:** `#6a7cf5`, `#e07aa8`, `#f6a65e`, `#fbe3c4`. Chosen over two other sets (Ocean and Ember).
- **Four font families:** Manuka Black for headlines, Louize Display for every large serif line, Louize for the letter and fine print, Neue Montreal for text. Each was checked against the reference by rendered width. Louize Regular must not be used for large serif lines: it runs 7 to 12% wider than Louize Display.
- **Neue Montreal Semibold stands in for bold.** The one bold label is 12px, and the licensed set has no Bold cut.
- **Photos become two-tone dithered images during the build.** Ink on paper, hard square pixels. The hero image also keeps a faint paint texture in its light areas; every other illustration sits on flat paper.

### How the project is built

- **Eleventy with Nunjucks templates.** Pages live in `src/content/`, so their addresses match their file names (`about.md` becomes `/about/`). Layouts and data sit beside it in `src/_includes/` and `src/_data/`.
- **esbuild runs inside the Eleventy build**, through Eleventy's "before build" hook, instead of as a second process. `npm run dev` is one command and one window, and it behaves the same in PowerShell as anywhere else. Saving a CSS or JavaScript file rebuilds and reloads.
- **esbuild also bundles the CSS.** `main.css` lists the stylesheets and the build joins them into one minified file: one request instead of several. The CSS is written out for Chrome 115, Edge 115, Firefox 115 and Safari 16.4 or newer, so nested CSS is flattened for browsers that are current but not brand new. The look is unchanged.
- **Eleventy and esbuild are listed under `dependencies`, Playwright under `devDependencies`.** The live server has to build the site, so it needs the first two. It never needs Playwright. To confirm against Railpack's documentation when deployment is set up.
- **No package for running two commands at once, and none for link checking.** `scripts/check.mjs` checks links itself in a few lines. Fewer packages means less to keep up to date.
- **The server uses only Node's built-in modules.** It serves `_site/`, refuses any path that climbs out of that folder, never lists folders, and answers only GET and HEAD requests. The two data endpoints (weather and now playing) are added with the widgets.
- **Font addresses are chosen automatically.** A computer that has the licensed fonts next to this repository loads them from `/fonts/`; everything else loads them from the font site named in `site.json`. `FONT_BASE_URL` overrides both. The `@font-face` rules are written into each page's head, because their addresses depend on this choice and plain CSS files cannot change.
- **One list of fonts.** `src/_data/fonts.json` is read by the font script and by the page templates, so a font is added in one place.
- **Fonts are cut down to Latin characters**, keeping every OpenType feature (kerning, ligatures). The two Neue Montreal files drop from about 200 KB to about 35 KB each.

### Known issues

- **`npm audit` reports 9 advisories (4 moderate, 5 high).** All of them are inside Eleventy 3.1.6's own dependencies (`braces`, `sprintf-js` and packages that use them). They are denial-of-service problems in tools that only read this project's own files while building. Nothing from them is sent to visitors. The fix npm offers is a downgrade to Eleventy 0.6.0, which is not a real fix. Recheck when Eleventy releases an update.
- **npm asks to approve esbuild's install script.** It has not been approved, and esbuild works without it: the build uses esbuild's JavaScript interface, which does not need that script.

### Still to do

- A hero screenshot of the live site for the README, once there is a site to photograph. GSAP gets a README badge when it is added.
- `src/_data/image-credits.json`, which the LICENSE note points to, arrives with the first photos.
