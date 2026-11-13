// When the hero's compass draws (compass.js), as plain numbers: whether this computer's graphics
// can carry it (graphics drawn by the processor, with no graphics card, cannot: there it would
// keep the page busy, so the still picture stays), how often a frame is due (no more than
// "fps" in motion.js, so a fast screen does not draw it twice as often for the same movement),
// and when a frame would show exactly what is already on the screen.
import { compass as settings } from './motion.js';

// The names graphics drawn in software go by: Chrome's own (SwiftShader), Linux's (llvmpipe,
// softpipe) and Windows's (Basic Render Driver). A real card's name, or none, is let through.
const software = /swiftshader|llvmpipe|softpipe|basic render driver/i;
export const inSoftware = (renderer) => software.test(String(renderer ?? ''));

// Whether a frame at "now" is due, the last drawing having been due at "last" (both in
// milliseconds). Returns the time to count the next frame from, or null to skip this one.
// A frame up to a millisecond early counts (screens are never exactly on time). What is left
// over is carried, so a 90 or 144 Hz screen still averages "fps" drawings a second; after a long
// pause (a hidden tab, a stalled computer) it starts afresh.
export function frameDue(last, now, fps = settings.fps) {
  const interval = 1000 / fps;
  const since = now - last;
  if (since < interval - 1) return null;
  if (since >= interval * 4) return now;
  return since >= interval ? now - (since % interval) : now;
}

// Whether two views ({ turn, needle }) are exactly the same, so the second needs no drawing.
export const sameView = (drawn, next) =>
  Boolean(drawn) &&
  drawn.needle === next.needle &&
  drawn.turn.every((value, index) => value === next.turn[index]);
