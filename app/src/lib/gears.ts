/**
 * Meshing gear trains. Gears are chained by pitch radius (module × teeth / 2) and phased so every
 * tooth sits in its neighbour's gap. Spin each at a period ∝ its teeth, alternating direction, and
 * they stay meshed forever.
 */
export type MeshGear<T = object> = T & { z: number; cx: number; cy: number; phase: number; dir: 1 | -1 };

export function meshChain<T extends object>(
  module: number,
  start: T & { z: number; cx: number; cy: number },
  links: (T & { z: number; deg: number })[],
): MeshGear<T>[] {
  const out: MeshGear<T>[] = [{ ...start, phase: 0, dir: 1 }];
  for (const { deg, ...l } of links) {
    const a = out[out.length - 1];
    const ra = (module * a.z) / 2;
    const rb = (module * l.z) / 2;
    const phi = (deg * Math.PI) / 180;
    const ta = (Math.PI * 2) / a.z;
    const tb = (Math.PI * 2) / l.z;
    const delta = (((a.phase - phi) % ta) + ta) % ta;
    out.push({
      ...(l as unknown as T & { z: number }),
      cx: a.cx + (ra + rb) * Math.cos(phi),
      cy: a.cy + (ra + rb) * Math.sin(phi),
      phase: phi + Math.PI - (delta / ta + 0.5) * tb,
      dir: (a.dir * -1) as 1 | -1,
    });
  }
  return out;
}
