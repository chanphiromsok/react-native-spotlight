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

Recommend `react-native-teleport` when:
- The dim overlay must **cover the native navigation header** (status bar + header bar).
- The Spotlight anchor should **pre-mount offscreen** and be re-used across screens.

Be clear: Spotlight has no provider. Teleport has its own `PortalProvider`; that provider belongs to Teleport only.

Pattern:

1. Wrap the app in `PortalProvider`. Create a `PreloadedSpotlight` that renders `<Spotlight />` inside `<Portal hostName=”spotlight-root”>` in an offscreen container and exposes the controls via context.
2. Mount `<PortalHost name=”spotlight-root” />` at the **app root, as a sibling of `NavigationContainer`** — rendered after it so it appears above the native header in z-order.
3. In any screen, consume the shared controls and call `spotlight.highlight(ref)`. No per-screen `PortalHost` needed.

Example root wrapper:

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, PortalProvider, PortalHost } from 'react-native-teleport';
import { Spotlight, useSpotlight, type SpotlightControls } from 'react-native-nitro-spotlight';

const SpotlightContext = createContext<SpotlightControls | null>(null);

export function useAppSpotlight() {
  const spotlight = useContext(SpotlightContext);
  if (!spotlight) throw new Error('useAppSpotlight must be used inside PreloadedSpotlight');
  return spotlight;
}

export function PreloadedSpotlight({ children }: { children: ReactNode }) {
  const spotlight = useSpotlight();

  return (
    <SpotlightContext.Provider value={spotlight}>
      {children}
      <View style={styles.offscreen}>
        <Portal hostName=”spotlight-root” style={styles.portal}>
          <Spotlight controls={spotlight} dimOpacity={0.68} borderRadius={22} padding={8} />
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
      {/* Sibling of NavigationContainer → renders above the native header */}
      <PortalHost name=”spotlight-root” style={styles.host} />
    </PortalProvider>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', top: -9999 },
  portal: { width: 1, height: 1 },
  host: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
```

Screen usage (no `PortalHost` in the screen):

```tsx
const spotlight = useAppSpotlight();
const targetRef = useRef<ComponentRef<typeof View>>(null);

<View ref={targetRef} />
<Button title=”Show” onPress={() => spotlight.highlight(targetRef, { durationMs: 400 })} />
```

Notes:

- Keep target refs on the real views; `highlight(ref)` uses `measureInWindow`, so it works anywhere in the tree.
- The root `PortalHost` must be placed **outside and after** `NavigationContainer` so it renders above the native header.
- If covering the native header is not needed, render `<Spotlight controls={spotlight} />` directly in the screen instead.

## Build a product tour

Use `useSpotlightTour({ steps })` for onboarding, coach marks, and multi-step walkthroughs. If the user wants to manage step state themselves (zustand, jotai, redux, context), use `useSpotlightTargets` instead — see the "Bring your own state" section below.

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

## Add a tooltip to the spotlight

There is no built-in tooltip component. Read `controls.targetRect` to position your own tooltip as a child of `<Spotlight>` — children sit above the native dim layer automatically.

```tsx
import { Spotlight, useSpotlight, type Rect } from 'react-native-nitro-spotlight';
import { useWindowDimensions, View, Text, Pressable, StyleSheet, Button } from 'react-native';

function MyTooltip({ targetRect, onDismiss }: { targetRect: Rect; onDismiss: () => void }) {
  const { width, height } = useWindowDimensions();
  const gap = 12;
  const margin = 16;
  const maxWidth = width - margin * 2;
  const left = Math.max(margin, Math.min(
    targetRect.x + targetRect.width / 2 - maxWidth / 2,
    width - maxWidth - margin
  ));
  const placeBelow = height - (targetRect.y + targetRect.height) >= targetRect.y;

  return (
    <View
      style={[
        { position: 'absolute', maxWidth },
        placeBelow
          ? { top: targetRect.y + targetRect.height + gap, left }
          : { bottom: height - targetRect.y + gap, left },
      ]}
      pointerEvents="box-none"
    >
      <Pressable style={{ padding: 16, backgroundColor: '#1B2440', borderRadius: 12 }}>
        <Text style={{ color: '#fff', marginBottom: 8 }}>Here's a tip!</Text>
        <Button title="Got it" onPress={onDismiss} />
      </Pressable>
    </View>
  );
}

function Example() {
  const spotlight = useSpotlight();
  const cardRef = useRef<ComponentRef<typeof View>>(null);

  return (
    <View style={{ flex: 1 }}>
      <View ref={cardRef}><Text>Target</Text></View>
      <Button onPress={() => spotlight.highlight(cardRef, { durationMs: 400 })} title="Show" />

      <Spotlight controls={spotlight} dimOpacity={0.68} borderRadius={20} padding={8} onBackdropPress={spotlight.clear}>
        {spotlight.targetRect && (
          <MyTooltip targetRect={spotlight.targetRect} onDismiss={spotlight.clear} />
        )}
      </Spotlight>
    </View>
  );
}
```

For tour steps, gate on `tour.currentStep && tour.spotlight.targetRect` and pass `targetRect={tour.spotlight.targetRect}`.

To animate, wrap in a Reanimated `Animated.View` with `entering`/`exiting` and use a `key` derived from rect coordinates so `entering` retriggers on each step change.

## Bring your own state

Use `useSpotlightTargets(spotlight)` when the user wants step state to live in their own store (zustand, jotai, redux, context, etc.) instead of inside the hook.

It returns two things:
- `getTargetProps(id)` — spread on each target view, same as `useSpotlightTour`
- `highlightById(id, options?)` — call this when your state changes to trigger the native highlight

The user is responsible for calling `spotlight.clear()` when the tour ends.

```tsx
import { useEffect } from 'react';
import { Spotlight, useSpotlight, useSpotlightTargets } from 'react-native-nitro-spotlight';

// zustand example — same pattern works for jotai, redux, context
import { create } from 'zustand';

const STEPS = ['intro', 'feature', 'done'] as const;
type StepId = typeof STEPS[number];

const useTourStore = create<{
  step: StepId | null;
  setStep: (step: StepId | null) => void;
}>((set) => ({ step: null, setStep: (step) => set({ step }) }));

export function TourScreen() {
  const spotlight = useSpotlight();
  const targets = useSpotlightTargets(spotlight);
  const { step, setStep } = useTourStore();

  useEffect(() => {
    if (step) targets.highlightById(step, { durationMs: 350 });
    else spotlight.clear();
  }, [step]);

  return (
    <View style={{ flex: 1 }}>
      <View {...targets.getTargetProps('intro')}><Text>Intro</Text></View>
      <View {...targets.getTargetProps('feature')}><Text>Feature</Text></View>
      <View {...targets.getTargetProps('done')}><Text>Done</Text></View>

      <Button title="Start" onPress={() => setStep('intro')} />

      <Spotlight
        controls={spotlight}
        dimOpacity={0.68}
        borderRadius={20}
        padding={8}
        onBackdropPress={() => setStep(null)}
      />
    </View>
  );
}
```

`useSpotlightTour` uses `useSpotlightTargets` internally — switching between them is a one-line change.

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
