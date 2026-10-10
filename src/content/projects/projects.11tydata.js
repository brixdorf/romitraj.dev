// Settings shared by every project in this folder. Each Markdown file here is one project: its
// facts (title, description, tags, year, link, order) are at the top of the file and its write-up
// is below them. The lists of projects are built from these files in eleventy.config.js.
export default {
  layout: 'layouts/project.njk',
  // The page above these pages, for the "all projects" link and the "you are here" line.
  parent: { title: 'Projects', url: '/projects/' },
};
