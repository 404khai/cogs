# @cogs/react

Cogs for React: parametric SVG avatars for machines. 20 chassis, 12 expressions and 8 display modes, with eyes that follow the cursor, glance around and blink. Build a unit in the [studio](https://github.com/404khai/cogs), copy its JSON and drop it in.

The package uses the studio's own renderer (`app/src`), so a unit looks and moves the same here as it does there.

## Install

```sh
npm i @cogs/react
# or: bun add @cogs/react · pnpm add @cogs/react · yarn add @cogs/react
```

React 18 or later is a peer dependency. Import the stylesheet once, for example in your root layout:

```ts
import '@cogs/react/styles.css';
```

It animates the Voice and Typing displays and styles `CogAvatar` and `CogTyping`. Everything else is plain SVG and works without it.

## Usage

```tsx
import { Cog } from '@cogs/react';

// Props for each field
<Cog chassis="gear" color="#e8603f" glow="#ffb23f" expression="angry" pupils={false} size={96} />

// Cog JSON straight from the studio (a string or an object)
<Cog unit={json} size={128} />

// A unit with overrides: field props win over the unit
<Cog unit={json} screen={busy ? 'think' : 'eyes'} expression={hover ? 'happy' : undefined} />
```

Without `size`, the cog fills the width of its container.

### Props

| Prop | Type | Default |
| --- | --- | --- |
| `unit` | cog JSON string or `Partial<CogConfig>` | the default unit (Rivet) |
| `chassis` | `octa` `capsule` `tab` `hex` `drop` `chamfer` `bloom` `plate` `gear` `orb` `keystone` `dome` `clamp` `bracket` `crest` `cross` `ticket` `rampart` `lynx` `fold` | `octa` |
| `expression` | `idle` `happy` `sleepy` `angry` `sad` `surprised` `suspicious` `wink` `focused` `skeptic` `bored` `lookup` | `idle` |
| `screen` | `eyes` `wave` `dots` `glyph` `think` `search` `code` `work` | `eyes` |
| `optics` | `auto` `mono` `dual` | `auto` |
| `color`, `glow` | `#rrggbb` | `#7cc9ea`, `#46d6ff` |
| `pupils` | `boolean` | `true` |
| `charge`, `curiosity`, `blink` | `0` – `1` | `0.78`, `0.7`, `0.5` |
| `name` | `string`, used in the accessible label | `Rivet` |
| `size` | width in px or any CSS length; the cog is square | `100%` of its container |
| `track` | follow the pointer with the eyes | `true` |
| `onWarnings` | `(warnings: string[]) => void` | |
| `className`, `style` | for the wrapping `<span>`, which sizes the cog | |
| `svgRef` | ref to the `<svg>`, e.g. for exporting it | |

Changing `expression` tweens the eyes to the new mood. The agent displays (`think`, `search`, `code`, `work`) animate with SVG SMIL, so they also move in a server-rendered or exported SVG. With `prefers-reduced-motion`, the eyes stop wandering and blinking.

### Invalid input

As in the studio, missing or invalid fields fall back to the defaults, and broken JSON falls back to the default unit. Nothing throws. Pass `onWarnings` to find out what was replaced:

```tsx
<Cog unit={userJson} onWarnings={(w) => console.warn('cog:', w)} />
// cog: ['chassis: "blob" unknown, using "octa"']
```

`resolveCog(unit, fields)` does the same outside React and returns `{ config, warnings }`.

### CogAvatar and CogTyping

```tsx
import { CogAvatar, CogTyping } from '@cogs/react';

<CogAvatar unit={json} size={56} presence="online" />      // online · busy · away · offline
<CogAvatar unit={json} screen="think" />                   // show what the agent is doing
<CogTyping unit={json}>Rivet is reviewing your PR</CogTyping>
```

`away` closes the unit's eyes and `offline` powers it down. Both need `styles.css`. Retheme them with `--cogs-line`, `--cogs-paper`, `--cogs-ink-2` and `--cogs-ink-3`.

### Server rendering and static SVG

The bundle is marked `'use client'`, so it works in Next.js server components. On the server a cog renders at rest: centred gaze, no blink. To make a static SVG file:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { Cog, LOGO } from '@cogs/react';

const svg = renderToStaticMarkup(<Cog unit={LOGO} size={400} track={false} />);
```

### Data and helpers

The studio's data and JSON tools are exported too:

- `CHASSIS`, `EXPRESSIONS`, `SCREENS`, `PAINTS`, `GLOWS`, plus `CHASSIS_IDS` and `EXPRESSION_IDS` as literal tuples
- `DEFAULT` (Rivet) and `LOGO` (Flange)
- `parseCog(text)`, `toJSON(config)`, `encodeConfig` and `decodeConfig` (the studio's share-link hash), `randomConfig(prev)`, `randomName()`, `serial(config)`, `chassisById` and `expressionById`
- Types: `CogConfig`, `CogInput`, `CogProps`, `ChassisId`, `ExpressionId`, `ScreenMode`, `OpticsMode`, `Presence`, `Chassis`, `Expression`

```ts
import { CHASSIS, parseCog } from '@cogs/react';

const res = parseCog(text);
if ('error' in res) throw new Error(res.error);
res.config; // a valid CogConfig
```

## Develop

The package has no renderer of its own: `src/` wraps and re-exports `app/src/components/Cog.tsx`, `app/src/kit/CogKit.tsx` and `app/src/lib`, and tsup bundles them into `dist/` (ESM, CJS and `.d.ts`). A change to the studio's renderer reaches the package on its next build.

```sh
cd packages/react
bun install
bun run build      # dist/: index.js, index.cjs, index.d.ts, styles.css
bun run test       # builds, then tests the bundle that ships
bun run typecheck
```

`styles.css` copies the display and avatar rules from `app/src/index.css` and `app/src/kit/kit.css`. Update it when those change.
