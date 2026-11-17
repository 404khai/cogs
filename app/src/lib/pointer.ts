/** One global pointer listener shared by every cog. Read inside rAF loops; never triggers renders. */
export const pointer = { x: -1, y: -1, t: 0 };

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.t = performance.now();
    },
    { passive: true },
  );
}

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
