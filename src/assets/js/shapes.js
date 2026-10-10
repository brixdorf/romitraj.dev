// The visible window of a piece while it animates, as shapes for the CSS clip-path property:
// all of it, or squeezed flat against one edge or corner. A letter that moves while its window
// shrinks toward the opposite edge looks as if it slides through a slot in the page.
// Shared by the page changes (page-changes.js) and the headline's entrance (intro.js).
export const shape = {
  all: 'polygon(-10% -10%, 110% -10%, 110% 110%, -10% 110%)',
  topEdge: 'polygon(-10% -10%, 110% -10%, 110% -10%, -10% -10%)',
  bottomEdge: 'polygon(-10% 110%, 110% 110%, 110% 110%, -10% 110%)',
  topLeftCorner: 'polygon(0% 0%, 1px 0%, 1px 1px, 0% 1px)',
  bottomRightCorner: 'polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)',
  box: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
};
