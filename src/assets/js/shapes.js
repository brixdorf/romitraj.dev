// The visible window of a piece while it animates, as shapes for the CSS clip-path property:
// all of it, or squeezed flat against one edge or corner. A letter that moves while its window
// shrinks toward the opposite edge looks as if it slides through a slot in the page.
// Shared by the page changes (page-changes.js) and the headline's entrance (intro.js).
//
// The first three are for letters and lines of text, written as "inset(top right bottom left)":
// how far each side of the window sits inside the piece's own box. A minus sign puts it outside.
// - Above and below, the window reaches a tenth of the box's height past the box. That edge is
//   the slot the letter slides through, so it has to stay close to the line.
// - To the sides it reaches half a letter-height past the box. The slide is up or down, so the
//   sides play no part in it, and ink that leans out of a narrow box sideways (the tail of an
//   italic comma under the letter before it) must not be cut off.
// "npm run check" tests that no letter's ink reaches outside "all" (scripts/lib/letters.mjs).
export const shape = {
  all: 'inset(-10% -0.5em -10% -0.5em)',
  topEdge: 'inset(-10% -0.5em 110% -0.5em)',
  bottomEdge: 'inset(110% -0.5em -10% -0.5em)',
  topLeftCorner: 'polygon(0% 0%, 1px 0%, 1px 1px, 0% 1px)',
  bottomRightCorner: 'polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)',
  box: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
};
