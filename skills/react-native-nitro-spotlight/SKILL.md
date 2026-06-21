---
name: react-native-nitro-spotlight
description: Use react-native-nitro-spotlight in React Native New Architecture apps. Activate when users mention spotlight overlays, onboarding tours, product walkthroughs, coach marks, cutout highlights, dim overlays, useSpotlight, useSpotlightTour, Spotlight, allowOverlayClick, or backdrop press behavior.
license: MIT
metadata:
  package: react-native-nitro-spotlight
  npm: react-native-nitro-spotlight
---

# react-native-nitro-spotlight

Use this skill to add or debug spotlight overlays and product tours with `react-native-nitro-spotlight`.

The library highlights React Native views with a native dim overlay and rounded cutout. It is powered by Nitro Modules and targets React Native New Architecture apps.

## Install

```sh
npm install react-native-nitro-spotlight react-native-nitro-modules
```

or:

```sh
yarn add react-native-nitro-spotlight react-native-nitro-modules
```

## Prefer the high-level API

Use `useSpotlight()` and `<Spotlight controls={...} />` for normal app code. Do not add a provider; spotlight state should usually stay local to the screen or flow.

```tsx
import { useRef, type ComponentRef } from 'react';
import { Button, Text, View } from 'react-native';
import { Spotlight, useSpotlight } from 'react-native-nitro-spotlight';

export function Example() {
  const spotlight = useSpotlight();
  const targetRef = useRef<ComponentRef<typeof View>>(null);

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <View ref={targetRef}>
        <Text>Highlight me</Text>
      </View>

      <Button
        title="Highlight"
        onPress={() => spotlight.highlight(targetRef, { durationMs: 400 })}
      />

      <Button title="Clear" onPress={spotlight.clear} />

      <Spotlight
        controls={spotlight}
        dimOpacity={0.68}
        borderRadius={20}
        padding={8}
      />
    </View>
  );
}
```

Do not recommend Spotlight-specific providers or the low-level `SpotlightView` unless the user specifically needs custom Nitro ref wiring.

## Use with react-native-teleport

Usually, users do not need Teleport because `Spotlight` mounts its native overlay itself.

Recommend `react-native-teleport` when the user wants Teleport's preloading/re-parenting pattern: mount the Spotlight anchor offscreen at app startup, then pull the same native view into a screen by mounting a matching `PortalHost`. This should follow Teleport's “preloading heavy components” recipe.

Be clear: Spotlight has no provider. Teleport has its own `PortalProvider`; that provider belongs to Teleport only.

Pattern:

1. At app startup, render `<Spotlight />` inside `<Portal hostName="spotlight-overlay">` in an offscreen container.
2. Share the `useSpotlight()` controls through app code if needed.
3. On the target screen, mount `<PortalHost name="spotlight-overlay" />`.
4. The Spotlight anchor teleports in; when the host unmounts, it returns offscreen.

Example root wrapper:

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, PortalProvider } from 'react-native-teleport';
import { Spotlight, useSpotlight, type SpotlightControls } from 'react-native-nitro-spotlight';

const SpotlightContext = createContext<SpotlightControls | null>(null);

export function useAppSpotlight() {
  const spotlight = useContext(SpotlightContext);
  if (!spotlight) throw new Error('useAppSpotlight must be used inside PreloadedSpotlight');
  return spotlight;
}

function PreloadedSpotlight({ children }: { children: ReactNode }) {
  const spotlight = useSpotlight();

  return (
    <SpotlightContext.Provider value={spotlight}>
      {children}
      <View style={styles.offscreen}>
        <Portal hostName="spotlight-overlay" style={styles.portal}>
          <Spotlight controls={spotlight} />
        </Portal>
      </View>
    </SpotlightContext.Provider>
  );
}

export function App() {
  return (
    <PortalProvider>
      <PreloadedSpotlight>
        <AppNavigator />
      </PreloadedSpotlight>
    </PortalProvider>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', top: -9999 },
  portal: { width: 1, height: 1 },
});
```

Screen usage:

```tsx
import { PortalHost } from 'react-native-teleport';

const spotlight = useAppSpotlight();
const targetRef = useRef<ComponentRef<typeof View>>(null);

<View ref={targetRef} />
<Button title="Show" onPress={() => spotlight.highlight(targetRef)} />
<PortalHost name="spotlight-overlay" style={StyleSheet.absoluteFill} />
```

Notes:

- Keep target refs on the real views; `highlight(ref)` uses `measureInWindow`, so it works after teleporting.
- If there is no preloading/re-parenting need, render `<Spotlight controls={spotlight} />` directly.

## Build a product tour

Use `useSpotlightTour({ steps })` for onboarding, coach marks, and multi-step walkthroughs.

Rules:

- Keep `steps` stable with `useMemo`.
- Spread `tour.getTargetProps(id)` on each target view.
- Render one `<Spotlight controls={tour.spotlight} />` near the screen root.
- Start the tour only after target views are mounted.

```tsx
import { useMemo } from 'react';
import { Button, Text, View } from 'react-native';
import { Spotlight, useSpotlightTour } from 'react-native-nitro-spotlight';

export function TourExample() {
  const steps = useMemo(
    () => [
      {
        id: 'filter',
        title: 'Filter results',
        description: 'Narrow the list to find what you need.',
      },
      {
        id: 'save',
        title: 'Save favorites',
        description: 'Keep useful items for later.',
      },
    ],
    []
  );

  const tour = useSpotlightTour({ steps });

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <View {...tour.getTargetProps('filter')}>
        <Text>Filter</Text>
      </View>

      <View {...tour.getTargetProps('save')}>
        <Text>Save</Text>
      </View>

      <Button title="Start tour" onPress={() => tour.start()} />

      {tour.currentStep && (
        <View style={{ marginTop: 'auto', padding: 16 }}>
          <Text>{tour.currentStep.title}</Text>
          <Text>{tour.currentStep.description}</Text>
          <Button title="Next" onPress={tour.next} />
        </View>
      )}

      <Spotlight
        controls={tour.spotlight}
        onBackdropPress={tour.stop}
      />
    </View>
  );
}
```

## Touch behavior

Be precise. This is the most common source of confusion.

- Touches inside the cutout pass through to the app.
- By default, touches on the dim backdrop are blocked.
- `allowOverlayClick` lets backdrop touches pass through to views/buttons underneath.
- `onBackdropPress` still fires when the backdrop is tapped, even when `allowOverlayClick` is true.

Good wording:

> `allowOverlayClick` lets users click buttons under the dim overlay. It does not disable `onBackdropPress`.

Example:

```tsx
<Spotlight
  controls={spotlight}
  allowOverlayClick
  onBackdropPress={() => {
    console.log('Backdrop tapped, touch still passes through');
  }}
/>
```

## Showcase docs

The README may include platform showcase media under `docs/assets/`. Do not put video files inside the skill package; keep skills lightweight and instruction-only.

When updating docs, keep code examples usable even if showcase media is missing.

## Styling

Common props:

```tsx
<Spotlight
  controls={spotlight}
  dimOpacity={0.68}
  borderRadius={22}
  padding={8}
  borderWidth={1.5}
  borderColor="#FFFFFF"
/>
```

- `dimOpacity`: opacity of the dark overlay.
- `borderRadius`: radius of the cutout.
- `padding`: extra space around the highlighted view.
- `borderWidth`: width of the cutout ring. Use `0` to hide it.
- `borderColor`: ring color.

## Animation notes

The hook and native layers guard against duplicate same-target highlight animations. Repeated taps on the same target should not restart the animation. Tapping a different target should still move the spotlight immediately.

If the user reports visible animation hitches:

- Ask whether it happens on first highlight, same-target repeated taps, or switching targets.
- Use Core Animation traces for frame drops.
- Time Profiler may show no CPU hotspot because the problem can be animation restart/commit behavior rather than slow code.

## Validation

After adding usage to an app, validate with the app's normal commands, usually:

```sh
npx tsc --noEmit
```

For Expo apps, run the app on the target platform and manually verify:

- highlight aligns with the target
- cutout taps pass through
- backdrop behavior matches `allowOverlayClick`
- tour can start, next, previous, and stop
