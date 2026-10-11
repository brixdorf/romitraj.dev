// A test used by the check script: are the drawn lines (the ".dash" that stands for a long dash
// between the ticker's pieces) painted equally thick in every browser?
// A line whose thickness is not a whole number of pixels can come out one pixel thick in one
// browser and two in another. "dashThickness" photographs one of the ticker's lines and counts
// the rows of screen pixels that hold ink; "dashesDiffer" compares the counts between browsers.
import sharp from 'sharp';

// Window width and screen density (screen pixels per CSS pixel: 1 on an ordinary screen, 2 on a sharp one).
const sizes = [{ width: 1440, density: 1 }, { width: 768, density: 1 }, { width: 1440, density: 2 }];

export async function dashThickness(browser, address) {
  const found = {};
  for (const { width, density } of sizes) {
    const key = `${width}px wide${density === 1 ? '' : `, ${density} screen pixels per pixel`}`;
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: density });
    await context.addInitScript(() => { window.steadyMotion = true; });
    const page = await context.newPage();
    await page.goto(address + '/', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    // Hold the ticker still, then find one of its lines that is wholly in view.
    await page.evaluate(() => { for (const animation of document.getAnimations()) animation.pause(); });
    const line = await page.evaluate(() => {
      const dash = [...document.querySelectorAll('.hero .ticker .dash')].find((candidate) => { const rect = candidate.getBoundingClientRect(); return rect.width > 6 && rect.left > 0 && rect.right < window.innerWidth; });
      if (!dash) return null;
      const rect = dash.getBoundingClientRect();
      return { x: rect.left, y: rect.top + window.scrollY, width: rect.width, height: rect.height };
    });
    if (line) {
      const clip = { x: Math.floor(line.x) + 2, y: Math.floor(line.y) - 4, width: Math.max(2, Math.floor(line.width) - 4), height: Math.ceil(line.height) + 8 };
      const { data, info } = await sharp(await page.screenshot({ clip, fullPage: true })).greyscale().raw().toBuffer({ resolveWithObject: true });
      // Count the inked rows down the middle of the line.
      const column = Math.floor(info.width / 2);
      let rows = 0;
      for (let y = 0; y < info.height; y++) if (data[y * info.width + column] < 200) rows++;
      found[key] = rows;
    } else {
      found[key] = null;
    }
    await context.close();
  }
  return found;
}

// Compares what "dashThickness" found in each browser. "found" is { browser name: counts }.
export function dashesDiffer(found) {
  const problems = [];
  const [first, ...others] = Object.entries(found);
  if (!first) return problems;
  for (const [key, rows] of Object.entries(first[1])) {
    if (!rows) problems.push(`${key}: no drawn line could be measured in the ticker in ${first[0]}`);
    for (const [name, theirs] of others) {
      if (theirs[key] !== rows) problems.push(`${key}: the ticker's drawn lines are ${rows} screen pixel${rows === 1 ? '' : 's'} thick in ${first[0]} and ${theirs[key]} in ${name}`);
    }
  }
  return problems;
}
