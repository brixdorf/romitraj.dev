// Tests for the list of pictures the Credits page thanks (scripts/lib/credits.mjs).
import { describe, expect, it } from 'vite-plus/test';
import { picturesToThank } from './credits.mjs';

const work = (subject, extra = {}) => ({
  subject,
  title: `A print of ${subject}`,
  artist: 'An Engraver',
  year: '1768',
  collection: 'A Museum',
  licence: 'CC0',
  url: `https://example.org/${subject.replaceAll(' ', '-')}`,
  ...extra,
});

describe('picturesToThank', () => {
  it('lists every picture with its artist, title, year, collection and licence, in order', () => {
    expect(
      picturesToThank({
        'a.jpg': work('the orrery'),
        'b.jpg': work('the press', { licence: 'Public domain', year: 'about 1820' }),
      }),
    ).toEqual([
      {
        subject: 'the orrery',
        title: 'A print of the orrery',
        artist: 'An Engraver',
        year: '1768',
        collection: 'A Museum',
        licence: 'CC0',
        url: 'https://example.org/the-orrery',
      },
      {
        subject: 'the press',
        title: 'A print of the press',
        artist: 'An Engraver',
        year: 'about 1820',
        collection: 'A Museum',
        licence: 'Public domain',
        url: 'https://example.org/the-press',
      },
    ]);
  });

  it('stops the build when a picture lacks a fact', () => {
    for (const fact of ['subject', 'title', 'artist', 'year', 'collection', 'licence', 'url'])
      expect(() => picturesToThank({ 'a.jpg': work('the orrery', { [fact]: '' }) })).toThrow(
        `a.jpg needs "${fact}"`,
      );
  });

  it('stops the build for a licence that does not allow free use', () => {
    expect(() =>
      picturesToThank({ 'a.jpg': work('the orrery', { licence: 'All rights reserved' }) }),
    ).toThrow('a.jpg');
    for (const licence of ['Public domain', 'CC0', 'Unsplash License'])
      expect(() => picturesToThank({ 'a.jpg': work('the orrery', { licence }) })).not.toThrow();
  });

  it('stops the build for an address that is not a web page', () => {
    expect(() => picturesToThank({ 'a.jpg': work('the orrery', { url: 'orrery.jpg' }) })).toThrow(
      'a.jpg',
    );
  });
});
