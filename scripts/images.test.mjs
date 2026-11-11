// Tests for the picture pipeline's speck removal (scripts/images.mjs, the "despeckle" setting).
import { describe, expect, it } from 'vite-plus/test';
import { removeSpecks } from './images.mjs';

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
