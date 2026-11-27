/*
 * Stand-ins for react-native and react-native-svg that render plain SVG elements, so a cog can be
 * server-rendered with react-dom in Bun: for tests, and for preview sheets rasterised outside a phone.
 * Call installShims() before importing anything from src.
 */
import { mock } from 'bun:test';
import { createElement } from 'react';
import type { ComponentType } from 'react';

class Value {
  constructor(public v: number) {}
  setValue(v: number) {
    this.v = v;
  }
}
const anim = () => ({ start() {}, stop() {} });
const resolve = (props: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(props).map(([k, v]) => [k, v instanceof Value ? v.v : v]));

const tag = (name: string) => (props: Record<string, unknown>) => createElement(name, props);
const TAGS = {
  Circle: 'circle', ClipPath: 'clipPath', Defs: 'defs', Ellipse: 'ellipse', G: 'g', Line: 'line', LinearGradient: 'linearGradient',
  Mask: 'mask', Path: 'path', Pattern: 'pattern', Polyline: 'polyline', RadialGradient: 'radialGradient', Rect: 'rect', Stop: 'stop',
};

function Svg({ accessible: _a, accessibilityRole: _r, accessibilityLabel, testID, style: _s, ...props }: Record<string, unknown>) {
  return createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', role: 'img', 'aria-label': accessibilityLabel, 'data-testid': testID, ...props });
}

export function installShims() {
  mock.module('react-native-svg', () => ({
    __esModule: true,
    default: Svg,
    Svg,
    ...Object.fromEntries(Object.entries(TAGS).map(([k, v]) => [k, tag(v)])),
  }));
  mock.module('react-native', () => ({
    Animated: {
      Value,
      createAnimatedComponent: (C: ComponentType<Record<string, unknown>>) => (props: Record<string, unknown>) => createElement(C, resolve(props)),
      loop: anim,
      sequence: anim,
      timing: anim,
    },
    Easing: { linear: (t: number) => t },
    AccessibilityInfo: {
      isReduceMotionEnabled: () => Promise.resolve(false),
      addEventListener: () => ({ remove() {} }),
    },
  }));
}
