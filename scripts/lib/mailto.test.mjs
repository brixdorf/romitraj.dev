// Tests for the email links that open with a subject already filled in (scripts/lib/mailto.mjs).
import { describe, expect, it } from 'vite-plus/test';
import { mailto } from './mailto.mjs';

describe('mailto', () => {
  it('gives a plain email link without a subject', () => {
    expect(mailto('hi@romitraj.dev')).toBe('mailto:hi@romitraj.dev');
  });

  it('adds the subject, with its spaces, commas and slashes written so every mail app reads them', () => {
    expect(
      mailto('hi@romitraj.dev', 'Hey Romit, here is this amazing movie/series you should watch'),
    ).toBe(
      'mailto:hi@romitraj.dev?subject=Hey%20Romit%2C%20here%20is%20this%20amazing%20movie%2Fseries%20you%20should%20watch',
    );
  });

  it('writes spaces as %20, never as +, which some mail apps show as a plus sign', () => {
    expect(mailto('a@b.c', 'one two')).not.toContain('+');
  });
});
