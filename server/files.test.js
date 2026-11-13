// Tests for how the server sends a file (server/files.js): its type, how long it may be kept,
// whether it opens in the browser, and when an unchanged file is answered "not modified".
import { describe, expect, it } from 'vite-plus/test';
import { fileHeaders, isUnchanged } from './files.js';

const send = (urlPath, search = '') =>
  fileHeaders({ urlPath, search, size: 1234, mtimeMs: 1700000000000 });

describe('fileHeaders', () => {
  it('names the type of every kind of file the site has', () => {
    expect(send('/index.html')['Content-Type']).toBe('text/html; charset=utf-8');
    expect(send('/assets/img/clock-480.jxl', '?v=1')['Content-Type']).toBe('image/jxl');
    expect(send('/assets/img/clock-480.avif', '?v=1')['Content-Type']).toBe('image/avif');
    expect(send('/assets/img/clock-480.jpg', '?v=1')['Content-Type']).toBe('image/jpeg');
    expect(send('/resume.pdf')['Content-Type']).toBe('application/pdf');
    expect(send('/romitraj-pgp-public.asc')['Content-Type']).toBe('application/pgp-keys');
    expect(send('/something')['Content-Type']).toBe('application/octet-stream');
  });

  it('lets a file with a fingerprint in its address be kept for a year, unchecked', () => {
    for (const [path, search] of [
      ['/assets/css/main.css', '?v=1a2b3c4d'],
      ['/assets/js/main.js', '?v=1a2b3c4d'],
      ['/assets/img/hero.jxl', '?v=1a2b3c4d'],
      ['/assets/img/hero.png', '?v=1a2b3c4d'],
      ['/fonts/manuka-black.woff2', '?v=e281303c'],
      ['/favicon-light.svg', '?v=9787ec47'],
    ])
      expect(send(path, search)['Cache-Control']).toBe('public, max-age=31536000, immutable');
  });

  it('makes browsers and Cloudflare check every file without one, so a new version shows at once', () => {
    for (const path of ['/index.html', '/resume.pdf', '/romitraj-pgp-public.asc'])
      expect(send(path)['Cache-Control']).toBe('no-cache');
    expect(send('/resume.pdf').ETag).toMatch(/^"[0-9a-f]+-[0-9a-f]+"$/);
  });

  it('opens the resume in the browser instead of downloading it, under its plain name', () => {
    expect(send('/resume.pdf')['Content-Disposition']).toBe('inline; filename="resume.pdf"');
    expect(send('/index.html')['Content-Disposition']).toBeUndefined();
  });

  it('sends the Web Key Directory as raw bytes any website may read', () => {
    const headers = send('/.well-known/openpgpkey/hu/aeii9rmagouy1owpp7e5ftpxjof7h41n', '?l=hi');
    expect(headers['Content-Type']).toBe('application/octet-stream');
    expect(headers['Access-Control-Allow-Origin']).toBe('*');
  });
});

describe('isUnchanged', () => {
  it('is true when the browser already has this exact version', () => {
    const { ETag } = send('/resume.pdf');
    expect(isUnchanged({ 'if-none-match': ETag }, ETag)).toBe(true);
    expect(isUnchanged({ 'if-none-match': `"other", ${ETag}` }, ETag)).toBe(true);
  });

  it('is false for another version, or when the browser has none', () => {
    const { ETag } = send('/resume.pdf');
    expect(isUnchanged({ 'if-none-match': '"0-0"' }, ETag)).toBe(false);
    expect(isUnchanged({}, ETag)).toBe(false);
  });
});
