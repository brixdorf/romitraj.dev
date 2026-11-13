// Tests for font-origin.mjs: which other website the pages load their fonts from, if any.
import { describe, expect, it } from 'vite-plus/test';
import { fontOrigin } from './font-origin.mjs';

describe('fontOrigin', () => {
  it('names the font site the live pages load from, so the browser can connect to it early', () => {
    expect(fontOrigin('https://fonts.romitraj.dev/')).toBe('https://fonts.romitraj.dev');
    expect(fontOrigin('http://localhost:9/')).toBe('http://localhost:9');
  });

  it('names none when the fonts come from the site itself', () => {
    expect(fontOrigin('/fonts/')).toBeNull();
    expect(fontOrigin('')).toBeNull();
    expect(fontOrigin(undefined)).toBeNull();
  });
});
