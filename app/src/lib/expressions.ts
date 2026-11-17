/**
 * Eye parameters. All lengths are fractions of the eye slot.
 * top/bottom: lid coverage. tilt: degrees, positive drops the inner corner (angry).
 * cheek: rising lower crescent (happy). sx/sy: scale. rx: corner roundness (0.5 = circle).
 * ps: pupil scale (0 hides). px/py: pupil bias, -1..1.
 */
export type EyeP = {
  top: number;
  tilt: number;
  bottom: number;
  cheek: number;
  sx: number;
  sy: number;
  rx: number;
  ps: number;
  px: number;
  py: number;
};

export const EYE_KEYS = ['top', 'tilt', 'bottom', 'cheek', 'sx', 'sy', 'rx', 'ps', 'px', 'py'] as const;

const base: EyeP = { top: 0, tilt: 0, bottom: 0, cheek: 0, sx: 1, sy: 1, rx: 0.36, ps: 1, px: 0, py: 0 };
const e = (p: Partial<EyeP>): EyeP => ({ ...base, ...p });

export type Expression = { id: string; name: string; code: string; note: string; L: EyeP; R: EyeP };

const both = (id: string, name: string, note: string, p: Partial<EyeP>, i: number): Expression => ({
  id, name, note, code: `EX-${String(i).padStart(2, '0')}`, L: e(p), R: e(p),
});

export const EXPRESSIONS: Expression[] = [
  both('idle', 'Idle', 'Nominal. Awaiting instruction.', {}, 1),
  both('happy', 'Happy', 'Task complete. Morale high.', { cheek: 0.62, ps: 0, sy: 1.04 }, 2),
  both('sleepy', 'Sleepy', 'Low-power mode engaged.', { top: 0.56, bottom: 0.04, py: 0.45, ps: 0.85 }, 3),
  both('angry', 'Angry', 'Build failed. Again.', { top: 0.36, tilt: 24, py: 0.15, ps: 0.9 }, 4),
  both('sad', 'Sad', 'Merge conflict detected.', { top: 0.3, tilt: -20, py: 0.4, ps: 0.9 }, 5),
  both('surprised', 'Surprised', 'Unexpected token.', { sx: 1.06, sy: 1.12, rx: 0.5, ps: 0.55 }, 6),
  {
    id: 'suspicious', name: 'Suspicious', code: 'EX-07', note: 'Reviewing your PR.',
    L: e({ top: 0.5, tilt: 4, px: 0.7, py: 0.1 }), R: e({ top: 0.18, px: 0.7, py: 0.1 }),
  },
  {
    id: 'wink', name: 'Wink', code: 'EX-08', note: 'Shipped to prod on a Friday.',
    L: e({ cheek: 0.58, ps: 0 }), R: e({ top: 0.45, bottom: 0.43, ps: 0 }),
  },
  both('focused', 'Focused', 'Compiling. Do not disturb.', { top: 0.28, bottom: 0.26, tilt: 8, ps: 0.8 }, 9),
  {
    id: 'skeptic', name: 'Skeptic', code: 'EX-10', note: 'Citation needed.',
    L: e({ sy: 1.08, rx: 0.42, px: -0.3 }), R: e({ top: 0.44, tilt: -12, px: -0.3 }),
  },
  both('bored', 'Bored', 'Polling. Still polling.', { top: 0.48, tilt: -5, px: -0.75, py: 0.25, ps: 0.85 }, 11),
  both('lookup', 'Pondering', 'Thinking about types.', { rx: 0.5, px: 0.45, py: -0.8, ps: 0.75 }, 12),
];

export const expressionById = (id: string) => EXPRESSIONS.find((x) => x.id === id) ?? EXPRESSIONS[0];
