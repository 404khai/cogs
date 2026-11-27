import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** The OS "Reduce Motion" setting, kept current. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(v), () => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Runs fn(now) on every animation frame while active. fn may change between renders. */
export function useFrames(active: boolean, fn: (now: number) => void) {
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      fn(performance.now());
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // fn is read through a ref by callers that need it fresh; restarting the loop per render would drop frames.
  }, [active]);
}

/** Seconds since the clock started, re-rendering at up to fps while active. Holds at `rest` when inactive. */
export function useClock(active: boolean, fps = 30, rest = 0.35) {
  const [t, setT] = useState(rest);
  useEffect(() => {
    if (!active) {
      setT(rest);
      return;
    }
    const start = performance.now();
    let raf = 0;
    let last = -Infinity;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - last < 1000 / fps - 2) return;
      last = now;
      setT((now - start) / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, fps, rest]);
  return t;
}
