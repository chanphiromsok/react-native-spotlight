---
name: react-native-nitro-spotlight-maintainer
description: Maintain and debug the react-native-nitro-spotlight library itself. Activate when editing this repository, native iOS or Android overlay code, Nitro view specs, package exports, README examples, animation behavior, touch pass-through, or profiling spotlight performance.
license: MIT
metadata:
  package: react-native-nitro-spotlight
  role: maintainer
---

# react-native-nitro-spotlight maintainer

Use this skill when working inside the `react-native-nitro-spotlight` repository.

## Repository map

Public JS/TS API:

- `src/index.tsx`
- `src/Spotlight.tsx`
- `src/useSpotlight.ts`
- `src/useSpotlightTour.ts`
- `src/SpotlightView.tsx`
- `src/Spotlight.nitro.ts`

Native iOS:

- `ios/SpotlightOverlayView.swift`
- `ios/HybridSpotlightView.swift`

Native Android:

- `android/src/main/java/com/margelo/nitro/spotlight/SpotlightOverlayView.kt`
- `android/src/main/java/com/margelo/nitro/spotlight/HybridSpotlightView.kt`

Docs/example:

- `README.md`
- `example/src/App.tsx`

## Public API rules

Prefer this API for users:

```tsx
const spotlight = useSpotlight();

<Spotlight controls={spotlight} />

spotlight.highlight(targetRef, { durationMs: 400 });
spotlight.clear();
```

Keep `SpotlightView` as a low-level escape hatch only.

Do not reintroduce a Spotlight provider API. The intended model is local controls per screen/flow:

- `useSpotlight()` for single-target/manual highlighting
- `useSpotlightTour()` for multi-step tours
- `<Spotlight controls={...} />` rendered once near the screen root

Teleport integration is allowed, but keep the distinction clear:

- Spotlight itself has no provider.
- `react-native-teleport` uses `PortalProvider`, `PortalHost`, and `Portal` when users want the Spotlight anchor in a top-level overlay host.
- Target refs stay on the original views because `highlight(ref)` uses `measureInWindow`.

For tours:

```tsx
const tour = useSpotlightTour({ steps });

<View {...tour.getTargetProps('step-id')} />
<Spotlight controls={tour.spotlight} />
```

## Touch behavior contract

Do not regress this behavior:

- Touches inside the cutout pass through to the app.
- Backdrop touches are blocked by default.
- `allowOverlayClick` lets backdrop touches pass through to underlying views/buttons.
- `onBackdropPress` fires when the backdrop is tapped regardless of `allowOverlayClick`.

Never document `onBackdropPress` as only firing when `allowOverlayClick` is false.

## Animation contract

Do not restart duplicate same-target animations.

Expected behavior:

- Same target while currently animating: ignore duplicate highlight.
- Different target: interrupt and animate to the new target.
- Duplicate clear while clearing: ignore duplicate clear.

Visible hitches can happen without CPU slowness. Prefer Core Animation traces when diagnosing animation smoothness.

## iOS notes

`SpotlightOverlayView.swift` draws with:

- `UIBezierPath(roundedRect:cornerRadius:)`
- `CAShapeLayer`
- even-odd fill for the cutout

Avoid shadowing UIKit method names. Example pitfall:

```swift
let point = touches.first?.location(in: self)
point(inside: point, with: event) // wrong: local CGPoint shadows method
```

Use a different variable name like `touchPoint`.

## Android notes

`SpotlightOverlayView.kt` draws with:

- `Path.addRoundRect(...)`
- `Paint(Paint.ANTI_ALIAS_FLAG)`
- even-odd overlay path

React Native `measureInWindow` returns DIP coordinates on Android. Convert to local physical pixels before drawing or hit testing.

## Validation checklist

Always run TypeScript validation after public API changes:

```sh
npx tsc --noEmit
```

For iOS changes, run from the example app:

```sh
npm run build:ios
```

For Android changes, run:

```sh
npm run build:android
```

For docs changes, ensure examples use the package name:

```tsx
import { Spotlight, useSpotlight } from 'react-native-nitro-spotlight';
```

## Profiling guidance

When analyzing `.trace` files:

1. Use `xcrun xctrace export --input file.trace --toc` to inspect metadata.
2. Export Time Profiler tables only when CPU is suspected.
3. Prefer Core Animation for visual frame hitches.
4. Ignore simulator/dev-client startup noise unless the issue is startup performance.
5. Look after startup windows, not just the whole trace.

Common noise in debug simulator traces:

- Swift protocol conformance / metadata
- dyld startup
- Hermes runtime
- Expo dev-client infrastructure
