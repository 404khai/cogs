# @404khai/cogs-react-native

Cogs for iOS and Android: parametric robot avatars with 20 chassis, 12 expressions and 8 display modes, drawn with [react-native-svg](https://github.com/software-mansion/react-native-svg). A cog exported from the [studio](https://github.com/404khai/cogs) as JSON renders the same here.

## Install

```sh
# Expo
npx expo install @404khai/cogs-react-native react-native-svg

# Bare React Native
npm install @404khai/cogs-react-native react-native-svg
cd ios && pod install
```

`react`, `react-native` and `react-native-svg` are peer dependencies.

## Use

```tsx
import { Cog } from '@404khai/cogs-react-native';

<Cog size={96} />                                          // Rivet, the default unit
<Cog chassis="hex" expression="happy" color="#9d8df0" />   // fields as props
<Cog unit={json} size={96} />                              // cog JSON, as the studio exports it
<Cog unit={json} expression="angry" />                     // props override the unit
<Cog chassis="gear" screen="think" />                      // an agent display
```

`unit` takes cog JSON (a string) or a partial config object. Any field can also be passed as its own prop, and props win over `unit`. Missing or invalid fields fall back to the defaults, just like the studio, and each fallback is reported through `onWarnings`:

```tsx
<Cog unit={pasted} onWarnings={(w) => console.warn(w.join('\n'))} />
```

### Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `unit` | `string \| Partial<CogConfig>` | | Cog JSON or a config. |
| `chassis`, `expression`, `screen`, `color`, `glow`, `optics`, `pupils`, `charge`, `curiosity`, `blink`, `name` | | from `unit` | Any cog field, overriding `unit`. |
| `size` | `number` | `120` | Width and height in points. |
| `gaze` | `{ x, y } \| null` | | Where the eyes look, `-1..1` on each axis (x right, y down), scaled by `curiosity`. Leave it out and they wander on their own. |
| `animated` | `boolean` | `true` | `false` holds the cog still. |
| `onWarnings` | `(warnings: string[]) => void` | | Fallbacks taken for invalid fields or JSON. |
| `style`, `testID`, `accessibilityLabel` | | | Passed to the `Svg`. The default label reads like "Rivet, a octa cog looking idle". |

### Following a finger

Phones have no pointer to track, so the eyes wander and blink by themselves. To steer them, pass `gaze`:

```tsx
const [gaze, setGaze] = useState<Gaze | null>(null);

<View
  onStartShouldSetResponder={() => true}
  onResponderMove={(e) => setGaze({ x: e.nativeEvent.locationX / 120 - 1, y: e.nativeEvent.locationY / 120 - 1 })}
  onResponderRelease={() => setGaze(null)}
>
  <Cog size={240} gaze={gaze} />
</View>
```

### Also exported

`CHASSIS`, `EXPRESSIONS`, `SCREENS`, `PAINTS`, `GLOWS`, `ROSTER`, `DEFAULT` and `LOGO`, plus `resolveCog`, `parseCog`, `toJSON`, `serial`, `randomConfig` and `randomName`, and the `CogConfig`, `CogInput`, `ScreenMode`, `OpticsMode`, `Chassis`, `Expression` and `Gaze` types.

## Fields

| Field | Values |
| --- | --- |
| `chassis` | `octa` `capsule` `tab` `hex` `drop` `chamfer` `bloom` `plate` `gear` `orb` `keystone` `dome` `clamp` `bracket` `crest` `cross` `ticket` `rampart` `lynx` `fold` |
| `expression` | `idle` `happy` `sleepy` `angry` `sad` `surprised` `suspicious` `wink` `focused` `skeptic` `bored` `lookup` |
| `screen` | `eyes` `wave` `dots` `glyph` `think` `search` `code` `work` |
| `optics` | `auto` `mono` `dual` |
| `color`, `glow` | `#rrggbb` |
| `charge`, `curiosity`, `blink` | `0` – `1` |

## How it differs from the web

The geometry, expressions, colours, JSON parsing, the eye and blink animation, and every display layout come straight from the studio's `app/src/lib`. They're bundled into this package at build time, so both renderers share one source. What differs is how things are drawn:

- **No SVG filters.** react-native-svg doesn't render the studio's blur filters reliably, so the drop shadow, LED glow and eye bloom are built from layered shapes and radial gradients. They're close, but a little crisper than on the web.
- **No SMIL or CSS animation.** The displays (Voice, Typing, Thinking, Search, Coding, Working) are redrawn from the time on each frame, at up to 30fps. Only the visor re-renders, and the status light pulses through `Animated`.
- **Reduce Motion.** With the OS setting on, or with `animated={false}`, the cog holds still on its expression.

Each animated cog runs its own frame loop. For long lists of cogs, pass `animated={false}` to the ones that are off screen or small.

## Develop

```sh
cd app && bun install                    # the studio, whose lib this package bundles
cd ../packages/react-native && bun install
bun run typecheck
bun test                                 # renders every chassis × screen; checks eye masks match the studio
bun run build                            # dist/ (ESM, CJS, types)
bun run preview                          # preview/sheet.png: studio vs react-native-svg, side by side
```

The example app runs the package source with Expo:

```sh
cd example && bun install && npx expo start
```
