// Tests for the picture pipeline (scripts/images.mjs): speck removal (the "despeckle" setting),
// which pictures need a photographer on record, which blocks are backdrop behind a subject, and
// which part of a photo is its plain backdrop, to be cut away (the "cutout" setting).
import { describe, expect, it } from 'vite-plus/test';
import { backdropOf, needsCredit, plainBackdrop, removeSpecks } from './images.mjs';

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
  it('asks for a photographer on record for every photo', () => {
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

describe('backdropOf', () => {
  // "#" is dark, "." light; in the see-through rows, "o" is see-through and anything else solid.
  const cells = (rows, mark) =>
    Uint8Array.from(rows.join('').split(''), (cell) => (cell === mark ? 1 : 0));

  it('without see-through parts: the light blocks reachable from the edge, not those enclosed', () => {
    const rows = ['.....', '.###.', '.#.#.', '.###.', '.....'];
    expect([...backdropOf(cells(rows, '.'), 5, 5)]).toEqual([
      1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1,
    ]);
  });

  it('with see-through parts (a drawing with its own outline): exactly the see-through blocks', () => {
    const light = ['.....', '.....', '..#..', '.....', '.....'];
    const clear = ['ooooo', 'o...o', 'o...o', 'o...o', 'ooooo'];
    expect([...backdropOf(cells(light, '.'), 5, 5, cells(clear, 'o'))]).toEqual([
      ...cells(clear, 'o'),
    ]);
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

  it('stops at a sharp edge even when the subject is light', () => {
    const { values, width, height } = greys(['3333', '3993', '3333']);
    expect(marks(plainBackdrop(values, width, height, 0.1), width)).toEqual([
      'bbbb',
      'b..b',
      'bbbb',
    ]);
  });
});
