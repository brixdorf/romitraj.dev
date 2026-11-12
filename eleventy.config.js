// Eleventy configuration: where the content lives, how the CSS and JavaScript are bundled, how the
// pictures are made, and where the web fonts load from.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { convertImages } from './scripts/images.mjs';
import { makeSiteIcons } from './scripts/icons.mjs';
import { bundleAssets, bundleIntro } from './scripts/lib/bundle.mjs';
import { missingFacts, projectLink } from './scripts/lib/projects.mjs';
import { publishFile } from './scripts/lib/downloads.mjs';
import { publishKey } from './scripts/lib/pgp.mjs';
import { picturesToThank } from './scripts/lib/credits.mjs';
import { mailto } from './scripts/lib/mailto.mjs';
import { answerApi } from './server/api.js';

if (fs.existsSync('.env')) process.loadEnvFile('.env');

const site = JSON.parse(fs.readFileSync('src/_data/site.json', 'utf8'));

// The licensed fonts live outside this repo. On a computer that has the folder below, they are
// copied into the built site and load from /fonts/. Anywhere else (the live server) they load
// from the font site.
const localFonts = '../romitraj-private/fonts/web';
const hasLocalFonts = fs.existsSync(localFonts);
const fontBase = process.env.FONT_BASE_URL || (hasLocalFonts ? '/fonts/' : site.fontsUrl);

const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The plain words of a heading, and the address ("the-problem") that links to it.
const plainText = (html) => html.replace(/<[^>]+>/g, '').trim();
const headingId = (html) =>
  plainText(html)
    .toLowerCase()
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const sectionHeading = /<h2>(.*?)<\/h2>/g;

export default function (eleventyConfig) {
  eleventyConfig.addGlobalData('fontBase', fontBase);

  // The site's own address without "https://", such as "romitraj.dev". The page compares it with
  // the address it is being viewed at, to count visitors on the live site only (layouts/base.njk).
  eleventyConfig.addGlobalData('liveHost', new URL(site.url).hostname);

  // The pictures to thank on the Credits page, from _data/image-credits.json
  // (scripts/lib/credits.mjs). That file's name has a hyphen in it, which templates cannot spell,
  // so the list is handed to them under this name.
  eleventyConfig.addGlobalData('pictureCredits', () =>
    picturesToThank(JSON.parse(fs.readFileSync('src/_data/image-credits.json', 'utf8')).pictures),
  );

  // The headline font has no apostrophe. This swaps each apostrophe for an empty marker,
  // which the styles fill with that font's own comma, raised into place.
  eleventyConfig.addFilter('raisedApostrophe', (text) =>
    escapeHtml(text).replace(/['’]/g, '<span class="apostrophe"></span>'),
  );

  // The share image: the card that WhatsApp, LinkedIn, X and similar apps show beside a link to
  // the site. It is a picture kept in the repository (src/assets/img/share.png, made by
  // "pnpm run share"), copied into the built site as it is. Those apps need its full address, and
  // its fingerprint makes them fetch a changed picture again.
  const shareFile = 'src/assets/img/share.png';
  if (!fs.existsSync(shareFile))
    throw new Error(`${shareFile} is missing. Make it with: pnpm run share`);
  eleventyConfig.addPassthroughCopy({ [shareFile]: 'assets/img/share.png' });
  eleventyConfig.addGlobalData('shareImage', {
    url: `${site.url}/assets/img/share.png?v=${createHash('sha256').update(fs.readFileSync(shareFile)).digest('hex').slice(0, 8)}`,
    width: 1200,
    height: 630,
  });
  // The site's name on X ("@name"), taken from the X link in site.json, for the card X draws.
  const xLink = site.elsewhere.find((link) => /^https:\/\/(x|twitter)\.com\//.test(link.url));
  eleventyConfig.addGlobalData(
    'xHandle',
    xLink ? '@' + new URL(xLink.url).pathname.split('/')[1] : '',
  );

  // The year the site was built, for the copyright line.
  eleventyConfig.addGlobalData('build', { year: new Date().getFullYear() });

  // Fills placeholders such as {email} in a piece of text with the matching fact from site.json.
  eleventyConfig.addFilter('fill', (text) =>
    String(text).replace(/\{(\w+)\}/g, (whole, key) =>
      typeof site[key] === 'string' ? escapeHtml(site[key]) : whole,
    ),
  );

  // Splits a title into two parts near its middle, always inside a word. The project rows open at this point on hover.
  eleventyConfig.addFilter('halves', (title) => {
    const insideWord = (at) =>
      at > 0 && at < title.length && title[at - 1] !== ' ' && title[at] !== ' ';
    const middle = Math.ceil(title.length * 0.45);
    for (let step = 0; step < title.length; step++) {
      for (const at of [middle + step, middle - step]) {
        if (insideWord(at)) return [title.slice(0, at), title.slice(at)];
      }
    }
    return [title, ''];
  });

  // The project template (content/projects/_template.md) is a file to copy, not a page.
  eleventyConfig.ignores.add('src/content/projects/_template.md');

  // The list of projects, in the order set by "order" at the top of each file in content/projects/.
  // The home page and the Projects page are built from it. A project with a fact missing stops
  // the build with a message that names the file and the fact (scripts/lib/projects.mjs).
  eleventyConfig.addCollection('projectList', (collection) => {
    const projects = collection.getFilteredByGlob('src/content/projects/*.md');
    for (const project of projects) {
      const missing = missingFacts(project.data);
      if (missing.length)
        throw new Error(
          `${project.inputPath} needs these at the top of the file: ${missing.join(', ')}.`,
        );
    }
    return projects.sort(
      (a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title),
    );
  });

  // How a project's link is labelled: "Code: GitHub", or "Live:" and the site's address.
  eleventyConfig.addFilter('projectLink', projectLink);
  // An email link with its subject filled in: {{ site.email | mailto(subject) }}.
  eleventyConfig.addFilter('mailto', mailto);

  // The number of letters in the longest word of a heading. The styles use it to shrink a giant
  // heading on a narrow window until its longest word fits.
  eleventyConfig.addFilter('longestWord', (text) =>
    Math.max(
      ...String(text)
        .split(/\s+/)
        .map((word) => word.length),
    ),
  );

  // A project write-up's section headings: "headings" lists them for the table of contents, and
  // "headingIds" gives each one the address the table of contents links to.
  eleventyConfig.addFilter('headings', (html) =>
    [...String(html).matchAll(sectionHeading)].map(([, inner]) => ({
      text: plainText(inner),
      id: headingId(inner),
    })),
  );
  eleventyConfig.addFilter('headingIds', (html) =>
    String(html).replace(
      sectionHeading,
      (whole, inner) => `<h2 id="${headingId(inner)}">${inner}</h2>`,
    ),
  );

  // In Markdown, turn straight quotes and apostrophes into curly ones: the serif fonts have no
  // straight apostrophe. Nothing else is swapped, so two hyphens stay two hyphens.
  eleventyConfig.amendLibrary('md', (markdown) =>
    markdown.set({ typographer: true }).disable('replacements'),
  );

  // Turns the site's latitude and longitude into text such as "N 12° 58′ E 77° 35′" (degrees and minutes only).
  eleventyConfig.addFilter('coordinates', (place) => {
    const part = (value, positive, negative) => {
      const size = Math.abs(value);
      const degrees = Math.floor(size);
      const minutes = Math.floor((size - degrees) * 60);
      return `${value >= 0 ? positive : negative} ${degrees}° ${minutes}′`;
    };
    return `${part(place.latitude, 'N', 'S')} ${part(place.longitude, 'E', 'W')}`;
  });

  // Every link that leaves this site opens in a new tab. This runs over each finished page, so it
  // covers links written in templates, in the data files and in Markdown alike. Such a link gets
  // target="_blank", rel="noopener noreferrer" (the new tab cannot reach back into this one and is
  // not told where the visitor came from) and a note for screen readers, hidden from the eye.
  // Links within the site, links to a section of a page and email links are left alone.
  const siteHost = new URL(site.url).host;
  const leavesTheSite = (href) => /^https?:\/\//i.test(href) && new URL(href).host !== siteHost;
  eleventyConfig.addTransform('linksThatLeave', function (content) {
    if (!(this.page.outputPath || '').endsWith('.html')) return content;
    return content.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/g, (whole, attributes, inside) => {
      const href = /\shref="([^"]*)"/.exec(attributes)?.[1];
      if (!href || !leavesTheSite(href)) return whole;
      let kept = attributes.replace(/\s(?:target|rel)="[^"]*"/g, '');
      // A link with a label of its own is read by that label, so the note goes into the label.
      const labelled = /\saria-label="[^"]*"/.test(kept);
      if (labelled)
        kept = kept.replace(/(\saria-label="[^"]*)"/, `$1 ${escapeHtml(site.newTabNote)}"`);
      const note = labelled
        ? ''
        : `<span class="visually-hidden"> ${escapeHtml(site.newTabNote)}</span>`;
      return `<a${kept} target="_blank" rel="noopener noreferrer">${inside}${note}</a>`;
    });
  });

  // The headline's entrance is a very small script of its own, written straight into the home page
  // (layouts/base.njk) so that it does not wait for the main script. It is built here, before every build.
  let introScript = '';
  eleventyConfig.addShortcode('introScript', () => introScript);
  eleventyConfig.on('eleventy.before', async () => {
    introScript = await bundleIntro();
  });

  // The pictures. Before every build, scripts/images.mjs turns the photos and drawings listed in
  // _data/images.json into small two-tone pixel pictures inside the built site. A template shows
  // one with {% picture "name" %}. The tag writes the picture's size into the page, so the browser
  // keeps its place before the file arrives, and its alt text from images.json (empty for a
  // picture marked as decoration there, so that screen readers pass over it).
  // Options: "eager: true" for a picture at the top of a page (fetched at once instead of when it
  // comes near the window), "class" for an extra class name, and for a photo "sizes": how wide
  // it is shown, as in an <img> tag's sizes attribute.
  let pictures = {};
  eleventyConfig.on('eleventy.before', async ({ directories }) => {
    pictures = await convertImages(path.join(directories.output, 'assets', 'img'));
  });
  eleventyConfig.addShortcode('picture', (name, options = {}) => {
    const picture = pictures[name];
    if (!picture) throw new Error(`There is no picture called "${name}" in src/_data/images.json.`);
    const attribute = (text) => escapeHtml(text).replace(/"/g, '&quot;');
    const loading = options.eager ? 'fetchpriority="high"' : 'loading="lazy"';
    const tag = (file, alt, kind, mark = name) =>
      `<img class="picture picture--${kind}${options.class ? ` ${options.class}` : ''}" src="${file.src}" width="${file.width}" height="${file.height}" alt="${attribute(alt)}" data-picture="${mark}" ${loading} decoding="async">`;
    // A photo: a <picture> that offers the newer formats first, smallest first, and JPEG to any
    // browser that knows neither. "sizes" tells the browser how wide the photo is shown, so it
    // fetches the smallest file that is still sharp on that screen.
    if (picture.kind === 'photo') {
      const sizes = options.sizes || '100vw';
      return (
        `<picture class="picture-set">` +
        picture.sources
          .map(
            (source) => `<source type="${source.type}" srcset="${source.srcset}" sizes="${sizes}">`,
          )
          .join('') +
        `<img class="picture picture--photo${options.class ? ` ${options.class}` : ''}" src="${picture.fallback.src}" srcset="${picture.fallback.srcset}" sizes="${sizes}" width="${picture.width}" height="${picture.height}" alt="${attribute(picture.alt)}" data-picture="${name}" ${loading} decoding="async">` +
        `</picture>`
      );
    }
    // A pixel picture: the PNG, with the newer lossless formats that came out smaller offered
    // first (smallest first) in a <picture>, which the styles leave out of the layout
    // (.picture-set--pixels), so the picture sits exactly where a lone <img> would.
    const pixels = picture.sources.length
      ? `<picture class="picture-set picture-set--pixels">` +
        picture.sources
          .map((source) => `<source type="${source.type}" srcset="${source.src}">`)
          .join('') +
        tag(picture, picture.alt, 'pixels') +
        `</picture>`
      : tag(picture, picture.alt, 'pixels');
    return pixels;
  });
  eleventyConfig.addWatchTarget('./src/assets/img/source/');
  eleventyConfig.addWatchTarget('./scripts/images.mjs');

  // The site's own icon: a compass, made before every build by scripts/icons.mjs as two drawings
  // for browser tabs (light and dark), an old-style .ico, and squares for phone home screens. A
  // template writes a file's address, with its fingerprint, with {% siteIcon "light" %} ("light",
  // "dark", "ico", "touch" or "manifest").
  let siteIcons = {};
  eleventyConfig.on('eleventy.before', async ({ directories }) => {
    siteIcons = await makeSiteIcons(directories.output);
  });
  eleventyConfig.addShortcode('siteIcon', (kind) => {
    if (!siteIcons[kind]) throw new Error(`There is no site icon of the kind "${kind}".`);
    return siteIcons[kind];
  });
  eleventyConfig.addWatchTarget('./scripts/icons.mjs');

  // The local preview (pnpm run dev) answers the widgets' questions the same way the live
  // server does, so the weather, the now-playing line and the latest posts show while developing too.
  eleventyConfig.setServerOptions({
    middleware: [
      (request, response, next) => {
        answerApi(new URL(request.url, 'http://localhost').pathname, request.method, response).then(
          (answered) => {
            if (!answered) next();
          },
          () => next(),
        );
      },
    ],
  });

  // Bundle and minify the CSS and JavaScript before every build (scripts/lib/bundle.mjs, with Vite+).
  // Each of the two files then gets a fingerprint: a few characters worked out from its contents.
  // A template writes a file's address with {% asset "/assets/css/main.css" %}, which adds the
  // fingerprint ("?v=..."). Browsers, and Cloudflare in front of the live site, may keep these
  // files for an hour; with the fingerprint in the address a changed file is a new address, so
  // nobody is shown a new page with an old stylesheet after a deploy.
  const assetVersions = {};
  eleventyConfig.on('eleventy.before', async ({ directories, runMode }) => {
    await bundleAssets(directories.output, { sourcemap: runMode !== 'build' });
    for (const address of ['/assets/css/main.css', '/assets/js/main.js']) {
      assetVersions[address] = createHash('sha256')
        .update(fs.readFileSync(path.join(directories.output, address)))
        .digest('hex')
        .slice(0, 8);
    }
  });
  eleventyConfig.addShortcode('asset', (address) => {
    if (!assetVersions[address])
      throw new Error(`There is no built file at ${address} to write an address for.`);
    return `${address}?v=${assetVersions[address]}`;
  });
  eleventyConfig.addWatchTarget('./src/assets/css/');
  eleventyConfig.addWatchTarget('./src/assets/js/');

  // Files visitors download as they are, from src/assets/files/: the resume at /resume.pdf, and
  // the OpenPGP key at /romitraj-pgp-public.asc and in the Web Key Directory (/.well-known/
  // openpgpkey/, see scripts/lib/pgp.mjs). Templates get their addresses, with fingerprints, and
  // the key's facts as "downloads.resume", "downloads.key.url" and "downloads.key.facts".
  const downloads = {};
  eleventyConfig.on('eleventy.before', ({ directories }) => {
    downloads.resume = publishFile('src/assets/files/resume.pdf', directories.output, 'resume.pdf');
    downloads.key = publishKey({
      source: 'src/assets/files/romitraj-pgp-public.asc',
      email: site.email,
      outDir: directories.output,
    });
  });
  eleventyConfig.addGlobalData('downloads', () => downloads);
  eleventyConfig.addWatchTarget('./src/assets/files/');

  // The free fallback fonts and their license files ship with the site.
  eleventyConfig.addPassthroughCopy({ 'src/assets/fonts': 'assets/fonts' });

  // Copy the licensed fonts into the local built site. _site/ is ignored by git, so they never reach this repo.
  if (hasLocalFonts && fontBase === '/fonts/') {
    eleventyConfig.addPassthroughCopy({ [localFonts]: 'fonts' });
  }

  return {
    dir: {
      input: 'src/content',
      includes: '../_includes',
      data: '../_data',
      output: '_site',
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}
