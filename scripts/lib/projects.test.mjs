// Tests for the project checks (scripts/lib/projects.mjs): which facts a project's file must have,
// and how its link is labelled on the project's page.
import fs from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import { missingFacts, projectLink } from './projects.mjs';

const complete = {
  title: 'Snip',
  description: 'A tiny URL shortener.',
  tags: ['Backend'],
  year: 2026,
  link: 'https://github.com/brixdorf/snip',
  order: 1,
};

describe('missingFacts', () => {
  it('finds nothing missing in a complete project', () => {
    expect(missingFacts(complete)).toEqual([]);
  });

  it('accepts a project without a link, since not every project has a public one', () => {
    const { link, ...withoutLink } = complete;
    expect(link).toBeTruthy();
    expect(missingFacts(withoutLink)).toEqual([]);
  });

  it('accepts a year written in words, such as "2026 to now"', () => {
    expect(missingFacts({ ...complete, year: '2026 to now' })).toEqual([]);
  });

  it('names every fact that is missing or empty', () => {
    expect(missingFacts({ tags: [], description: '' })).toEqual([
      'title',
      'description',
      'year',
      'tags (a list)',
      'order (a number)',
    ]);
  });
});

describe('projectLink', () => {
  it('labels a link to GitHub as the code', () => {
    expect(projectLink('https://github.com/brixdorf/devops-labs')).toEqual({
      kind: 'code',
      text: 'GitHub',
    });
  });

  it('labels any other link as the live project, shown by its address', () => {
    expect(projectLink('https://aletheia.romitraj.dev')).toEqual({
      kind: 'live',
      text: 'aletheia.romitraj.dev',
    });
    expect(projectLink('https://www.example.org/app/')).toEqual({
      kind: 'live',
      text: 'example.org/app',
    });
  });

  it('gives nothing for a project without a link', () => {
    expect(projectLink(undefined)).toBeNull();
    expect(projectLink('')).toBeNull();
  });
});

describe('the project template', () => {
  const template = fs.readFileSync(
    new URL('../../src/content/projects/_template.md', import.meta.url),
    'utf8',
  );

  it('names every fact a project needs, so a copy of it is a complete project', () => {
    for (const fact of ['title', 'description', 'tags', 'year', 'link', 'order', 'image'])
      expect(template).toMatch(new RegExp(`^#? ?${fact}:`, 'm'));
  });

  it('has the four sections every write-up has', () => {
    for (const section of ['What it is', 'Why it exists', 'How it works', 'What I learned'])
      expect(template).toContain(`## ${section}`);
  });
});
