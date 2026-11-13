// Brings the sitemap's dates up to date: every page whose words changed since the last run, and
// every new page, is dated today in src/_data/pageDates.json (see scripts/lib/sitemap.mjs). Run it
// after changing a page's words, when "pnpm test" asks for it, and commit pageDates.json with the
// change. Run it with: pnpm run dates
import fs from 'node:fs';
import path from 'node:path';
import { datesFile, localDate, pageHashes, updateDates } from './lib/sitemap.mjs';

const root = path.resolve(import.meta.dirname, '..');
const site = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'site.json'), 'utf8'));
const record = fs.existsSync(datesFile)
  ? JSON.parse(fs.readFileSync(datesFile, 'utf8'))
  : { pages: {} };

const { record: updated, changed } = updateDates(
  record,
  pageHashes(root),
  localDate(site.timeZone),
);
fs.writeFileSync(datesFile, JSON.stringify(updated, null, 2) + '\n');
console.log(
  changed.length
    ? `Dated today: ${changed.filter((page) => page in updated.pages).join(', ') || 'none'}.` +
        (changed.some((page) => !(page in updated.pages))
          ? ` Dropped: ${changed.filter((page) => !(page in updated.pages)).join(', ')}.`
          : '')
    : 'Every page’s date was already up to date.',
);
