// How the hero's compass moves, as plain numbers: where it leans for a pointer position and a
// scroll position, how it eases toward that, how its needle swings back to north, and how a tone
// becomes ink or paper. No drawing happens here (compass.js draws); the settings are in motion.js.
import { compass as settings } from './motion.js';

const radians = (degrees) => (degrees * Math.PI) / 180;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// The pose at rest, as the still picture shows it: "tilt" turns the top away from the viewer,
// "lean" turns the right side away, "spin" turns the case on its own face.
export const rest = Object.freeze({
  tilt: radians(settings.rest.tilt),
  lean: radians(settings.rest.lean),
  spin: 0,
});

// The pose for a pointer position ("x" and "y" from -1 to 1 across the window, 0 in the middle,
// right and up positive)
// and how far the hero has scrolled away (0 at the top, 1 once it has gone). The compass leans
// toward the pointer and the case turns as the page scrolls.
export function poseFor(pointer, scrolled) {
  const x = clamp(pointer.x, -1, 1);
  const y = clamp(pointer.y, -1, 1);
  return {
    tilt: rest.tilt + radians(settings.reach.tilt) * y,
    lean: rest.lean + radians(settings.reach.lean) * x,
    spin: radians(settings.reach.spin) * clamp(scrolled, 0, 1) + radians(settings.reach.turn) * x,
  };
}

// One frame's step from the current pose toward the target: a share of the way that depends on
// how long the frame was, so the compass moves at the same pace whatever the screen's refresh rate.
export function settle(current, target, seconds) {
  const share = 1 - Math.exp(-seconds / settings.follow);
  const step = (key) => current[key] + (target[key] - current[key]) * share;
  return { tilt: step('tilt'), lean: step('lean'), spin: step('spin') };
}

// One step of the needle. "angle" is where it points, measured from north (up, toward the ring
// when the case is not turned); "speed" is how fast it turns; "spin" is the case's turn it last
// felt. A spring pulls it back to north and the pivot's friction drags it along when the case
// turns, so it wobbles a few times and settles. Long pauses between frames (a tab in the
// background) are cut into small steps.
export function stepNeedle(needle, spin, seconds) {
  // The case turned: the needle is dragged along a little by its pivot.
  let angle = needle.angle + (spin - needle.spin) * settings.needle.drag;
  let speed = needle.speed;
  const time = clamp(seconds, 0, 4);
  const steps = Math.min(960, Math.max(1, Math.ceil(time * 240)));
  for (let step = 0; step < steps; step++) {
    const pull = -settings.needle.spring * angle - settings.needle.damping * speed;
    speed += (pull * time) / steps;
    angle += (speed * time) / steps;
  }
  if (Math.abs(angle) < 1e-5 && Math.abs(speed) < 1e-5) [angle, speed] = [0, 0];
  return { angle, speed, spin };
}

// Whether nothing is moving any more, so drawing can stop until the pointer or the page moves.
export function isStill(needle, pose, target) {
  const near = (a, b) => Math.abs(a - b) < 1e-3;
  return (
    Math.abs(needle.angle) < 1e-3 &&
    Math.abs(needle.speed) < 1e-3 &&
    ['tilt', 'lean', 'spin'].every((key) => near(pose[key], target[key]))
  );
}

// The two by two pattern of thresholds the pixel pictures use (scripts/images.mjs, "checker"):
// a pixel becomes paper when its tone is above its threshold. The shader in compass.js repeats it.
const pattern = [
  [0, 2],
  [3, 1],
];
export const threshold = (x, y) => (pattern[y % 2][x % 2] + 0.5) / 4;

// A tone (0 dark to 1 light) at a pixel, as ink or paper: darker than "black" is solid ink,
// lighter than "white" solid paper, and a checkerboard between.
export function toneAt(value, x, y, black, white) {
  const stretched = clamp((value - black) / (white - black), 0, 1);
  return stretched <= threshold(x, y) ? 'ink' : 'paper';
}
