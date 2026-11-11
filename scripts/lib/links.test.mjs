// Tests for the dead-link checker (scripts/lib/links.mjs): finding the links in a page, judging
// an answer, and checking a small made-up site served on this computer.
import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { checkSite, idsIn, judge, linksIn } from './links.mjs';

describe('linksIn', () => {
  const page = 'https://example.org/blog/post/';

  it('finds links, pictures, scripts, stylesheets and preview images as full addresses', () => {
    const html = `
      <link rel="stylesheet" href="/assets/main.css?v=1">
      <meta property="og:image" content="https://example.org/share.png">
      <meta name="twitter:image" content="/card.png">
      <a href="../other/">Other</a>
      <img src="pic.png" srcset="pic-2x.png 2x, /pic-3x.png 3x" alt="">
      <script src="https://cdn.example.net/x.js"></script>
      <source srcset="/a.avif">`;
    expect(linksIn(html, page).sort()).toEqual([
      'https://cdn.example.net/x.js',
      'https://example.org/a.avif',
      'https://example.org/assets/main.css?v=1',
      'https://example.org/blog/other/',
      'https://example.org/blog/post/pic-2x.png',
      'https://example.org/blog/post/pic.png',
      'https://example.org/card.png',
      'https://example.org/pic-3x.png',
      'https://example.org/share.png',
    ]);
  });

  it('keeps a jump to a section, and leaves out email, phone, script and empty links', () => {
    const html = `
      <a href="#top">Top</a>
      <a href="/projects/#the-problem">Problem</a>
      <a href="mailto:hi@example.org">Mail</a>
      <a href="tel:+100">Call</a>
      <a href="javascript:void(0)">Nothing</a>
      <a href="data:text/plain,hi">Data</a>
      <a href="">Empty</a>`;
    expect(linksIn(html, page).sort()).toEqual([
      'https://example.org/blog/post/#top',
      'https://example.org/projects/#the-problem',
    ]);
  });

  it('reads addresses written with single quotes, no quotes or HTML entities, once each', () => {
    const html = `<a href='/one/'>1</a><a href=/two/>2</a><a href="/three/?a=1&amp;b=2">3</a><a href="/one/">again</a>`;
    expect(linksIn(html, page).sort()).toEqual([
      'https://example.org/one/',
      'https://example.org/three/?a=1&b=2',
      'https://example.org/two/',
    ]);
  });

  it('ignores links inside comments', () => {
    expect(linksIn('<!-- <a href="/gone/">old</a> --><a href="/here/">new</a>', page)).toEqual([
      'https://example.org/here/',
    ]);
  });
});

describe('idsIn', () => {
  it('lists the places a link can jump to', () => {
    expect(
      [...idsIn('<h2 id="the-problem">P</h2><a name="old-style"></a><div id=\'x\'></div>')].sort(),
    ).toEqual(['old-style', 'the-problem', 'x']);
  });
});

describe('judge', () => {
  it('calls an answer that worked fine', () => {
    expect(judge({ status: 200 }).verdict).toBe('fine');
    expect(judge({ status: 204 }).verdict).toBe('fine');
  });

  it('calls a missing page dead', () => {
    expect(judge({ status: 404 })).toEqual({ verdict: 'dead', reason: '404 Not Found' });
    expect(judge({ status: 410 }).verdict).toBe('dead');
  });

  it('calls an address that leads to no server dead', () => {
    expect(judge({ error: { code: 'ENOTFOUND' } })).toEqual({
      verdict: 'dead',
      reason: 'no such website (the name does not exist)',
    });
    expect(judge({ error: { code: 'ECONNREFUSED' } }).verdict).toBe('dead');
  });

  it('is unsure about refusals, bot checks, server errors and slow answers', () => {
    for (const status of [401, 403, 429, 999, 500, 503])
      expect(judge({ status }).verdict).toBe('unsure');
    expect(
      judge({ status: 403, headers: new Headers({ 'cf-mitigated': 'challenge' }) }).reason,
    ).toMatch(/bot check/);
    expect(judge({ error: { name: 'TimeoutError' } }).verdict).toBe('unsure');
  });

  it('calls any failure on the site being checked dead, since its own server does not refuse programs', () => {
    expect(judge({ status: 403 }, { inside: true }).verdict).toBe('dead');
    expect(judge({ status: 500 }, { inside: true }).verdict).toBe('dead');
  });
});

describe('checkSite', () => {
  // Two small servers: "the site" and "elsewhere", a different website it links to.
  let site;
  let elsewhere;
  const serve = (routes) =>
    new Promise((resolve) => {
      const server = http.createServer((request, response) => {
        const route = routes[request.url.split('?')[0]];
        if (!route) {
          response.writeHead(404, { 'Content-Type': 'text/html' });
          response.end('<a href="/from-the-missing-page/">x</a>');
          return;
        }
        const { status = 200, type = 'text/html', body = '', headOnly, location } = route(request);
        if (request.method === 'HEAD' && headOnly) {
          response.writeHead(headOnly);
          response.end();
          return;
        }
        response.writeHead(status, {
          'Content-Type': type,
          ...(location ? { Location: location } : {}),
        });
        response.end(request.method === 'HEAD' ? undefined : body);
      });
      server.listen(0, '127.0.0.1', () =>
        resolve({ server, address: `http://127.0.0.1:${server.address().port}` }),
      );
    });

  beforeAll(async () => {
    elsewhere = await serve({
      '/fine/': () => ({ body: 'ok' }),
      '/gone/': () => ({ status: 404 }),
      '/no-head/': () => ({ headOnly: 405, body: 'ok' }),
      '/no-programs/': () => ({ status: 403 }),
    });
    const other = elsewhere.address;
    site = await serve({
      '/': () => ({
        body: `<link rel="stylesheet" href="/main.css">
          <a href="/about/">About</a> <a href="/old">Old</a> <a href="/missing/">Missing</a>
          <a href="/about/#who">Who</a> <a href="/about/#nobody">Nobody</a>
          <a href="${other}/fine/">1</a> <a href="${other}/gone/">2</a> <a href="${other}/no-head/">3</a> <a href="${other}/no-programs/">4</a>
          <a href="https://www.example.org/live-copy/">The live copy of this page</a>`,
      }),
      '/about/': () => ({
        body: `<h2 id="who">Who</h2><a href="/">Home</a><img src="/missing.png" alt="">`,
      }),
      '/old': () => ({ status: 301, location: '/about/' }),
      '/main.css': () => ({ type: 'text/css', body: 'a{}' }),
      '/unlinked/': () => ({ body: `<a href="${other}/gone/">again</a>` }),
    });
  });

  afterAll(() => {
    site.server.close();
    elsewhere.server.close();
  });

  it('reports every dead link with the pages it is on, and nothing that works', async () => {
    const report = await checkSite(site.address, {
      alsoRead: [`${site.address}/unlinked/`],
      sameAs: ['https://www.example.org'],
      timeout: 2000,
    });
    const deadOnes = Object.fromEntries(
      report.dead.map((link) => [
        link.url.replace(site.address, 'SITE').replace(elsewhere.address, 'ELSEWHERE'),
        link.on.map((on) => on.replace(site.address, '')).sort(),
      ]),
    );
    expect(deadOnes).toEqual({
      'SITE/missing/': ['/'],
      'SITE/missing.png': ['/about/'],
      'SITE/about/#nobody': ['/'],
      'ELSEWHERE/gone/': ['/', '/unlinked/'],
      // The live copy is checked against the site on this computer.
      'SITE/live-copy/': ['/'],
    });
    expect(report.unsure.map((link) => link.url.replace(elsewhere.address, 'ELSEWHERE'))).toEqual([
      'ELSEWHERE/no-programs/',
    ]);
    expect(report.pages).toBe(3);
  });

  it('does not read pages on other websites', async () => {
    const report = await checkSite(site.address, {
      sameAs: ['https://www.example.org'],
      timeout: 2000,
    });
    expect(report.pages).toBe(2);
    expect(report.dead.some((link) => link.url.includes('from-the-missing-page'))).toBe(false);
  });
});
