// Tests for the bundling of the site's CSS and JavaScript (scripts/lib/bundle.mjs).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { browsers, bundleAssets, bundleIntro, bundleForPage } from './bundle.mjs';

describe('browsers', () => {
  it('names the oldest browser versions the bundles are written for', () => {
    expect(browsers).toEqual(['chrome115', 'edge115', 'firefox115', 'safari16.4']);
  });
});

describe('bundleIntro', () => {
  it('gives the headline entrance as one small self-contained script', async () => {
    const code = await bundleIntro();
    expect(code).toMatch(/^\(function\(\)\{/);
    expect(code).not.toMatch(/\bimport\b[^(]|\bexport\b/);
    expect(code.length).toBeLessThan(6000);
    expect(code).toBe(code.trim());
  });
});

describe('bundleAssets', () => {
  let out;
  beforeAll(async () => {
    out = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-test-'));
    await bundleAssets(out, { sourcemap: true });
  }, 60000);
  afterAll(() => fs.rmSync(out, { recursive: true, force: true }));

  it('writes one stylesheet with every imported file in it, nesting flattened for older browsers', () => {
    const css = fs.readFileSync(path.join(out, 'assets', 'css', 'main.css'), 'utf8');
    expect(css).not.toMatch(/@import/);
    expect(css).not.toMatch(/&/);
    // A rule from tokens.css and one from the last component file are both in it.
    expect(css).toMatch(/--color-paper:/);
    expect(css).toMatch(/\.ticker/);
    expect(css).not.toMatch(/\n\s+/);
  });

  it('writes one minified script that runs as it is, without modules', () => {
    const js = fs.readFileSync(path.join(out, 'assets', 'js', 'main.js'), 'utf8');
    expect(js).toMatch(/^\(function\(\)\{/);
    expect(js).not.toMatch(/^import |^export /m);
    expect(js.length).toBeGreaterThan(50000);
  });

  it('writes a source map for the script when asked, for the local preview', () => {
    expect(fs.existsSync(path.join(out, 'assets', 'js', 'main.js.map'))).toBe(true);
  });
});

describe('bundleForPage', () => {
  it('turns a few lines of module code into a script that puts their exports on one global name', async () => {
    const code = await bundleForPage(
      "export { shape } from './shapes.js'; export const answer = 42;",
      'src/assets/js',
      'testBundle',
    );
    const scope = {};
    new Function('window', `${code}; window.testBundle = testBundle;`)(scope);
    expect(scope.testBundle.answer).toBe(42);
    expect(typeof scope.testBundle.shape).toBe('object');
  });
});
