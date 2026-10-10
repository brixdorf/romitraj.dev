// Measures how wide the hero's big lines run and saves the numbers to src/_data/textWidths.json,
// so each line is sized to fill its space exactly. Run it after changing the headline's words
// (src/_data/headline.json) or the headline fonts. Run it with: npm run fit
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { root, textWidthsFile, buildSite, startServer, measureTextWidths } from './lib/site.mjs';

await buildSite();
const server = await startServer(4174);
const browser = await chromium.launch();
try {
  const before = JSON.parse(fs.readFileSync(textWidthsFile, 'utf8'));
  const measured = await measureTextWidths(await browser.newPage(), server.address);
  // Two runs can differ by a hair. Keep the saved number unless the line really changed (by more than a thousandth).
  const after = Object.fromEntries(Object.entries(measured).map(([name, value]) => [
    name,
    before[name] && Math.abs(value - before[name]) / value < 0.001 ? before[name] : value,
  ]));
  fs.writeFileSync(textWidthsFile, JSON.stringify(after, null, 2) + '\n');
  console.log('\nWidth of each line, in units of its own font size:');
  for (const [name, value] of Object.entries(after)) {
    console.log(`  ${name.padEnd(18)} ${String(value).padEnd(8)} ${before[name] === value ? '(unchanged)' : `(was ${before[name]})`}`);
  }
  console.log(`\nSaved to ${path.relative(root, textWidthsFile)}. Run npm run check to see the result.`);
} finally {
  await browser.close();
  server.stop();
}
