export type Pt = [number, number];
export type Rect = { x: number; y: number; w: number; h: number; r: number };
export type Light = { x: number; y: number; w: number; h: number; angle?: number };
export type Optics = 'mono' | 'dual';

export type Chassis = {
  id: string;
  name: string;
  code: string;
  path: string;
  box: [number, number, number, number];
  visor: Rect;
  light: Light;
  screws: Pt[];
  optics: Optics;
};

const f = (n: number) => +n.toFixed(2);

export function roundedPoly(pts: Pt[], r: number): string {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const v1 = [p0[0] - p1[0], p0[1] - p1[1]];
    const v2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(v1[0], v1[1]);
    const l2 = Math.hypot(v2[0], v2[1]);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = [p1[0] + (v1[0] / l1) * rr, p1[1] + (v1[1] / l1) * rr];
    const b = [p1[0] + (v2[0] / l2) * rr, p1[1] + (v2[1] / l2) * rr];
    d += `${i === 0 ? 'M' : 'L'}${f(a[0])} ${f(a[1])} Q${f(p1[0])} ${f(p1[1])} ${f(b[0])} ${f(b[1])} `;
  }
  return d + 'Z';
}

function bbox(pts: Pt[]): [number, number, number, number] {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.round(Math.min(...xs)), Math.round(Math.min(...ys)), Math.round(Math.max(...xs)), Math.round(Math.max(...ys))];
}

export function gearPoints(cx: number, cy: number, teeth: number, rRoot: number, rTip: number, phase = -Math.PI / 2): Pt[] {
  const T = (Math.PI * 2) / teeth;
  const pts: Pt[] = [];
  const at = (r: number, a: number): Pt => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  for (let i = 0; i < teeth; i++) {
    const c = phase + i * T;
    pts.push(at(rRoot, c - 0.3 * T), at(rTip, c - 0.15 * T), at(rTip, c + 0.15 * T), at(rRoot, c + 0.3 * T), at(rRoot, c + 0.5 * T));
  }
  return pts;
}

function polarPoints(cx: number, cy: number, r: (a: number) => number, samples = 180): Pt[] {
  return Array.from({ length: samples }, (_, i) => {
    const a = (i / samples) * Math.PI * 2;
    return [cx + r(a) * Math.cos(a), cy + r(a) * Math.sin(a)] as Pt;
  });
}

function ellipseArc(cx: number, cy: number, rx: number, ry: number, t0: number, t1: number, n = 24): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = ((t0 + ((t1 - t0) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] as Pt;
  });
}

/** Ellipse with its top and bottom shaved flat, leaving little horns at each cut (a pipe clamp). */
const clampPts: Pt[] = [
  ...ellipseArc(200, 200, 170, 125, -60, 60),
  [285, 285], [115, 285],
  ...ellipseArc(200, 200, 170, 125, 120, 240),
  [115, 115], [285, 115],
];

function polyPath(pts: Pt[]) {
  return 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L') + ' Z';
}

/** Hull of two horizontally aligned circles: a teardrop/keyhole plate. */
function dropPath(c1x: number, c2x: number, cy: number, r1: number, r2: number) {
  const d = c2x - c1x;
  const t = Math.acos((r1 - r2) / d);
  const c = Math.cos(t);
  const s = Math.sin(t);
  const p1a = [c1x + r1 * c, cy - r1 * s];
  const p1b = [c1x + r1 * c, cy + r1 * s];
  const p2a = [c2x + r2 * c, cy - r2 * s];
  const p2b = [c2x + r2 * c, cy + r2 * s];
  return `M${f(p1a[0])} ${f(p1a[1])} L${f(p2a[0])} ${f(p2a[1])} A${r2} ${r2} 0 0 1 ${f(p2b[0])} ${f(p2b[1])} L${f(p1b[0])} ${f(p1b[1])} A${r1} ${r1} 0 1 1 ${f(p1a[0])} ${f(p1a[1])} Z`;
}

function poly(id: string, name: string, code: string, pts: Pt[], r: number, rest: Omit<Chassis, 'id' | 'name' | 'code' | 'path' | 'box'>): Chassis {
  return { id, name, code, path: roundedPoly(pts, r), box: bbox(pts), ...rest };
}

/** Ray-cast radius of a union of circles (a centre disc plus petals), giving a scalloped flower outline. */
function flowerRadius(petals: number, dist: number, petalR: number, coreR: number) {
  return (a: number) => {
    let r = coreR;
    for (let i = 0; i < petals; i++) {
      const d = a - (-Math.PI / 2 + (i * Math.PI * 2) / petals);
      const s = dist * Math.sin(d);
      if (petalR * petalR >= s * s) r = Math.max(r, dist * Math.cos(d) + Math.sqrt(petalR * petalR - s * s));
    }
    return r;
  };
}

const bloomPts = polarPoints(200, 208, flowerRadius(5, 78, 74, 112), 360);
const gearPts = gearPoints(200, 200, 10, 132, 158);

export const CHASSIS: Chassis[] = [
  poly('octa', 'Octa', 'CH-01', [[95, 95], [305, 95], [350, 140], [350, 265], [305, 310], [95, 310], [50, 265], [50, 140]], 14, {
    visor: { x: 95, y: 162, w: 210, h: 110, r: 50 },
    light: { x: 150, y: 124, w: 100, h: 13 },
    screws: [[104, 124], [296, 124], [104, 282], [296, 282]],
    optics: 'dual',
  }),
  {
    id: 'capsule', name: 'Capsule', code: 'CH-02',
    path: 'M135 110 H265 A95 95 0 0 1 265 300 H135 A95 95 0 0 1 135 110 Z',
    box: [40, 110, 360, 300],
    visor: { x: 105, y: 162, w: 190, h: 104, r: 50 },
    light: { x: 150, y: 128, w: 100, h: 13 },
    screws: [[70, 205], [330, 205]],
    optics: 'dual',
  },
  poly('tab', 'Tabbed', 'CH-03', [[55, 132], [112, 132], [112, 98], [288, 98], [288, 132], [345, 132], [345, 252], [288, 310], [112, 310], [55, 252]], 12, {
    visor: { x: 95, y: 172, w: 210, h: 106, r: 50 },
    light: { x: 150, y: 143, w: 100, h: 12 },
    screws: [[134, 116], [266, 116]],
    optics: 'dual',
  }),
  poly('hex', 'Hexa', 'CH-04', [[125, 80], [275, 80], [345, 200], [275, 320], [125, 320], [55, 200]], 18, {
    visor: { x: 140, y: 146, w: 120, h: 120, r: 40 },
    light: { x: 152, y: 114, w: 96, h: 12 },
    screws: [[138, 100], [262, 100], [138, 300], [262, 300]],
    optics: 'mono',
  }),
  {
    id: 'drop', name: 'Keyhole', code: 'CH-05',
    path: dropPath(150, 318, 200, 108, 44),
    box: [42, 92, 362, 308],
    visor: { x: 92, y: 145, w: 112, h: 110, r: 36 },
    light: { x: 222, y: 192, w: 90, h: 16 },
    screws: [[64, 200], [336, 200]],
    optics: 'mono',
  },
  poly('chamfer', 'Chamfer', 'CH-06', [[135, 92], [348, 92], [348, 245], [285, 308], [52, 308], [52, 175]], 14, {
    visor: { x: 85, y: 188, w: 205, h: 98, r: 46 },
    light: { x: 255, y: 133, w: 70, h: 13, angle: -40 },
    screws: [[160, 113], [326, 113], [326, 222]],
    optics: 'dual',
  }),
  {
    id: 'bloom', name: 'Bloom', code: 'CH-07',
    path: polyPath(bloomPts),
    box: bbox(bloomPts),
    visor: { x: 132, y: 152, w: 116, h: 110, r: 38 },
    light: { x: 262, y: 156, w: 14, h: 100 },
    screws: [0, 1, 2, 3, 4].map((i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      return [200 + 118 * Math.cos(a), 208 + 118 * Math.sin(a)] as Pt;
    }),
    optics: 'mono',
  },
  poly('plate', 'Plate', 'CH-08', [[50, 135], [108, 135], [108, 100], [292, 100], [292, 135], [350, 135], [350, 275], [292, 275], [292, 308], [108, 308], [108, 275], [50, 275]], 13, {
    visor: { x: 92, y: 168, w: 216, h: 100, r: 48 },
    light: { x: 155, y: 140, w: 90, h: 12 },
    screws: [[72, 156], [328, 156], [72, 254], [328, 254]],
    optics: 'dual',
  }),
  poly('gear', 'Sprocket', 'CH-09', gearPts, 5, {
    visor: { x: 115, y: 152, w: 170, h: 98, r: 46 },
    light: { x: 160, y: 120, w: 80, h: 12 },
    screws: [[121, 121], [279, 121], [121, 279], [279, 279]],
    optics: 'dual',
  }),
  {
    id: 'orb', name: 'Orb', code: 'CH-10',
    path: 'M50 200 A150 150 0 1 0 350 200 A150 150 0 1 0 50 200 Z',
    box: [50, 50, 350, 350],
    visor: { x: 100, y: 160, w: 200, h: 100, r: 48 },
    light: { x: 150, y: 122, w: 100, h: 13 },
    screws: [[200, 76], [76, 200], [324, 200], [200, 324]],
    optics: 'dual',
  },
  poly('keystone', 'Keystone', 'CH-11', [[131, 95], [269, 95], [350, 237], [314, 305], [86, 305], [50, 237]], 16, {
    visor: { x: 98, y: 179, w: 204, h: 100, r: 48 },
    light: { x: 154, y: 154, w: 92, h: 13 },
    screws: [[200, 120], [73, 240], [327, 240]],
    optics: 'dual',
  }),
  {
    id: 'dome', name: 'Dome', code: 'CH-12',
    path: 'M50 230 A150 150 0 0 1 350 230 L350 291 Q350 305 336 305 L64 305 Q50 305 50 291 Z',
    box: [50, 80, 350, 305],
    visor: { x: 105, y: 172, w: 190, h: 95, r: 46 },
    light: { x: 158, y: 136, w: 84, h: 13 },
    screws: [[72, 284], [328, 284]],
    optics: 'dual',
  },
  poly('clamp', 'Clamp', 'CH-13', clampPts, 7, {
    visor: { x: 110, y: 160, w: 180, h: 94, r: 45 },
    light: { x: 160, y: 130, w: 80, h: 12 },
    screws: [[52, 200], [348, 200]],
    optics: 'dual',
  }),
  poly('bracket', 'Bracket', 'CH-14', [[130, 85], [270, 85], [270, 105], [300, 105], [300, 128], [345, 128], [345, 290], [258, 290], [258, 312], [142, 312], [142, 290], [55, 290], [55, 128], [100, 128], [100, 105], [130, 105]], 9, {
    visor: { x: 100, y: 162, w: 200, h: 98, r: 46 },
    light: { x: 160, y: 118, w: 80, h: 12 },
    screws: [[76, 270], [324, 270]],
    optics: 'dual',
  }),
  poly('crest', 'Crest', 'CH-15', [[60, 95], [340, 95], [340, 215], [200, 335], [60, 215]], 20, {
    visor: { x: 110, y: 148, w: 180, h: 90, r: 44 },
    light: { x: 160, y: 116, w: 80, h: 12 },
    screws: [[86, 120], [314, 120], [200, 298]],
    optics: 'dual',
  }),
  poly('cross', 'Cross', 'CH-16', [[130, 65], [270, 65], [270, 140], [360, 140], [360, 280], [270, 280], [270, 340], [130, 340], [130, 280], [40, 280], [40, 140], [130, 140]], 18, {
    visor: { x: 92, y: 172, w: 216, h: 92, r: 44 },
    light: { x: 160, y: 130, w: 80, h: 12 },
    screws: [[165, 92], [235, 92], [62, 210], [338, 210], [200, 312]],
    optics: 'dual',
  }),
  {
    id: 'ticket', name: 'Ticket', code: 'CH-17',
    path: 'M67 110 H333 Q355 110 355 132 V179 A26 26 0 0 0 355 231 V278 Q355 300 333 300 H67 Q45 300 45 278 V231 A26 26 0 0 0 45 179 V132 Q45 110 67 110 Z',
    box: [45, 110, 355, 300],
    visor: { x: 100, y: 164, w: 200, h: 98, r: 47 },
    light: { x: 155, y: 132, w: 90, h: 12 },
    screws: [[72, 136], [328, 136], [72, 274], [328, 274]],
    optics: 'dual',
  },
];

export const chassisById = (id: string) => CHASSIS.find((c) => c.id === id) ?? CHASSIS[0];
