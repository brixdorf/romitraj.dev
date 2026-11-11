// Tests for the list of photographers the Credits page thanks (scripts/lib/credits.mjs).
import { describe, expect, it } from 'vite-plus/test';
import { photographersToThank } from './credits.mjs';

const unsplash = (name, subject) => ({
  photographer: name,
  profile: `https://unsplash.com/@${name.toLowerCase()}`,
  subject,
  url: `https://unsplash.com/photos/${subject}`,
});

describe('photographersToThank', () => {
  it('lists each photographer once, with everything they photographed', () => {
    expect(
      photographersToThank({
        'a.jpg': unsplash('Ann', 'the lamp'),
        'b.jpg': unsplash('Ben', 'the clock'),
        'c.jpg': unsplash('Ann', 'the globe'),
      }),
    ).toEqual([
      { name: 'Ann', profile: 'https://unsplash.com/@ann', subjects: ['the lamp', 'the globe'] },
      { name: 'Ben', profile: 'https://unsplash.com/@ben', subjects: ['the clock'] },
    ]);
  });

  it('leaves out a photo of the site’s own, which needs only its photographer on record', () => {
    expect(
      photographersToThank({
        'portrait.jpg': { photographer: 'Romit Raj Sahu', own: true },
        'b.jpg': unsplash('Ben', 'the clock'),
      }),
    ).toEqual([{ name: 'Ben', profile: 'https://unsplash.com/@ben', subjects: ['the clock'] }]);
  });

  it('stops the build when a photo lacks a fact', () => {
    expect(() =>
      photographersToThank({ 'a.jpg': { ...unsplash('Ann', 'the lamp'), url: '' } }),
    ).toThrow('a.jpg needs "url"');
    expect(() => photographersToThank({ 'p.jpg': { own: true } })).toThrow(
      'p.jpg needs "photographer"',
    );
  });

  it('stops the build when a profile is not an Unsplash profile', () => {
    expect(() =>
      photographersToThank({
        'a.jpg': { ...unsplash('Ann', 'the lamp'), profile: 'https://example.org/ann' },
      }),
    ).toThrow('https://unsplash.com/@name');
  });
});
