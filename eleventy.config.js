// Eleventy configuration: where the content lives, how the CSS and JavaScript are bundled, how the
// pictures are made, and where the web fonts load from.
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { convertImages } from './scripts/images.mjs';
import { answerApi } from './server/api.js';

if (fs.existsSync('.env')) process.loadEnvFile('.env');

const site = JSON.parse(fs.readFileSync('src/_data/site.json', 'utf8'));

// The licensed fonts live outside this repo. On a computer that has the folder below, they are
// copied into the built site and load from /fonts/. Anywhere else (the live server) they load
// from the font site.
const localFonts = '../romitraj-private/fonts/web';
const hasLocalFonts = fs.existsSync(localFonts);
const fontBase = process.env.FONT_BASE_URL || (hasLocalFonts ? '/fonts/' : site.fontsUrl);

// Oldest browser versions the bundled CSS and JavaScript are written out for.
const browsers = ['chrome115', 'edge115', 'firefox115', 'safari16.4'];

const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The plain words of a heading, and the address ("the-problem") that links to it.
const plainText = (html) => html.replace(/<[^>]+>/g, '').trim();
const headingId = (html) => plainText(html).toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sectionHeading = /<h2>(.*?)<\/h2>/g;

export default function (eleventyConfig) {
  eleventyConfig.addGlobalData('fontBase', fontBase);

  // The headline font has no apostrophe. This swaps each apostrophe for an empty marker,
  // which the styles fill with that font's own comma, raised into place.
  eleventyConfig.addFilter('raisedApostrophe', (text) => escapeHtml(text).replace(/['’]/g, '<span class="apostrophe"></span>'));

  // The year the site was built, for the copyright line.
  eleventyConfig.addGlobalData('build', { year: new Date().getFullYear() });

  // Fills placeholders such as {email} in a piece of text with the matching fact from site.json.
  eleventyConfig.addFilter('fill', (text) => String(text).replace(/\{(\w+)\}/g, (whole, key) => (typeof site[key] === 'string' ? escapeHtml(site[key]) : whole)));

  // Splits a title into two parts near its middle, always inside a word. The project rows open at this point on hover.
  eleventyConfig.addFilter('halves', (title) => {
    const insideWord = (at) => at > 0 && at < title.length && title[at - 1] !== ' ' && title[at] !== ' ';
    const middle = Math.ceil(title.length * 0.45);
    for (let step = 0; step < title.length; step++) {
      for (const at of [middle + step, middle - step]) {
        if (insideWord(at)) return [title.slice(0, at), title.slice(at)];
      }
    }
    return [title, ''];
  });

  // The list of projects, in the order set by "order" at the top of each file in content/projects/.
  // The home page and the Projects page are built from it. A project with a fact missing stops
  // the build with a message that names the file and the fact.
  eleventyConfig.addCollection('projectList', (collection) => {
    const projects = collection.getFilteredByGlob('src/content/projects/*.md');
    for (const project of projects) {
      const { title, description, tags, year, link, order } = project.data;
      const missing = Object.entries({ title, description, year, link }).filter(([, value]) => value === undefined || value === '').map(([name]) => name);
      if (!Array.isArray(tags) || !tags.length) missing.push('tags (a list)');
      if (typeof order !== 'number') missing.push('order (a number)');
      if (missing.length) throw new Error(`${project.inputPath} needs these at the top of the file: ${missing.join(', ')}.`);
    }
    return projects.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
  });

  // The number of letters in the longest word of a heading. The styles use it to shrink a giant
  // heading on a narrow window until its longest word fits.
  eleventyConfig.addFilter('longestWord', (text) => Math.max(...String(text).split(/\s+/).map((word) => word.length)));

  // A project write-up's section headings: "headings" lists them for the table of contents, and
  // "headingIds" gives each one the address the table of contents links to.
  eleventyConfig.addFilter('headings', (html) => [...String(html).matchAll(sectionHeading)].map(([, inner]) => ({ text: plainText(inner), id: headingId(inner) })));
  eleventyConfig.addFilter('headingIds', (html) => String(html).replace(sectionHeading, (whole, inner) => `<h2 id="${headingId(inner)}">${inner}</h2>`));

  // In Markdown, turn straight quotes and apostrophes into curly ones: the serif fonts have no
  // straight apostrophe. Nothing else is swapped, so two hyphens stay two hyphens.
  eleventyConfig.amendLibrary('md', (markdown) => markdown.set({ typographer: true }).disable('replacements'));

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
      if (labelled) kept = kept.replace(/(\saria-label="[^"]*)"/, `$1 ${escapeHtml(site.newTabNote)}"`);
      const note = labelled ? '' : `<span class="visually-hidden"> ${escapeHtml(site.newTabNote)}</span>`;
      return `<a${kept} target="_blank" rel="noopener noreferrer">${inside}${note}</a>`;
    });
  });

  // The headline's entrance is a very small script of its own, written straight into the home page
  // (layouts/base.njk) so that it does not wait for the main script. It is built here, before every build.
  let introScript = '';
  eleventyConfig.addShortcode('introScript', () => introScript);
  eleventyConfig.on('eleventy.before', async () => {
    const result = await esbuild.build({ entryPoints: ['src/assets/js/intro.js'], bundle: true, minify: true, format: 'iife', target: browsers, write: false, logLevel: 'warning' });
    introScript = result.outputFiles[0].text.trim();
  });

  // The pictures. Before every build, scripts/images.mjs turns the photos and drawings listed in
  // _data/images.json into small two-tone pixel pictures inside the built site. A template shows
  // one with {% picture "name" %}. The tag writes the picture's size into the page, so the browser
  // keeps its place before the file arrives, and its alt text from images.json (empty for a
  // picture marked as decoration there, so that screen readers pass over it).
  // Options: "eager: true" for a picture at the top of a page (fetched at once instead of when it
  // comes near the window), and "class" for an extra class name.
  let pictures = {};
  eleventyConfig.on('eleventy.before', async ({ directories }) => {
    pictures = await convertImages(path.join(directories.output, 'assets', 'img'));
  });
  eleventyConfig.addShortcode('picture', (name, options = {}) => {
    const picture = pictures[name];
    if (!picture) throw new Error(`There is no picture called "${name}" in src/_data/images.json.`);
    const attribute = (text) => escapeHtml(text).replace(/"/g, '&quot;');
    const tag = (file, alt, kind) => `<img class="picture picture--${kind}${options.class ? ` ${options.class}` : ''}" src="${file.src}" width="${file.width}" height="${file.height}" alt="${attribute(alt)}" ${options.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
    // A picture with a painted backdrop is two files: the paint underneath, the pixels on top.
    return (picture.texture ? tag(picture.texture, '', 'paint') : '') + tag(picture, picture.alt, 'pixels');
  });
  eleventyConfig.addWatchTarget('./src/assets/img/source/');
  eleventyConfig.addWatchTarget('./scripts/images.mjs');

  // The local preview (npm run dev) answers the widgets' two questions the same way the live
  // server does, so the weather and the now-playing line show while developing too.
  eleventyConfig.setServerOptions({
    middleware: [
      (request, response, next) => {
        answerApi(new URL(request.url, 'http://localhost').pathname, request.method, response).then((answered) => { if (!answered) next(); }, () => next());
      },
    ],
  });

  // Bundle and minify the CSS and JavaScript before every build.
  eleventyConfig.on('eleventy.before', async ({ directories, runMode }) => {
    await esbuild.build({
      entryPoints: {
        'assets/css/main': 'src/assets/css/main.css',
        'assets/js/main': 'src/assets/js/main.js',
      },
      outdir: directories.output,
      bundle: true,
      minify: true,
      sourcemap: runMode !== 'build',
      format: 'iife',
      target: browsers,
      logLevel: 'warning',
    });
  });
  eleventyConfig.addWatchTarget('./src/assets/css/');
  eleventyConfig.addWatchTarget('./src/assets/js/');

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
