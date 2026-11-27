/*
 * Literal ids for autocomplete. app/src/lib keeps them as plain strings; test/ids.test.ts
 * checks these lists against CHASSIS and EXPRESSIONS so they can't drift.
 */
export const CHASSIS_IDS = [
  'octa', 'capsule', 'tab', 'hex', 'drop', 'chamfer', 'bloom', 'plate', 'gear', 'orb',
  'keystone', 'dome', 'clamp', 'bracket', 'crest', 'cross', 'ticket', 'rampart', 'lynx', 'fold',
] as const;
export type ChassisId = (typeof CHASSIS_IDS)[number];

export const EXPRESSION_IDS = [
  'idle', 'happy', 'sleepy', 'angry', 'sad', 'surprised', 'suspicious', 'wink', 'focused', 'skeptic', 'bored', 'lookup',
] as const;
export type ExpressionId = (typeof EXPRESSION_IDS)[number];
