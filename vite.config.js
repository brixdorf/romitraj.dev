// Settings for Vite+ (the "vp" command): how "pnpm run lint" formats and checks the code, and
// where "pnpm test" finds the tests. The site itself is built by Eleventy and esbuild, not by Vite.
import { defineConfig } from 'vite-plus';

export default defineConfig({
  // The formatter (Oxfmt). Single quotes, as the code was written before it arrived.
  fmt: {
    singleQuote: true,
    // Files the build scripts write themselves, in their own layout.
    ignorePatterns: [
      'src/_data/fontVersions.json',
      'src/_data/fallbackFonts.json',
      'src/_data/textWidths.json',
      'src/_data/pageDates.json',
      'pnpm-lock.yaml',
    ],
  },
  // The linter (Oxlint), with its default rules, plus one from Vite+: tests import from
  // "vite-plus/test", never from "vitest" directly.
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
  },
  // The tests (Vitest): every file ending in .test.mjs or .test.js next to the code it tests.
  test: {
    include: ['scripts/**/*.test.mjs', 'server/**/*.test.js', 'src/**/*.test.js'],
  },
});
