// How the hero's compass moves, as plain numbers: how it turns on its own, how a drag turns it
// in any direction and lets it coast, how its needle swings back to north, and how a tone
// becomes ink or paper. No drawing happens here (compass.js draws); the settings are in motion.js.
//
// A "turn" is the compass's whole orientation, as nine numbers (a 3 by 3 rotation, row by row):
// it takes a direction on the compass (its dial faces +z, its bow is up, +y) to a direction in
// the window (right +x, up +y, toward the viewer +z). A "spin" is how fast it turns, as an axis
// in the window whose length is the speed in radians a second.
import { compass as settings } from './motion.js';

const radians = (degrees) => (degrees * Math.PI) / 180;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const size = (v) => Math.hypot(v[0], v[1], v[2]);

// A turn applied to a direction.
export const applyTurn = (m, [x, y, z]) => [
  m[0] * x + m[1] * y + m[2] * z,
  m[3] * x + m[4] * y + m[5] * z,
  m[6] * x + m[7] * y + m[8] * z,
];

const multiply = (a, b) => {
  const out = Array.from({ length: 9 }, () => 0);
  for (let row = 0; row < 3; row++)
    for (let column = 0; column < 3; column++)
      for (let k = 0; k < 3; k++) out[row * 3 + column] += a[row * 3 + k] * b[k * 3 + column];
  return out;
};

// The turn by "angle" about "axis" (any length), by Rodrigues' formula.
function about(axis, angle) {
  const length = size(axis);
  if (!length || !angle) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const [x, y, z] = axis.map((value) => value / length);
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const t = 1 - c;
  return [
    t * x * x + c,
    t * x * y - s * z,
    t * x * z + s * y,
    t * x * y + s * z,
    t * y * y + c,
    t * y * z - s * x,
    t * x * z - s * y,
    t * y * z + s * x,
    t * z * z + c,
  ];
}

// Small rounding errors pile up over thousands of frames and would slowly stretch the compass;
// this squares the turn up again (Gram-Schmidt on its columns).
function straighten(m) {
  const column = (index) => [m[index], m[index + 3], m[index + 6]];
  const unit = (v) => v.map((value) => value / size(v));
  const x = unit(column(0));
  const yRaw = column(1);
  const along = x[0] * yRaw[0] + x[1] * yRaw[1] + x[2] * yRaw[2];
  const y = unit(yRaw.map((value, index) => value - along * x[index]));
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
}

// The turn after turning further by "angle" about "axis", an axis in the window.
export const turnBy = (turn, axis, angle) => straighten(multiply(about(axis, angle), turn));

// The pose the still picture shows: the top turned away from the viewer by "tilt", then the
// right side turned away by "lean".
export const restTurn = () =>
  multiply(
    about([1, 0, 0], -radians(settings.rest.tilt)),
    about([0, 1, 0], -radians(settings.rest.lean)),
  );

// How it turns on its own, "seconds" after it took the still picture's place: still for a
// moment, then easing into a slow turn about an axis close to upright that wanders a little, so
// it tumbles and shows its back and its edges in turn.
export function idleSpin(seconds) {
  const { speed, delay, rampUp, wander } = settings.idle;
  const share = clamp((seconds - delay) / rampUp, 0, 1);
  const ease = share * share * (3 - 2 * share);
  if (!ease) return [0, 0, 0];
  const axis = [wander * Math.sin(seconds * 0.23), 1, wander * 0.6 * Math.sin(seconds * 0.17 + 1)];
  const scale = (radians(speed) * ease) / size(axis);
  return axis.map((value) => value * scale);
}

// The turn for a drag of "dx" and "dy" CSS pixels (right and down positive): it turns about the
// axis across the drag, so the part under the pointer goes with it, as far as the drag is long,
// with no limit.
export function dragSpin(dx, dy) {
  const distance = Math.hypot(dx, dy);
  return {
    axis: distance ? [dy / distance, dx / distance, 0] : [0, 1, 0],
    angle: radians(distance * settings.drag.perPixel),
  };
}

// One frame's step of the spin after a drag lets go: it eases back to the pace it turns at on
// its own ("idle"), slowing as a spinning thing does. A throw is never faster than its limit.
export function coast(spin, idle, seconds) {
  const fastest = radians(settings.drag.fastest);
  const speed = size(spin);
  const limited = speed > fastest ? spin.map((value) => (value * fastest) / speed) : spin;
  const keep = Math.exp(-clamp(seconds, 0, 30) / settings.drag.coast);
  return limited.map((value, index) => idle[index] + (value - idle[index]) * keep);
}

// Where the needle rests on the dial for a turn: pointing north, up the window, as near as the
// dial lets it. The angle is measured on the dial from the bow, the needle's direction being
// (-sin, cos) there.
export function needleRest(turn) {
  // North, in the compass's own directions (the turn's inverse is its transpose).
  const [x, y] = [turn[3], turn[4]];
  return Math.atan2(-x, y);
}

// One step of the needle. "angle" is where it points on the dial, "speed" how fast it turns.
// North pulls it with a spring, strongest when the dial faces the viewer and weak when it is
// edge on (as a magnet would); damping calms it; and when the case turns on its own face
// ("spin"), the pivot drags the needle most of the way along. Long pauses between frames are
// cut into small steps.
export function stepNeedle(needle, turn, spin, seconds) {
  const [x, y] = [turn[3], turn[4]];
  // How fast the case turns about its own face: the spin seen from the case.
  const ownSpin = turn[2] * spin[0] + turn[5] * spin[1] + turn[8] * spin[2];
  let { angle, speed } = needle;
  const time = clamp(seconds, 0, 4);
  const steps = Math.min(960, Math.max(1, Math.ceil(time * 240)));
  const { spring, damping, drag } = settings.needle;
  for (let step = 0; step < steps; step++) {
    const pull = spring * (-x * Math.cos(angle) - y * Math.sin(angle)) - damping * speed;
    speed += (pull * time) / steps;
    angle += ((speed - (1 - drag) * ownSpin) * time) / steps;
  }
  // Kept within one turn, so it never grows without end.
  angle = Math.atan2(Math.sin(angle), Math.cos(angle));
  return { angle, speed };
}

// The four by four pattern of thresholds the pixel pictures call "fine" (scripts/images.mjs): a
// pixel becomes paper when its tone is above its threshold. Sixteen steps between ink and paper,
// so the compass's curved metal shades smoothly. The shader in compass.js repeats it.
const pattern = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
export const threshold = (x, y) => (pattern[y % 4][x % 4] + 0.5) / 16;

// A tone (0 dark to 1 light) at a pixel, as ink or paper: darker than "black" is solid ink,
// lighter than "white" solid paper, and an even mix of the two between.
export function toneAt(value, x, y, black, white) {
  const stretched = clamp((value - black) / (white - black), 0, 1);
  return stretched <= threshold(x, y) ? 'ink' : 'paper';
}
