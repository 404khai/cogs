/*
 * @cogs/react-native: cogs on iOS and Android, drawn with react-native-svg.
 * Geometry, expressions, colour, JSON and face logic are the studio's own (app/src/lib), so a cog
 * built in the studio looks and behaves the same in an app.
 */
export { Cog } from './Cog';
export type { CogFields, CogProps } from './Cog';

export { CHASSIS, chassisById } from './core';
export type { Chassis, Optics } from './core';
export { EXPRESSIONS, expressionById } from './core';
export type { Expression } from './core';
export { DEFAULT, GLOWS, LOGO, PAINTS, ROSTER, SCREENS, parseCog, randomConfig, randomName, serial, toJSON } from './core';
export type { CogConfig, OpticsMode, ScreenMode } from './core';
export { resolveCog } from './core';
export type { CogInput, Gaze } from './core';
