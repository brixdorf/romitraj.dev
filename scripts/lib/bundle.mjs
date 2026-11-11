// Bundles the site's CSS and JavaScript with Vite+ (Vite, with Rolldown for the scripts and
// Lightning CSS for the styles): main.css with every file it imports, main.js with everything it
// imports, and the headline's small entrance script, each as one minified file written for the
// browser versions in "browsers". Used by the build (eleventy.config.js) and by the letters test.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite-plus';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// The oldest browser versions the bundled CSS and JavaScript are written for. Newer CSS (such as
// nesting) is rewritten so these versions understand it.
export const browsers = ['chrome115', 'edge115', 'firefox115', 'safari16.4'];

// Settings every bundle shares: no vite.config.js (that file is for the tests and the linter),
// no public folder, and only warnings printed.
const shared = {
  configFile: false,
  root,
  publicDir: false,
  logLevel: 'warn',
  css: { transformer: 'lightningcss' },
};

// One script file: "entry" and everything it imports, as a single function that runs at once
// ("iife"), so the page needs no modules. With "globalName" its exports are kept on that name.
async function bundleScript(
  entry,
  { outDir, fileName, sourcemap = false, globalName = 'bundle', write = true },
) {
  const result = await build({
    ...shared,
    build: {
      outDir,
      emptyOutDir: false,
      write,
      minify: true,
      sourcemap,
      target: browsers,
      lib: { entry, formats: ['iife'], name: globalName, fileName: () => fileName },
    },
  });
  return [result].flat()[0].output[0].code.trim();
}

// The headline's entrance (src/assets/js/intro.js), returned as text: the build writes it straight
// into the page, so that it does not wait for the main script.
export const bundleIntro = () =>
  bundleScript(path.join(root, 'src/assets/js/intro.js'), {
    fileName: 'intro.js',
    write: false,
    outDir: os.tmpdir(),
  });

// The main stylesheet and script, written to assets/css/main.css and assets/js/main.js inside
// "outDir". "sourcemap" adds main.js.map, which lets the browser's tools show the original files.
export async function bundleAssets(outDir, { sourcemap = false } = {}) {
  await bundleScript(path.join(root, 'src/assets/js/main.js'), {
    outDir: path.join(outDir, 'assets', 'js'),
    fileName: 'main.js',
    sourcemap,
  });
  // The stylesheet is bundled on its own. Vite writes it as an asset of an empty script, which is
  // left behind in a folder of its own and removed.
  const cssOut = fs.mkdtempSync(path.join(os.tmpdir(), 'site-css-'));
  try {
    await build({
      ...shared,
      build: {
        outDir: cssOut,
        emptyOutDir: true,
        cssMinify: 'lightningcss',
        cssTarget: browsers,
        target: browsers,
        rolldownOptions: {
          input: path.join(root, 'src/assets/css/main.css'),
          output: { assetFileNames: '[name][extname]' },
        },
      },
    });
    fs.mkdirSync(path.join(outDir, 'assets', 'css'), { recursive: true });
    fs.copyFileSync(path.join(cssOut, 'main.css'), path.join(outDir, 'assets', 'css', 'main.css'));
  } finally {
    fs.rmSync(cssOut, { recursive: true, force: true });
  }
}

// A few lines of module code (importing from files in "folder", relative to the project), turned
// into a plain script that puts their exports on window["globalName"]. The checks use it to give a
// test page the site's own functions.
export async function bundleForPage(code, folder, globalName) {
  const entry = path.join(root, folder, `.bundle-for-page-${process.pid}-${Date.now()}.js`);
  fs.writeFileSync(entry, code);
  try {
    return await bundleScript(entry, {
      fileName: 'page.js',
      write: false,
      outDir: os.tmpdir(),
      globalName,
    });
  } finally {
    fs.rmSync(entry, { force: true });
  }
}
