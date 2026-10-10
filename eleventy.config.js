// Eleventy configuration: where the content lives, how the CSS and JavaScript are bundled,
// and where the web fonts load from.
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

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
