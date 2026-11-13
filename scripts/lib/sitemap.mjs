// The sitemap (/sitemap.xml) and /robots.txt, and the date each page last changed.
//
// The server builds the site from a copy of the repository that holds only the newest commit, so
// git cannot tell it when each page last changed. The dates are kept in src/_data/pageDates.json
// instead, with a fingerprint of everything each page is made from. "pnpm run dates"
// (scripts/dates.mjs) brings them up to date, and "pnpm test" fails until it has been run after a
// page's words change. Used by eleventy.config.js, scripts/dates.mjs and scripts/check.mjs.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const datesFile = path.join(root, 'src', '_data', 'pageDates.json');

// What else each page is made from, besides its own file in src/content/: the files that hold its
// words. Only what a visitor reads counts; the banner, the footer and the styles do not, as they
// are the same on every page. "file#part" is one part of a data file ("pages.json#credits");
// "*.md#facts" is the facts at the top of every project (title, description, tags, year), which
// the lists of projects show. A page missing here is made from its own file alone.
const words = {
  '/': ['src/_data/home.json', 'src/_data/headline.json', 'src/content/projects/*.md#facts'],
  '/about/': ['src/_data/about.json'],
  '/projects/': ['src/_data/pages.json#projects', 'src/content/projects/*.md#facts'],
  '/resume/': ['src/_data/pages.json#resume', 'src/assets/files/resume.pdf'],
  '/credits/': ['src/_data/pages.json#credits', 'src/_data/image-credits.json'],
};
// Every project's page is also made from these words.
const projectWords = ['src/_data/pages.json#project'];

// The facts at the top of a page's file, between the two "---" lines.
const factsOf = (text) => /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '';

// The files in a folder that a "*" in "pattern" matches. A name starting with "_" is not a page
// (the project template), so it is never matched.
function matching(base, pattern) {
  const folder = path.posix.dirname(pattern);
  const [before, after] = path.posix.basename(pattern).split('*');
  const full = path.join(base, folder);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((name) => !name.startsWith('_') && name.startsWith(before) && name.endsWith(after))
    .sort()
    .map((name) => `${folder}/${name}`);
}

// Every public page of the site in "base" (the repository's folder), by its address, with the
// list of what it is made from. The pages are the files in src/content/ and src/content/projects/,
// less the ones kept out of the collections (the page for a missing address, the sitemap and
// robots.txt themselves) and the project template.
export function pageSources(base = root) {
  const pages = {};
  const content = path.join(base, 'src', 'content');
  for (const name of fs.readdirSync(content).sort()) {
    if (!name.endsWith('.njk')) continue;
    const text = fs.readFileSync(path.join(content, name), 'utf8');
    if (/^eleventyExcludeFromCollections:\s*true\s*$/m.test(factsOf(text))) continue;
    const page = name === 'index.njk' ? '/' : `/${name.replace(/\.njk$/, '')}/`;
    pages[page] = [`src/content/${name}`, ...(words[page] ?? [])];
  }
  for (const file of matching(base, 'src/content/projects/*.md')) {
    const page = `/projects/${path.posix.basename(file, '.md')}/`;
    pages[page] = [file, ...projectWords, ...(words[page] ?? [])];
  }
  return pages;
}

// A fingerprint of everything in "files" (see "words" above for the forms a name can take).
// Stops if a named file is missing, so a moved file cannot quietly fall out of the count.
export function sourceHash(base, files) {
  const hash = crypto.createHash('sha256');
  for (const entry of files) {
    const [file, part] = entry.split('#');
    const names = file.includes('*') ? matching(base, file) : [file];
    for (const name of names) {
      const full = path.join(base, name);
      if (!fs.existsSync(full)) throw new Error(`The sitemap counts on ${name}, which is missing.`);
      let body = fs.readFileSync(full);
      if (part === 'facts') body = factsOf(body.toString('utf8'));
      else if (part) body = JSON.stringify(JSON.parse(body.toString('utf8'))[part] ?? null);
      hash.update(`${entry} ${name}\n`).update(body).update('\n');
    }
  }
  return hash.digest('hex').slice(0, 16);
}

// The fingerprint of every page, by address.
export const pageHashes = (base = root) =>
  Object.fromEntries(
    Object.entries(pageSources(base)).map(([page, files]) => [page, sourceHash(base, files)]),
  );

// Today's date (YYYY-MM-DD) in "timeZone", the site's own (Asia/Kolkata in site.json).
export const localDate = (timeZone, when = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(when);

// The record with every page's fingerprint brought up to date: a page whose fingerprint changed,
// or a new page, is dated "today"; a page that is gone is dropped. Also says which pages changed.
export function updateDates(record, hashes, today) {
  const pages = {};
  const changed = [];
  for (const [page, hash] of Object.entries(hashes).sort(([one], [other]) =>
    one.localeCompare(other),
  )) {
    const held = record.pages?.[page];
    if (held && held.hash === hash) pages[page] = held;
    else {
      pages[page] = { lastmod: today, hash };
      changed.push(page);
    }
  }
  for (const page of Object.keys(record.pages ?? {})) if (!(page in hashes)) changed.push(page);
  return { record: { ...record, pages }, changed };
}

// The pages whose date on record no longer matches what they are made from.
export function staleDates(base, record) {
  const { changed } = updateDates(record, pageHashes(base), '');
  return changed;
}

const escapeXml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The sitemap: every page in "pages" (addresses such as "/about/") under "siteUrl", each with the
// day it last changed from "dates" (pageDates.json's "pages"). Stops the build for a page with
// no date on record.
export function sitemapXml(siteUrl, pages, dates) {
  const base = siteUrl.replace(/\/+$/, '');
  const listed = [...new Set(pages)].sort();
  const missing = listed.filter((page) => !dates[page]?.lastmod);
  if (missing.length)
    throw new Error(
      `No date on record for ${missing.join(', ')}. Run: pnpm run dates (see scripts/lib/sitemap.mjs).`,
    );
  const urls = listed.map(
    (page) =>
      `  <url><loc>${escapeXml(base + page)}</loc><lastmod>${dates[page].lastmod}</lastmod></url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

// robots.txt: every crawler may read everything, and here is the sitemap. Nothing is blocked:
// the other subdomains are kept out of search results by a "noindex" header that Cloudflare adds,
// which a crawler can only see if it is allowed to read the page.
export const robotsTxt = (siteUrl) =>
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl.replace(/\/+$/, '')}/sitemap.xml\n`;
