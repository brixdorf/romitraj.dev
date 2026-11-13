# Decisions

A dated log of what was chosen and why. Newest entries at the top. Add an entry whenever something important is chosen or changed, and whenever a version is verified.

## 2026-11-13, loading speed: the compass, the fonts and caching

Romit's request, after PageSpeed scored the live site 91 on phones and 64 on laptops: the laptop test's Total Blocking Time was 1,170ms because the hero's compass ran in software on PageSpeed's machine (no graphics card, about 17 seconds of main-thread work); both tests said the fonts from fonts.romitraj.dev held the text back about 1.4 seconds, and that `?v=` files were kept only 4 hours (pictures 1 hour). Fix all three without changing how the site looks or behaves for visitors. No package was added or updated.

- **Why "4 hours":** the live headers (read on 2026-11-13) showed the site sending an hour, and Cloudflare raising it to its own Browser Cache TTL of 4 hours for the file types it caches (`.png`, `.css`, `.js`), while `.jxl` passed straight through at an hour. The font server already sent a year.
- **Caching:** a file asked for with `?v=` is now sent with `public, max-age=31536000, immutable` (`server/files.js`, test changed first). Every fingerprint is worked out from the file's contents, so a changed file always gets a new address. Cloudflare keeps an origin's time when it is longer than its own setting, so nothing changes in Cloudflare. The resume, the key and the pages keep `no-cache` and plain addresses. The font server now gives the year only to an address with `?v=` (what the pages ask for) and `no-cache` to one without, so a swapped font is never stuck for a year at its plain address (`font-server.test.js`, Node's own test runner, written first; `pnpm test` there).
- **Fonts:** the font lines now come first in the head, right after the viewport line, and on the live site begin with `<link rel="preconnect" href="https://fonts.romitraj.dev" crossorigin>` (`scripts/lib/font-origin.mjs`, tested). The four preloads were already there. `font-display: block` stays: with `swap` the hero would first show Anton and Cormorant and then change its letters when the real fonts arrived (the sizes are matched, so nothing would move, but the shapes visibly change), and the brief forbids it.
- **The compass:** it already started only after the page had loaded, at idle, and already slept while out of sight or in a hidden tab. New: where WebGL would be drawn in software, the still picture stays (`compass-pace.js`, tests first). The browser is asked for a context with `failIfMajorPerformanceCaveat`, and the graphics' name is read (Firefox gives it as the renderer; Chrome and Safari through `WEBGL_debug_renderer_info`, only asked for there, since Firefox warns about it): SwiftShader, llvmpipe, softpipe and Windows's Basic Render Driver count as software. Chromium in the test toolbox names SwiftShader and does not fail the caveat, so the name is what catches it. It also draws at most 60 times a second (`fps` in `motion.js`; the leftover time is carried, so 90 and 144 Hz screens still average 60) and skips a frame identical to the last (the moment it holds still). Its movement is worked out from time, so nothing looks different.
- **Not done: a lower internal resolution.** The first pass draws three times finer than the blocks. Drawn twice as fine, 294 of the 28,880 blocks of the resting compass changed (1%), and the rose's thin arms and the needle broke into dots. Visibly different, so it stays at three. On a real graphics card that pass is small work.
- **Tests:** the check's test browsers draw in software, so `pnpm run check`, `pnpm run smoke` and the pictures test set `window.drawInSoftware` to keep testing the compass as visitors see it. The check gained a case that tells each browser its graphics are SwiftShader and expects the still picture alone; with the detection switched off it fails in Firefox, as it should. `pnpm run speed` does not set the switch, so it sees what PageSpeed sees.
- **`pnpm run speed` now also prints Total Blocking Time and main-thread work.** On this computer the software compass ran in many short tasks (Chromium draws in another process with spare cores), so blocking time hardly showed it; main-thread work did: 3.75 of 5 seconds with the compass against 0.14 with the still picture, in a first probe.
- **Measured with `pnpm run speed`** (home page, middle of nine loads; the font change does not show here, since this computer loads the fonts from the site itself):

|                                                                  | Before         | After          |
| ---------------------------------------------------------------- | -------------- | -------------- |
| Phone, with the entrance: First and Largest Contentful Paint     | 1088ms, 1088ms | 1088ms, 1088ms |
| Phone, with the entrance: Total Blocking Time, main-thread work  | 127ms, 3296ms  | 62ms, 1136ms   |
| Phone, without: Total Blocking Time, main-thread work            | 119ms, 3101ms  | 56ms, 799ms    |
| Laptop, with the entrance: First and Largest Contentful Paint    | 44ms, 112ms    | 40ms, 100ms    |
| Laptop, with the entrance: Total Blocking Time, main-thread work | 13ms, 2606ms   | 0ms, 460ms     |
| Laptop, without: Total Blocking Time, main-thread work           | 14ms, 2818ms   | 0ms, 406ms     |

- **Checks:** `pnpm run lint`, `pnpm test` (145 tests), `pnpm run smoke` and the full `pnpm run check` pass. The first full check failed once in Firefox ("dragging did not turn the compass"). That test of the drag fails now and then in Firefox with the old code as well (1 in 4 runs before this change, 2 in 12 after), so it was not changed; the second full check passed.

## 2026-11-13, the live servers start with node, not pnpm

Both Dokploy applications built fine with Railpack, then crashed on start with `/bin/bash: line 1: pnpm: command not found`. No package was added or updated; nothing in the build changes (still Node.js 26 and pnpm 12.18.0).

- **Why, from Railpack's code** (railpack.com, "Config file" and "Node"; `core/providers/node/` and `core/generate/context.go` at 0.15.4 and 0.43.0, read on 2026-11-13; 0.43.0 is still the newest release, GitHub, released 2026-10-19). Railpack's default start command is `pnpm run start`. In 0.15.4, the version Dokploy fills in by default, pnpm comes from Corepack, installed during the install step into Node.js's own folder; the finished image copies Node.js from an earlier step, without it, so pnpm is missing at run time. 0.43.0 installs pnpm another way and copies more, but relying on that would tie the site to one Railpack version.
- **The fix:** a `railpack.json` in each repository with `deploy.startCommand`: `node server/index.js` for the site, `node font-server.js` for the fonts, the same files their `start` scripts run. Railpack's code applies this after its own choice, in both versions. `pnpm start` stays as it is for use on this computer.
- **What the finished image holds, from the same code:** Node.js; `node_modules` from the install; and everything in the repository after the build (`.` of the build step, `node_modules` copied separately), so `_site/`, `server/` and `src/_data/` for the site, `fonts/web/` and `font-server.js` for the fonts. Both servers use only Node.js's own modules, so they need nothing more.
- **Tested here:** a clean copy of each repository (its tracked files plus `railpack.json`), installed with Railpack's command `pnpm install --frozen-lockfile --prefer-offline` (the private one's lock file still resolves, pnpm 12.18.0, nothing to install), the site built with `pnpm run build`, then each started with the command read from its `railpack.json` in a shell whose only program was `node` 26.13.1, with no `.env`, and for the site with `node_modules` moved away. The site answered 200 for the home page, Projects, a project, About, Resume, Credits, the resume PDF and both widget questions, and 404 with the page for a missing address; the font server sent a font (200, `font/woff2`) and refused anything else (404). Railpack itself could not be run here: downloading its program is blocked on this computer.
- **Test first:** `server/start.test.js` checks that the site's `railpack.json` starts with `node`, names no package manager, matches the `start` script and names a file that exists. It failed before the file was added. The private repository has no test setup and was not given one for a three-line file; its command was checked by running it.

## 2026-11-13, a knight's emblem behind the about section

Romit's request, later the same day: run three knight pictures he supplied (in `../inputs`) through the site's picture process as the piece behind "About the human", tuned so each looks its best, and show all three side by side and switchable on the local site. He chose the first: a drawn knight's emblem from Pixabay. No package was added or updated.

| Picture (`images.json`) | Source                                                                | By                                         | Where                                       |
| ----------------------- | --------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| `armour`                | Medieval knight emblem illustration (helmet, plume, spiked pauldrons) | an unnamed artist, Pixabay Content License | Behind the home page's about section, large |

- **Source checked on 2026-11-13:** the image's page on pixabay.com (address from Romit) says "Free for use under the Pixabay Content License". The licence summary: free to use and to change, no credit required; not to be sold on its own, used as a trademark or business name, or used to mislead. A background picture on a personal site is none of those. The page names no uploader, so the Credits page says "by an unnamed artist". The file is Romit's download as he supplied it (`armour.png`, 1920 by 1404, transparent ground, which the process flattens to white). The Met's armour photo (`armour.jpg`) and its credit are gone.
- **The Pixabay Content License is now accepted** by the build (`scripts/lib/credits.mjs`, test written first), next to public domain, CC0 and the Unsplash License. Pixabay is free to use like those three.
- **A drawing, not a photo**, against the family of photos of old machines: Romit's choice, the same exception as the armour before it (the subject he asked for in that place, knowingly). Being flat colour with black outlines, it is the crispest of the three in two tones: the outlines stay solid ink, the gold turns to a light dither and the red plume and cape to a dark one.
- **Settings:** `zoom` 0.63 with `x` 0.475 and `y` 0.746, so the whole emblem shows, its plume near the top, its helmet between the text and the card of links on laptops, and its left spike clear of the text on tablets (at a larger size it ran into the text there). `black` 0.25, `white` 0.8, no `cutout` (the ground is already white). 2169 bytes as PNG, 1215 as JPEG XL.
- **The other two, tried and not chosen:** a photo of a suit of armour standing in a stone hall, and a gold engraving of a closed helmet. The hall photo needed a new setting to separate the grey steel from the warm wall (lightening each pixel by how colourful the area around it is); it worked, but the steel stayed soft and the helmet had no outline. That setting was not kept, since nothing uses it. The engraving came out as heavy black with bright highlights and was the runner-up.

## 2026-11-13, a knight's armour behind the about section

Romit's request: replace the picture behind "About the human" on the home page with a medieval knight's armour, from Unsplash or any similar site (not only museums, libraries or public domain), credited and described. No package was added or updated.

| Picture (`images.json`) | Photo                                                                       | By                                               | Where                                       |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| `armour` (was `engine`) | A suit of polished steel plate armor on a display stand (Augsburg, c. 1525) | the Metropolitan Museum of Art, Unsplash License | Behind the home page's about section, large |

- **Source checked on 2026-11-13:** the photo's page on unsplash.com says "Free to use under the Unsplash License". The museum's record there: "Armor", helmet, pauldrons and vambraces attributed to Kolman Helmschmid, Augsburg, about 1525 and later, steel and leather, Bashford Dean Memorial Collection. Fetched at 2000 pixels wide from Unsplash's image server and kept as it came (`armour.jpg`). The engine photo and its credit are gone.
- **Strictly** it is early sixteenth century, the last age of the armoured knight, not the Middle Ages proper; it is the classic "knight in shining armour" look Romit asked for.
- **Against the earlier rules, by Romit's choice:** the reference has a knight's armour in the same place, and BRIEF.md said never to imitate the subject of one of its pictures, and that every picture comes from the old machines and instruments family. Romit's request overrides both for this one picture. Only the subject is shared: the photo is a different one, licensed and credited, and nothing of the reference's picture was used. The armour is empty, so "no living things" still holds.
- **Tried, through the site's own conversion:** five suits from the Met on Unsplash (polished, fluted, gilded, dark gilded, red velvet). The polished one won: a clear helmet, tall shoulder guards and bright ridges that survive two tones. The gilded ones turn to a black mass, the red velvet one too, and the fluted one's light helmet melts into the ground. Photos of people in armour, close-ups and suits in rooms were left out.
- **Placed in the open:** at its natural size the helmet sat behind the card of links on laptops. A `zoom` below 1 could not move a photo sideways, because the room was always split evenly. Now `x` and `y` decide how the room is shared, so the chosen point sits in the middle of the frame as far as the room allows (`paddingFor` in `scripts/images.mjs`, three new tests written first). With `x` and `y` at 0.5 nothing changes: the computer's picture is byte for byte the same. The armour uses `zoom` 0.82 and `x` 0.68: on laptops the helmet and shoulders stand between the text and the card; on tablets and phones the card covers part of the suit, as it covered the engine.
- **Settings:** `black` 0.45, `white` 0.9, `stretch`, `cutout` 0.03. Lighter thresholds were tried for more of the visor; the difference was small and the heavier one is closer to the reference's heavy black.

## 2026-11-12, four pictures swapped for ones that grab attention

Romit's request: the desk globe was bland ("we need something that gathers instant attention the moment visitor puts an eye on it"), and the 1881 typewriters, the press camera and the telephone should go too. Same family and the same rule: old machines and instruments, nothing alive. Each photo's page on unsplash.com was read on 2026-11-12 for its licence. No package was added or updated.

| Picture (`images.json`) | Photo                                                           | By                                                             | Where                                       |
| ----------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| `engine`                | Pitcairn-Brewer Model F nine-cylinder radial engine, about 1927 | the Smithsonian (National Air and Space Museum), public domain | Behind the home page's about section, large |
| `magnifier`             | A magnifying glass on a pink background                         | Sasun Bughdaryan, Unsplash                                     | Beside Aletheia                             |
| `computer`              | Apple computer (a Lisa 2, modified to a Macintosh XL)           | Museums Victoria, Unsplash                                     | Beside My Homelab                           |
| `keys`                  | Grey skeleton key (an ornate bow), repeated in a row            | Tom Joseph, Unsplash                                           | Beside "Resume"                             |

- **The engine** is the eye-catcher: nine cylinders bursting out of a round hub like a star, the same kind of jolt as the reference's knight with his spiked mace. It was photographed on black; cutting the black away and setting the thresholds high (`black` 0.5, `white` 0.92) draws the metal dark with its highlights light. It is zoomed out (0.68) so the whole star sits in the top half, which is all that shows on laptops, and right of centre, clear of the text on tablets.
- **An `invert` setting** (black for white) was written, test first, to turn the engine around; it looked like a photo negative and was removed again with its test.
- **Why the others:** a magnifying glass for a project that inspects checkouts for tricks, lying flat in a wide frame; an early personal computer beside the server that runs everything; keys for the Resume, a fence of them in the strip like the reference's barbed wire.
- **Tried and dropped:** two other Smithsonian radial engines (one too thin, one side on), a spacesuit (reads as a person), an astronaut's helmet, black binoculars seen from above (read as a face), a vacuum tube on a workbench, other early computers and keys.
- **Settings:** `gamma` is unused again (the globe used it).
- **Checks:** the build, `pnpm run lint`, `pnpm test` (125 tests) and the full check (`pnpm run check`, three browsers) pass.

## 2026-11-12, pictures again: photos of old machines, nothing alive

Romit's request: start fresh, ignoring every earlier picture choice; look at how henry.codes's pictures work together; find photos on Unsplash and other sites; **no living things in any picture**; credit and describe each; and on the Credits page keep his sentence exactly, "A huge thanks to these great folks for their breathtaking photos".

### Sources checked

| What                 | Source, read on 2026-11-12                                                                                                                                                        | Used for                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| henry.codes          | Its home, about and case study pages, photographed in Chromium in the toolbox (looked at only)                                                                                    | How its pictures fit together |
| Each photo's licence | Its own page on unsplash.com: "Free to use under the Unsplash License", or for the Smithsonian's "Dual License: Public Domain & Unsplash License", with the object's record there | The photos below              |

No package was added or updated. Unsplash's download links and search data sit behind a bot check, which was not worked around: photos were found through its pages as a web reader sees them and fetched from its image server, as before. The Smithsonian's own search service limits unnamed callers to a few requests, so it was left after that.

### How the reference's pictures fit together, looked at again

Not old engravings, as the previous entry thought, but **photos of hard, man-made things**: a stone gargoyle in the hero, a suit of armour with a mace behind the about text, a ghostly draped statue and a spiked collar in small frames, a city skyline above the footer, and barbed wire or a crown of thorns repeated as a band in every wide strip. Each is cut out of its background and drawn in heavy black with bright highlights. What holds them together is one mood (menacing, gothic) and one treatment, plus a spiky motif that comes back again and again.

### The new set

Photos of old machines and instruments, shot on plain white or grey grounds, most of them museum photos the Smithsonian shares. Nothing alive in any of them: no people, animals or plants.

| Picture (`images.json`)                      | Photo                                                   | By                                                                   | Where                                                      |
| -------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `globe`                                      | A black globe sitting on top of a white table           | charlesdeluvio, Unsplash                                             | Behind the home page's about section, large                |
| `theodolite`, `theodolites`, `theodoliterow` | Black telescope (a surveyor's theodolite on a tripod)   | Uriel Soberanes, Unsplash                                            | The missing page; the Projects and Credits strips, as rows |
| `presscamera`                                | Folding camera on white surface                         | Jonathan Talbert, Unsplash                                           | Beside Aletheia                                            |
| `telephone`                                  | Alexander Graham Bell's experimental telephone, 1876    | the Smithsonian (National Museum of American History), public domain | Beside My Homelab                                          |
| `camera`                                     | An old fashioned camera on a white background (a Kodak) | JJ Shev, Unsplash                                                    | The About page's small frame                               |
| `typewriter`                                 | Lucien S. Crandall's typewriter patent model, 1881      | the Smithsonian (National Museum of American History), public domain | The Resume strip, as a row                                 |

- **Same three uses as the reference:** one big bold shape behind the about text (the globe, whose lit edge comes out like the orb in the reference's gargoyle), single objects in the small frames, and one instrument repeated as a band in the wide strips (a row of theodolites; on the Resume page a row of typewriters).
- **Why each:** the globe is painted black with no countries on it, a world still to explore; a theodolite maps new land, and for the missing page it is the search party's instrument; the press camera catches things in the act, as Aletheia catches dark patterns; Bell's telephone is the first network, beside the server that runs everything; the Kodak sits beside the portrait and its "I didn’t have many photos of myself" caption; a resume is typed.
- **Tried and dropped** (about sixty, through the site's own conversion): the Smithsonian's Linotype machine (dense close-up machinery: a texture, not a shape, behind the about text, and a blob in a small frame), the binoculars John Glenn took on Friendship 7 (their white strap is the same grey as the backdrop and vanished with it, leaving two blobs), astrolabes, armillary spheres, an astronomical clock, a celestial globe and gears (in rooms, on dark grounds or with no outline), brass instruments on dark shelves, and Lincoln's pocket watch (gold on brown).
- **Files:** each fetched at 2000 pixels wide from Unsplash's image server and kept as it came. The old prints and their records are gone.

### Settings

- **`cutout`** on every photo. At the globe's large size its backdrop search crept along the smooth light on the sphere's edge and removed the sphere; a smaller number (0.012) stops it.
- **`gamma`** (already in `scripts/images.mjs`, now in the guide): 1.4 on the globe, so its highlight is a soft glow instead of a pale hole.
- **`repeat`** makes the rows: the theodolite's head (its top two fifths) six times beside "Projects" and nine times beside "Credits"; the typewriter six times beside "Resume", on a 6 by 1 band so that a wide strip trims paper rather than typewriters.
- **`fade`** is no longer used (the globe stands clear of the text by itself); the setting stays.

### The Credits page

- The card is called **Photographs** again, and its sentence is Romit's, exactly: "A huge thanks to these great folks for their breathtaking photos:" (the colon, as in his original text, leads into the list).
- Each line now names the photographer: "The telephone: Alexander Graham Bell’s experimental telephone, 1876, by the Smithsonian. National Museum of American History, Public domain." `image-credits.json` has `photographer` in place of `artist`, and no `year` (a date that matters goes in the title). `scripts/lib/credits.mjs` and its test changed together, the test first.

### Checks

The build, `pnpm run lint`, `pnpm test` (125 tests) and the full check (`pnpm run check`, Chromium, Firefox and WebKit at once) pass: every picture says what `images.json` has for it, nothing moves as they arrive, each sits in the same place in all three browsers, and all 45 picture files together weigh 679 KB (the heaviest is the portrait at 960 pixels). The same held after the four swaps in the entry above.

## 2026-11-12, pictures that fit together, and a compass you can spin

Two requests from Romit: pictures that fit together the way henry.codes's do, found anywhere on the internet, each credited and described; and a hero compass that ignores the mouse, turns on its own like Resend's cube, spins freely when dragged, and has nothing behind it.

### Sources checked

| What                 | Source, read on 2026-11-12                                                                                                                                                            | Used for                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| henry.codes          | Its pictures, looked at only, in our own screenshots in the private `reference/`                                                                                                      | How its pictures fit together (below)                                       |
| resend.com           | Its 3D cube, watched in Chromium in the toolbox: frames while idle and after a drag                                                                                                   | How the compass moves: a slow tumble on its own, a drag spins it, it coasts |
| Each print's licence | Its file page on Wikimedia Commons ("CC0" from the National Gallery of Art, the Met and the Cleveland Museum of Art; "Public domain" for the others); the Cleveland Museum's own page | The pictures below                                                          |
| Playwright's clock   | `page.clock` in Playwright 1.65.0 (already installed): stops and moves on the page's timers, frames and `performance.now()`                                                           | The compass test                                                            |

No package was added or updated. The Art Institute of Chicago's collection search sits behind a bot check, which was not worked around; Wikimedia Commons, the Met's and the Cleveland Museum's open data answered.

### How the reference's pictures fit together

They are all one family, old engravings in heavy black ink, and used in three ways: one big figure behind the about text, single subjects in the small frames, and one motif (a thorn branch) repeated as a band in every wide strip. The previous photos here were a mix of unrelated 20th-century objects (a sewing machine, a typewriter, a telephone, a radio), in modern photographs.

### The new set: old prints of science and machines

| Picture (`images.json`) | Print                                                                                 | Artist                                                     | Year         | Collection, licence                | Where                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------ | ---------------------------------- | ------------------------------------------------------------------------------------ |
| `orrery`, `lamplight`   | A Philosopher Giving a Lecture on the Orrery (mezzotint)                              | William Pether, after Joseph Wright of Derby               | 1768         | National Gallery of Art, CC0       | Home page's about section (an oval); About page's small frame (the children's faces) |
| `alchemist`             | The Alchymist, in Search of the Philosopher’s Stone, Discovers Phosphorus (mezzotint) | William Pether, after Joseph Wright of Derby               | 1775         | Cleveland Museum of Art, CC0       | Beside Aletheia                                                                      |
| `diogenes`              | Diogenes, holding a lantern                                                           | Pierre-François Basan, after Jusepe de Ribera              | 1750 to 1769 | The Met, CC0                       | The page for a missing address                                                       |
| `locomotives`           | A locomotive engine similar to the Planet                                             | William Miller, after J. Kindar                            | 1832         | Wikimedia Commons, public domain   | Beside "Projects", repeated                                                          |
| `presses`               | The Columbian Press                                                                   | unknown, in Charles Timperley's printers' manual           | 1842         | Wikimedia Commons, public domain   | Beside "Resume", repeated                                                            |
| `hammers`, `hammerrow`  | Nasmyth's patent steam hammer                                                         | unknown, in Charles Tomlinson's Cyclopaedia of Useful Arts | 1854         | Library of Congress, public domain | Beside My Homelab; beside "Credits"                                                  |

- **Why these:** the same structure as the reference with this site's own family, 18th and 19th-century prints of science and machines. The big pieces and small frames are tonal prints (mezzotints and a stipple engraving): deep black with lamp-lit highlights, which is what survives two tones. Most are after Joseph Wright of Derby, who painted science by candlelight. The wide strips are bands of one machine repeated.
- **Tried and dropped** (each through the site's own conversion, about fifty in all): the Flammarion woodcut, Dürer's armillary sphere, Ramelli's book wheel, Babbage's Difference Engine and Herschel's telescope (fine line engravings: noise at these block sizes); the Met's astrolabes, clocks and celestial globes (brass on grey shrinks to nothing in a strip); the air pump, the iron forge and the blacksmith's shop as small frames (whole scenes turn to mush); a Stephenson locomotive (too light).
- **The theme** stays "the age of exploration meeting old machines", now as prints of the period rather than modern photos. Nothing of the sea.
- **Files:** the 1280-pixel copies Commons serves, kept as they came (never edited). The old photos and their Unsplash credits are gone.

### Three new picture settings (`scripts/images.mjs`, tested)

- **`stretch`** existed; **`fade`** fades a picture into the paper in an oval, like a vignette in an old book (`fadeKeeps`): its middle and size can be set, so the orrery behind the home page's about text stays clear of the text on tablets and phones (measured: the text reaches 9% into the picture at 768px and over its top 7% at 390px).
- **`repeat`** sets copies of a picture (or a `part` of it) side by side, as a band (`repeatLayout`, `partRegion`).

### The Credits page

The card is "Pictures" now, listing for each print what it shows, its title (linked to its page), year, artist, collection and licence (`scripts/lib/credits.mjs`, tested: the build stops on a missing fact, an address that is not a web page, or any licence other than public domain, CC0 or the Unsplash License). Romit's sentence changed by the fewest words: "A huge thanks to these great folks for their breathtaking pictures, and to the museums that share them freely:" (listed in `REWRITE.md` for him to approve).

### The hero compass

- **No reaction to the mouse.** The pointer and scroll listeners are gone.
- **Turns on its own,** like Resend's cube: still for 1.2 seconds after it appears (so it first matches the still picture), then eases in over 1.5 seconds to 30 degrees a second about an axis close to upright that wanders, so it tumbles and shows its face, edge and back.
- **Drag to spin, all the way round.** Its whole pose is now a rotation (nine numbers) rather than three angles with limits: a drag turns it about the axis across the drag, 0.6 degrees per pixel, with no limit. Let go and it keeps the speed of the last tenth of a second (at most 900 degrees a second), easing back to its own pace over about a second.
- **Touch:** a round handle over the compass (`.hero__grip`, `touch-action: none`) takes the finger, so dragging there turns the compass and a finger elsewhere in the frame still scrolls the page. The mouse shows a hand (the standard `grab` cursor).
- **The needle** points up the window, pulled hardest when the dial faces the viewer, and is dragged a little by the case spinning on its face; it wobbles as the compass tumbles.
- **Room to turn:** it turns about the middle of case, crown and bow together, and the view now reaches 1.4 case radii across, so it never leaves the frame. It sits about a fifth smaller in the frame than before.
- **The back** of the case has a raised boss and two turned grooves, and catches a broad light from behind the viewer so they show.
- **Nothing behind it:** the painted texture behind the hero picture (`scripts/lib/paint.mjs`, the `texture` ground) is removed everywhere, the share image included. The brief's "faint paint texture" rule is withdrawn by this request.
- **One clock:** frames and pointer events both read `performance.now()`, so a drag's speed is measured on the same clock as the frames.
- **The check** (`scripts/lib/compass.mjs`) changed with the behaviour: it now stops the page's clock with Playwright's clock and moves it on by hand, and tests that the first drawing is the still picture, that only paper surrounds the compass, that the mouse moving over it changes nothing, that it turns on its own and keeps turning, that a drag turns it and it coasts after, and that a finger on it turns it (`touch-action: none`). The old tests of following the pointer and coming to rest went with the behaviour they tested. The headline's entrance runs on the browser's own animation clock, which Playwright's clock does not stop, so the test waits for it to end before comparing (in Firefox its letters were still passing over the top of the frame).

### Checks

The build, `pnpm run lint`, `pnpm test` (125 tests) and the full check (`pnpm run check`, Chromium, Firefox and WebKit at once) pass. On the way, the full check found three things, each fixed:

- **A missing letter:** the serif fonts have no "ç", so the Credits page fetched the fallback font for "Pierre-François Basan". He is written "P.-F. Basan", a usual short form.
- **The letters test** compares two photographs of each sliding heading, and the compass, now always turning beside the headline, differed between them. That test already hid the tickers for the same reason; it now hides the compass's canvas too (its place stays, so nothing moves). The picture test leaves out the compass's drag handle with its canvas, for the same reason it left out the canvas; the compass test checks the frame does not move when they arrive.
- **The compass test** asked Playwright to stop the clock 20ms ahead, which under the load of three browsers was already past; it now tries again from the new time.

`pnpm run speed`: Largest Contentful Paint on a slow phone 1092ms (1144ms before), on a laptop 104ms; the headline's entrance costs 0ms on the phone and 64ms on the laptop.

## 2026-11-12, Part 3 again: better photos, a finer compass, two About cards

Romit found the Part 3 photos and the 3D compass poor and asked for both again, plus his own caption back on the missing page and two new cards on the About page.

### Sources checked

| What                 | Source, read on 2026-11-12                                                                                                                                                  | Used for                                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Each photo's licence | Its own page on unsplash.com: "Free to use under the Unsplash License" (the Smithsonian's camera, tried and dropped, says "Dual License: Public Domain & Unsplash License") | The photos below                                                                                                                                                  |
| henry.codes          | Its pictures, looked at only (our own screenshots in the private `reference/`)                                                                                              | What a picture here should be: one cut-out object, heavy ink, bright highlights                                                                                   |
| resend.com           | Its 3D cube, watched in Chromium in the toolbox (pointer moved across it)                                                                                                   | The bar for the compass's finish: bevels catching light, varied surfaces, soft studio light, weight in the motion. Nothing of its code, models or assets was used |

No package was added or updated.

### The photos

Unsplash's search refuses automated browsers ("Access Denied"), which was not worked around: photos were found through its search pages as a web reader sees them, and fetched with each photo's own download link. About a hundred were tried through the site's own conversion before choosing.

**Why the first set was poor:** thin line engravings (the armillary sphere, the heavens), busy close-ups (gears, punched cards, the watch movement) and a light object on a busy ground (the globe) all turn to noise or near-empty paper in two tones. **What works**, as on henry.codes: one bold object, mostly dark with bright highlights, on a plain light ground, or a bright object on plain black (paper on an ink block).

| Picture (`images.json`) | Photo                                                                                                                                                    | Photographer   | Where                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------- |
| `sewing`                | [Black and yellow metal sewing machine](https://unsplash.com/photos/black-and-yellow-metal-sewing-machine-hzdgFPz1V24)                                   | Annie Spratt   | Behind the home page's about section                      |
| `typebars`, `keys`      | [A black and white photo of an old fashioned typewriter](https://unsplash.com/photos/a-black-and-white-photo-of-an-old-fashioned-typewriter-sufuSMO41Jg) | Bonnie Hawkins | Beside "Projects" (the type bars) and "Resume" (the keys) |
| `telephone`             | [Photo of black rotary phone against white background](https://unsplash.com/photos/photo-of-black-rotary-phone-against-white-background-xhGMQ_nYWqU)     | Quino Al       | Beside "Credits"                                          |
| `hourglass`             | [An antique hourglass with sand flowing](https://unsplash.com/photos/an-antique-hourglass-with-sand-flowing-ozuQ8EY2CRA)                                 | Callum Mullin  | The About page's small frame                              |
| `lantern`               | [Silhouette of an old lantern against a pale sky](https://unsplash.com/photos/silhouette-of-an-old-lantern-against-a-pale-sky-sOvV69iL6SA)               | Belov Sergey   | The page for a missing address                            |
| `binoculars`            | [Black binoculars on white surface](https://unsplash.com/photos/black-binoculars-on-white-surface-bMIUBn07iM0)                                           | Glen Carrie    | Beside Aletheia                                           |
| `radio`                 | [Vintage radio on a white background](https://unsplash.com/photos/vintage-radio-on-a-white-background-mZSx0BmjOMg)                                       | Ian Talmacs    | Beside My Homelab                                         |

Tried and dropped: an astro compass and a bellows camera from the Smithsonian (black on a dark or grey ground: no clean outline), a row of three folding cameras (blobs in a strip), a big gear (rust turned to noise), a celestial globe and a top-down globe (too light), and an earlier telephone, kept off in favour of the wider one for the Credits strip.

**Two new settings** (`scripts/images.mjs`, tested):

- **`cutout`** removes a photo's plain backdrop, so only the object is drawn on paper (`plainBackdrop`): it spreads from the photo's edges while neighbouring greys stay close, so it follows a slowly darkening wall and stops at the object's edge, and a light spot inside the object stays. It starts only from edge pixels near the ground's grey, measured along the whole photo's edge, because a tight crop runs through the object (the sewing machine at first came out hollow when the search started inside its hand wheel).
- **`zoom` below 1** shows the whole photo smaller, with room around it in the photo's own ground grey (`paddingFor`), for objects a wide frame would cut (the radio, the telephone).

**Frames are cropped to fill**, and their shapes change a lot with the window (measured: the strips beside page names run from 2.9 to 7.5 times as wide as tall; the My Homelab frame from 2.5 to 3.3; the About page's small frame from 0.4 to 3). Each picture keeps its object in the middle with room to lose. The about section's picture only shows its top half on laptops (the section cuts the rest), so the sewing machine's decorated arm sits high.

**The Credits page keeps its wide frame:** a square frame was tried and left a large empty gap beside the short name.

Formats as before (lossless JPEG XL, AVIF, PNG; the smaller offered first): JPEG XL wins for all the new pictures, AVIF for none.

### The hero: the compass rebuilt

- **Same blocks, 152 by 190 (3px on laptops).** Finer blocks (228 by 285, 2px) were tried first and looked finer, but the brief's measured rule for the hero is about 150 blocks of 3px, like the reference's and every other picture here; 3px blocks also leave more room for the browsers' rounding when they enlarge the picture. The dial's rings and marks were made a little bolder for 3px blocks.
- **Two steps:** the compass is drawn three times finer into a texture, as smooth greys, then each block's nine samples are averaged and dithered. Edges and small parts come out cleaner than drawing straight into blocks.
- **Light and materials:** polished metal reflects a soft studio (a large soft light above on the left, a narrow one on the right, a dim room), so highlights slide over the case as it turns; painted parts take the light softly; the bezel and crown are knurled (grooves made in the shader); the dial darkens under the bezel's rim; the needle casts a soft shadow on the dial; the glass adds its reflections and dulls the dial toward its rim (as white on white, its reflections alone would not show).
- **Model** (`compass-model.js`, tested): a rounded case with smooth normals, a stepped bezel, a crown with a knurled button and a bow, a dial with a track of 5°, 10° and 30° marks, quarter marks and rings, a raised eight-point rose, a blued north half and a brighter south half on the needle with a jewelled cap, and a domed glass.
- **Dither:** the four by four `fine` pattern (16 steps) instead of two by two (4 steps): curved metal shades smoothly.
- **Motion:** the pose now hangs on a spring (`follow: { stiffness: 70, damping: 13 }`): it swings about 2% past and settles in about half a second, which gives it weight. Reach: tilt 18°, lean 24° (the test keeps it under 25°). It still comes to rest, so the still picture and the checks hold; there is no idle motion.
- **Still and share image:** redrawn by `pnpm run share`.
- **Speed** (`pnpm run speed`): Largest Contentful Paint on a slow phone 1144ms (1168ms before), on a laptop 44ms (104ms before); the headline's entrance costs nothing.

### Firefox and the still picture

The first full check failed once, in Firefox only: at rest the compass differed from the still picture in 5.1% of its blocks (1% allowed). Measured step by step: the two browsers draw the same compass (0.07% apart, raw pixels); Firefox's live canvas shows exactly what it draws (0.09% off the file); but Firefox showed the still _image_ 1.8% off its own file, in one rectangle on the right, even with the compass never started. The cause: every picture has `object-fit: cover`, and the hero frame's inside is 454.67 by 569.33 pixels at 1440px, a hair off four by five, so the image was enlarged by its height (2.9965 times) and trimmed by 0.8px, while the canvas is stretched to the box (2.9912 across). The two drift a pixel apart toward the right; Chromium's rounding hid it, Firefox's did not. **Fix:** the hero's still picture is stretched like the canvas (`object-fit: fill`, `hero.css`). After it: 0.00% in Chromium, 0.11% in Firefox, 0.07% in WebKit. The check itself was not changed.

Three other changes made on the way are kept because they are sound, though none was the cause: the block pass asks for high precision where there is any; the grooves' angle is folded into one turn before its sine (graphics cards differ on the sine of large numbers); and the fine picture is released after each frame before the next draws into it. A plain canvas copy of each frame and a transform-scaled canvas were tried and dropped.

### Checks

The build, `pnpm run lint`, `pnpm test` (112 tests), `pnpm run smoke` and `pnpm run speed` pass. The full check (`pnpm run check`, Chromium, Firefox and WebKit at once) failed once in Firefox (see above) and then **passed** in all three browsers, the compass test included.

### Text

- **The missing page's caption** is Romit's again: "The search party hasn’t found it either." It sits under the lantern.
- **About page:** two new cards, in the existing card style, between Contact and Toolbox: "Last Movie or Series I watched" ("Finishing MCU for Doomsday") and "Currently Reading" ("The Odyssey"), each with "Suggest me", an email link to hi@romitraj.dev with the subject filled in. The titles' font (Louize Display) has no slash of any kind, so in "Movie/Series" the slash became "or", which also reads right aloud; the subjects keep their slash, since they are not shown. Words in `about.json` (`watching`, `reading`). The link is built by `scripts/lib/mailto.mjs` (tested): the subject is written with `encodeURIComponent`, so spaces are `%20`, never `+`, which some mail apps show as a plus sign.
- New picture descriptions in Romit's tone, listed in his notes and in `REWRITE.md`.

## 2026-11-12, Part 3: a new theme, new pictures, a 3D compass

Part 3 of the overhaul. The sea theme is gone. The new one, Romit's, is **the age of exploration meeting old machines**: compasses, armillary spheres, star charts, telescopes, hourglasses, gears and punched cards.

### Versions and sources checked

| What                | Version                   | Source, read on 2026-11-12                                                                                        | Used for                                       |
| ------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Phosphor Icons      | 2.1.1 (newest)            | `@phosphor-icons/core` package.json on unpkg.com                                                                  | The README's gear icon, in place of the anchor |
| WebGL 1             | in every target           | Checked in the three test browsers here (Chromium 158 with SwiftShader, Firefox 159, WebKit 27.2): all draw WebGL | The hero's compass                             |
| sharp, @jsquash/jxl | 0.35.5, 1.3.0 (unchanged) | `pnpm view`                                                                                                       | Lossless AVIF and JPEG XL                      |

No package was added. The compass is drawn with plain WebGL, a few hundred lines of the site's own code, rather than a 3D library (three.js alone would be several times the size of the whole main script).

### The photos

Chosen from Unsplash for one clear subject on a plain ground, which is what survives the two-tone treatment. Each page was read on 2026-11-12 and says "Free to use under the Unsplash License" (the Smithsonian's says "Dual License: Public Domain & Unsplash License"; it was tried and dropped, see below). Unsplash's search now sits behind a bot check, which was not worked around: photos were found through its pages as a web reader sees them, and the files fetched from its image server.

| Picture (`images.json`) | Photo                                                                                                                                      | Photographer                | Where                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `armillary`, `heavens`  | [Celestial spheres and armillary sphere diagrams](https://unsplash.com/photos/celestial-spheres-and-armillary-sphere-diagrams-7LzE9wWU-pI) | The New York Public Library | Behind the home page's about section (the armillary sphere); beside "Credits" (the heavens above it) |
| `gears`                 | [Cogs and gears](https://unsplash.com/photos/cogs-and-gears-GmvH5v9l3K4)                                                                   | Tim Mossholder              | Beside "Projects"                                                                                    |
| `punchcards`            | [Rows of vintage punched cards with data](https://unsplash.com/photos/rows-of-vintage-punched-cards-with-data-OOeeu8t-Xl4)                 | Bernd Dittrich              | Beside "Resume"                                                                                      |
| `hourglass`             | [Clear hour glass with brown frame](https://unsplash.com/photos/clear-hour-glass-with-brown-frame-KYxXMTpTzek)                             | Quilia                      | The About page's small frame                                                                         |
| `telescope`             | [Black telescope](https://unsplash.com/photos/black-telescope-gCeH4z9m7bg)                                                                 | Uriel Soberanes             | The page for a missing address                                                                       |
| `globe`                 | [A black globe sitting on top of a white table](https://unsplash.com/photos/a-black-globe-sitting-on-top-of-a-white-table-RDjZh9dqlP4)     | charlesdeluvio              | Beside Aletheia on the Projects page                                                                 |
| `movement`              | [A close up view of a watch movement](https://unsplash.com/photos/a-close-up-view-of-a-watch-movement-HmIwomthlWw)                         | Олександр К                 | Beside My Homelab on the Projects page                                                               |

Tried and dropped: a clear hourglass on white (the glass vanished), a 1795 star map (its fine lines turned to noise at 192 blocks), and the Smithsonian's surveyor's compass in its case (a muddle of greys). The whale's tail, the server rack, the padlock and the harbour cranes are gone, with their credits.

### The band above the footer: a night sky

`night-sky.svg`, this site's own drawing, in place of the sea swells: paper at the top darkening to ink, stars coming out as it darkens (a few four-pointed), a thin crescent moon, and the arcs and hour lines of a star chart, dark on the light part and light on the dark part. Stippled (`pattern: grain`) as before. It also fills the About page's wide frame. The CSS is `night-sky.css` (was `shore.css`).

### The hero: a 3D compass

Romit's request: an animated 3D compass in the pixel style, reacting to the pointer or the scroll, with a still pixel picture where it cannot run.

- **Drawn with WebGL into a canvas exactly as many pixels as the hero's picture has blocks** (152 by 190), enlarged with `image-rendering: pixelated`. The shader lights each surface and turns the result into ink or paper with the same two by two pattern the build uses for photos, counted from the top left, so it is the same kind of picture as the others.
- **The model** (`compass-model.js`, tested): a brass case turned from a profile (a rounded back, a rolled edge, a lip), its ring on a stem, a light face with a thin ring, 36 marks (longer at the four quarters), a rose of eight points each split dark and light, a pivot, and a needle with a raised ridge, its dark half north. Each surface carries a tone from ink to paper.
- **The movement** (`compass-motion.js`, tested; numbers in `motion.js`, `compass`): it leans toward the pointer (up to 16° and 22°), the case turns on its face as the hero scrolls away (up to 140°, plus a little with the pointer), and it follows with a time constant of 0.18s, whatever the screen's refresh rate. The needle has a spring toward north, damping and a pivot that drags it along when the case turns, so it swings past north and settles in a few wobbles. A finger is not a pointer: on touch screens the scroll turns it.
- **It draws only while something moves**, and not while the hero is out of sight or the tab hidden. Leaving the home page stops it and removes its canvas (and frees the WebGL context); coming back starts it again.
- **The still picture first, and wherever it cannot run.** `pnpm run share` now first draws the compass at rest with the same code, in Chromium, and saves `src/assets/img/source/hero-compass.png` (see-through around the compass). The build turns it into the hero's picture like any source; the painted texture shows exactly where it is see-through (new: a source with see-through parts gives its own outline, `backdropOf` in `images.mjs`, tested). Converted, it is the same block for block. Every visitor gets the still first; the canvas is laid over it after load, when the browser is idle, and takes its place once its first drawing is ready. Without scripts, without WebGL, under reduced motion (also when switched on during a visit) or if the context is lost, the still stays.
- **Accessibility:** the still `<img>` keeps its place in the page at opacity 0, so screen readers read its description; the canvas is `aria-hidden`.
- **Loading speed:** the still is the page's largest piece, as the whale was; the compass's code is in the main script and starts after load.

### Formats: lossless JPEG XL, AVIF and PNG for every pixel picture

`scripts/lib/formats.mjs` (tested) saves each pixel picture losslessly in all three, decodes each file again and keeps only those that give back exactly the same pixels, and the page offers the ones smaller than the PNG, smallest first, in a `<picture>`, with the PNG last for everyone else. The `<picture>` takes no part in the layout (`display: contents`), so nothing moves.

Sizes in bytes (PNG, JPEG XL, AVIF): hero 1,584, 934, 3,295; armillary 4,709, 3,323, 7,615; night sky 8,453, 8,894, 16,138; heavens 959, 991, 1,971; the rest are a few hundred bytes each, JPEG XL about a third under the PNG. Offered: JPEG XL then PNG, except the night sky and the heavens (PNG alone).

- **AVIF never wins**: for two-tone pixel art it is two to three times the PNG. Effort 9 (the slowest) made it 10 to 15% smaller but still twice the PNG, and added about 10 seconds to every build, so the AVIF files are made at effort 4, only to be compared. JPEG XL is made at effort 9 (lossless JPEG XL is quick at that size).
- **The texture behind the hero stays a lossy WebP**: it is a smooth surface, and lossless it would weigh hundreds of kilobytes. The portrait stays as in Part 2.
- Chromium 158 takes the JPEG XL; Firefox the PNG.

### The share image and the preview tags

The share image now shows the hero's compass at rest on its painted texture (3 pixels a block), beside the headline. Every page also carries `og:locale` (`en_IN`, `locale` in `site.json`) and `twitter:site` (the X name, as `twitter:creator`); the check expects both (`scripts/lib/head.mjs`). Its description says "an old pocket compass".

### The page for a missing address

A telescope on a tripod, "pointed at nothing in particular", with the caption "I pointed the telescope everywhere. Still nothing." (a draft for Romit). The test of that page waited for the words "Lost at sea" after a link to a missing page; since the rename it waited ten seconds in vain each time before going on. It now waits for the page's own name, and its made-up addresses are no longer sea jokes.

### Sea words

Gone from the code, the styles and the guide: the paint texture's "swells" are "bumps", the band is the night sky, the missing page's picture class is `lost__picture`. The headline's own words ("a drop", "an ocean") are Romit's and stay. Older entries in this log keep their words: they record what was true then.

### The README

The anchor icon is now Phosphor's gear (2.1.1, fill, ink and paper files). The pictures paragraph describes the new pictures and the 3D compass, the tools list names WebGL and jSquash, and the screenshot was retaken.

### The full check

Run five times at the end of Part 3, in Chromium, Firefox and WebKit at once. It also confirms the Vite+ bundling in Firefox and WebKit: no script error or layout fault in either.

- **First run, four problems, all fixed:** (1) the Credits page drew "Олександр К" in a fallback font (Louize has no Cyrillic): the name is now written "Oleksandr K"; (2) the About page's in-sight post test assumed a 1000px window shows the piece, untrue since the quote moved to the top in Part 2: the window is now 1600px and the test checks the piece really is in sight; (3) the picture test counted the compass's canvas as a piece that appeared when the pictures loaded: it is left out there (its own test checks that it moves nothing); (4) at 768px the about section was a pixel taller in Chromium than Firefox, because the serif asides in the bio grew the line differently: they now take no line height (`line-height: 0`), and both measure the same.
- **Second run, one problem:** on phones the footer's compass sat 1.1px lower in Firefox, because the © sign (text font, in a serif line) grew the line half a pixel there. Same fix; both now measure the same (721.53 against 721.60). Everything else passed in all three browsers, including the new compass test.
- **Third and fourth runs: WebKit only, now and then.** The home page's blog list was "still not shown after the visitor scrolled back up", and cutting the home page's headings into letters "moved 4 other pieces". Both passed alone in WebKit, four times out of four. **The cause is real, and Safari's:** WebKit moves an animated element (the tickers) even between two measurements in the same instant of a script; Chromium and Firefox hold it still until the next frame (measured: 4.1px in 100ms in WebKit, 0 in the others). So on Safari, `posts.js` could take the moving ticker for something the newer posts had pushed, undo the change and wait for another scroll. **Fix:** what moves inside a ticker is left out of that measurement (the ticker's own box is still measured), and out of the letters test's, as the other tests already did.
- **Fifth run: passed** in all three browsers, including the new compass test. It also confirms the Vite+ bundling in Firefox and WebKit.
- **Speed** (`pnpm run speed`): Largest Contentful Paint on a slow phone 1168ms, against about 1250ms with the whale; on a laptop 104ms. The headline's entrance costs 0ms on the phone and 8ms on the laptop.

## 2026-11-12, last: a copy button, and a shorter description

- **The Projects page's search description** is Romit's: "The projects Romit Raj Sahu has built." The rest of the hidden text stays as rewritten earlier the same day.
- **A copy button beside the gpg command** on the About page (`src/assets/js/copy.js`, tested): one press copies "gpg --locate-external-keys hi@romitraj.dev" with the browser's clipboard, or the older way (selecting a hidden copy) if the clipboard refuses. It then shows "Copied" for 1.5 seconds, filled with ink in the `.button` style (`.button--small`, as tall as the box beside it).
  - **Keyboard and screen readers:** it is a real `<button>`, so Tab reaches it and Enter or Space presses it, with the focus ring every link has. Screen readers hear its label, "Copy the command", and "Copied" from a status line beside it.
  - **Without scripts** it is hidden by the styles (it shows only on a page marked `js`), and the command can still be selected by hand. Nothing in the page is changed when it starts: one listener on the whole document handles every copy button, so pages that arrive by a page change work too, and the copy of the page that Taxi keeps stays as built.
  - **On a narrow card** the command wraps inside its box, so the button stays beside it.
  - Checked in Chromium: mouse and keyboard copy the exact command, the state returns after 1.5 seconds, it works after a page change, and it is hidden without scripts. The full check at the end of Part 3 covers the other browsers.

## 2026-11-12, later: Romit's fixes to Part 2

Eleven fixes Romit asked for after looking at Part 2. Some of them reverse choices in the entry below.

### Versions and sources checked

| What                | Version                                                   | Source, read on 2026-11-12                                                                                                                                                    | Used for                                                                                                                 |
| ------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| @jsquash/jxl        | 1.3.0 (newest)                                            | `pnpm view @jsquash/jxl version`; its README (Node needs the WebAssembly files handed to `init`)                                                                              | Encoding and decoding JPEG XL during the build. sharp, already used, cannot write JPEG XL: its own libvips has no libjxl |
| JPEG XL in browsers | Safari since 17; Chrome from 155; Firefox switching it on | developer.chrome.com, "Shipping JPEG XL in Chrome" (dated 2026-10-06); reports of Firefox 152 (behind a setting) and 158 (on by default), with no official Mozilla page found | Why JPEG XL is offered but never alone: AVIF and JPEG follow it                                                          |

### The portrait is a photo again (fix 1)

- **The pixel portrait is gone.** `src/assets/img/source/portrait.jpg` is now the original photo with its backdrop. The build turns it into shades of grey and keeps it a photo (`"kind": "photo"` in `images.json`; `scripts/lib/photo.mjs`, tested).
- **Same quality, smallest first.** Each format is saved at the lowest setting whose result scores 0.98 on SSIM (structural similarity with the grey original; 1 is identical), searched at 480 pixels and used at every width. SSIM was implemented in the project (about 60 lines, tested) because no maintained package offers a perceptual score in Node. Results for the portrait at 480 pixels: AVIF 24.7 KB (quality 74), JPEG XL 32.2 KB (quality 88), JPEG 43.9 KB (quality 91). The page offers AVIF first, then JPEG XL, then JPEG. The order is worked out on every build, so a photo where JPEG XL comes out smaller would list it first.
- **Sized for the frame.** Four widths (240, 480, 720, 960) and a `sizes` attribute that matches the frame (a square of at most 224px under 1000px, two of twelve columns above), so a laptop takes the 240 file, a sharper screen 480, a phone 720.
- **Encoder settings:** JPEG XL effort 6 (as small as 7 and quicker), AVIF effort 4 (sharp's default: effort 6 took three times as long for files about 2% smaller). A first build takes about 25 seconds for the portrait; the results are kept in `.cache/photos/` and reused, so later builds take about a second. On the live server, where there is no cache, each deploy takes those 25 seconds once.
- **Not named or credited anywhere**, as asked: it has no entry in `image-credits.json` (`"credit": false` in `images.json`), the README and the Credits page say nothing about it, and the "own photo" rule added earlier today is removed again.
- **The full check's picture tests** now name a picture by its `data-picture` mark (a photo's files are named by width) and give photo files a limit of their own, 160 KB each, since they are real photos in shades of grey; the 24 KB limit for pixel pictures is unchanged.

### The quote moved to the top, with an entrance (fix 2)

- It sits right under "About the human", outside the card grid, at 40px on phones and from 56px up to 104px on laptops (`--type-saying`), as two lines: the plain half, then the italic half.
- **The entrance:** each line slides up into place through a window at its top edge, solid, the second 0.12s after the first, each in 0.95s on the same curve as the giant letters. On opening the page it runs through `intro.js` with `entrance: saying`: the page names the pieces that enter, so the page's name stays still (a page with `entrance: true`, the missing page, still gets everything). On arriving from another page it runs in `pageIn`, starting 0.3s in, while the name is still sliding up. On leaving, the quote fades with the cards. No entrance under "reduce motion", no hiding without scripts, and the usual three-second safety.
- **Why whole lines, not each wrapped line:** cutting the quote into its wrapped lines needed the line-cutting code in the small entrance script, which then grew to 6,210 characters, past its 5,999 limit (`bundle.test.mjs`). That limit keeps the script quick and was not loosened. With whole lines the script is 5,297 characters. On phones each half wraps over two lines and moves as one piece.
- **Speed** (`pnpm run speed /about/`, which now compares with and without the entrance on any page): 0ms of Largest Contentful Paint on a slow phone and on a laptop. The home page: 0ms and -4ms, as before.
- **Test:** `scripts/lib/saying.mjs`, run by the full check (no flash, ends in place, the name does not move, arrival from home, reduced motion, no scripts). Run once in Chromium here: no problems.

### Plain addresses for downloads (fix 3)

- `/resume.pdf` and `/romitraj-pgp-public.asc` have no `?v=` any more (`scripts/lib/downloads.mjs`).
- **Caching stays safe another way** (`server/files.js`, tested): everything without a fingerprint, pages and downloads alike, is sent with `Cache-Control: no-cache` and an ETag, so browsers and Cloudflare check each time and get a short 304 "not modified" when they already hold the latest version. Files asked for with a fingerprint may still be kept for an hour.
- **What keeps its fingerprint:** the stylesheet, the scripts, the fonts, the icons, the pictures and the share image. Visitors never follow those as links, and the fingerprint is what lets them be kept safely. If Romit wants plain addresses there too, the same no-cache rule would cover them, at the cost of one check per file per visit.

### The key card (fix 4)

- The key's algorithms are read from the key for every part, with what each is for, from the key's own flags: "Ed25519 (signing) and Curve25519 (encryption)" (`keyFacts` in `scripts/lib/pgp.mjs`, tested). The words for the uses and "and" are in `about.json`.
- **"Download key" is a button**: a new `.button` style (`button.css`) in the site's language, a 2px ink frame with 12px corners that fills with ink on hover in 0.2s. No button existed before.
- Under it: "You can also fetch it straight from my domain:" and `gpg --locate-external-keys hi@romitraj.dev` in a framed box (`.command`) where one click selects the whole line. It is set in Neue Montreal, not a monospace font: the site's licensed fonts have none, and a system monospace would differ between browsers.

### The resume opens in the browser (fixes 5 and 6)

- `/resume.pdf` is sent as `application/pdf` with `Content-Disposition: inline; filename="resume.pdf"` (`server/files.js`), so browsers show it. A separate "Download PDF" button saves it (`download` attribute).
- The card has no number and no title: "The best of all me in one page." and the email line, then "Open the PDF" and "Download PDF".

### Text (fixes 7 to 10)

The missing page's caption, and three lines removed from the DevOps Labs, Aletheia and My Homelab write-ups, as Romit asked.

### Hidden text (fix 11)

- **Rewritten in Romit's tone:** the search descriptions of the home page, the Projects page, the Credits page and the missing page, and some words for the sky ("clear skies", "cloudy", "drizzling", "raining", "pouring", "thunderstorms"). The About and Resume descriptions are his own from earlier today and stay.
- **Kept as they are:** the screen-reader labels ("(opens in a new tab)", "Weather in {city}:", "Site map", "Main" and the rest). They are already plain, and screen-reader users rely on the usual wording.
- **Moved out of the templates:** "Main", "Site map" and "love" were written into the templates; they are now in `home.json` (`navLabel`, `footer.navLabel`, `footer.heartLabel`), so every piece of hidden text is in a data file or at the top of a page's file.
- Romit has the full list, with each piece's page, file, key and text, among his notes.

### Checks

The build, `pnpm run lint`, `pnpm test` (68 tests), `pnpm run smoke` (10 pages at three widths in Chromium) and `pnpm run links` (no dead links) pass. The full three-browser check runs at the end of Part 3, as planned; it now includes the quote's entrance.

## 2026-11-12: Romit's own words, projects, resume, portrait and OpenPGP key

Part 2 of the overhaul: every piece of draft text replaced with Romit's (`../inputs/site-text.md`), his real projects, his resume, his portrait and his OpenPGP key. No new packages and no version changes.

### Text

- **Every text in `site-text.md` is in place as written**: the banner ("A lifelong explorer" plus the italic "of how things work."), the tagline ("on", not "of"), the link hints, the home page, the About page, the Credits page, the page for a missing address (now "Lost in oblivion", one paragraph, "Actual places") and the search descriptions. Every procrastination joke is gone. The one place the word is left is the sample text `scripts/fallback_fonts.py` measures fonts with; it is never shown, and changing it would change the fallback fonts' measurements.
- **"Tinkering" is titled "Whereabouts".** Its key in `about.json` and its class name stay `tinkering`, so the blog-post test that names that class is unchanged.
- **The toolbox matches the resume's skills**: two columns (area, skills) instead of three. A two-column table keeps the skills in ink and gives them the room the third column had (`panel.css`).
- **The 404 caption is unchanged** for now: Romit asked for one that fits the new Part 3 picture.
- **The test of the page for a missing address reads the page's name from `404.njk`** instead of having "Lost at sea" written into it, so renaming the page needs no change to the test.

### The Epictetus quote

Placed as the last piece of the About page, under the toolbox, across the same width: "It is impossible for a man to learn _what he thinks he already knows._" in Louize Display at the size of the project names on the Projects page (48 to 80px), with "Epictetus, c. 108 AD" in small grey capitals under it. Why there and why so:

- It answers the "Who" card ("keep learning more about things I think I already know") and closes the page on it, as an epigraph closes a chapter. At the top it would have pushed the portrait and the frames down and broken the grid the cards are measured against.
- The plain-then-italic split repeats the banner and the hero's opening line, the site's own way of setting a sentence. Romit can drop the split by moving all the words into `plain`.
- Every character is in Louize Display (no straight apostrophe, no slash); the author line is in Neue Montreal. It is a `<figure>` with a `<blockquote>`, and arrives last in page changes, like a card.

### Projects

- **The six samples are gone; DevOps Labs, Aletheia, Watchsheet and My Homelab are in**, in that order, written from Romit's facts and the public READMEs of the three repositories (nothing is fetched from GitHub by the build). Each has an opening line and four sections: What it is, Why it exists, How it works (ending in "Built with:"), What I learned, as he asked ("what it is, why it exists, how it works, and what he learned"). The "why" and "learned" parts are drafts built only from those facts; Romit reviews them. Aletheia's write-up says it was built with Abhijit P, as its README says. My Homelab names no IP address.
- **`link` is optional**, since My Homelab has no public link, and **a link that is not on GitHub is shown as "Live:" with its address** (Aletheia and Watchsheet link to the running apps). `scripts/lib/projects.mjs`, tested.
- **A copy-and-fill template**, `src/content/projects/_template.md`, next to the projects. Eleventy ignores it, so it never becomes a page. A test checks that it names every fact and the four sections.
- **Pictures:** Aletheia (2nd) has the padlock and My Homelab (4th) the harbour cranes, until Part 3 replaces every picture. The container ship photo was no longer used and is gone, with its credit.

### Resume

`src/assets/files/resume.pdf` (the PDF from `../inputs/`, phone number included, as Romit allowed) is published at `/resume.pdf` with a fingerprint in the link, and the Resume page is one card that offers it. The PDF is not shown inside the page: browsers show embedded PDFs very differently (Safari on phones shows only the first page), and the site must look the same everywhere.

### Email and the OpenPGP key

- **The email address is in the "Elsewhere" lists** (home page, About page, footer), first, as the address itself with Phosphor's envelope icon (2.1.1, fill, like the others). The list reads `{email}` from `site.json`, so the address is still written in one place. It is plain text everywhere; Cloudflare's Email Address Obfuscation is off (Romit, 2026-11-11).
- **The Contact card on the About page shows the key**: fingerprint `010F 1F08 E31C AFDB 78E1 AEEC CF7E F21B CBB8 D0BB`, key ID `CF7EF21BCBB8D0BB`, Ed25519, expires 2029-09-28, and a download link. These are read from the key file during the build (`scripts/lib/pgp.mjs`, Node's built-in modules only), so they cannot drift from the key. They match what GnuPG 2.4.9 prints for the same file, and the tests check them.
- **The Web Key Directory, direct method**: the build writes the binary key to `/.well-known/openpgpkey/hu/aeii9rmagouy1owpp7e5ftpxjof7h41n` and an empty `/.well-known/openpgpkey/policy`; the server sends both as `application/octet-stream` with `Access-Control-Allow-Origin: *` (`server/wkd.js`), with or without `?l=hi`. The binary is byte for byte what `gpg --dearmor` gives, and the hash is the one WKD gives `hi`; the tests check both, and the build stops if the key has no user ID for the site's email.
- **Tested on this computer** with the site's own server and a throwaway `GNUPGHOME`: both files answer 200 with the right headers, and the key fetched from the WKD address imports as `Romit Raj Sahu <hi@romitraj.dev>`, `CF7EF21BCBB8D0BB`, expiring 2029-09-28. `gpg --locate-external-keys` itself needs the live site over HTTPS: run on 2026-11-12, it answered "No data" because the live site does not have the files yet (404). It works once this is pushed and deployed; the guide has the command ("The OpenPGP key").
- **`openpgpkey.romitraj.dev` does not resolve** (checked 2026-11-12 with the computer's resolver and with 1.1.1.1: no A or AAAA record; Cloudflare answers it exactly as it answers a made-up name). GnuPG tries that name first and uses the direct method only when it does not exist. Never add a record for it, or a wildcard.
- **Cloudflare's Bot Fight Mode** let `curl` through to the WKD address (it answered with the server's own 404), so it should let GnuPG through too. If the check after deploying fails with a challenge page, the WKD folder needs the same care as the blog's feed.

### The portrait

`src/assets/img/source/portrait.jpg` (Romit's photo, already cut out onto white) replaces the marble bust, in the same 11:21 frame. Starting from the tested settings (`across 160`, `pattern fine`, `black 0.05`, `white 0.93`, `sharpen 0.8`, crop `{x 0.45, y 0.42, zoom 1.15}`):

- **With black 0.05 and white 0.93 the face did not read**: all of the skin fell on one or two steps of the dither and the eyes nearly vanished. Four contrast settings were compared side by side; `black 0.3`, `white 0.8`, `sharpen 1.2` gave the clearest eyes, brows and mouth while keeping the face light, as on the reference's portrait. The crop is unchanged (head to crossed arms).
- **Stray specks:** the cut-out left a faint grey outline around the shirt, which became scattered dots. A median filter on the full-size photo before shrinking removed only some of them. What works is a new picture setting, `"despeckle": true` (`removeSpecks` in `scripts/images.mjs`, tested): after dithering, a block of ink with no ink touching it and at most one other within three blocks is removed. The dots of a light tone always have more ink near them, so the shading of the face and arms stays.
- **On phones and tablets the frame is square** and showed the middle of the tall picture (chin to chest). The picture is now placed from the top there (`object-position: 50% 10%`), so the face shows.
- **Credit:** `image-credits.json` keeps every photo on record; the portrait is entered as `"own": true` with Romit as photographer, and the Credits page leaves it out (`scripts/lib/credits.mjs`, tested). The caption and the Credits text say the photos and the portrait are his.
- 1.5 KB as a file.

### Checks

After each step: the build, `pnpm run lint`, `pnpm test` (50 tests) and `pnpm run smoke` (10 pages at three widths in Chromium). `pnpm run links`: no dead links; "could not be sure" only for LinkedIn and four Unsplash profiles, which turn programs away. The full three-browser check runs once, at the end of Part 3.

### Known issues

- **The full check has not run** (Romit's plan: once, at the end of Part 3). Changes it will look at first: the new About page pieces (the key block, the quote) and the portrait in three browsers, and the hero's introduction, which is longer now: on wide windows its last line should still end level with the picture frame.
- **The README's screenshot** shows the old banner line until it is retaken with `pnpm run share` (see Part 3, which makes a new share image anyway).

## 2026-11-11: Updates, pnpm, Vite+, a dead-link checker, and a new computer

Part 1 of the overhaul: setup, updates and tooling. Nothing a visitor sees changed, except list items in Firefox on Linux (see below).

### Versions and sources checked

| What                                           | Version                                                                                  | Source, read on 2026-11-11                                                                                                              | Notes                                                                                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js, newest LTS line                       | 26 (26.13.1, "Lithium")                                                                  | https://nodejs.org/dist/index.json; https://nodejs.org/en/about/previous-releases ("v26.13.1 Latest LTS")                               | `engines` moved from `24.x` to `26.x` in both repositories                                                                                                        |
| @11ty/eleventy                                 | 3.1.8 (was 3.1.6)                                                                        | `npm view`; its GitHub releases                                                                                                         | 3.1.7 replaced the dependency behind the 9 audit warnings logged on 2026-10-09; 3.1.8 undid one alias from 3.1.7. No breaking change. The audit now finds nothing |
| gsap                                           | 3.15.1 (was 3.15.0)                                                                      | `npm view`                                                                                                                              | A patch release; the bundled script is 0.5 KB smaller                                                                                                             |
| playwright                                     | 1.65.0 (was 1.64.0)                                                                      | `npm view`; its GitHub release                                                                                                          | Its browsers: Chrome for Testing 158, Firefox 159, WebKit 27.2                                                                                                    |
| @unseenco/taxi, sharp                          | 2.0.0, 0.35.5 (unchanged)                                                                | `npm view`                                                                                                                              | Already the newest                                                                                                                                                |
| esbuild                                        | 0.28.2 (newest; then removed)                                                            | `npm view`                                                                                                                              | See "esbuild or Vite+" below                                                                                                                                      |
| pnpm                                           | 12.18.0                                                                                  | `npm view pnpm dist-tags` (12.19.0, out the day before, was only on `next`)                                                             |                                                                                                                                                                   |
| vite-plus                                      | 1.6.0                                                                                    | `npm view`; viteplus.dev guide (check, fmt, lint, test, build, migrate, config)                                                         | Published the same day, 04:16 UTC. Brings Vite 8.3.7, Rolldown 1.2.18, Oxfmt 0.78.0, Oxlint 1.93.0, Vitest 5.1.0                                                  |
| corepack                                       | 0.36.0                                                                                   | `npm view`                                                                                                                              | What Railpack uses to install pnpm                                                                                                                                |
| fonttools, brotli                              | 4.68.0, 1.2.1 (were 4.66.1, 1.2.0)                                                       | pypi.org                                                                                                                                | brotli 1.2.0 has no ready-built package for Python 3.15 and failed to build; 1.2.1 has one. The converted fonts came out byte for byte the same                   |
| Python                                         | 3.15.2 (this computer's)                                                                 |                                                                                                                                         |                                                                                                                                                                   |
| Railpack                                       | 0.43.0 newest; 0.15.4 is the default Dokploy 0.31.0 puts in its "Railpack Version" field | GitHub releases; Railpack's code (`core/providers/node/`) at 0.15.4, 0.40.1 and 0.43.0; Dokploy's code at v0.31.0; railpack.com, "Node" | How Railpack finds pnpm and its version, and installs it                                                                                                          |
| Fallback fonts (Anton, Cormorant, Inter Tight) | snapshot of 2026-10-09 (unchanged)                                                       | GitHub, the last change to each font's folder in google/fonts                                                                           | Each last changed in March or April 2026, before the snapshot, so it already holds the newest files                                                               |

### A new computer: Fedora

Romit moved to Fedora KDE. Node.js and pnpm come from Vite+ (`vp`), which picks Node.js from `engines`. Playwright does not support Fedora, so everything that opens a test browser runs in an Ubuntu 24.04 toolbox named `playwright` (the guide, "Test browsers on Fedora").

**The full check failed on the new computer before anything was changed**, in the cross-browser picture test: the footer's compass sat up to 50px lower in Firefox and WebKit than in Chromium on the project pages. Two causes, both of Linux:

- **Chromium rounds each letter's width to whole pixels on Linux** (font hinting), so its text ran a pixel shorter or longer per line than in Firefox and WebKit, and a long write-up wrapped one line differently. Chrome on Windows and macOS does not do this. Every script that starts a test browser now starts Chromium with `--font-render-hinting=none` (`launchOptions` in `scripts/lib/site.mjs`). With it, Chromium and WebKit placed every piece of the project pages identically.
- **Firefox made each list item 24.5px tall instead of 24px.** The invisible list bullet is set in Neue Montreal (so that Safari does not fetch a fallback font, see 2026-10-10), and Neue Montreal's taller line added half a pixel in Firefox. The bullet now has a size of 0 (`study.css`, `panel.css`). It was invisible before and still is; list items are exactly 24px in all three browsers. This is the one change a visitor could notice: lists in Firefox on Linux are a few pixels shorter.
- After both fixes the full check passed in all three browsers. That was the last full check of this part: see "Change of plan" below.

### Updates

- **Node.js 26, Eleventy, GSAP and Playwright were updated together**, as Romit asked, then checked with the build and the quick checks. The built pages came out the same apart from the script's fingerprint.
- **The Python font scripts got their own environment** in `.venv` inside the project, which `scripts/python.mjs` makes and fills by itself on the first `pnpm run fonts` and whenever `scripts/requirements.txt` changes, without pip's download cache. Before, the packages had to be installed by hand into the computer's own Python. A first try with the old brotli left a pip cache in the home folder; it was removed.

### pnpm instead of npm

- **`"packageManager": "pnpm@12.18.0"` in `package.json`, `pnpm-lock.yaml` in place of `package-lock.json`** (converted with `pnpm import`, so every version stayed), in both repositories and in the private reference scripts.
- **`.npmrc` is gone.** pnpm 12 reads only login and network settings from it, so `save-exact` moved to `pnpm-workspace.yaml` as `saveExact: true`.
- **pnpm runs no package's install script unless it is named** (`allowBuilds`) and stops the install if one asks. esbuild's was allowed until esbuild was removed; no package needs one now.
- **Railpack builds it.** Reading its code: when `packageManager` names pnpm, Railpack installs Corepack (`npm i -g corepack@latest`, needed since Node.js 25 no longer ships it) and Corepack installs the named pnpm; the install is `pnpm install --frozen-lockfile --prefer-offline`. Both 0.15.4 and 0.43.0 do this. Tested here: Corepack 0.36.0 runs pnpm 12.18.0 from the field, and a clean copy of the repository (no `.env`, no private folder beside it) installs with that exact command, builds, and serves every page, a 404 for a missing one and nothing for the track without keys. Running Railpack itself here was not possible (downloading its program was blocked on this computer), so its code was read instead.
- **Node.js 26 on the server** comes from `engines`, as Node.js 24 did.

### Vite+: formatting, linting and tests

- **Set up by hand rather than with `vp migrate`.** `vp migrate` was tried on a throwaway copy, with editor settings, agent files and Git hooks all declined. It adds `vite-plus`, a config file, a catalog and overrides for Vite (which nothing here uses on its own), and type-aware linting. The hand setup keeps what is useful: `vite-plus` itself, `vite.config.js`, and Vite+'s lint rule that tests import from `vite-plus/test`. No editor configuration was written.
- **Type-aware linting is off.** It needs type information that a plain JavaScript project does not have, and gave a screenful of warnings about it (promises nobody waits for, and so on), none of them a fault. Without it the linter found two things: an unused helper in `transitions.js` (removed) and a copy of a list in `split.js` that it called needless. That copy is needed (the loop replaces nodes in a live list), so the line says so in a comment that switches the rule off for it.
- **Two more pnpm settings for Vite+:** it ships its own build of Vite numbered 1.6.0, which Vitest's request for Vite 6 to 8 would warn about (`peerDependencyRules`); and pnpm waits a day before installing a new release, so the hours-old Vite+ 1.6.0 is let through by name (`minimumReleaseAgeExclude`, which can go at the next update).
- **The reformat is its own commit.** Oxfmt with single quotes (as the code was written) changed 67 files. The site built from before and after the reformat is identical, byte for byte, in every file.
- **Commands:** `pnpm run lint` (`vp check`), `pnpm run format` (`vp check --fix`), `pnpm test` (`vp test`).
- **Tests, written first and seen failing before the code:** the dead-link checker, the font scripts' Python environment, and the bundling.

### esbuild or Vite+ for the CSS and JavaScript

Romit's rule: keep Vite+ only if the result is identical to the pixel, written for the same browsers and not bigger. Following his change of plan, the comparison was made in Chromium only.

- **How:** the site was built with esbuild; then the same three entry files (the stylesheet, the main script, the headline's entrance) were bundled by Vite+ (Rolldown for scripts, Lightning CSS for styles) for the same browser list (Chrome and Edge 115, Firefox 115, Safari 16.4) and swapped into a copy. Both copies were photographed, every page at 390, 768 and 1440px, with the clock frozen, the stand-in services, and every animation at rest, and the photographs compared pixel by pixel. The esbuild copy photographed twice came out identical, and a 4-pixel change planted in one photograph was found, so the comparison can be trusted.
- **Pixels:** 36 of 36 photographs identical.
- **Browsers:** the same list; nesting is flattened the same way (464 rules in each, no nesting, no `@import` left).
- **Size**, in bytes:

  | File                | esbuild (gzip, brotli)       | Vite+ (gzip, brotli)         |
  | ------------------- | ---------------------------- | ---------------------------- |
  | main.css            | 41,008 (7,702, 6,942)        | 40,277 (7,767, 6,991)        |
  | main.js             | 156,647 (58,501, 52,623)     | 154,192 (56,713, 51,129)     |
  | the entrance script | 4,872 (2,106, 1,882)         | 4,839 (2,029, 1,806)         |
  | **All three**       | **202,527 (68,309, 61,447)** | **199,308 (66,509, 59,926)** |

- **Decision: Vite+.** Every file is smaller as written, and all three together are smaller as sent (about 1.5 KB less with brotli, 1.8 KB less with gzip). The one figure that went the other way: the stylesheet alone is 49 bytes bigger with brotli and 65 with gzip, because Lightning CSS shortens colors (`#666666` to `#666`), which compresses a little less well. Counted as "not bigger" because what a visitor downloads in total is smaller; if Romit reads the rule file by file, going back is one commit.
- **As built:** `scripts/lib/bundle.mjs` does the bundling for the build and for the letters test (which bundled `split.js` with esbuild for the test browser). The real build gives exactly the trial's files, and its photographs are again identical to esbuild's. A build takes about as long (1.75s against 1.62s). esbuild is no longer a dependency; `vite-plus` is a regular dependency, because the live server's build needs it.
- **Still to confirm:** the same in Firefox and WebKit. That is part of the full check at the end of Part 3.

### Change of plan: quick checks now, the full check once at the end

Romit asked mid-way to skip the slow three-browser runs: after each step only the build, `vp check`, `vp test` and a quick check in Chromium.

- **`pnpm run smoke`** (new, `scripts/smoke.mjs`): builds with the stand-in services and opens every page in Chromium at three widths, reporting a page that fails to load, a file that fails or answers with an error, a script error or console error, and a page wider than its window. About 20 seconds. A planted console error was reported on every page.
- **The full check now runs the three browsers at the same time**, each through its tests in turn, printing each browser's results in one piece. Every server the browser tests use is started before them and only read from, so they cannot get in each other's way. **It has not been run in this form yet:** it runs once, at the end of Part 3, and also confirms the bundling in all three browsers.

### The dead-link checker

`pnpm run links` checks every link, picture, stylesheet and script on every page of the built site (served on this computer for a moment), inside the site and out, and every jump to a section; `pnpm run links <address>` does the same for any live website. It sorts the answers into dead (not found, a name that does not exist, a missing section) and "could not be sure" (sites that turn programs away or ask them to prove they are people: LinkedIn, Unsplash profiles, Figma), and asks each website at most three things at a time. Only Node's built-in `fetch`; no package.

First runs:

- **This site:** 86 addresses on 12 pages. Dead: the six sample projects' GitHub links (placeholders; replaced in Part 2). Not sure: LinkedIn and the six Unsplash profile pages.
- **The blog** (`pnpm run links https://blog.romitraj.dev`): two dead links. `https://didiread.romitraj.dev/` (on "Finishing off what I started") has no address at all, and `https://pngfolio.com/arrow-png-transparent-images` (on "Why you should own a server") answers "not found". Not sure: Unsplash photo pages, Figma and LinkedIn's share links.

### Known issues

- **The full check has not run since the bundling and the parallel browsers came in**, by Romit's choice; the quick checks passed after every step.
- **The letters test writes a small temporary file** into `src/assets/js/` while it bundles `split.js`, and removes it at once. A running `pnpm run dev` would notice it and rebuild once.
- **While a test browser is open in the toolbox, Chromium uses the hinting setting above.** Real Chrome on Linux still rounds letter widths, so a visitor on Linux may see a long text wrap a word differently. That has always been so and is not something a page can change.

## 2026-11-06: The site is live; Cloudflare lets the server read the blog's feed

Romit deployed both applications himself in the Dokploy dashboard, following "Deploying with Dokploy" in the guide: the site at https://romitraj.dev and the fonts at https://fonts.romitraj.dev. Nothing in the code changed for it.

- **What his dashboard showed**, now written into the guide: the buttons that create a project and an application and save the source, the build type and the Environment tab were easy to find, so the steps describe them without names; Auto Deploy starts switched on; the origin certificate added in Dokploy was used at once, with the certificate provider set to None on each domain. Watch Paths is not set (his choice), so the fonts application still restarts on every push to the private repository, which is harmless.
- **Cloudflare's Bot Fight Mode is on, and it would block the server from reading the blog's feed** (`https://blog.romitraj.dev/rss.xml`), which the build and `/api/posts` both need: the server is a program, not a browser. Custom rules and WAF skip rules cannot get past Bot Fight Mode, so an **IP Access rule (Allow) for the server's IP address** lets it through instead.
  - The IP Access rules page is hidden in Cloudflare's new dashboard: open the Security rules page and add `/ip-access-rules` to the end of its address.
  - **If the server's IP address changes, the rule must be updated.** Otherwise new posts stop arriving, and because the server keeps answering with the last good list, the site does not look broken. The guide's trouble table points to this.
  - The address itself is not written in this repository.

## 2026-10-14: The About page's latest post arrives without a deploy too

Romit asked for the About page's piece about the latest post to work like the home page's list: from `/api/posts`, with the built piece as the fallback, the same no-jump rule, and the last good post kept when the feed fails. No package was added.

- **The server sends each post's short description now** (`server/blog.js`), which the piece shows under the title. Nothing else in its answer changed.
- **One piece, written once.** The piece is a Nunjucks macro in `src/content/about.njk`, used for the built piece and for a blank copy in a `<template>` element right where the piece goes. A live piece is a copy of that blank, so it carries the same classes, the same "card" mark the page change uses to bring it in, and the same new-tab link. When the build could not read the feed, there is no piece, and the `<template>` marks where one is added.
- **One rule for both pages** (`src/assets/js/posts.js`, rewritten so the list and the piece share it):
  - A piece is changed only while it is out of sight below the window, as on the home page.
  - **New: the change is tried and measured first.** Everything the visitor can see is measured, the change is made, and if anything in sight moved, it is undone at once. All of this happens before the browser draws again, so the visitor never sees the try. It was needed on the About page: there the piece shares grid rows with other cards, so a piece just below the window could still stretch a card that is in sight. A test put the piece exactly at the window's edge on a tablet; without the measuring, something in sight moved.
  - **New: waiting pieces are tried again on every scroll and resize** (once per frame at most), instead of only when the piece leaves the window, so a try that had to be undone gets another chance.
  - **New: a page arriving through a page change gets the newer posts straight away**, wherever its pieces are. The new content comes in and is announced in the same step, before the browser draws anything (confirmed in Taxi's code), so changing it then cannot be seen. This matters on the About page, whose piece starts near the bottom of a laptop's first screen. The home page's list follows the same rule.
  - Still: a piece that already says the same is never touched, and the movement tied to scrolling measures its places again after a change.
- **What stays as built, by the rule:** on a laptop, a visitor who opens the About page directly and can already see the piece when the newer post arrives keeps the built piece for that visit. Arriving from another page of the site, or on a tablet or a phone (where the piece starts below the window), they get the newer one.
- **The last good post** is kept as before: the server keeps answering with the last list it read, and the page keeps the last answer it had.
- **The stand-in feed** gives each post a description; the newer post's is much longer, so the piece really changes size in the tests.
- **Tests** (`latestOnTheAboutPage` in `scripts/lib/posts.mjs`), in each of the three browsers:
  - below the window at a phone's, a tablet's and a laptop's width, the newer post is put in place with nothing in sight and nothing above it moving, made exactly like a built piece;
  - on a tablet with the piece exactly at the window's edge, nothing in sight moves, whichever way it goes;
  - in sight, the piece is left alone until the window is made shorter, then put in place;
  - after a page change into the About page, the newer post is there at once and nothing moves afterwards;
  - an unchanged post is not touched; a page built without the piece gets it, in the right place in the grid;
  - with the feed unreachable or without scripts, the built piece stays.

  The server's answer test now checks the descriptions too. Faults put in on purpose were each reported: changing at once whatever the place, the added piece in the wrong place, the measuring left out, and the page-change exception left out.

## 2026-10-14: The tab icon follows light and dark; blog posts arrive without a deploy

Romit asked for both. No package was added or upgraded.

### The tab icon

- **Why the first version did not switch on his browser.** The tab icon was one drawing (`favicon.svg`) with a rule inside it that turned it from ink to paper in a dark browser. Chrome and Edge draw a tab icon once, when the page loads, and keep that picture: the rule is only looked at again after a reload, and their own store of icons can hold on to the old picture even then. Safari (which reads drawings as tab icons only from version 26) ignores such a rule altogether. Reports read on 2026-10-14 say the same: developers' write-ups on Chrome needing a reload, and WebKit's bug 309949, opened in March 2026, on Safari ignoring the dark rule in a tab icon.
- **What it is now, the way GitHub does it:** two drawings, `favicon-light.svg` (the ink compass) and `favicon-dark.svg` (the paper compass), neither switching by itself. Every page names the light one, with the dark one's address beside it (`data-dark`), and a short script in the head (`layouts/base.njk`) asks the browser "prefers-color-scheme: dark?", names the matching drawing before any icon is fetched, and swaps it the moment the answer changes. It puts a fresh copy of the icon's line in place instead of only changing its address, because some browsers only notice a new line. Without scripts the ink compass stays.
- **Kept as they were:** the `.ico` (ink, for Safari before 26 and anything that asks for `/favicon.ico`), the Apple touch icon and the two Android squares with their manifest. The old `favicon.svg` is gone from the built site.
- **What a page cannot see:** the script follows the browser's light or dark setting (or the system's, when the browser follows the system). A browser theme in custom colors does not change that setting, so a page cannot match it.
- **Tests** (`scripts/lib/head.mjs`): on every built page, the icon line names both drawings and starts with the ink one, and the script is there; each drawing is the right color and neither switches by itself. In each of the three browsers: opened light, the page names the ink compass, and opened dark, the paper one; switching the browser while the page is open swaps it with no reload; the right one stays after a page change; without scripts it is the ink one; and each drawing, painted on a tab-colored background at 16 and 64 pixels, is the compass in the right tone. With the swapping taken out of the script, the test reports the failure in every browser.
- A real browser tab could not be photographed here (the test browsers draw no tabs), so the last look is Romit's.

### Blog posts without a deploy

- **Before:** the home page's posts were fetched while the site was built, so a new post appeared only after the next deploy.
- **Now:** the live server reads the blog's feed itself (`server/blog.js`), keeps the list for 30 minutes, and answers `/api/posts` with as many posts as the home page shows (`writing.count`), each with its title, address and date only. The home page asks for it when it opens and every 30 minutes while it is in view (`assets/js/widgets.js`), and `assets/js/posts.js` puts a newer list in place. The list built with the site stays as it was: it is what visitors see first, and what stays if the script or the feed fails.
- **One reader for the feed.** `server/blog.js` reads the feed for the server and for the build (`src/_data/blog.js`), so both give the same titles (with curly apostrophes for the serif), the same dates and the same filtering. Only links to pages on the blog itself are kept, so the list can never point anywhere else.
- **The last good list.** If the feed fails, the server keeps answering with the last list it read and tries the feed again after 5 minutes (`server/cache.js` has a "keep the last good answer" option for this; the weather and the track still hide when their service fails, as before). Before its first good read, the server answers nothing, and the page keeps its built list. The page likewise keeps the last good list it was given.
- **Nothing in sight moves.** A newer list can be a line taller or shorter than the old one and push everything under it. So the list is replaced only while it is entirely below the window: at once when the page has just opened or arrived through a page change (the visitor is at the top), or else as soon as the visitor scrolls back above it. A list equal to the one in the page is not touched at all. After a replacement, the movement tied to scrolling (the footer's compass) measures its places again.
- **One card pattern.** The cards are written once (a Nunjucks macro in `partials/writing.njk`), for the built list and for a blank card kept in a `<template>` element, which the page copies for each new post. A live card is therefore the built card: the same classes, and the same new-tab link and hidden "(opens in a new tab)", which the build adds to the template like any other link. A page built while the blog was unreachable shows a sentence instead of cards; the live list replaces it.
- **The About page's latest post** is still made at build time and changes at the next deploy. Only the home page's list was asked for. (Changed later the same day: see the entry above.)
- **The check reads no real blog any more.** The stand-in services (`scripts/lib/pretend.mjs`) now include a feed with five stand-in posts of different lengths, in four moods (the same posts, one more post on top, an error, and an answer that is not a feed). `npm run check` and `npm run speed` build the site with that feed too, so the built list and the server's list agree and the screenshots no longer change with the real blog. A stand-in feed is never saved in `.cache/`, so `npm run dev` never shows it.
- **Tests** (`scripts/lib/posts.mjs`). The server: the right posts in the right order and shape, one reading of the feed for five requests, no more posts than the page shows, and an empty answer for a feed that fails, is not a feed or cannot be reached; with short timings, the last good list kept through a failure, the failing feed not asked again at once, and the newer list taken once it answers. In each of the three browsers: a newer list put in place with nothing in sight and nothing above it moving, its cards made exactly like built ones; with the list in sight, nothing replaced and nothing moved until the visitor scrolls back up; the newer list there at once after a page change; an unchanged list left untouched; cards filled in on a page built without them; the built list kept with the feed unreachable and without scripts. Three faults put in on purpose (replacing while in sight, replacing an unchanged list, forgetting the last good list) were each reported, in every browser.

## 2026-10-11: The icon is a compass

Romit found the water drop too plain and asked for three options to choose from, all in ink and paper and all original. He chose the third.

### The three options

| Option                        | What it was                                                                                                 | How it looked at 16 pixels                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| A pixel helmet                | A diver's helmet drawn by hand on a 16 by 16 grid, in the style of the site's pixel pictures                | Sharp: every pixel placed                      |
| A letter R                    | See the note below                                                                                          | Readable but soft                              |
| **A simple compass (chosen)** | This site's compass (the footer's drawing) reduced to a ring, four long points, four short points and a hub | Soft in the first drawing; reworked, see below |

- **The R was not set in the headline font.** A logo made from a typeface needs a licence that covers logos, which is separate from a licence to show text on a website and is Romit's to settle with the foundry. So the option shown was an R in Anton, the free stand-in the site already ships under the SIL Open Font License, which does not restrict artwork made with it.
- The preview of all three, at 16, 32 and 180 pixels on a light and a dark background, was saved outside both repositories (`favicon-options/` beside them), with each option's drawings.

### The compass, as built

- **It is this site's own drawing**, `src/assets/icons/site-icon.svg`, not from an icon set, so there is no licence to follow and nothing to credit. The water drop (Phosphor's "Drop Simple") is gone from `icons.json`, from the built site and from the README.
- **Made for 16 pixels.** On the drawing's 64 by 64 grid the ring has a radius of 26 and a thickness of 4, which at 16 pixels is a ring exactly one pixel thick whose top, bottom and sides fall on whole pixels. The first drawing's ring was a little larger and landed between pixels, which is why it looked soft in the preview. The long points reach the edge of the grid; the hub is a dot in the other color.
- **Everything else is as it was for the drop** (the entry below): `scripts/icons.mjs` makes the tab drawing that switches between ink and paper, the `.ico` with a 16 and a 32 pixel picture, the paper-on-ink squares for phones and the small file for Android, all with fingerprints, and `base.njk` names them on every page. Only where the drawing comes from changed: a file with three kinds of shape (`ring`, `mark`, `hub`) that the script colors, in place of one line in `icons.json`.
- **The README's title carries the same compass** (`docs/readme/compass-light.svg` and `compass-dark.svg`). Its "What this is" heading, which had Phosphor's compass, has Phosphor's anchor now, so the page does not show two compasses.
- **The same limit as before:** the `.ico` cannot switch colors, so in a dark tab of Safari older than 26 the ink compass is dark on dark unless Safari puts a light plate behind it.
- **Tests:** unchanged in what they check (`scripts/lib/head.mjs`); the spot they sample on the tab icon is now on the compass's south point.

### A test that failed once, for another reason

- **The full check failed once while this was being applied**, in one browser, saying that every letter of "OCEAN." was cut at the widest window. Nothing was cut and nothing about the letters had changed.
- **Cause.** That test photographs a heading twice and counts every pixel that differs. The status ticker sits right under "OCEAN." at that width, inside the photograph. The test pauses the ticker first, but the ticker builds itself again, and moves again, a moment after the window changes size and whenever the page asks for the weather or the track again. When that falls between the two photographs, the ticker's movement is counted as missing ink. It can only have started with the widgets; it had not shown in the runs since.
- **Fix, in the test only** (`scripts/lib/letters.mjs`): the tickers are made invisible for those photographs. They keep their place, so nothing else moves, and the test still catches what it is for: with the raised apostrophe's fix taken away, it reports the cut at once.
- The exact failure could not be made to happen again on demand; the ticker restarting by itself after being paused could, and was.

## 2026-10-11: The icon, the share image and the README

### Versions and sources checked

| What                                    | Version or page                                        | Source, read on 2026-10-11                                                                                      | What it settled                                                                          |
| --------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Phosphor Icons (`@phosphor-icons/core`) | 2.1.1 (unchanged)                                      | `npm view @phosphor-icons/core version`; the drawings and the license text were read from the published package | The drop, and the README's small icons. MIT license                                      |
| Safari and drawn icons                  | Safari 26.0 release notes; WebKit's notes on Safari 26 | developer.apple.com, webkit.org                                                                                 | Safari takes an SVG icon from version 26 (September 2025). Older Safari needs the `.ico` |
| LinkedIn Post Inspector                 | Its page                                               | linkedin.com/post-inspector                                                                                     | It exists, for previewing a shared link                                                  |

No package was installed: the drawings are copied in, as the other icons were.

### The icon: a single water drop

**Replaced the same day by a compass: see the entry above. What follows is how the drop was chosen and built; the files and tests it describes are still the ones in use, with another drawing.**

- **The drawing is "Drop Simple" from Phosphor Icons, fill weight.** The set has two solid drops. "Drop" has a thin highlight cut into it, half a pixel wide at tab size, which would only blur. "Drop Simple" is one clean shape and stays sharp at 16 pixels. It is the set the site's other icons come from, so nothing new was added.
- **The license asks for no credit on the page.** Phosphor's MIT license asks that its license text travel with copies of the drawings; it has been in `src/assets/icons/LICENSE-phosphor.txt` since the first icons. The Credits page was left as it is. The README now names Phosphor, because the README's icons come from it too.
- **Ink on a light tab, paper on a dark one.** The tab icon is a drawing (`favicon.svg`) with a rule inside it that picks the color from the browser's light or dark appearance. Drawn in each of the three browser engines on a light and on a dark background, it switched in all three.
- **The reference's icon was looked at once**, as Romit allowed, for inspiration only: it is one solid black mark with nothing behind it, offered as two small pictures. What was taken from it is that idea alone, one solid shape with no tile behind it. The shape, the files and the switch between ink and paper are this site's own.
- **For browsers that cannot use the drawing there is `favicon.ico`**, holding the ink drop at 16 and 32 pixels, each drawn at that size instead of being shrunk. It cannot switch colors.
  - **Known limit:** in a dark tab of Safari older than 26 the ink drop is dark on dark, unless Safari puts a light plate behind it, which could not be tested here. A drop on a tile would have shown in both, but smaller and unlike what every other browser shows.
- **Phone home screens get a paper drop on an ink square**, with nothing transparent (an iPhone paints transparent parts black) and room around the drop for rounded corners or a circle: `apple-touch-icon.png` for iPhones and iPads, two larger squares and `site.webmanifest` for Android.
- **The build makes all of it from one line** (`drop` in `icons.json`) and the two colors in `tokens.css` (`scripts/icons.mjs`), so the icon follows the site. Every address carries a fingerprint.
- **What could not be checked by a script:** how each real browser draws the icon in a real tab. The test browsers do not show tabs. The files, their addresses, how they are served and how the drawing renders on light and dark were all tested; the tab itself is for Romit to look at.

### The share image and the preview tags

- **One picture for every page**, 1200 by 630 pixels, 32 KB: the gradient bar's colors along the top, the headline set as on the site (the serif line, the giant line on two lines with its raised apostrophe, the outlined "is an", the large "OCEAN."), the name and the address, and the close-up of the diver in a frame. Type, colors and drawing are the site's own; nothing of the reference's was used or looked at for it.
- **It uses the diver, not the whale's tail**, because the whale is a placeholder photo and the diver is this site's own drawing.
- **It is a picture in the repository, made by a new command, `npm run share`,** and not by the build. The card is set in the licensed fonts, which the live server does not have. The command draws the card in a real browser from the site's own stylesheet, words and measurements, and stops if a font is missing.
- **Every page carries the tags**, written once in `layouts/base.njk`: Open Graph (`og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` with its type, size and description) and X's (`twitter:card` as a large picture, title, description, picture, its description, and `twitter:creator` from the X link in `site.json`).
  - The title and description are each page's own. The title is given without the site's name after it, which has its own tag.
  - Addresses are full ones, built from `url` in `site.json`.
  - **The page for a missing address gives no `og:url`**: it has no address of its own.
- **The same command retakes the README's screenshot** (`docs/screenshot.png`) from the site running on this computer. Unlike the check, it uses the real weather and track if the keys in `.env` are there, because it is a picture of the real site. The first one shows the track that was playing when it was taken.
- **Previewing the card:** LinkedIn's Post Inspector, once the site is live. opengraph.xyz is another often-named free tool; it could not be opened from this computer to confirm, so the guide names only the first.

### The README

- **Rewritten at about two screens**, where the brief had asked for one: what the site is, the screenshot, what makes it special (page changes, live weather and music, the pictures), what it is built with, three commands to run it, credits and license. Romit asked for the longer version.
- **In Romit's voice**, after reading his blog: first person, short sentences, plain words, a little fun at his own expense. It is draft text and is listed in his rewrite checklist.
- **Small icons instead of emojis**, as image files in `docs/readme/`: ten Phosphor drawings, each as an ink file for GitHub's light mode and a paper file for its dark mode, chosen by a `<picture>` tag, which GitHub follows.
- **It names no private folder and no fonts' location.** It says only that the real fonts are licensed and not in the repository.

### Tests

- **`npm run check`, on the built files** (`scripts/lib/head.mjs`): every page names the four icon files, each exists and is what it should be (the drawing switches between the two colors; the `.ico` holds a 16 and a 32 pixel picture; the squares are the right size with nothing transparent; the manifest names two icons that exist); every page has every tag, with its own title and description, its own full address, and one share image that exists, is 1200 by 630 pixels and weighs under 300 KB.
- **In each browser:** the four icon files are served, each as the right kind of file; and the tab icon, drawn at 16 and at 64 pixels, is the ink drop on a light background and the paper drop on a dark one.
- The share image is left out of the pictures' own weight test (24 KB a picture): no visitor's browser loads it.

## 2026-10-11: The page for a missing address

Nothing was installed or upgraded.

### What it is

- **"Lost at sea".** An address that leads nowhere now gets a page of the site's own, built on the headline's ocean ("What we know is a drop, what we don't know is an ocean"): the page is somewhere in the part we don't know.
  - The giant name, LOST AT SEA, with the compass in a dark frame beside it.
  - A card numbered 404 where other cards say 01, titled "Off the chart", with two short sentences.
  - Three ways back under the label "Dry land": Home, Projects and About, as the same kind of list the home page's hero has, with the same descriptions.
  - A close-up of the diver's helmet in a frame, captioned as the search party.
- **Only the site's own parts were used:** the inner pages' header, card, frame and navigation list, the two drawings made for this site, its fonts, colors, spacing and motion. The reference's page for a missing address was not opened, measured or looked at.
- **The diver's close-up is a new picture, `searcher`**, cut from the same drawing as the large diver and the jellyfish (`diver.svg`). It is described for screen readers; the compass stays decoration.
- **The words are draft text** in Romit's voice, in `pages.json` (`lost`), and are listed in his rewrite checklist.

### A real 404

- **The server answers a missing address with the status 404 and this page.** Before, it answered 404 with two plain words. The status is unchanged; what the visitor sees is new.
- **A missing picture, stylesheet or other file still gets the plain answer.** A page is no use where a picture was asked for. The server tells the two apart by the address: one that ends in a file extension other than `.html` is a file.
- **The page asked for by its own file name (`/404.html`) is answered 404 as well**, so it has no address at which it looks like a real page.
- **`npm run dev` does the same** without any change: Eleventy's preview server sends `404.html`, with the status 404, for any address it does not have.

### A link inside the site that leads to a missing page

- **What happened before, found while building this.** Page changes are made by Taxi.js, which fetches the next page. For any answer that is not a success Taxi gives up and reloads the browser at that address. But Taxi also fetches a page ahead of the click, when the pointer first rests on a link, and a click that came while that early fetch was still under way was left with nothing: the old page had animated away, the address had changed, and no content arrived. A visitor on a slow connection would have been left on a page with a banner, a footer and nothing between them.
- **Now the "Lost at sea" page arrives like any other page.** A few lines in `transitions.js` watch Taxi's own requests. An answer with the status 404 that carries a page is handed to Taxi as one it accepts; Taxi then swaps the content in and the page arrives with its letters and cards, at the missing address, with no reload. The answer on the wire is still a 404. Every other request, and every other failure, is passed on untouched, so a server error still makes Taxi reload as before.
- **Why not leave it to the reload:** the blank page above, and because a reload restarts the banner's gradient bar and the footer for no reason.

### Its name slides in when the page opens

- **Romit asked for the same letter-by-letter entrance as the other pages.** The other inner pages only show it during a page change, and a missing page is almost never reached by one: it is reached by a typed address or a link from elsewhere. So this page has the entrance on opening as well, like the home page: its letters rise into place one after another, at the same pace.
- **This makes it the second page with an entrance.** The earlier entries say only the home page has one; that was true until this request. It uses the same small script (`intro.js`) with one more starting place, and a page asks for it with `entrance: true` at the top of its file. Every condition set for the home page's entrance holds here too, and is tested: the name is hidden until its letters are ready and never flashes in place first; it ends exactly where a still page has it; visitors who asked for less motion get no entrance; without scripts the name is simply there.
- Only the name moves on opening. The card and the frame are there from the start, as the rest of the home page is.

### Tests

- **`npm run check` asks the server directly** for five missing pages (with GET and HEAD), three missing files and one real page, and checks the status and what came back.
- **In each of the three browsers** (`scripts/lib/lost.mjs`): the page at laptop and phone size (status, name, the three ways back, nothing wider than the window); the entrance, as above; a link on the home page pointed at an address that does not exist and clicked (it must end on this page, at that address, with every answer for that address a 404); "Projects" on this page (a page change with no reload and nothing left behind); and the back button (back to the missing address).
- **The page is also photographed** with every other page at three widths in three browsers, and its heading goes through the letter tests at thirteen widths.
- The check's photograph run opens the page at `/404.html`, which answers 404 on purpose; that one answer is no longer counted as a problem.

### Known issues

- **The browser's own console notes the 404** when a link leads to a missing page ("Failed to load resource"). That is the browser reporting the status, not an error in the page.
- **The descriptions beside the three ways back start faint and blurred**, as in the hero, and sharpen under the pointer. On touch screens they stay faint.

## 2026-10-11: Ready to deploy

Nothing was installed or upgraded in the site. Nothing was deployed: this entry records what was checked and what the guide's new section rests on.

### Versions and sources checked

| What                     | Version or page                                                                                                            | Source, read on 2026-10-11                                           | What it settled                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Node.js, newest LTS line | 24 (24.21.0, "Krypton"); 26 is the current line and not yet LTS                                                            | https://nodejs.org/dist/index.json                                   | `engines` stays at `24.x` in both repositories                                                     |
| Railpack                 | 0.40.1 (released 2026-09-28)                                                                                               | github.com/railwayapp/railpack, latest release; railpack.com, "Node" | How the Node.js version, the install, build and start commands are chosen; which settings it reads |
| Dokploy                  | 0.30.8 (released 2026-09-29)                                                                                               | github.com/Dokploy/dokploy, latest release                           | The version the documentation below describes                                                      |
| Dokploy's documentation  | Applications, Build Type, Domains, Cloudflare, Certificates, Auto Deploy, GitHub, Watch Paths, Variables, Going Production | docs.dokploy.com                                                     | The tab, field and button names used in the guide, and the ones it does not give                   |
| Rybbit                   | Its home page                                                                                                              | rybbit.com                                                           | "cookieless", "no cookies, no consent banner": the Credits page's sentence is accurate             |

### What the live server needs, and how each was checked

- **Railpack's own plan for each repository** (`railpack info`, version 0.40.1): Node.js 24.21.0 "from package.json > engines > node (24.x)"; install with `npm install`; for the site, build with `npm run build`; start with `npm run start`. It finds the start script and so does not put its own static file server in front.
- **A clean copy of each repository was built and started on Linux** (in the Windows Subsystem for Linux, under Node.js 24.21.0, in a temporary folder): only the files git knows about, so no `.env`, no `node_modules`, no built site, and no private folder beside the site.
  - The site: `npm ci` took 6 seconds and `npm run build` 3 seconds. The pages load their fonts from https://fonts.romitraj.dev and no font file is in the built site. Started with no `PORT` and no settings, it listened on 3000 and answered every page with 200, `/about` with a redirect to `/about/`, an unknown address with 404, and attempts to read `/.env` or `/../package.json` with 404.
  - With no Spotify settings `/api/now-playing` answers 204 (nothing to show) and the ticker hides that piece. With the weather service out of reach `/api/weather` answers 204 as well. Neither is an error.
  - The font server: started with no settings, it listened on 3000.
- **The port is 3000 for both**, which is the container port to enter in Dokploy. Neither Railpack nor Dokploy sets `PORT`, and none needs to be set.
- **The settings to enter in Dokploy are three names, for the site only:** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`. The fonts application needs none. `FONT_BASE_URL` stays unset: without the private folder the build already uses `fontsUrl` from `site.json`.
- **The lock file covers the server.** `package-lock.json` lists the Linux builds of sharp and esbuild (x64 and arm64, glibc and musl), although it was written on Windows.
- **Railpack installs the development packages too** (it sets `NPM_CONFIG_PRODUCTION=false`), so Playwright's package is installed on the server. Its browsers are not: those only come with a separate command. This costs a little disk space and nothing else. `RAILPACK_PRUNE_DEPS` would remove it; it was left alone, following the rule to add a `RAILPACK_` setting only when a default does not work.
- **Railpack suggests naming the package manager and its version in `package.json`.** It is a suggestion, printed as a warning; npm is found from the lock file without it. Left alone for the same reason.
- **The domain names already point at Cloudflare** with the proxy on, and the server answers both with `404 page not found`: nothing is attached to them yet.

### Three changes that getting ready needed

- **The stylesheet and the script now carry a fingerprint in their address** (`/assets/css/main.css?v=2eb25f32`). The server lets browsers keep these two files for an hour, and Cloudflare keeps them for as long at its edge. Without a fingerprint, a visitor could have been shown a new page with the old stylesheet for up to an hour after every deploy. The pictures and the fonts had fingerprints already. The build works each one out from the file's contents (`{% asset %}` in `eleventy.config.js`).
- **The font server also reads the `Origin` header.** A browser sends it with every request for a font on another site, even when the site hides the page's address (`Referer`), which was the only header read before. A request that names another website in either header is answered 403.
- **The private repository has a `package-lock.json`.** It has no packages, so the file is nearly empty, but with it both install commands (`npm install` and `npm ci`) work.

### The font server and "only to romitraj.dev"

Tested with seventeen requests against the server as it will run:

| Who asks                                                                                                                                              | Answer                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| A page on romitraj.dev (with or without its address shown)                                                                                            | 200, the font, marked for use by `https://romitraj.dev` only, to be kept for a year |
| A page on another website, a look-alike address, or `www.romitraj.dev`                                                                                | 403                                                                                 |
| Anything that is not one of the font files: the folder, the brief, an original font file, the server's own code, a path that climbs out of the folder | 404                                                                                 |
| Anything but a GET or HEAD request                                                                                                                    | 405                                                                                 |
| The font's address typed into a browser, or fetched by a program that names no website                                                                | 200, the font                                                                       |

- **The last row cannot be closed.** A browser has to be able to download a web font to show it, so anyone who looks up a font's address on the site can fetch that one file. What the server prevents is other websites using the fonts, and anything else in the private repository being reached.
- **Cloudflare sits in front and keeps the fonts at its edge**, so most requests are answered by Cloudflare without reaching this server, including a second site's request for a font Cloudflare already holds. The answer still says the font is for `https://romitraj.dev` only, and browsers refuse to use a font for any other site. That header, not the 403, is the protection that always holds.
- **The whole private repository is copied into the fonts application when it is built** (the brief, the original fonts, the reference screenshots: about 60 MB). The server reaches none of it but `fonts/web/`. It stays on Romit's own server.

### Deploying is by hand in the dashboard, and the guide says how

- `docs/guide.md` has a new section, "Deploying with Dokploy": Cloudflare, the origin certificate, GitHub, then the fonts application and the site application, each with its checks, a table of what each error page means, and what changes after the first deployment.
- **Fonts first, then the site**, because the site's pages load their fonts from the fonts application.
- **The domain is `romitraj.dev`, never `www`**, with HTTPS on and the certificate provider set to None, so that the Cloudflare origin certificate added under Certificates is used and no Let's Encrypt certificate is requested.
- **Seven things Dokploy's documentation does not confirm** are listed at the end of that section: the buttons that create a project and an application, the buttons that save the source, the build type and the settings, whether Auto Deploy starts switched on, the certificate form's field name, whether a newly added certificate is used at once, and where Watch Paths is. The guide describes each instead of naming it. They are to be corrected on Romit's dashboard.
- **Dokploy's documentation advises building in a pipeline elsewhere and only running the result on the server**, because builds can exhaust a small server. This site's build is small (seconds, one process), so it is built on the server as the brief asks. If a build ever stalls the server, that advice is the way out.

### Before this, on the same day

- **The focus ring now meets 3 to 1.** Romit asked for it after the comparison had matched the reference's faint ring. It keeps the reference's shape (2px, dashed, 2px away) and uses `#8c8c8c` on paper (3.2 to 1) and `#7d7565` on ink (3.3 to 1), a warm grey in the same family as the reference's. A new line in `npm run check` works both contrasts out from `tokens.css` and fails below 3 to 1. This replaces the ring's colors in the entry below; the other three things raised there (focus without hover effects, the project name's place, the tickers' fixed speeds) stay as they are, by his choice.
- **The Credits page has a fourth card, "Visits":** "Visits are counted with Rybbit, a privacy-friendly analytics tool I run on my own server. It uses no cookies." His sentence, with Rybbit linked to rybbit.com.
- **`REWRITE.md` in the private repository** lists every piece of visible text, by page, with its file and key, and marks the guesses and samples to replace first.

### Known issues

- **No deployment has been run.** Everything above was checked on this computer; the first real build on the server is still the first.
- **The first visit after a deploy asks the services afresh**, so the ticker's weather and track appear a moment later than usual.

## 2026-10-11: The whole site compared with the reference

Nothing was installed or upgraded in this step.

### How it was compared

New scripts in the private folder (`../romitraj-private/reference/scripts/`) measure the reference and this site in the same way and list the differences. They read rendered values only: sizes, colors, positions and timings as a browser reports them. Each ran in Chromium, Firefox and WebKit (Safari's engine).

| What                                | How much                                                                                                                   | Script                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Layout, spacing, type sizes, colors | About 150 pieces and 50 gaps between pieces on four pages (home, About, Projects, one project), at 1440px, 768px and 390px | `compare.mjs`, `compare-report.mjs`        |
| Hover and keyboard focus            | 24 kinds of link: what changes, what it ends at, how long it takes                                                         | `compare-states.mjs`                       |
| Movement                            | The two tickers, the gradient bar, the scroll-tied movement and how long it takes to catch up                              | `compare-motion.mjs`                       |
| Page changes                        | Ten changes of page, each as a timeline of what leaves and arrives                                                         | `pagechange.mjs`, `pagechange-compare.mjs` |

**The three browsers agree.** Every difference found was between the two sites, the same in all three browsers. None showed in one browser only.

### Fixed

Each line gives the reference's value, what this site had, and what it has now.

**Layout and spacing**

| Where                                                                  | Reference                                                       | Was                                              | Now                                                                                                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Navigation rows in the hero, phones and tablets                        | 27.2px tall                                                     | 32px (the link took the body text's taller line) | 27.2px                                                                                                                               |
| The letter's text on phones                                            | Flush left                                                      | Centered                                         | Flush left under 600px, centered from there                                                                                          |
| Faint copies of project names on phones                                | Sharp                                                           | Blurred                                          | Sharp under 600px, blurred from there                                                                                                |
| The ring in the corner of the card of links                            | Pale grey `#bdbdbd`                                             | Ink                                              | `#bdbdbd`                                                                                                                            |
| The outlined italic words in the hero, phones and tablets              | A line of 84px                                                  | 84.9px                                           | 84px                                                                                                                                 |
| Footer on the home page, phones and tablets: room above the first line | None: it starts at the footer's top edge, under the band        | 32px                                             | None                                                                                                                                 |
| Footer on the other pages: ink above "You are here"                    | 48px up to 1099px wide, 96px from 1100px                        | 32px at every width                              | 48px and 96px                                                                                                                        |
| Footer between 900px and 1099px: room under the links                  | 64px                                                            | 112px                                            | 64px (112px from 1100px, as before)                                                                                                  |
| About page: gap between the portrait and its caption                   | 8px                                                             | 14px                                             | 8px                                                                                                                                  |
| About page: gap between the latest post's text and its link            | 32px                                                            | 40px (the link sat in a line of text)            | 32px                                                                                                                                 |
| About page on tablets: room above the latest post                      | 32px                                                            | 16px                                             | 32px                                                                                                                                 |
| Projects page, stacked cards: gap between a card's number and its name | 16px                                                            | 12px                                             | 16px                                                                                                                                 |
| A project's page on tablets: gap between the rows of its header        | 16px                                                            | None                                             | 16px                                                                                                                                 |
| A project's page on laptops: where the name sits                       | 240px below the top of its header (80px, then its logo's 160px) | 80px                                             | 240px. This log already said the name stands "in the same place" without a logo; on phones and tablets it did, on laptops it did not |

**Hover**

| Link                                                                           | Reference                                                              | Was                                     | Now                |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------- | ------------------ |
| The track's title in the ticker                                                | No change                                                              | Turned grey                             | No change          |
| "View all projects", "Read the blog"                                           | Underlined at once                                                     | No change                               | Underlined at once |
| The links at the bottom of the About page's first card, and "Read the post"    | Underlined at once                                                     | No change                               | Underlined at once |
| A link inside a project's write-up                                             | Turns grey at once                                                     | No change                               | Turns grey at once |
| A line in a project's "Contents"                                               | Turns grey while a line grows 1px above the bottom of its letters' box | The same, with the line one pixel lower | As the reference   |
| Links in the "Elsewhere" lists, "Contents" and the Projects page's "Read more" | The drawn line breaks around the tails of letters (g, p, y)            | The line ran through them               | Breaks around them |

- **The third row corrects this log.** The entry for the inner pages says those links "do not react at all". That came from a measurement that watched an underline's color and thickness but not whether there was one. Watching that as well shows the underline appearing.
- **How the line breaks around a tail.** The reference gives those letters a 2px outline in the color of whatever is behind them, painted under the letters, and puts the line under that outline. This site now does the same. At rest the outline cannot be seen: photographs with and without it are identical pixel for pixel in all three browsers. In Chromium before version 123 (early 2024), which could not yet paint an outline under HTML text, these few links would look thinner; the reference has the same limit.

**Keyboard focus**

- **The ring is the reference's:** a 2px dashed outline, 2px from the link, `#bdbdbd` on paper and `#474239` on the dark blocks. It was a solid 2px outline in the text's color, 3px away. No look for it had been recorded before.
  - **It is faint.** Its contrast with the background is about 1.8 to 1 on paper and 1.4 to 1 on ink, where accessibility guidelines ask for 3 to 1. The brief puts the look first, so the reference's ring was taken as it is. The two colors are in `tokens.css` if Romit wants a stronger one. (He did, the same day: see "Ready to deploy" above. The ring keeps this shape with stronger colors.)
- **Focus shows a hover effect only where the reference does:** the hero's navigation links (line and description), "View all projects" and "Read the blog" (underline), and the cards (their outline, and on a writing card the line under "Read more"). Everywhere else focus shows the ring alone. Before, every link showed its hover effect on focus as well.
- **On a writing card the ring goes around "Read more"**, as on the reference, not around the whole card. The whole card is still the link.

**Movement**

| What                                                             | Reference                                                                   | Was                                                          | Now                                                                     |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Scroll-tied movement catching up after the scroll position jumps | Halfway after about 0.14s, nine tenths after 0.5s, settled after about 1.0s | Nine tenths after 0.27s, settled after 0.53s: twice as quick | Nine tenths after 0.5s, settled after about 1.0s, in all three browsers |

- The earlier note "trailing the scroll by about a second" was right about the reference, but the setting handed to GSAP was 1, and GSAP eases toward the new place, so the movement was done in half that time. The setting is 2 now (`scrollCatchUp` in `motion.js`).

**Browser consistency**

- The short line beside a section number in a project's write-up was a filled box 1.92px tall. Like the ticker's dashes before it, a box of that height can come out one pixel thick in one browser and two in another. It is a 2px border now.

### Left as they are, each from a choice recorded in this log

| Difference                                                                                                                                                 | Recorded choice                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| The giant line is smaller, the serif word larger, and the hero has one more line above the giant line                                                      | "How the headline is set" (2026-10-10): version B, chosen by Romit; 18 letters against the reference's 12            |
| On phones the sideways headline is narrower (71px against 108.5px), so everything beside it starts further left and is wider                               | The same: its letters are about two thirds as tall                                                                   |
| On tablets the hero's picture frame is smaller (186px wide against 307px)                                                                                  | "On tablets the picture is as wide as the space the first headline line leaves free" (2026-10-10)                    |
| The weather shows a word for the sky; the track's title and artists are not in capitals; Spotify's icon is larger                                          | "The ticker's line" (2026-10-11): Romit's choices, and Spotify's rules                                               |
| No dark first card in the writing section; no category, tags or reading time on cards                                                                      | "No dark featured card", and the feed has neither (2026-10-10)                                                       |
| The footer's compass is 300px across, not 400px, and the footer is shorter                                                                                 | "Positions are the measured ones" under Pictures (2026-10-10): this footer has fewer links                           |
| The frame beside "About the human" is dark with a compass in it; the reference's is light with padding                                                     | "The inner pages reuse these" (2026-10-10)                                                                           |
| No logo above a project's name or beside a name on the Projects page (its cards have four columns, not five)                                               | "A project's page has no logo above its name" (2026-10-10)                                                           |
| Giant page names are smaller on phones ("Projects" 121px against 160px)                                                                                    | "Giant names shrink on phones by letter count" (2026-10-10)                                                          |
| The About page's table is stacked on narrow windows where the reference swaps in a list                                                                    | "The table is a real table" (2026-10-10): a stand-in                                                                 |
| The About page's cards are about other things, and the piece beside the second card has no video                                                           | "The About page's cards" (2026-10-10)                                                                                |
| About and Resume are choreographed where the reference fades plainly; back and forward return to the scroll position; the headline slides in on first load | Romit's choices, all recorded on 2026-10-10                                                                          |
| The small row sits a fixed distance below the banner (1px lower than the reference in Firefox on tablets)                                                  | "The small row sits a fixed distance below the banner" (2026-10-10)                                                  |
| The one bold label is weight 600, not 700                                                                                                                  | "Neue Montreal Semibold stands in for bold" (2026-10-09)                                                             |
| The status ticker moves at 41px a second where the reference's moved at 39.5px on the day of the comparison                                                | "The ticker runs on the browser's built-in animation engine ... at 41px per second" (2026-10-10). See the note below |
| The ticker also slows while keyboard focus is inside it                                                                                                    | The same entry: "under the pointer or keyboard focus"                                                                |
| No Now page, block or link                                                                                                                                 | "No Now page" (2026-10-10)                                                                                           |

- **A note on the tickers' speed.** The comparison showed the rule behind the reference's speeds: each of its tickers takes 20 seconds for one loop, however long its line is. Its status line was 822px long when first measured (41px a second) and 790px on the day of the comparison, with a shorter song title (39.5px a second); its quote strip is 1205px (60px a second). This site moves at the fixed speeds first measured, 41px and 60px a second. With the reference's rule this site's status line would move at about 44px a second and its shorter quote strip at about 36px a second. The fixed speeds were kept because they are the recorded choice and keep the quote strip at the pace seen on the reference; Romit can ask for the 20-second rule instead.

### Left as they are, and not from an earlier choice

These three could not be fixed. They are recorded here for the first time.

- **The reference's page of case studies ends with a strip of its past portfolios.** This site has no earlier versions to show, so the Projects page ends with its cards.
- **Rows of the reference's table are 2px taller** (49px against 47px). Its rows hold an empty fourth cell that wraps onto a line of its own. This table has three columns.
- **Heights that follow from the words:** the About page's first card and the frames beside it (490px against 507px), a project card with a shorter description, the footer. The rules are the same; the content is shorter.

### Page changes

All ten changes of page on the route (home to About and back, home to Projects, into a project, back out twice, home to a project, a project to About, About to Projects, and the back button) were recorded on both sites in all three browsers, with every moving piece's start and length.

- **This site against the reference, in Chromium:** the timelines line up as they did when the page changes were built. Leaving the home page for the list, for instance: letters take 0.93 to 0.95s each and start 0.02s apart on both; the sections fade over 0.3s, 0.1s apart; the navigation's pieces leave over 0.2s each, 0.033s apart; the picture frame follows at about 0.4s. Nothing was changed.
- **This site in Firefox against Chromium:** of about 200 moving pieces per change, at most 10 differ by more than 70ms (four frames) in start or length.
- **This site in WebKit against Chromium:** at most 23 of about 200. WebKit starts 40 to 200ms later while a page is leaving, and its lengths scatter by a frame or two. That is the recording itself: watching every element on every frame slows WebKit on Windows down the most. The reference shows the same and more under the same recording (up to 72 of 139 pieces).
- So no page change was found to behave differently from one browser to the next on this site, beyond what the reference itself shows when measured the same way.

### Loading speed

`npm run speed` after all the changes (Chromium, the home page, nine loads each way, the middle value; lowest and highest in brackets):

|                                       | With the headline's entrance | Without it            |
| ------------------------------------- | ---------------------------- | --------------------- |
| Slow phone, First Contentful Paint    | 1236ms (1232 to 1284)        | 1252ms (1236 to 1308) |
| Slow phone, Largest Contentful Paint  | 1236ms (1232 to 1284)        | 1252ms (1236 to 1308) |
| Fast laptop, First Contentful Paint   | 152ms (104 to 168)           | 148ms (112 to 172)    |
| Fast laptop, Largest Contentful Paint | 152ms (104 to 168)           | 148ms (112 to 172)    |

- "Slow phone" is the connection and processor Lighthouse uses for its mobile score. The largest piece is the hero picture, drawn with the first paint.
- The figures are the same as after the pictures were added (1252ms and 1236ms then); the difference between the two columns is within the spread from one load to the next. Nothing in this step changed what the page loads.
- These are measurements of the locally built site on Romit's computer. The live site will differ.

### Other changes

- **`npm run speed` now serves the site with the stand-in weather and music services**, as `npm run check` does. Before, it started the site with the real keys in `.env`, so each run asked Spotify and Open-Meteo. The paint times do not depend on the widgets, which load after them.
- **The guide has two new sections:** "Hover and keyboard focus" (what every kind of link does) and "Comparing with the design reference" (how to run the comparison again).

## 2026-10-11: Visitor counting and the Credits page

### Sources checked

No package was added. Read on 2026-10-11:

| What                                        | Source                                                         | What it settled                                                                                                                                                                                                                                                              |
| ------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rybbit's tag and settings                   | rybbit.com, "Tracking script"                                  | The tag goes in the head of every page; views in single-page sites are counted through the browser's History API, after a waiting time of half a second (`data-debounce`); automatic counting is switched in the dashboard, not on the tag                                   |
| The script Romit's own Rybbit serves        | https://analytics.romitraj.dev/api/script.js, fetched and read | It reads `data-site-id` from its own tag; it counts one view when it starts, and one more, half a second after the last of them, whenever `history.pushState` or `history.replaceState` is called or a `popstate` or `hashchange` event fires. It does not compare addresses |
| How Taxi changes pages                      | `@unseenco/taxi` 2.0.0, its bundled code                       | One `pushState` per page change by link, none for back and forward; it reloads only scripts marked `data-taxi-reload`                                                                                                                                                        |
| How the build could know it is the live one | railpack.com, "Node"                                           | `NODE_ENV=production` is documented at run time only, and nothing says whether a setting made in Dokploy reaches the build. Not something to rely on                                                                                                                         |
| Each photographer's Unsplash profile        | The six profile pages, opened one by one                       | Each profile shows the name on record                                                                                                                                                                                                                                        |

### Visitor counting (Rybbit)

- **Rybbit's tag is added to the head of every page, on the live site only.** Romit asked for the tag exactly as Rybbit's install page shows it (`src` https://analytics.romitraj.dev/api/script.js, `data-site-id` 4662ddf4f073, `defer`), and for it never to load in `npm run dev` or `npm run check`.
- **How "live only" is decided: by the address the page is viewed at.** A tag written straight into the page cannot be conditional, and the build has no reliable way to know that it is the live build (see the table). So a few lines of script in the head add the tag, with exactly those attributes, only when `location.hostname` is `romitraj.dev`. This needs no setting in Dokploy, cannot be forgotten, and also keeps any copy of the site at another address from counting. The cost is that the tag is not literally in the page's source; it is in the page once the page is open.
  - The other way, a tag written into the page when a Dokploy setting says so, is possible if Romit prefers it. It would depend on that setting reaching the build.
- **Loaded once.** The head is not touched by page changes, and Taxi reloads no script that is not marked for it. Checked with the real script: one tag at the start and after seven page changes.
- **Each page change counts once.** With the real script, watched once in a test browser with everything it tried to send caught on this computer (nothing reached the counter): one view on opening the home page, and one each for changes by link, by the back button and by a footer link, with the right address every time.
- **One fix was needed for that.** The site's scroll memory wrote a key into the browser's history with `history.replaceState`, on first load and after each page change. Rybbit counts every call to that function. Half a second usually hid it; with a counter that starts early, opening a page counted twice. The key is now written with the browser's own function taken from `History.prototype`, which the counter does not replace, so it never sees it. Rule: besides Taxi, nothing on the site may call `history.pushState` or `history.replaceState` directly.
- **Jumps within a page were counted as views at first; fixed the same day (see "Section jumps" below).**
- **Security headers:** the site's server sends `X-Content-Type-Options` and nothing that limits scripts, so there was nothing to allow. The guide says what to allow if a Content-Security-Policy is ever added.
- **Tests** (`scripts/lib/analytics.mjs`, in three browsers): on this computer no tag and no request to the counter, and the check's screenshot run also fails if any page asks the counter for anything. Then, with the test browser told that the live address is answered by the local site and a stand-in in place of Rybbit's script: the tag's attributes, one run of the script, and exactly one view and one history write per page change. Putting the old `history.replaceState` back makes it fail, as it should.

### Section jumps are not page views

Romit asked that clicking a line under "Contents" on a project's page should no longer count as another view, keeping the `#section` in the address if possible. It was possible.

- **What happened before.** A jump to a section is the browser's own doing: it adds `#section` to the address and scrolls. It announces this with two events, `popstate` and `hashchange`, and does the same for every step back or forward between such jumps. Rybbit counts a view half a second after hearing either. So one visit to a project's page with three clicks in its Contents counted as four views.
- **The fix: the counter does not get to hear those events.** The script in the head that adds the counter now first adds two listeners of its own. Because they are added before Rybbit's script is even fetched, and before the site's own script, they hear each event first, and they stop it from going any further (`stopImmediatePropagation`) when it is only a jump within the page being shown.
  - `hashchange` is only ever sent for a jump within a page, so it is always stopped. Nothing on the site listens for it.
  - `popstate` is also sent when the back or forward button leads to a different page. That one must go through, to Taxi (which changes the page) and to Rybbit (which counts it). It is stopped only when the address still belongs to the page being shown. To know that, the content slot of every page now carries its own address (`data-path` on `<main>`); Taxi replaces that slot on every page change, so it always tells the truth.
  - One more `popstate` goes through: while a move to another page by the back or forward button is still under way. If the visitor presses back and then forward again within the animation, the address belongs to the page still showing, but Taxi has to be told so that it can put things right. The script recognises this by the content slot being the same one that was showing when the move began.
- **Nothing else changes.** The address still gains and loses the `#section`, the page jumps as before, and back and forward move between the jumps as before: measured in three browsers, the same addresses and the same scroll positions at each step. Taxi ignores `popstate` for jumps within a page anyway, so it misses nothing.
- **The other way, rejected:** doing the jump by script and writing the address with the browser's own `pushState` would also have hidden it from the counter's replaced functions, but going back would still have been counted, and the browser's own behaviour would have had to be imitated.
- **Checked with the real script** (everything it tried to send caught on this computer): a jump to a section and the step back from it sent nothing, and the page changes around them still sent one view each.
- **Test:** the visitor counter's test in `npm run check` now also clicks a line under "Contents", goes back, goes forward, clicks a second line, and then leaves with the back button. Each of the first four must add no view and reach the stand-in counter with nothing, the address must show the section when it should, and the page must have moved. Before the fix the test failed on all four.

### The Credits page

- **A page at `/credits/`, in the About page's style** (giant name, numbered cards), linked from the footer under "Me". Romit asked for it; it is also where the Open-Meteo credit, owed since the ticker's "(via Open-Meteo)" was removed, now lives.
- **Design card:** Romit's sentence, word for word: "Design based on henry.codes by Henry Desroches. The code, words and pictures here are my own.", with a link to henry.codes.
- **Photographs card:** each Unsplash photographer by name, linked to their Unsplash profile, with what they photographed. It is built from `image-credits.json`, which gained `profile` and `subject` for each photo; the build stops if either is missing. Since the first card says the pictures are Romit's own and six photos are not yet, this card opens by saying the photographs are placeholders standing in until he takes his own. That sentence is mine; it is in `pages.json`.
- **Weather card:** "Weather data by Open-Meteo.com", linking to open-meteo.com, and "licence (CC BY 4.0)", linking to Open-Meteo's licence page.
- **Footer only.** The link is not in the hero's two lists, which keep the four destinations measured against the reference. `navigation.json` marks it `"footerOnly": true`. The reference's footer also lists more than its hero does.
- **Open-Meteo's wording is "a link next to any location Open-Meteo data are displayed".** The credit is on a separate page by Romit's decision, not beside the weather. The home page still may not mention Open-Meteo (the check enforces it).
- The page's picture is the sea band, which is decoration.

## 2026-10-11: Weather and now playing

### Sources checked

No package was added or upgraded. These pages were read on 2026-10-11, before any code was written:

| What                        | Source                                                                                            | What it settled                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spotify redirect addresses  | developer.spotify.com, "Redirect URIs"                                                            | `localhost` is refused; `http://127.0.0.1:PORT` is the one plain-http form allowed (enforced for new apps since April 2025)                                             |
| Spotify approval and tokens | "Authorization Code Flow", "Refreshing tokens"                                                    | The flow the helper uses; **refresh tokens last 6 months from the approval and refreshing does not extend them**                                                        |
| Spotify development mode    | "Quota modes", "February 2026 Migration Guide", changelogs for February, March, May and July 2026 | The owner needs Premium; 5 users per app; 25 apps per account since July 2026; the two player endpoints used here are not among the ones removed in February 2026       |
| Spotify endpoints           | "Get Currently Playing Track", "Get Recently Played Tracks"                                       | Scopes `user-read-currently-playing` and `user-read-recently-played`; the fields used                                                                                   |
| Spotify design rules        | "Design & Branding Guidelines"                                                                    | Spotify's icon beside its content (at least 21px), a link back to Spotify, titles as Spotify gives them                                                                 |
| Open-Meteo                  | open-meteo.com: docs, terms, licence                                                              | No key; free for sites without ads or subscriptions, under 10,000 requests a day; data under CC BY 4.0 with "a link next to any location Open-Meteo data are displayed" |
| The Spotify icon's drawing  | Phosphor Icons 2.1.1, fill weight (`npm view @phosphor-icons/core version`: still 2.1.1)          | Same icon set and licence as the other icons                                                                                                                            |

### How it is built

- **The page asks this site's own server, and the server asks the services.** `/api/weather` and `/api/now-playing` (`server/api.js`) answer with a few facts as JSON. The Spotify keys and tokens stay on the server; the page only ever sees a title, artists and a link.
- **Answers are kept** (`server/cache.js`): the weather for 15 minutes, the track for 30 seconds, as the brief asks. Visitors arriving while a request is under way share it. After a failure the service is left alone for a minute.
- **Nothing playing means the last track played.** So does a paused track or a podcast. Spotify answers "204 No Content" when nothing is playing.
- **Every failure is quiet.** A service that is down, slow (5 seconds), answering errors, missing its keys or refusing the token all lead to the same thing: the server answers 204 with no body, and the page hides that piece. Nothing shows as an error in the page or the browser's console.
- **The server uses Node's built-in modules only**, as before: `fetch`, `AbortSignal.timeout`, `process.loadEnvFile`.
- **The local preview answers the same two questions** (`setServerOptions` in `eleventy.config.js`), so the widgets show in `npm run dev`. The brief expected them only under `npm start`.
- **The page asks again every 30 seconds for the track and every 15 minutes for the weather, only while its tab is in view**, and at once when the tab comes back into view.
- **The link to Spotify must begin with `https://open.spotify.com/`** or the answer is dropped, and titles are put into the page as plain text, so nothing a service sends can become markup or a script.

### The ticker's line

- **Order, as on the reference:** weather, an "@", the coordinates and city, the time, then the icon, the track's title (underlined, a link) and the artists. The track is in ink and the rest in grey, as measured there.
- **The weather shows a word for the sky as well as the temperature** ("21°C, clear"). The reference shows the temperature alone. Romit confirmed he wants both (2026-10-11). The wording is one line in `home.json` (`ticker.weather`).
- **The home page carries no credit for Open-Meteo. Romit's decision (2026-10-11): the credit will go on a separate page, to be built later.** The first version had "(via Open-Meteo)" with a link in the line; he had it removed completely, with no link on the weather either.
  - What Open-Meteo asks: its data is under CC BY 4.0, and its licence page says "You must include a link next to any location Open-Meteo data are displayed", with the example "Weather data by Open-Meteo.com".
  - **Done later the same day:** the Credits page carries that credit (see the entry above this one). Whether a credit on another page, and not beside the data, satisfies that sentence is Romit's call.
  - `npm run check` fails if the home page mentions Open-Meteo, so the words cannot creep back in by accident.
- **Spotify's icon is 21px across**, the smallest its rules allow, where the reference's icon is a little smaller. The line stays 20px tall.
- **The title and the artists are written as Spotify gives them** ("Elastic Heart, Sia"), not in the ticker's capitals, and the title links to that track on Spotify in a new tab. Romit's choice (2026-10-11), to follow Spotify's design rules, which say titles and artist names must be shown as Spotify provides them. The first version showed them in capitals to match the reference's look. He named the title; the artists are shown the same way because the rule covers both and a title in its own case beside an artist in capitals read badly.

### The drawn lines in Firefox

Romit's review of the ticker showed the short drawn lines between its pieces looking heavier in Firefox than in Chrome and Safari. They date from the hero step.

- **Cause.** The line was a filled box 0.075 of the text's height tall, which is 1.19px in the ticker. No screen can show 1.19 pixels. Measured on an ordinary screen: Chrome's and Safari's engines painted one row of pixels, Firefox two.
- **Fix.** The line is now the box's top border instead of a filled box (`.dash` in `base.css`). All three browsers round a border's thickness down to whole screen pixels in the same way. Measured after the change: one row in all three on an ordinary screen, two rows in all three on a screen with two screen pixels per pixel. The lines in the navigation list, the small row and the project pages use the same rule and are fixed with it.
- **Not solved:** at 125% display scaling the three engines still differ by a row in the test browsers, as they did before. That is how each treats a pixel grid that does not divide evenly, and it affects every one-pixel line on any site.
- **New test:** `npm run check` photographs one of the ticker's lines in each browser, at two widths and at two screen densities, counts the rows of ink, and fails if the browsers disagree (`scripts/lib/dashes.mjs`).

### The six-monthly routine in Dokploy

- The guide now has the renewal step by step: `npm run spotify` on the PC, then the new `SPOTIFY_REFRESH_TOKEN` into the application's Environment tab in Dokploy, then deploy again.
- **Dokploy's documentation was read on 2026-10-11** (docs.dokploy.com: "Applications", "Variables", the API reference). It names the application's tabs (General, Environment, Deployments) and shows that saving the settings and deploying again are separate actions. **It does not name the buttons**, so the guide describes them instead of naming them. They are to be confirmed, and the guide corrected, when the deployment step is done on Romit's own dashboard.

### The Spotify helper and the 6-month token

- **`npm run spotify`** (`scripts/spotify.mjs`) does the one step that needs a browser: it opens Spotify's approval page, receives the answer on `http://127.0.0.1:8888/callback`, swaps the one-time code for a refresh token, writes it into `.env` without printing it, and tests it. Romit asked for it instead of doing the exchange by hand, because it has to be repeated.
- **The brief assumed a refresh token lasts indefinitely. It does not any more:** 6 months from the approval. The maintenance routine has a six-monthly item for it, the helper writes the end date beside the token in `.env`, and the server logs a plain sentence when Spotify refuses the token.
- The first token was obtained on 2026-10-11 and lasts until about 2027-04-11.

### Secrets

- `.env` holds the Client ID, the Client secret and the refresh token. It is ignored by git (`.gitignore`), has never been committed, and `git status` was checked for it before every commit of this step.
- Nothing in the repo, the docs, the logs of the helper or this log contains a secret. The helper and the checks report only whether a value is present and how long it is.

### Tests

- **The whole of `npm run check` now runs against stand-ins** for Open-Meteo and Spotify on the same computer (`scripts/lib/pretend.mjs`). The site's server is started with the stand-ins' addresses and made-up keys, which take precedence over `.env`. So the check's screenshots always show the same weather and track, it never contacts the real services, and it never uses the real keys.
- **The server's answers** are tested in seven situations: all well, nothing playing, paused, token refused, both services answering errors, both unreachable, and no keys. It also checks that five requests cause one request to each service, and that no key or token appears in an answer.
- **On the page**, in three browsers: the right words and links in the line and in each of its repeats, nothing outside the ticker moving when the answers arrive, the line staying 20px tall, the pieces reappearing at once after a page change, and with both services down, the two pieces hidden with no error anywhere.
- For this the server reads three optional settings, `WEATHER_URL`, `SPOTIFY_TOKEN_URL` and `SPOTIFY_API_URL`. They are only ever set by the check.

### Known issues

- **The line disappears every 6 months until the token is renewed.** There is no way around it for an app in development mode.
- **A newer refresh token that Spotify may hand out is only kept while the server runs.** The live server's settings cannot be rewritten from inside it, so after a restart the saved one is used again. Spotify's docs say to keep using the old one when no new one is sent, so this is expected to be harmless.
- **The live site's settings are not covered yet.** They come with the deployment step.

## 2026-10-10: The apostrophe during the headline's animation

Romit noticed that the raised comma in DON'T was cut while the headline slid in, and whole only once the animation ended.

- **Cause.** While a heading moves, each letter is shown through a window that opens around the letter's own box. The apostrophe is Manuka's comma, lifted to the top of the letters. It was lifted by moving its whole box up by half a letter-height, so its box no longer sat in the line: the comma's ink ended up at the very bottom of that box, with its tail hanging 25px below it at laptop size, where the window allows 19px. Two things followed. The tail was cut for as long as the window was there (measured: about 150 pixels of ink missing, the same in all three browsers). And because a window opens from the top of its box downward, the apostrophe appeared late and from the top down, as a flat bar, while N and T beside it were already mostly in view.
- **Fix.** The apostrophe's box now stays in the line, exactly where a letter's box would be, and only the comma inside it is lifted (`.apostrophe::before` in `base.css`). Its ink sits in the upper part of an ordinary letter box, so it comes through the edge together with the tops of N and T, as every letter does, and nothing of it is outside the window afterwards. At rest the headline is unchanged: screenshots before and after are identical pixel for pixel in three browsers at six widths.
- **The new check found a second case**, which was fixed with it: the comma after "DROP" in the opening line lost the tip of its tail (about 10 pixels at wide windows). An italic comma's tail leans left, out of its narrow box, and the windows reached only a tenth of the box's _width_ to each side. They now reach half a letter-height to each side. The slide is up or down, so the sides play no part in the movement; above and below, the windows are as before. The shapes are written as `inset(...)` instead of `polygon(...)` for this.
- **New test in `npm run check`** (`lettersStayWhole` in `scripts/lib/letters.mjs`), in three browsers at seven widths: each sliding heading is cut into letters and photographed twice, once as it is and once with every letter's window fully open. Any pixel that differs is ink the window took away. It reports the letter and the place. Before the fix it failed on the apostrophe at every width.
- **What "whole" means here.** Every letter is deliberately hidden bit by bit as it passes the edge it slides through; that is the animation. The apostrophe now passes that edge with its neighbours (for one or two frames, like them) and is whole in every frame after that, where before it stayed cut until the animation ended.

## 2026-10-10: Pictures

### Versions verified

| What  | Version | Source                                                                        | Used for                                                                                     |
| ----- | ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| sharp | 0.35.5  | `npm view sharp version`, 2026-10-10. Apache-2.0. Needs Node.js 20.9 or newer | Reading the photos and drawings, shrinking them, and writing the finished PNG and WebP files |

sharp is a new package for this project; nothing was upgraded. It is a normal dependency, not a dev-only one, because the live server runs the build too.

### Why sharp

- It reads JPEG and SVG, resizes well, hands over the raw pixels (so the two-tone conversion is this project's own code), and writes PNG files with a palette of two or three colours.
- It ships ready-built for Windows and Linux, so `npm install` needs no compiler on Romit's computer or on the server.
- The dithering itself is about forty lines in `scripts/images.mjs`. No dithering package is used: none gave the exact look measured on the reference (solid ink, solid paper, a fine checkerboard only where the tone changes).

### How the pictures are made

- **One list, `src/_data/images.json`**, names every picture: its source file, alt text, size in blocks, crop and contrast. The build converts them all before every build (`npm run build` and `npm run dev` alike) and writes the results into `_site/assets/img/`. Only the sources are committed.
- **One pixel of the file is one block on the page.** The hero picture is 152 by 190 pixels and is enlarged by the browser without smoothing (`image-rendering: pixelated`, which Chrome, Edge, Firefox and Safari all support). This keeps the edges hard, as measured, and the files tiny: 12 files, 27 KB in all, the pixel pictures between 0.3 and 5.2 KB each.
- **PNG with a palette for the pixel pictures:** lossless, shown the same way by every browser. **WebP for the hero's texture:** it is a smooth, faint surface, where a lossless file would weigh several hundred KB for no visible gain; as WebP it is 11 KB.
- **The cost of a fluid size:** where a block is not a whole number of screen pixels, the browser makes an occasional column or row one pixel wider. The reference behaves the same way. The footer compass is set at exactly 300px on laptops, 3px a block.
- **Addresses carry a fingerprint** (`hero.png?v=...`), so a changed picture is fetched again at once.

### What is shown where

- **Hero:** a whale's tail rising from the sea (photo by Zac Bowling). Chosen for a strong dark outline against a plain sky, and because it suits the headline. About half ink, as measured on the reference.
- **The hero's paint texture is painted by the build, not taken from a photo.** The brief allowed "original or licensed"; Romit asked for an original. `scripts/lib/paint.mjs` lays brush strokes with raised edges onto a height map and lights it from the top left, from a seed number, so every build gives the same file. It shows only behind the subject; light spots enclosed by the subject stay flat paper, as on the reference.
  - Measured with `texturecheck.mjs` on the light areas of the framed picture, reference against this site: darkest 1% 212 against 213, darkest 5% 233 against 237, middle 244 against 245, lightest 5% 250 against 250, average 243.2 against 243.2.
- **Three drawings made for this site**, as SVG files in greys that the build turns into pixels: a deep-sea diver with a jellyfish (behind the home page's about section, where the reference has its large illustration), a compass rose (the footer's corner, where the reference has its ornament), and sea swells sinking into the dark (the band above the footer). They follow the reference only in role, size and place. Their subjects come from this site's own headline ("what we don't know is an ocean") and bio line ("a lifelong explorer"). None of the reference's pictures was copied, traced or used as a source.
  - The drawings contain no text: the build would draw it with the fonts of whichever computer runs it.
  - The band is stippled (`pattern: grain`), like the reference's; everything else uses the checkerboard.
- **The inner pages reuse these**, as the reference reuses its own few pictures: the compass on a dark frame beside "About the human", the jellyfish and the swells in two of the About page's frames, the tips of the whale's tail beside "Resume".
- **Other photos (all placeholders):** a marble bust for the About page's portrait frame, with a caption saying it is a stand-in; a server rack beside "Projects"; a padlock, a container ship and harbour cranes in the three frames on the Projects page.
- **A project's picture is optional.** The Projects page has a frame beside every second project only, so three of the six sample projects have a picture. The reference's project pages show a logo above the name; these projects have none, and no picture was added there.
- **Positions are the measured ones:** the about drawing is 65% of the window wide and hangs 64px past the right edge from tablets up, and sits low behind the card on phones; the compass shows its left half at the right edge on laptops and its top half at the bottom on phones and tablets; it rises 14px as the footer scrolls in. On laptops it is 300px across, not the reference's 400px: this footer has fewer links and is about 100px shorter, and a 400px compass would run into the last line.
- **The about section now spans the whole window**, with its text held to 1440px, so that the drawing can hang past the edge on very wide windows as on the reference. Nothing changes below 1440px.

### Alt text, credits, and nothing moving

- **Every picture is either described or marked as decoration**, in `images.json`: `alt` for a description, or `"decorative": true`. The build stops on a picture with neither or with both, so a silent picture is always a decision and never an oversight. Romit's choice (2026-10-10): the compass, the sea band and the hero's paint texture are decoration and are passed over by screen readers, wherever they appear; the hero, the diver, the project pictures, the portrait and the other framed pictures are described.
- **`src/_data/image-credits.json`** records the photographer and Unsplash page of each of the six photos. Each page was opened on 2026-10-10 and read "Free to use under the Unsplash License". The build stops if a photo has no entry.
- **No picture can move the page.** Each one is laid over a box whose size the styles already fix, and carries its width and height in the page. A new test in `npm run check` (`scripts/lib/pictures.mjs`) holds the picture files back, notes where everything is, lets them arrive and compares, on every page at three widths in three browsers. It also checks that each picture says exactly what `images.json` has for it (or nothing, for decoration), written sizes, hard-edged enlarging, that every file loads, and that no file is heavier than 24 KB. A last step compares where each picture sits, and how much of it shows, from one browser to the next.
  - That last step exists because the first version of the compass differed: its box took its width from its height, which Chrome's engine, Firefox and Safari's engine each worked out differently (half a compass, most of one, a whole one). Every size is now written out in full. **Rule: never let a box take its width from its height.** A height worked out from a width (the hero frame, the about drawing) is fine and the same everywhere.
- **Loading speed, measured with `npm run speed`** (Chromium, middle of nine loads). The largest piece of the home page is now the hero picture, which is drawn with the first paint:

  |                                                            | Before the pictures | With the pictures |
  | ---------------------------------------------------------- | ------------------- | ----------------- |
  | Slow phone, Largest Contentful Paint, with the entrance    | about 1310ms        | 1252ms            |
  | Slow phone, Largest Contentful Paint, without the entrance | about 1235ms        | 1236ms            |
  | Fast laptop, Largest Contentful Paint, with the entrance   | about 180ms         | 148ms             |

  The headline's entrance used to cost about 70ms on the slow phone because the giant line was the largest piece. It now costs about 16ms.

### An older difference the new test found

- **On the Projects page, at phone and tablet widths, each card was 0.6px taller in Firefox and Safari's engine than in Chrome's**, which put the footer 2 to 4px lower there. The "Read more" link was a box sitting in a line of text, and browsers disagree by a fraction of a pixel about the height of such a line. It is now a block of its own (`project-cards.css`). The cards are 1.8px shorter than before in Chrome's engine and the same height everywhere. Laptop widths were never affected.

### Known issues

- **Safari's engine does not report the fonts as ready until the pictures have loaded** (`document.fonts.ready`). Nothing on the site waits on that for anything visible; the picture test waits for the fonts another way.
- **The ship photo shows a shipping line's name on the hull.** At 170 blocks across it cannot be read. It is a placeholder.
- **At 125% display scaling on Windows**, blocks that are 3px wide become 3.75 screen pixels, so some columns are 3 and some 4 pixels wide. The reference has the same.

## 2026-10-10: Page changes, headline reveals and hovers

### Versions verified

| What                       | Version            | Source                                                                                                                                             | Used for                      |
| -------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Taxi.js (`@unseenco/taxi`) | 2.0.0              | `npm view @unseenco/taxi version` (the only release line marked `latest`); its bundled README and type definitions were read for the 2.0 interface | Page changes without a reload |
| gsap                       | 3.15.0 (unchanged) | `npm view gsap version`                                                                                                                            | The page-change animations    |

Taxi.js is under the BSD 3-Clause license. It is a new package for this project; nothing was upgraded.

### What was measured, and what it overturned

The first motion measurements (2026-10-09) covered the home page's first load and one page change, home to about. They found no reveal animations and a plain 200ms fade, and the project was planned on that. Measuring every kind of page change frame by frame showed more:

- **Nothing animates when a page is first opened** on the reference. This still holds there, on its inner pages too. (This site now has one entrance of its own: see "The headline's entrance" below.)
- **Page changes between the reference's home page, its list of case studies and a case study are choreographed.** Headline letters slide in and out one after another through an unseen edge; cards, lines of text and blocks follow in a set order. Five changes have their own sequence; every other change is the plain fade.
- **Nothing on the inner pages moves with scrolling.** The scroll-tied movement stays on the home page only.
- So "headline reveals" exist, but only as part of a page change. This site now has them in the same places.

### Decisions

- **The same five choreographed changes, with the measured timings**: home to projects, projects to home, projects to a project, a project to projects, and a project to home. Each was recorded on this site with the same frame-by-frame recorder and compared with the reference: letters take 0.95s each and start 0.02s apart, cards arrive 0.98s after the page name starts and 0.1s apart, and so on, all within a frame or two. The numbers are in `motion.js` (`pageChange`).
- **About and Resume are choreographed too. This is Romit's choice and goes beyond the reference**, where every change to or from the about page is a plain fade. Here About and Resume behave like the Projects page: the page name's letters slide in and out, and the cards arrive one by one in the order they are written (on About: Who, the portrait, the frames, the links, Tinkering, the latest post, Contact, Toolbox). This holds in every direction: from and to the home page, the Projects page, a project, and each other. Going back to the home page from About or Resume, the home page arrives the way it does from a project: all letters together, the rest sooner.
- **So the rule is by kind of page, not by pair of pages.** Each kind (home, a page with a giant name, a project) has a way of leaving and a way of arriving, with three measured variations kept from the reference: the home page arrives letter after letter only from the Projects page; a page with a giant name leaves faster on the way to a project; and the home page straight to a project is a plain fade. Any page that uses `layouts/page.njk` is choreographed without further setup.
- **Only the home page straight to a project still fades plainly**, 0.2s out and 0.2s in, as on the reference.
- **How the home page's pieces map to the reference's.** Its giant line and this site's giant line behave the same (letters sink out of the line and rise back into it). Its large serif word and this site's "OCEAN." behave the same (letters lift out and drop back in). Its outlined italic words and this site's "is an" slide sideways and fade. This site has one line the reference does not, the opening serif line; it moves like the other serif line, since it is the same typeface. Romit can change this.
- **A project page has no logo to animate**, so its name is the first piece.
- **Reduced motion always gets the plain fade.** The reference drops its home-to-list sequence under that setting but keeps parts of the others. One rule for all of them is simpler and calmer.
- **Taxi.js swaps the content.** It fetches the next page (starting when the pointer rests on a link), waits for the leaving animation, swaps the content and starts the arriving one. Its accessibility option is on: screen readers hear the new page's name and keyboard focus moves to its heading.
- **The banner, the small row and the footer stay in place** across changes, as on the reference, so the gradient bar never restarts. For that the small row and the "You are here" line are now in every page's HTML, hidden on the home page, and a script shows, hides and refills them from the page it fetched. The row fades in over 0.2s and out over 0.12s, and when its back link changes words the old words slide out to the left and the new ones slide in, as measured.
- **The page is usable as soon as the new content is in.** The arriving animation of the list of projects runs for over two seconds; a visitor can click during it. A new click finishes the running animation at once.
- **Letters are cut by this site's own small script, not GSAP's SplitText.** A heading is cut into letter boxes only while it animates, then the original HTML is put back. Letter boxes lose the font's kerning (the fine spacing between certain pairs), which would make the giant fitted lines shift by a few pixels; the script measures each letter first and shifts every box back onto exactly that spot. It also treats the drawn apostrophe as a letter and handles the phone's sideways headline. SplitText does not correct kerning.
- **A cut heading keeps its lines.** The first build let a long project name re-wrap while its letters were separate boxes: "Homelab Dashboard" showed "Da" on the first line and "shboard" on the second, then jumped when the text was put back. Romit caught it. Now a heading is told not to wrap while it is cut, a line break is placed exactly where each line ended before, and every letter box is shifted onto the spot its letter had. The shift uses the CSS `translate` property, which moves one box without touching its neighbours and adds to the animation's own movement; nudging with margins, tried first, left Safari up to a pixel off in centered headings. A paragraph cut into lines keeps its width, and its lines cannot wrap again.
- **A test guards this.** `npm run check` cuts every heading on every page into letters at thirteen window widths in all three browsers and fails if any letter is more than 0.6px from where it was, or if the text is not put back exactly. All six project names were also watched during the real animation at four widths in three browsers: every letter stayed within 0.01px of its final place.
- **An animation starts two frames after it is prepared.** Cutting the text and measuring makes one slow frame; starting later keeps that frame out of the animation. Before this, the first tenth of a second of each arrival was skipped.
- **Scroll position.** Measured on the reference in all three browsers (`reference/scripts/scrollrestore.mjs`): a full reload stays at the same scroll position; the back and forward buttons arrive at the top of the page.
  - **A reload stays where it was**, as on the reference. The browser does this itself: the site only takes over scroll handling once a page change starts, and hands it back when the document is left.
  - **Back and forward return to where the visitor was on that page. This is Romit's choice and goes beyond the reference.** Each step in the browser's history gets a small key, and the scroll position for each key is kept in the tab's session storage, so it also works after a reload in between.
  - Following a link always starts the new page at the top.
- **The tickers, the scroll movement and the widgets can now be stopped and restarted**, because the content they belong to is replaced.
- **Hover details measured on the reference's inner pages**, corrected here:
  - A link inside a sentence turns grey at once under the pointer (about text on the home page and in the cards).
  - The row of links at the bottom of the "Who" card and the "Read the post" link do not react at all. (Corrected on 2026-10-11, in the entry on comparing the whole site: they are underlined at once. This measurement did not watch whether an underline was there.)
  - A project card's outline darkens at once, while "Read more" draws its underline.
  - A link in a project's list of sections turns grey over 0.2s while its line draws.
- **A heading that received focus after a page change shows no outline.** Safari drew one around the whole heading.
- **`npm run check` now clicks through the page changes** in all three browsers, checks that back, forward and reload return to the same scroll position, and runs the letters test above.

### Links that leave the site

- **Every link to another website opens in a new tab**, with `rel="noopener noreferrer"` and the hidden words "(opens in a new tab)" for screen readers. Romit asked for this. Email links are left as they are.
- **The build adds this to each finished page**, instead of each template doing it. One rule in `eleventy.config.js` covers links in templates, data files and Markdown, including ones added later, and cannot be forgotten. A link that has its own `aria-label` gets the words added to that label.
- **The blog counts as another website**, because it is at a different address (blog.romitraj.dev).

### Things that moved after a page change

Romit noticed that after going back and forth between pages, the picture frame beside "PROJECTS" and the line "WHAT WE KNOW IS A DROP," shifted left once the animation ended, and snapped back on the next click. Recording ten trips in each of the three browsers and comparing positions during and after each arrival reproduced it everywhere, with two separate causes:

- **GSAP took over the letters' position fix.** Each letter box carried a small shift (the CSS `translate` property) to hold it exactly on its spot. GSAP absorbs that property into its own handling of any element it moves, and the animations told every letter to end at "no shift", so the fix was animated away. By the end of an arrival the letters had drifted, up to 19px at the end of the opening line, and they jumped back when the plain text returned. **Fix:** every letter now has two boxes. The outer one carries the shift and is never animated; the inner one is what the animations move.
- **A heading in letters was wider than the same word as text.** "PROJECTS" was 4.9px wider while cut, which pushed the frame beside it. **Fix:** the spacing between letter boxes is first put back with margins, so the heading keeps its natural size, and a heading whose text runs across is also held at its measured width. (The phone's sideways headline is not held: its length is tied up with the hero's grid rows, and fixing it changed the hero's height. The margins alone keep it right.)
- **Tests added to `npm run check`**, in all three browsers:
  - During the page-change walk, each arrival is watched until it ends. The check fails if any letter, any heading's box or the frame beside a page name is in a different place just after the animation than during it, or if the finished page differs from a fresh load of the same page by more than half a pixel.
  - The letters test now also fails if cutting a heading moves anything else on the page.

### The headline's entrance on first load

- **The home page's headline now slides in when the page is opened or reloaded. This is Romit's choice and goes beyond the reference**, where nothing animates on first load. The letters of the three big lines slide in one after another at the pace of the page changes, and the outlined italic words slide in from the left. Only the home page has an entrance.
- **Romit's conditions, and how each is met:**
  - _Letters slide in rather than fade from invisible:_ the letters are fully solid from their first frame and come in from behind an edge. (Only the small outlined words fade as they slide, as they do in the page changes.)
  - _No flash before the script runs:_ a few lines of script in the page's head mark the page before anything is drawn, and the styles hide the headline while the mark is there.
  - _The text stays visible if the script fails:_ without scripts the page is never marked. The mark is removed after three seconds whatever happens, and at once if the entrance script fails or the fonts cannot be fetched.
  - _Reduced motion gets no animation:_ the head script does not mark the page for those visitors.
  - _Without hurting page speed:_ see the measurements below.
- **Measured with `npm run speed`** (new): Chromium, the home page, nine loads each way, taking the middle value. "Slow phone" is the connection and processor Lighthouse uses for its mobile score. Largest Contentful Paint is the moment the biggest piece of content (here the giant line) is first drawn.

  |                                       | Without the entrance | With the entrance | Difference                                            |
  | ------------------------------------- | -------------------- | ----------------- | ----------------------------------------------------- |
  | Slow phone, Largest Contentful Paint  | about 1235ms         | about 1310ms      | 44 to 96ms later over four runs, typically about 70ms |
  | Slow phone, First Contentful Paint    | about 1235ms         | about 1245ms      | within the noise (4 to 12ms)                          |
  | Fast laptop, Largest Contentful Paint | about 155ms          | about 180ms       | 24 to 44ms later                                      |
  | Fast laptop, First Contentful Paint   | about 155ms          | about 156ms       | none                                                  |

  These are measurements on Romit's computer of the locally built site. The live site will differ, but the difference between the two columns is what matters.

- **The first build of the entrance cost 840ms on the slow phone** (2076ms against 1236ms), for two reasons, both removed:
  - It put the plain headline back when the animation ended. The browser counts that as a very large new piece drawn late. Now the letters stay in the page (they sit exactly where the text would) and the plain text is only put back at the visitor's first click, tap, key press or wheel turn, when the browser has stopped measuring, or on a resize or a page change, when the letters' places would be wrong.
  - It ran from the main script, which a slow phone needs about 0.9s longer to fetch and run than the fonts. Now the entrance is a script of its own, about 2 KB compressed, written into the home page. It uses the browser's built-in animation (the Web Animations API) instead of GSAP, and starts one frame after the headline's fonts arrive, which is when the headline would have appeared anyway.
- **Taxi's saved copy of the first page is dropped**, because it may be taken while the headline is in letters. Coming back to that page fetches it again, as for every other page.
- **`npm run check`, `npm run fit` and the comparison screenshots use a still page.** They set `steadyMotion`, which the head script also respects, so the headline is at rest when measured or photographed. The entrance has its own test (`scripts/lib/entrance.mjs`).

### Known issues

- **The bundled script is about 151 KB** (about 57 KB when compressed in transit), up from 116 KB: Taxi.js and the page-change code.
- **`npm run check` takes a few minutes longer**, for the page changes and the letters test.
- **Firefox prints a note about "scroll-linked positioning"** in its console. It comes from the scroll movement built earlier, is informational, and does not affect the page.

## 2026-10-10: About, projects and resume pages

### Versions verified

| What                                    | Version           | Source                                                                             | Used for                                                                 |
| --------------------------------------- | ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
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
- Scroll-tied movement on the inner pages. A later measurement confirmed the reference has none there.

### Known issues

- **The About page's placeholder text makes claims about Romit** (tools, interests) that are guesses. `about.json` says so in its first line.

## 2026-10-10: Letter, about, projects, writing and footer

### Versions verified

| What                                    | Version | Source                                                                              | Used for                                                |
| --------------------------------------- | ------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| gsap                                    | 3.15.0  | `npm view gsap version`                                                             | Movement tied to scroll (with its ScrollTrigger plugin) |
| Phosphor Icons (`@phosphor-icons/core`) | 2.1.1   | `npm view @phosphor-icons/core version`; drawings copied from the published package | The heart and the link icons                            |

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

The banner carries the bio line: A LIFELONG EXPLORER _WHO PROCRASTINATES A LOT._ The whole headline sits inside the hero, in four pieces read top to bottom:

| Piece                 | Words                     | How it is sized                                        |
| --------------------- | ------------------------- | ------------------------------------------------------ |
| Opening serif line    | WHAT WE KNOW _IS A DROP,_ | Fills the full width                                   |
| Giant line (Manuka)   | WHAT WE DON'T KNOW        | Fills the full width                                   |
| Outlined italic words | is an                     | A fixed share of the width, overlapping the giant line |
| Large serif word      | OCEAN.                    | Fills eight columns, beside the picture                |

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

| What                                           | Version                                                                                                         | Source                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
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

| What                      | Version                 | Source                               | Used for                              |
| ------------------------- | ----------------------- | ------------------------------------ | ------------------------------------- |
| Node.js (newest LTS line) | 24 (24.21.0, "Krypton") | https://nodejs.org/dist/index.json   | `engines` in `package.json`           |
| @11ty/eleventy            | 3.1.6                   | `npm view @11ty/eleventy version`    | Builds the pages                      |
| esbuild                   | 0.28.2                  | `npm view esbuild version`           | Bundles CSS and JavaScript            |
| playwright                | 1.64.0                  | `npm view playwright version`        | `npm run check` (dev only)            |
| fonttools                 | 4.66.1                  | https://pypi.org/pypi/fonttools/json | `npm run fonts`                       |
| brotli                    | 1.2.0                   | https://pypi.org/pypi/brotli/json    | WOFF2 compression for `npm run fonts` |
| Python                    | 3.15.0 is the latest    | https://www.python.org/downloads/    | See the note below                    |

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

- A hero screenshot of the live site for the README, once there is a site to photograph. GSAP gets a README badge when it is added. (Done on 2026-10-11: `docs/screenshot.png`, taken from the site running on this computer by `npm run share`. Retake it from the live site after the first deployment if it should show that.)
- `src/_data/image-credits.json`, which the LICENSE note points to, arrives with the first photos.
