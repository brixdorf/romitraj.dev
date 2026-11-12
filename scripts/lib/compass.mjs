// Tests used by the check script, about the hero's 3D compass (src/assets/js/compass.js).
// "compassInBrowser" opens the home page in a browser and confirms that
//   - the compass takes the still picture's place: one canvas, exactly over the still picture,
//     enlarged without smoothing, the frame not moving, and the still picture kept in the page
//     (unseen) with its description;
//   - at rest it shows what the still picture shows, block for block (almost: see "allowed");
//   - it moves when the pointer moves and when the page scrolls, and comes to rest again, after
//     which nothing on it changes;
//   - with "reduce motion", without WebGL and without scripts the still picture stays, alone;
//   - after a page change away and back there is still exactly one compass, and none elsewhere;
//   - no script error is raised along the way.
import sharp from 'sharp';

// The share of the frame's screen pixels that may differ between the compass at rest and the
// still picture. The still is drawn by the same code, but each browser's graphics work out the
// shading with tiny differences, which can tip a block on the very edge of two tones.
const allowed = 0.01;

const frame = '.hero__image';

// A photograph of the hero's frame, as raw pixels. Taken of the window, clipped to the frame,
// without scrolling it into view: scrolling turns the compass. (The window is tall enough to
// hold the frame.)
const photograph = async (page) => {
  const clip = await page.evaluate((selector) => {
    const { left, top, width, height } = document.querySelector(selector).getBoundingClientRect();
    return { x: left, y: top, width, height };
  }, frame);
  const { data, info } = await sharp(await page.screenshot({ clip }))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};

// The tone at the middle of every block of the hero's picture, as a photograph one pixel to a
// block.
async function blocksOf(page, { width, height }) {
  const shot = await photograph(page);
  const inner = await page.evaluate((selector) => {
    const box = document.querySelector(selector);
    const outer = box.getBoundingClientRect();
    const picture = box.querySelector('.picture--pixels').getBoundingClientRect();
    return {
      left: picture.left - outer.left,
      top: picture.top - outer.top,
      width: picture.width,
      height: picture.height,
    };
  }, frame);
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const sx = Math.floor(inner.left + ((x + 0.5) * inner.width) / width);
      const sy = Math.floor(inner.top + ((y + 0.5) * inner.height) / height);
      shot.data.copy(
        data,
        (y * width + x) * 4,
        (sy * shot.width + sx) * 4,
        (sy * shot.width + sx) * 4 + 4,
      );
    }
  return { data, width, height };
}

// The share of pixels that differ between two photographs of the same size.
function difference(a, b) {
  if (a.width !== b.width || a.height !== b.height) return 1;
  let differ = 0;
  for (let index = 0; index < a.data.length; index += 4) {
    if (
      Math.abs(a.data[index] - b.data[index]) > 40 ||
      Math.abs(a.data[index + 1] - b.data[index + 1]) > 40 ||
      Math.abs(a.data[index + 2] - b.data[index + 2]) > 40
    )
      differ++;
  }
  return differ / (a.width * a.height);
}

// Waits for the compass to take over, up to a few seconds. Returns whether it did.
const goesLive = (page, timeout = 5000) =>
  page
    .waitForFunction(
      (selector) => document.querySelector(selector)?.classList.contains('hero__image--live'),
      frame,
      { timeout },
    )
    .then(() => true)
    .catch(() => false);

// What the frame holds: canvases, whether the still picture shows, and where things are.
const contents = (page) =>
  page.evaluate((selector) => {
    const box = document.querySelector(selector);
    const still = box.querySelector('.picture--pixels');
    const canvases = [...document.querySelectorAll('canvas')];
    const canvas = box.querySelector('canvas');
    const rect = (element) => {
      const { left, top, width, height } = element.getBoundingClientRect();
      return { left, top, width, height };
    };
    return {
      canvases: canvases.length,
      inFrame: box.querySelectorAll('canvas').length,
      stillShown: getComputedStyle(still).opacity !== '0',
      stillAlt: still.getAttribute('alt'),
      frame: rect(box),
      still: rect(still),
      canvas: canvas && {
        ...rect(canvas),
        across: canvas.width,
        down: canvas.height,
        rendering: getComputedStyle(canvas).imageRendering,
        hidden: canvas.getAttribute('aria-hidden'),
      },
      blocks: {
        width: Number(still.getAttribute('width')),
        height: Number(still.getAttribute('height')),
      },
    };
  }, frame);

export async function compassInBrowser(browser, address) {
  const problems = [];
  const errorsOf = (page, where) =>
    page.on('pageerror', (error) => problems.push(`${where}: script error: ${error.message}`));

  // ---- It takes the still picture's place, and at rest shows the same ----
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await context.newPage();
    errorsOf(page, 'home page');
    await page.goto(address + '/', { waitUntil: 'load' });
    // The still picture first, as every visitor gets it.
    await page.waitForTimeout(150);
    const before = await contents(page);
    if (!(await goesLive(page))) {
      problems.push('the compass did not take the still picture’s place within 5 seconds');
      await context.close();
      return problems;
    }
    await page.waitForTimeout(300);
    const live = await contents(page);
    if (live.inFrame !== 1 || live.canvases !== 1)
      problems.push(
        `the hero holds ${live.inFrame} canvases (${live.canvases} on the page), not one`,
      );
    if (live.stillShown) problems.push('the still picture still shows under the compass');
    if (!live.stillAlt)
      problems.push('the still picture lost its description once the compass came');
    if (live.canvas?.hidden !== 'true')
      problems.push(
        'the compass canvas is not hidden from screen readers (the still picture is the description)',
      );
    if (live.canvas?.across !== live.blocks.width || live.canvas?.down !== live.blocks.height)
      problems.push(
        `the compass is ${live.canvas?.across} by ${live.canvas?.down} pixels, the still picture ${live.blocks.width} by ${live.blocks.height} blocks`,
      );
    if (live.canvas?.rendering !== 'pixelated')
      problems.push(
        `the compass is enlarged with smoothing (image-rendering is ${live.canvas?.rendering})`,
      );
    for (const side of ['left', 'top', 'width', 'height']) {
      if (Math.abs(live.canvas[side] - live.still[side]) > 0.5)
        problems.push(
          `the compass is not exactly over the still picture (${side} ${live.canvas[side]} against ${live.still[side]})`,
        );
      if (Math.abs(live.frame[side] - before.frame[side]) > 0.5)
        problems.push(
          `the hero's frame moved when the compass came (${side} ${before.frame[side]} to ${live.frame[side]})`,
        );
    }

    // Compared block by block, at the middle of each block: the browser enlarges a canvas and a
    // picture with the same hard edges, but may round a block's edge to a different screen pixel.
    const atRest = await blocksOf(page, live.blocks);
    await page.evaluate((selector) => {
      document.querySelector(selector).classList.remove('hero__image--live');
    }, frame);
    const still = await blocksOf(page, live.blocks);
    await page.evaluate((selector) => {
      document.querySelector(selector).classList.add('hero__image--live');
    }, frame);
    const restDiffers = difference(atRest, still);
    if (restDiffers > allowed)
      problems.push(
        `at rest the compass differs from the still picture in ${(restDiffers * 100).toFixed(1)}% of its blocks (at most ${allowed * 100}% may)`,
      );

    // ---- It follows the pointer and the scroll, then rests ----
    await page.mouse.move(40, 40);
    await page.mouse.move(1400, 860, { steps: 8 });
    await page.waitForTimeout(250);
    const leaning = await blocksOf(page, live.blocks);
    if (difference(leaning, atRest) < 0.02)
      problems.push('the compass did not move with the pointer');
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const swinging = await photograph(page);
    await page.waitForTimeout(250);
    if (difference(swinging, await photograph(page)) < 0.002)
      problems.push('the needle did not swing after the page scrolled and came back');
    await page.waitForTimeout(6000);
    const settled = await photograph(page);
    await page.waitForTimeout(400);
    if (difference(settled, await photograph(page)) > 0)
      problems.push(
        'the compass was still moving six seconds after the pointer and the page stopped',
      );

    // ---- A page change away and back ----
    await page.locator('.hero__nav a[href="/about/"]').click();
    await page
      .waitForFunction(() => location.pathname === '/about/', null, { timeout: 8000 })
      .catch(() => {});
    await page.waitForTimeout(2500);
    const away = await page.evaluate(() => document.querySelectorAll('canvas').length);
    if (away) problems.push(`the About page has ${away} canvases after leaving the home page`);
    await page.goBack();
    await page
      .waitForFunction(() => location.pathname === '/', null, { timeout: 8000 })
      .catch(() => {});
    if (!(await goesLive(page)))
      problems.push('back on the home page after a page change, the compass did not start again');
    await page.waitForTimeout(300);
    const back = await contents(page);
    if (back.canvases !== 1)
      problems.push(
        `back on the home page after a page change, there are ${back.canvases} canvases, not one`,
      );
    await context.close();
  }

  // ---- Where it must not run, the still picture stays ----
  const stays = async (where, options, prepare = async () => {}) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...options,
    });
    await prepare(context);
    const page = await context.newPage();
    if (options.javaScriptEnabled !== false) errorsOf(page, where);
    await page.goto(address + '/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const state = await contents(page);
    if (state.canvases) problems.push(`${where}: the page has ${state.canvases} canvases`);
    if (!state.stillShown) problems.push(`${where}: the still picture does not show`);
    await context.close();
  };
  await stays('with less motion asked for', { reducedMotion: 'reduce' });
  await stays('without scripts', { javaScriptEnabled: false });
  await stays('without WebGL', {}, (context) =>
    context.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
        return /webgl/.test(kind) ? null : getContext.call(this, kind, ...rest);
      };
    }),
  );
  return problems;
}
