// The photos the Credits page thanks, from src/_data/image-credits.json: for each source photo,
// what it shows, its title, who took or drew it, where it is shared (Unsplash, Pixabay, or the
// museum that keeps the object), its licence and its page. The build stops if a fact is missing or
// the licence is not one that allows free use.
const facts = ['subject', 'title', 'photographer', 'collection', 'licence', 'url'];
const freeLicences = ['Public domain', 'CC0', 'Unsplash License', 'Pixabay Content License'];

export function picturesToThank(pictures) {
  return Object.entries(pictures).map(([file, picture]) => {
    for (const fact of facts)
      if (!picture[fact]) throw new Error(`image-credits.json: ${file} needs "${fact}".`);
    if (!freeLicences.includes(picture.licence))
      throw new Error(
        `image-credits.json: ${file} has the licence "${picture.licence}"; only ${freeLicences.join(', ')} are allowed.`,
      );
    if (!picture.url.startsWith('https://'))
      throw new Error(`image-credits.json: the url of ${file} should be its page, from https://.`);
    return Object.fromEntries(facts.map((fact) => [fact, picture[fact]]));
  });
}
