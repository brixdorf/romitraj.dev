// Tests for the list of photos the Credits page thanks (scripts/lib/credits.mjs).
import { describe, expect, it } from 'vite-plus/test';
import { picturesToThank } from './credits.mjs';

const photo = (subject, extra = {}) => ({
  subject,
  title: `A photo of ${subject}`,
  photographer: 'A Photographer',
  collection: 'Unsplash',
  licence: 'Unsplash License',
  url: `https://example.org/${subject.replaceAll(' ', '-')}`,
  ...extra,
});

describe('picturesToThank', () => {
  it('lists every photo with its title, photographer, collection and licence, in order', () => {
    expect(
      picturesToThank({
        'a.jpg': photo('the globe'),
        'b.jpg': photo('the telephone', {
          photographer: 'the Smithsonian',
          collection: 'National Museum of American History',
          licence: 'Public domain',
        }),
      }),
    ).toEqual([
      {
        subject: 'the globe',
        title: 'A photo of the globe',
        photographer: 'A Photographer',
        collection: 'Unsplash',
        licence: 'Unsplash License',
        url: 'https://example.org/the-globe',
      },
      {
        subject: 'the telephone',
        title: 'A photo of the telephone',
        photographer: 'the Smithsonian',
        collection: 'National Museum of American History',
        licence: 'Public domain',
        url: 'https://example.org/the-telephone',
      },
    ]);
  });

  it('stops the build when a photo lacks a fact', () => {
    for (const fact of ['subject', 'title', 'photographer', 'collection', 'licence', 'url'])
      expect(() => picturesToThank({ 'a.jpg': photo('the globe', { [fact]: '' }) })).toThrow(
        `a.jpg needs "${fact}"`,
      );
  });

  it('stops the build for a licence that does not allow free use', () => {
    expect(() =>
      picturesToThank({ 'a.jpg': photo('the globe', { licence: 'All rights reserved' }) }),
    ).toThrow('a.jpg');
    for (const licence of ['Public domain', 'CC0', 'Unsplash License'])
      expect(() => picturesToThank({ 'a.jpg': photo('the globe', { licence }) })).not.toThrow();
  });

  it('accepts a drawing from Pixabay under the Pixabay Content License', () => {
    expect(() =>
      picturesToThank({
        'a.png': photo('the emblem', {
          collection: 'Pixabay',
          licence: 'Pixabay Content License',
        }),
      }),
    ).not.toThrow();
  });

  it('stops the build for an address that is not a web page', () => {
    expect(() => picturesToThank({ 'a.jpg': photo('the globe', { url: 'globe.jpg' }) })).toThrow(
      'a.jpg',
    );
  });
});
