// Tests for the picture pipeline (scripts/images.mjs): speck removal (the "despeckle" setting),
// which pictures need their source on record, which part of a photo is its plain backdrop, to be
// cut away (the "cutout" setting), how much room goes around a photo shown smaller than its frame
// (a "zoom" below 1), how a picture fades into the paper ("fade") and where the copies of a
// repeated picture go ("repeat").
import { describe, expect, it } from 'vite-plus/test';
import {
  fadeKeeps,
  needsCredit,
  paddingFor,
  plainBackdrop,
  partRegion,
  removeSpecks,
  repeatLayout,
} from './images.mjs';

// A small picture from rows of text: "#" is ink, "." is paper.
const picture = (rows) => ({
  width: rows[0].length,
  height: rows.length,
  dark: Uint8Array.from(rows.join('').split(''), (cell) => (cell === '#' ? 1 : 0)),
});
const asRows = (dark, width) =>
  Array.from({ length: dark.length / width }, (_, y) =>
    Array.from(dark.slice(y * width, (y + 1) * width), (cell) => (cell ? '#' : '.')).join(''),
  );

describe('removeSpecks', () => {
  it('removes a lone block of ink with only paper around it', () => {
    const { dark, width, height } = picture([
      '.........',
      '.........',
      '.........',
      '....#....',
      '.........',
      '.........',
      '.........',
    ]);
    expect(asRows(removeSpecks(dark, width, height), width)).toEqual([
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
    ]);
  });

  it('removes a faint dotted line, the trace a cut-out photo leaves around its subject', () => {
    const { dark, width, height } = picture([
      '....#....',
      '.........',
      '.........',
      '.........',
      '....#....',
      '.........',
      '.........',
      '.........',
      '....#....',
    ]);
    expect(removeSpecks(dark, width, height).every((cell) => cell === 0)).toBe(true);
  });

  it('keeps solid shapes, lines and the edges of a shape', () => {
    const rows = ['.........', '.####....', '.####....', '.####....', '......##.', '.........'];
    const { dark, width, height } = picture(rows);
    expect(asRows(removeSpecks(dark, width, height), width)).toEqual(rows);
  });

  it('keeps an even checkerboard and a light dither, which are tones, not specks', () => {
    const checker = picture(['#.#.#.#', '.#.#.#.', '#.#.#.#', '.#.#.#.', '#.#.#.#']);
    expect(removeSpecks(checker.dark, checker.width, checker.height)).toEqual(checker.dark);
    const light = picture(['#...#...#', '..#...#..', '#...#...#', '..#...#..', '#...#...#']);
    expect(removeSpecks(light.dark, light.width, light.height)).toEqual(light.dark);
  });

  it('changes nothing in place: it gives a new picture', () => {
    const { dark, width, height } = picture(['...', '.#.', '...']);
    removeSpecks(dark, width, height);
    expect([...dark]).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0]);
  });
});

describe('needsCredit', () => {
  it('asks for its source on record for every photo or print', () => {
    expect(needsCredit({ source: 'clock.jpg' })).toBe(true);
    expect(needsCredit({ source: 'clock.jpg', kind: 'photo' })).toBe(true);
  });

  it('asks for none for the site’s own drawings', () => {
    expect(needsCredit({ source: 'compass.svg' })).toBe(false);
  });

  it('asks for none for a photo marked "credit": false', () => {
    expect(needsCredit({ source: 'portrait.jpg', kind: 'photo', credit: false })).toBe(false);
  });
});

describe('plainBackdrop', () => {
  // Greys from rows of digits: 0 is black, 9 is white.
  const greys = (rows) => ({
    width: rows[0].length,
    height: rows.length,
    values: Uint8Array.from(rows.join('').split(''), (digit) => Math.round((digit / 9) * 255)),
  });
  const marks = (found, width) =>
    Array.from({ length: found.length / width }, (_, y) =>
      Array.from(found.slice(y * width, (y + 1) * width), (cell) => (cell ? 'b' : '.')).join(''),
    );

  it('finds an even backdrop around a dark subject, and not the subject', () => {
    const { values, width, height } = greys([
      '8888888',
      '8811188',
      '8810188',
      '8811188',
      '8888888',
    ]);
    expect(marks(plainBackdrop(values, width, height, 0.05), width)).toEqual([
      'bbbbbbb',
      'bb...bb',
      'bb...bb',
      'bb...bb',
      'bbbbbbb',
    ]);
  });

  it('follows a backdrop that darkens slowly from one side to the other', () => {
    const { values, width, height } = greys(['9876543', '9816543', '9876543']);
    expect(marks(plainBackdrop(values, width, height, 0.12), width)).toEqual([
      'bbbbbbb',
      'bb.bbbb',
      'bbbbbbb',
    ]);
  });

  it('leaves a light spot inside the subject alone: it cannot be reached from the edge', () => {
    const { values, width, height } = greys(['88888', '81118', '81818', '81118', '88888']);
    expect(marks(plainBackdrop(values, width, height, 0.05), width)[2]).toBe('b...b');
  });

  it('does not start inside a subject that touches the edge of the picture', () => {
    const { values, width, height } = greys([
      '8888888',
      '8881111',
      '8881111',
      '8888888',
      '8888888',
    ]);
    expect(marks(plainBackdrop(values, width, height, 0.05), width)).toEqual([
      'bbbbbbb',
      'bbb....',
      'bbb....',
      'bbbbbbb',
      'bbbbbbb',
    ]);
  });

  it('starts only from the ground’s grey when it is given, even if the subject fills most edges', () => {
    const { values, width, height } = greys(['1111111', '1188811', '1188811', '1111111']);
    expect(marks(plainBackdrop(values, width, height, 0.05, 8 / 9), width)).toEqual([
      '.......',
      '.......',
      '.......',
      '.......',
    ]);
    const open = greys(['1118111', '1188811', '1111111']);
    expect(
      marks(plainBackdrop(open.values, open.width, open.height, 0.05, 8 / 9), open.width),
    ).toEqual(['...b...', '..bbb..', '.......']);
  });

  it('stops at a sharp edge even when the subject is light', () => {
    const { values, width, height } = greys(['3333', '3993', '3333']);
    expect(marks(plainBackdrop(values, width, height, 0.1), width)).toEqual([
      'bbbb',
      'b..b',
      'bbbb',
    ]);
  });
});

describe('paddingFor', () => {
  it('adds nothing at a zoom of 1 or more', () => {
    expect(paddingFor(1600, 1000, 1)).toBeNull();
    expect(paddingFor(1600, 1000, 1.4)).toBeNull();
    expect(paddingFor(1600, 1000)).toBeNull();
  });

  it('adds room on every side, so a zoom of one half shows the photo at half its size', () => {
    expect(paddingFor(1600, 1000, 0.5)).toEqual({ left: 800, right: 800, top: 500, bottom: 500 });
  });

  it('splits an odd amount of room with the extra pixel on the right and at the bottom', () => {
    expect(paddingFor(101, 51, 0.5)).toEqual({ left: 50, right: 51, top: 25, bottom: 26 });
  });

  it('moves the photo so that the point at x and y sits in the middle of the frame', () => {
    // 1000 wide at a zoom of one half: 1000 of room. With x at 0.6, the photo's point 600 must
    // be at the middle of the 2000 wide result, 1000, so 400 of the room goes on the left.
    expect(paddingFor(1000, 800, 0.5, { x: 0.6, y: 0.25 })).toEqual({
      left: 400,
      right: 600,
      top: 600,
      bottom: 200,
    });
  });

  it('never moves the photo past the edge of the frame', () => {
    expect(paddingFor(1000, 800, 0.5, { x: 1, y: 0 })).toEqual({
      left: 0,
      right: 1000,
      top: 800,
      bottom: 0,
    });
    expect(paddingFor(1000, 800, 0.5, { x: -1, y: 2 })).toEqual({
      left: 1000,
      right: 0,
      top: 0,
      bottom: 800,
    });
  });

  it('keeps the photo in the middle when x and y are 0.5 or left out', () => {
    expect(paddingFor(101, 51, 0.5, { x: 0.5, y: 0.5 })).toEqual(paddingFor(101, 51, 0.5));
    expect(paddingFor(101, 51, 0.5, {})).toEqual(paddingFor(101, 51, 0.5));
  });
});

describe('fadeKeeps', () => {
  it('keeps the middle whole and nothing at the very edge', () => {
    expect(fadeKeeps(50, 40, 100, 80, 0.4)).toBe(1);
    expect(fadeKeeps(0, 40, 100, 80, 0.4)).toBe(0);
    expect(fadeKeeps(50, 0, 100, 80, 0.4)).toBe(0);
    expect(fadeKeeps(99.5, 79.5, 100, 80, 0.4)).toBe(0);
  });

  it('fades smoothly toward the edge, over the share of the way given', () => {
    const along = [50, 40, 32, 26, 20, 14, 8, 2].map((x) => fadeKeeps(x, 40, 100, 80, 0.6));
    for (let index = 1; index < along.length; index++)
      expect(along[index]).toBeLessThanOrEqual(along[index - 1]);
    expect(along[3]).toBeGreaterThan(0);
    expect(along[3]).toBeLessThan(1);
    // A narrower fade keeps more of the same place.
    expect(fadeKeeps(26, 40, 100, 80, 0.3)).toBeGreaterThan(fadeKeeps(26, 40, 100, 80, 0.6));
  });

  it('can fade from a corner: kept whole there, gone along the far edges', () => {
    const corner = { x: 1, y: 1 };
    expect(fadeKeeps(99.5, 79.5, 100, 80, 0.5, corner)).toBe(1);
    expect(fadeKeeps(0, 40, 100, 80, 0.5, corner)).toBe(0);
    expect(fadeKeeps(80, 0, 100, 80, 0.5, corner)).toBe(0);
    expect(fadeKeeps(60, 50, 100, 80, 0.5, corner)).toBeGreaterThan(0);
  });

  it('can be a smaller oval, leaving paper between it and the edges', () => {
    expect(fadeKeeps(10, 40, 100, 80, 0.1, { x: 0.5, y: 0.5 }, 0.7)).toBe(0);
    expect(fadeKeeps(50, 5, 100, 80, 0.1, { x: 0.5, y: 0.5 }, 0.7)).toBe(0);
    expect(fadeKeeps(50, 40, 100, 80, 0.1, { x: 0.5, y: 0.5 }, 0.7)).toBe(1);
    expect(fadeKeeps(25, 40, 100, 80, 0.1, { x: 0.5, y: 0.5 }, 0.7)).toBeGreaterThan(0);
  });

  it('keeps everything without a fade', () => {
    expect(fadeKeeps(0, 0, 100, 80, 0)).toBe(1);
  });
});

describe('repeatLayout', () => {
  it('sets copies side by side with a gap between them and half a gap at each end', () => {
    expect(repeatLayout(100, 60, 3, 0.2)).toEqual({
      width: 360,
      height: 60,
      lefts: [10, 130, 250],
    });
  });

  it('is the picture itself for one copy and no gap', () => {
    expect(repeatLayout(100, 60, 1, 0)).toEqual({ width: 100, height: 60, lefts: [0] });
  });
});

describe('partRegion', () => {
  it('turns a part given in shares of the picture into whole pixels', () => {
    expect(partRegion(1000, 500, { x: 0.1, y: 0.2, width: 0.5, height: 0.4 })).toEqual({
      left: 100,
      top: 100,
      width: 500,
      height: 200,
    });
  });

  it('is the whole picture without a part, and never reaches past its edges', () => {
    expect(partRegion(300, 200)).toEqual({ left: 0, top: 0, width: 300, height: 200 });
    expect(partRegion(300, 200, { x: 0.8, y: 0, width: 0.5, height: 1 })).toEqual({
      left: 240,
      top: 0,
      width: 60,
      height: 200,
    });
  });
});
