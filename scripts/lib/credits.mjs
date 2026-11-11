// The photographers the Credits page thanks, from src/_data/image-credits.json: one entry per
// photographer, with everything each photographed. A photo of the site's own ("own": true, such
// as the portrait) only needs its photographer on record and is not listed.
export function photographersToThank(photos) {
  const people = new Map();
  for (const [file, photo] of Object.entries(photos)) {
    const facts = photo.own ? ['photographer'] : ['photographer', 'profile', 'subject', 'url'];
    for (const fact of facts) {
      if (!photo[fact]) throw new Error(`image-credits.json: ${file} needs "${fact}".`);
    }
    if (photo.own) continue;
    if (!photo.profile.startsWith('https://unsplash.com/@'))
      throw new Error(
        `image-credits.json: the profile of ${file} should be an address like https://unsplash.com/@name.`,
      );
    const person = people.get(photo.profile) || {
      name: photo.photographer,
      profile: photo.profile,
      subjects: [],
    };
    person.subjects.push(photo.subject);
    people.set(photo.profile, person);
  }
  return [...people.values()];
}
