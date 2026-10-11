// Tests used by the check script, about what every page carries in its head for the world outside
// the page: the site's icon (scripts/icons.mjs) and the tags that sharing apps read to draw a
// preview card (layouts/base.njk, with the share image made by "npm run share").
//
// "headOfEveryPage" reads the built pages and files and confirms that
//   - every page names the four icon files, and each exists and is what it should be: a drawing
//     that switches between ink and paper, an .ico holding a 16 and a 32 pixel picture, a 180
//     pixel square with no transparent parts, and a small file for Android naming two squares;
//   - every page has the Open Graph tags and the X card tags, with the page's own title and
//     description, the page's full address, and the full address of the share image;
//   - the share image exists, is 1200 by 630 pixels and is light enough for every app.
// "siteIconInBrowser" asks a browser for the icon files and draws the tab icon on a light and on
// a dark background: it must be the ink compass on light and the paper compass on dark.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const attribute = (tag, name) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
const unescape = (text) => String(text).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// The file in the built site behind an address such as "/favicon.svg?v=1234".
const fileBehind = (siteDir, address) => path.join(siteDir, address.split('?')[0]);

export async function headOfEveryPage(siteDir, root) {
  const problems = [];
  const site = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'site.json'), 'utf8'));
  const tokens = fs.readFileSync(path.join(root, 'src', 'assets', 'css', 'tokens.css'), 'utf8');
  const color = (name) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})\\b`, 'i').exec(tokens)?.[1];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
  const pages = walk(siteDir).filter((file) => file.endsWith('.html'));
  let shareAddress = null;

  for (const file of pages) {
    const pagePath = '/' + path.relative(siteDir, file).split(path.sep).join('/').replace(/index\.html$/, '');
    const head = fs.readFileSync(file, 'utf8').split('</head>')[0];
    const links = [...head.matchAll(/<link [^>]*>/g)].map((match) => match[0]);
    const metas = [...head.matchAll(/<meta [^>]*>/g)].map((match) => match[0]);
    const meta = (key) => { const tag = metas.find((candidate) => attribute(candidate, 'property') === key || attribute(candidate, 'name') === key); return tag ? unescape(attribute(tag, 'content')) : null; };
    const title = unescape(/<title>([^<]*)<\/title>/.exec(head)?.[1] || '');

    // ---- The icon ----
    const icon = (test) => { const tag = links.find(test); return tag ? attribute(tag, 'href') : null; };
    const icons = {
      'the .ico icon': icon((tag) => attribute(tag, 'rel') === 'icon' && /\.ico(\?|$)/.test(attribute(tag, 'href') || '')),
      'the drawn icon': icon((tag) => attribute(tag, 'rel') === 'icon' && attribute(tag, 'type') === 'image/svg+xml'),
      'the Apple touch icon': icon((tag) => attribute(tag, 'rel') === 'apple-touch-icon'),
      'the manifest': icon((tag) => attribute(tag, 'rel') === 'manifest'),
    };
    for (const [what, address] of Object.entries(icons)) {
      if (!address) problems.push(`${pagePath} does not name ${what} in its head`);
      else if (!address.startsWith('/') || !/\?v=\w+/.test(address)) problems.push(`${pagePath}: ${what} is at ${address}, which should start at the site's root and carry a fingerprint`);
      else if (!fs.existsSync(fileBehind(siteDir, address))) problems.push(`${pagePath} names ${what} at ${address}, but there is no such file`);
    }

    // ---- The preview card ----
    const expectedTitle = title.endsWith(` | ${site.name}`) ? title.slice(0, -` | ${site.name}`.length) : title;
    const expected = {
      'og:type': 'website',
      'og:site_name': site.name,
      'og:title': expectedTitle,
      'og:description': meta('description'),
      'twitter:card': 'summary_large_image',
      'twitter:title': expectedTitle,
      'twitter:description': meta('description'),
    };
    for (const [key, value] of Object.entries(expected)) {
      if (meta(key) === null) problems.push(`${pagePath} has no ${key} tag`);
      else if (meta(key) !== value) problems.push(`${pagePath}: ${key} is "${meta(key)}" where "${value}" was expected`);
    }
    if (!meta('description')) problems.push(`${pagePath} has no description`);
    // The page for a missing address has no address of its own to give.
    const isLost = pagePath === '/404.html';
    if (isLost && meta('og:url') !== null) problems.push(`${pagePath} gives itself an address (og:url), though it is shown at addresses that do not exist`);
    if (!isLost && meta('og:url') !== site.url + pagePath) problems.push(`${pagePath}: og:url is "${meta('og:url')}" where "${site.url + pagePath}" was expected`);
    const image = meta('og:image');
    if (!image) problems.push(`${pagePath} has no og:image tag`);
    else {
      if (!image.startsWith(site.url + '/')) problems.push(`${pagePath}: og:image is "${image}", which is not a full address on ${site.url}`);
      if (meta('twitter:image') !== image) problems.push(`${pagePath}: twitter:image differs from og:image`);
      shareAddress = shareAddress || image;
      if (image !== shareAddress) problems.push(`${pagePath} names a different share image from the other pages`);
    }
    for (const key of ['og:image:width', 'og:image:height', 'og:image:alt', 'twitter:image:alt']) if (!meta(key)) problems.push(`${pagePath} has no ${key} tag`);
    if (meta('og:image:width') !== '1200' || meta('og:image:height') !== '630') problems.push(`${pagePath} says the share image is ${meta('og:image:width')} by ${meta('og:image:height')}, where 1200 by 630 was expected`);
  }

  // ---- The files themselves ----
  const ink = color('color-ink');
  const paper = color('color-paper');
  const drawing = fs.existsSync(path.join(siteDir, 'favicon.svg')) ? fs.readFileSync(path.join(siteDir, 'favicon.svg'), 'utf8') : '';
  if (!drawing.includes(ink) || !drawing.includes(paper) || !drawing.includes('prefers-color-scheme')) problems.push('favicon.svg does not switch between the ink and the paper color');
  const ico = fs.existsSync(path.join(siteDir, 'favicon.ico')) ? fs.readFileSync(path.join(siteDir, 'favicon.ico')) : Buffer.alloc(6);
  const icoSizes = Array.from({ length: ico.readUInt16LE(4) }, (_, index) => ico.readUInt8(6 + 16 * index));
  if (ico.readUInt16LE(2) !== 1 || icoSizes.join(',') !== '16,32') problems.push(`favicon.ico should hold a 16 and a 32 pixel picture; it holds ${icoSizes.join(', ') || 'none'}`);
  for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    const file = path.join(siteDir, name);
    if (!fs.existsSync(file)) { problems.push(`${name} was not made`); continue; }
    const { width, height } = await sharp(file).metadata();
    const { channels } = await sharp(file).stats();
    const opaque = channels.length < 4 || channels[3].min === 255;
    if (width !== size || height !== size) problems.push(`${name} is ${width} by ${height} pixels instead of ${size} by ${size}`);
    if (!opaque) problems.push(`${name} has transparent parts, which a phone would paint black`);
  }
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(siteDir, 'site.webmanifest'), 'utf8'));
    if (manifest.name !== site.name) problems.push(`site.webmanifest calls the site "${manifest.name}"`);
    for (const entry of manifest.icons || []) if (!fs.existsSync(fileBehind(siteDir, entry.src))) problems.push(`site.webmanifest names an icon at ${entry.src}, but there is no such file`);
    if ((manifest.icons || []).length !== 2) problems.push('site.webmanifest should name two icons');
  } catch {
    problems.push('site.webmanifest is missing or cannot be read');
  }
  let share = 'no share image';
  if (shareAddress) {
    const file = fileBehind(siteDir, shareAddress.slice(site.url.length));
    if (!fs.existsSync(file)) problems.push(`the share image named in the pages (${shareAddress}) is not in the built site`);
    else {
      const { width, height, format } = await sharp(file).metadata();
      const weight = fs.statSync(file).size / 1024;
      if (width !== 1200 || height !== 630) problems.push(`the share image is ${width} by ${height} pixels instead of 1200 by 630`);
      if (format !== 'png' && format !== 'jpeg') problems.push(`the share image is a ${format} file; sharing apps expect PNG or JPEG`);
      // Some apps skip a preview picture heavier than about 300 KB.
      if (weight > 300) problems.push(`the share image weighs ${weight.toFixed(0)} KB, more than the 300 KB some apps accept`);
      share = `share image ${width} by ${height} pixels, ${weight.toFixed(0)} KB`;
    }
  }
  return { problems, summary: `${pages.length} pages name the icon and carry their own preview tags; ${share}` };
}

export async function siteIconInBrowser(browser, address) {
  const problems = [];
  const context = await browser.newContext({ viewport: { width: 200, height: 120 } });
  const page = await context.newPage();
  const home = await (await page.request.get(address + '/')).text();
  const hrefs = [...home.split('</head>')[0].matchAll(/<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*href="([^"]+)"/g)].map((match) => match[1]);
  const types = { ico: 'image/x-icon', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json' };
  for (const href of hrefs) {
    const response = await page.request.get(address + href);
    const kind = href.split('?')[0].split('.').pop();
    if (response.status() !== 200) problems.push(`${href} was answered with status ${response.status()}`);
    if (!(response.headers()['content-type'] || '').startsWith(types[kind])) problems.push(`${href} was sent as "${response.headers()['content-type']}" instead of ${types[kind]}`);
  }
  if (hrefs.length !== 4) problems.push(`the home page names ${hrefs.length} icon files instead of 4`);
  await context.close();

  // The tab icon, drawn at tab size and larger, on a light and on a dark background.
  for (const [scheme, background, tone] of [['light', '#f1f3f4', 'dark'], ['dark', '#202124', 'light']]) {
    const tab = await browser.newContext({ viewport: { width: 200, height: 120 }, colorScheme: scheme, deviceScaleFactor: 1 });
    const sheet = await tab.newPage();
    await sheet.route(address + '/icon-sheet', (route) => route.fulfill({ contentType: 'text/html', body: `<body style="margin:0;background:${background}"><img id="small" src="/favicon.svg" width="16" height="16" style="position:absolute;left:20px;top:20px"><img id="large" src="/favicon.svg" width="64" height="64" style="position:absolute;left:80px;top:20px"></body>` }));
    await sheet.goto(address + '/icon-sheet', { waitUntil: 'load' });
    await sheet.waitForTimeout(200);
    const { data, info } = await sharp(await sheet.screenshot()).greyscale().raw().toBuffer({ resolveWithObject: true });
    const grey = (x, y) => data[y * info.width + x];
    // A spot on the compass (on its south point, a little below the middle of its box), and a corner of each box, which the round compass leaves clear.
    for (const [name, left, size] of [['16 pixels', 20, 16], ['64 pixels', 80, 64]]) {
      const middle = grey(left + Math.floor(size / 2), 20 + Math.floor(size * 0.62));
      const corner = grey(left + 1, 20 + 1);
      const isIcon = tone === 'dark' ? middle < 90 : middle > 200;
      const cornerIsBackground = tone === 'dark' ? corner > 200 : corner < 90;
      if (!isIcon) problems.push(`on a ${scheme} tab the icon at ${name} is not the ${tone === 'dark' ? 'ink' : 'paper'} compass (its south point is grey level ${middle} of 255)`);
      if (!cornerIsBackground) problems.push(`on a ${scheme} tab the icon at ${name} is not a compass on a clear background (its corner is grey level ${corner} of 255)`);
    }
    await tab.close();
  }
  return [...new Set(problems)];
}
