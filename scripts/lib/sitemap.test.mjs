// Tests for the sitemap and robots.txt (scripts/lib/sitemap.mjs): which pages are listed, what
// each page is made from, the date each page last changed, and the two files themselves. The last
// test confirms that the dates on record (src/_data/pageDates.json) match the pages as they are.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  datesFile,
  localDate,
  pageSources,
  robotsTxt,
  sitemapXml,
  sourceHash,
  staleDates,
  updateDates,
} from './sitemap.mjs';

// A small site in a temporary folder: two pages, a page for a missing address, a sitemap
// template, a project, the project template and a data file.
let dir;
const write = (file, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), text);
};
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-test-'));
  write('src/content/index.njk', 'Home');
  write('src/content/about.njk', '---\ntitle: About\n---\nAbout');
  write('src/content/404.njk', '---\neleventyExcludeFromCollections: true\n---\nLost');
  write(
    'src/content/sitemap.njk',
    '---\npermalink: sitemap.xml\neleventyExcludeFromCollections: true\n---\n',
  );
  write('src/content/projects/snip.md', '---\ntitle: Snip\n---\nThe write-up.');
  write('src/content/projects/_template.md', '---\ntitle: Name\n---\n');
  write('src/_data/pages.json', JSON.stringify({ resume: { link: 'Open' }, credits: { a: 1 } }));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('pageSources', () => {
  it('lists every page, each project included, by its address', () => {
    expect(Object.keys(pageSources(dir)).sort()).toEqual(['/', '/about/', '/projects/snip/']);
  });

  it('leaves out pages kept out of the collections, and the project template', () => {
    const pages = Object.keys(pageSources(dir));
    expect(pages).not.toContain('/404/');
    expect(pages).not.toContain('/sitemap/');
    expect(pages).not.toContain('/projects/_template/');
  });

  it('makes each page from its own file at least', () => {
    expect(pageSources(dir)['/about/']).toContain('src/content/about.njk');
    expect(pageSources(dir)['/projects/snip/']).toContain('src/content/projects/snip.md');
  });

  it('adds the data files that hold the words of the real pages', () => {
    const real = pageSources(path.resolve(import.meta.dirname, '..', '..'));
    expect(real['/about/']).toContain('src/_data/about.json');
    expect(real['/']).toContain('src/_data/home.json');
    expect(real['/credits/']).toContain('src/_data/pages.json#credits');
    expect(real['/resume/']).toContain('src/assets/files/resume.pdf');
  });
});

describe('sourceHash', () => {
  it('changes when one of the files changes', () => {
    const before = sourceHash(dir, ['src/content/about.njk']);
    write('src/content/about.njk', '---\ntitle: About\n---\nAbout, changed');
    expect(sourceHash(dir, ['src/content/about.njk'])).not.toBe(before);
  });

  it('reads only the named part of a data file', () => {
    const before = sourceHash(dir, ['src/_data/pages.json#resume']);
    write('src/_data/pages.json', JSON.stringify({ resume: { link: 'Open' }, credits: { a: 2 } }));
    expect(sourceHash(dir, ['src/_data/pages.json#resume'])).toBe(before);
    write('src/_data/pages.json', JSON.stringify({ resume: { link: 'View' }, credits: { a: 2 } }));
    expect(sourceHash(dir, ['src/_data/pages.json#resume'])).not.toBe(before);
  });

  it('reads only the facts at the top of a project for "#facts"', () => {
    const files = ['src/content/projects/*.md#facts'];
    const before = sourceHash(dir, files);
    write('src/content/projects/snip.md', '---\ntitle: Snip\n---\nA longer write-up.');
    expect(sourceHash(dir, files)).toBe(before);
    write('src/content/projects/snip.md', '---\ntitle: Snip 2\n---\nA longer write-up.');
    expect(sourceHash(dir, files)).not.toBe(before);
  });

  it('counts a new project in a list of every project, but not the template', () => {
    const files = ['src/content/projects/*.md#facts'];
    const before = sourceHash(dir, files);
    write('src/content/projects/_template.md', '---\ntitle: Other\n---\n');
    expect(sourceHash(dir, files)).toBe(before);
    write('src/content/projects/clip.md', '---\ntitle: Clip\n---\n');
    expect(sourceHash(dir, files)).not.toBe(before);
  });

  it('stops when a named file is missing', () => {
    expect(() => sourceHash(dir, ['src/_data/gone.json'])).toThrow(/gone\.json/);
  });
});

describe('localDate', () => {
  it('gives the day in the site’s time zone', () => {
    // 20:00 in London is 01:30 the next day in Bangalore.
    expect(localDate('Asia/Kolkata', new Date('2026-11-13T20:00:00Z'))).toBe('2026-11-14');
    expect(localDate('Asia/Kolkata', new Date('2026-11-13T10:00:00Z'))).toBe('2026-11-13');
  });
});

describe('updateDates', () => {
  const record = {
    note: 'kept',
    pages: {
      '/': { lastmod: '2026-01-01', hash: 'aaa' },
      '/about/': { lastmod: '2026-02-02', hash: 'bbb' },
      '/gone/': { lastmod: '2026-03-03', hash: 'ccc' },
    },
  };
  const hashes = { '/': 'aaa', '/about/': 'changed', '/new/': 'ddd' };
  const { record: updated, changed } = updateDates(record, hashes, '2026-11-13');

  it('keeps the date of a page that has not changed', () => {
    expect(updated.pages['/']).toEqual({ lastmod: '2026-01-01', hash: 'aaa' });
  });

  it('dates a changed page and a new page today', () => {
    expect(updated.pages['/about/']).toEqual({ lastmod: '2026-11-13', hash: 'changed' });
    expect(updated.pages['/new/']).toEqual({ lastmod: '2026-11-13', hash: 'ddd' });
  });

  it('drops a page that no longer exists, and keeps the note', () => {
    expect(updated.pages['/gone/']).toBeUndefined();
    expect(updated.note).toBe('kept');
  });

  it('says what changed', () => {
    expect(changed.sort()).toEqual(['/about/', '/gone/', '/new/']);
  });
});

describe('sitemapXml', () => {
  const dates = { '/': { lastmod: '2026-01-01' }, '/about/': { lastmod: '2026-02-02' } };

  it('lists each page by its full address with the day it last changed', () => {
    const xml = sitemapXml('https://romitraj.dev', ['/', '/about/'], dates);
    expect(xml).toMatch(
      /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/,
    );
    expect(xml).toContain(
      '<url><loc>https://romitraj.dev/about/</loc><lastmod>2026-02-02</lastmod></url>',
    );
    expect(xml).toContain(
      '<url><loc>https://romitraj.dev/</loc><lastmod>2026-01-01</lastmod></url>',
    );
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('lists the pages in order of their address, each once', () => {
    const xml = sitemapXml('https://romitraj.dev/', ['/about/', '/', '/about/'], dates);
    const listed = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
    expect(listed).toEqual(['https://romitraj.dev/', 'https://romitraj.dev/about/']);
  });

  it('stops the build when a page has no date on record', () => {
    expect(() => sitemapXml('https://romitraj.dev', ['/', '/uses/'], dates)).toThrow(
      /\/uses\/.*pnpm run dates/,
    );
  });
});

describe('robotsTxt', () => {
  const text = robotsTxt('https://romitraj.dev');

  it('lets every crawler read every page', () => {
    expect(text).toMatch(/^User-agent: \*\nAllow: \/\n/);
  });

  it('blocks nothing', () => {
    expect(text).not.toMatch(/Disallow:\s*\S/);
  });

  it('points to the sitemap', () => {
    expect(text).toContain('\nSitemap: https://romitraj.dev/sitemap.xml\n');
  });
});

describe('the dates on record', () => {
  it('match every page as it is now (if not: pnpm run dates)', () => {
    const root = path.resolve(import.meta.dirname, '..', '..');
    const record = JSON.parse(fs.readFileSync(datesFile, 'utf8'));
    expect(staleDates(root, record)).toEqual([]);
  });
});
