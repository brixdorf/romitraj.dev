// Which other website the pages load their fonts from (the live site loads them from
// fonts.romitraj.dev), so the page's head can tell the browser to connect to it at once. None
// when the fonts come from the site itself ("/fonts/" on a computer with the private folder).
export function fontOrigin(base) {
  if (!/^https?:\/\//i.test(base ?? '')) return null;
  return new URL(base).origin;
}
