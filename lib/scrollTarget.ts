/* power4.inOut — matches the {J} logo's scroll-to feel. */
export const power4InOut = (t: number) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

/* Canonical scroll-Y for a nav target.
   getBoundingClientRect() is unreliable here: StackTransitions leaves a
   persistent transform (scale/yPercent) on each section after its boundary,
   so a section's rect is shifted once you've scrolled past it — clicking a
   section from below would miss. offsetTop accumulation ignores transforms,
   giving a stable layout position from ANY scroll position.
   Contact is special-cased: it's revealed at the END of the burn (where its
   sticky still fills the viewport), i.e. footerTop − innerHeight. */
export const absoluteTop = (el: HTMLElement) => {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
};
