/*
 * @404khai/cogs: the cogs renderer as a React library.
 * Everything here is the studio's own code from app/src, so a cog looks and moves the same in both.
 */
export { Cog, CogAvatar, CogTyping, resolveCog } from './Cog';
export type { CogAvatarProps, CogFields, CogInput, CogProps, CogTypingProps, Presence } from './Cog';
export { CHASSIS_IDS, EXPRESSION_IDS } from './ids';
export type { ChassisId, ExpressionId } from './ids';

export { CHASSIS, chassisById } from '../../../app/src/lib/chassis';
export type { Chassis, Optics } from '../../../app/src/lib/chassis';
export { EXPRESSIONS, expressionById } from '../../../app/src/lib/expressions';
export type { Expression } from '../../../app/src/lib/expressions';
export {
  DEFAULT, GLOWS, LOGO, PAINTS, SCREENS,
  decodeConfig, encodeConfig, parseCog, randomConfig, randomName, serial, toJSON,
} from '../../../app/src/lib/config';
export type { CogConfig, OpticsMode, ScreenMode } from '../../../app/src/lib/config';
