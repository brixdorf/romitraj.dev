// Email links that open the visitor's mail app with a subject already filled in, such as the
// About page's "Suggest me" links. The subject is written with encodeURIComponent, so spaces,
// commas and slashes reach every mail app as written.
export function mailto(email, subject) {
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}
