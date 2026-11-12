// Tests for copying a command to the clipboard (src/assets/js/copy.js).
import { describe, expect, it } from 'vite-plus/test';
import { copyText } from './copy.js';

describe('copyText', () => {
  it('copies with the browser’s clipboard when it is there', async () => {
    let copied = null;
    const clipboard = { writeText: async (text) => (copied = text) };
    const fallback = () => {
      throw new Error('not needed');
    };
    expect(
      await copyText('gpg --locate-external-keys hi@romitraj.dev', { clipboard, fallback }),
    ).toBe(true);
    expect(copied).toBe('gpg --locate-external-keys hi@romitraj.dev');
  });

  it('falls back to the older way when the clipboard is missing or refuses', async () => {
    const asked = [];
    const fallback = (text) => {
      asked.push(text);
      return true;
    };
    expect(await copyText('a', { clipboard: undefined, fallback })).toBe(true);
    const refusing = {
      writeText: async () => {
        throw new Error('not allowed');
      },
    };
    expect(await copyText('b', { clipboard: refusing, fallback })).toBe(true);
    expect(asked).toEqual(['a', 'b']);
  });

  it('says so when nothing worked', async () => {
    expect(await copyText('c', { clipboard: undefined, fallback: () => false })).toBe(false);
    expect(
      await copyText('d', {
        clipboard: undefined,
        fallback: () => {
          throw new Error('no');
        },
      }),
    ).toBe(false);
  });
});
