// The checks on a project's facts (the top of each file in src/content/projects/), and how its
// link is labelled on its page. Used by eleventy.config.js.

// The facts a project's file must have. "link" and "image" are optional: not every project has
// public code or a live site, and only some have a picture.
export function missingFacts({ title, description, tags, year, order }) {
  const missing = Object.entries({ title, description, year })
    .filter(([, value]) => value === undefined || value === '')
    .map(([name]) => name);
  if (!Array.isArray(tags) || !tags.length) missing.push('tags (a list)');
  if (typeof order !== 'number') missing.push('order (a number)');
  return missing;
}

// How a project's link is shown: a link to GitHub is the code ("Code: GitHub"); any other link
// is the project running live, shown by its address without "https://" and "www."
// ("Live: aletheia.romitraj.dev"). No link, nothing.
export function projectLink(link) {
  if (!link) return null;
  const url = new URL(link);
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'github.com') return { kind: 'code', text: 'GitHub' };
  return { kind: 'live', text: (host + url.pathname).replace(/\/+$/, '') };
}
