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
- `src/SpotlightTooltip.tsx`
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

## SpotlightTooltip

`SpotlightTooltip` is a pure JS component (`src/SpotlightTooltip.tsx`). It:

- Reads `controls.targetRect` (set via `_onTargetLayout` → `onTargetLayout` native callback → `windowDpToLocalDip`)
- Positions itself above or below the cutout using `placement` logic
- Is invisible when `targetRect` is null (no active highlight)
- Must be a child of `<Spotlight>` so it composites above the native dim layer in z-order

When debugging tooltip positioning:
- On Android edge-to-edge (Android 15+), `targetRect` coordinates are in overlay-local DIP — verify `windowDpToLocalDip()` is being called in `HybridSpotlightView.highlight()` and `highlightAnimated()`.
- On iOS, `onTargetLayout` fires with window-local coordinates from the native layer; the iOS overlay starts at y=0 (full-screen), so no offset correction is needed.
- `useWindowDimensions()` provides `screenHeight` for placement; this matches the overlay height when the overlay fills the full screen.

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

### Two-layer dim architecture

The Android implementation uses two layers to achieve a full-screen dim that covers the status bar and native navigation header:

1. **`SpotlightOverlayView`** (in the React tree) — the Nitro HybridView returns this as its native view. It draws the dim + cutout over the React-managed content area. Because it lives in the React tree, tooltip children rendered inside `<Spotlight>` composite above the dim layer in Android z-order, matching iOS behavior.

2. **`headerDimView`** (added to `decorView`) — a plain `View` added directly to the activity's `decorView` when a highlight is active. It covers the pixels above the React tree (status bar height + native navigation bar height). It is removed on `clear()`.

This split avoids needing the overlay to span full-screen in the React tree while still giving the appearance of full-screen coverage.

### Edge-to-edge coordinate mismatch (Android 15+)

On Android 15+, edge-to-edge is mandatory — the app window starts at physical y=0 (above the status bar). `measureInWindow` returns DIP relative to `visibleWindowFrame.top` (status bar bottom). When the Spotlight overlay is positioned at y=0 (e.g. via a root-level Teleport `PortalHost`), the raw `measureInWindow` coordinates are offset by the status bar height.

**Fix**: `SpotlightOverlayView.windowDpToLocalDip()` converts `measureInWindow` DIP coordinates into overlay-local DIP by:
1. Converting DIP → screen pixels (multiply by density, add `visibleWindowFrame` offset)
2. Subtracting the overlay's own screen origin (via `getLocationOnScreen`)
3. Dividing back to DIP

`HybridSpotlightView` calls `windowDpToLocalDip()` before firing `onTargetLayout`, so `SpotlightTooltip` always receives rect coordinates in the overlay's local DIP space, regardless of windowing mode.

### Drawing

`SpotlightOverlayView.kt` draws with:

- `Path.addRoundRect(...)` for the cutout hole
- `Paint(Paint.ANTI_ALIAS_FLAG)` for dim and ring
- `Path.FillType.EVEN_ODD` for the cutout overlay

The EVEN_ODD outer rect uses **physical screen bounds** (`displayMetrics.widthPixels` / `heightPixels`) converted to local coordinates. This ensures the outer rect always contains the hole, preventing dim inversion when the overlay is positioned at y=0 (root portal) or inside the React tree below the navigation header.

React Native `measureInWindow` returns DIP coordinates on Android. Convert to local physical pixels via `windowDpToLocalPx()` before drawing or hit testing.

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
