/*
 * The renderer-agnostic half of cogs, straight from the studio's app/src/lib: chassis geometry,
 * expressions, colour, config/JSON, the face animation and display layouts. tsup bundles it into
 * dist, so the published package is self-contained while the source of truth stays in one place.
 */
export * from '../../../app/src/lib/chassis';
export * from '../../../app/src/lib/color';
export * from '../../../app/src/lib/config';
export * from '../../../app/src/lib/displays';
export * from '../../../app/src/lib/expressions';
export * from '../../../app/src/lib/face';
export * from '../../../app/src/lib/unit';
