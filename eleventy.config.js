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

export default function (eleventyConfig) {
  eleventyConfig.addGlobalData('fontBase', fontBase);

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
