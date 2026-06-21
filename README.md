# react-native-nitro-spotlight ✨

A tiny native spotlight overlay for React Native. Dim the whole screen, cut a buttery hole around any view, and build product tours that feel clean instead of clunky.

Powered by [Nitro Modules](https://nitro.margelo.com/). Built for the New Architecture.

```tsx
<Spotlight controls={spotlight} />
```

## Why it slaps

- 🎯 Highlight any React Native view by ref
- 🪄 Smooth native cutout animations
- 🧭 Built-in multi-step onboarding tours
- 👆 Touches inside the cutout pass through by default
- 🌑 Custom dim opacity, radius, padding, border width, and border color
- ⚡ Nitro-powered native view, no heavy JS overlay games

## Requirements

- React Native New Architecture
- [`react-native-nitro-modules`](https://nitro.margelo.com/)

## Installation

```sh
npm install react-native-nitro-spotlight react-native-nitro-modules
```

or

```sh
yarn add react-native-nitro-spotlight react-native-nitro-modules
```

## Quick start

Create spotlight controls, attach a ref to the thing you want to highlight, then render `<Spotlight />` once near the root of the screen.

```tsx
import { useRef, type ComponentRef } from 'react';
import { Button, Text, View } from 'react-native';
import { Spotlight, useSpotlight } from 'react-native-nitro-spotlight';

export function Example() {
  const spotlight = useSpotlight();
  const cardRef = useRef<ComponentRef<typeof View>>(null);

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <View ref={cardRef} style={{ padding: 20, borderRadius: 16 }}>
        <Text>Main character energy</Text>
      </View>

      <Button
        title="Highlight card"
        onPress={() => spotlight.highlight(cardRef, { durationMs: 400 })}
      />

      <Button title="Clear" onPress={spotlight.clear} />

      <Spotlight
        controls={spotlight}
        dimOpacity={0.68}
        borderRadius={22}
        padding={8}
        borderColor="#FFFFFF"
      />
    </View>
  );
}
```

That’s it. No measuring. No portal juggling. No chaos.

## Product tour mode 🧭

Use `useSpotlightTour()` when you want a real walkthrough.

Each step has an `id`. Spread `getTargetProps(id)` on the matching view, then call `tour.start()`.

```tsx
import { useMemo } from 'react';
import { Button, Text, View } from 'react-native';
import { Spotlight, useSpotlightTour } from 'react-native-nitro-spotlight';

export function TutorialExample() {
  const steps = useMemo(
    () => [
      {
        id: 'filter',
        title: 'Filter stuff',
        description: 'Use this to find exactly what you need.',
      },
      {
        id: 'item-1',
        title: 'Open an item',
        description: 'Tap a result to see the details.',
      },
      {
        id: 'save',
        title: 'Save it',
        description: 'Keep your favorites for later.',
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

      <View {...tour.getTargetProps('item-1')}>
        <Text>Item 1</Text>
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
        dimOpacity={0.68}
        borderRadius={20}
        padding={8}
        borderColor="#FFFFFF"
        onBackdropPress={tour.stop}
      />
    </View>
  );
}
```

Jump around whenever you need:

```tsx
tour.start('filter'); // start at a specific step
tour.goTo('item-1'); // jump by id
tour.goTo(2); // jump by index
tour.previous(); // go back
tour.stop(); // end the tour
```

> Keep your `steps` stable with `useMemo`, and start the tour only after target views have mounted.

## Touch behavior

The default behavior is usually what you want:

- touches **inside** the cutout pass through to your app
- touches on the dimmed backdrop are blocked
- `onBackdropPress` fires when the backdrop is tapped

`allowOverlayClick` means “let the user click buttons under the dim overlay.” It does **not** disable `onBackdropPress` — the callback still fires when the backdrop is tapped.

Remove the ring:

```tsx
<Spotlight controls={spotlight} borderWidth={0} />
```

Let the dimmed backdrop pass touches through to buttons underneath:

```tsx
<Spotlight
  controls={spotlight}
  allowOverlayClick
  onBackdropPress={() => console.log('Backdrop tapped, but touch still passes through')}
/>
```

Close on backdrop tap:

```tsx
<Spotlight controls={spotlight} onBackdropPress={spotlight.clear} />
```

## API

### `useSpotlight()`

```tsx
const spotlight = useSpotlight();
```

| Field | Type | What it does |
| --- | --- | --- |
| `highlight` | `(viewRef, options?) => void` | Measures a view ref and animates the cutout to it. |
| `clear` | `() => void` | Hides the overlay. |
| `_ref` | `RefObject` | Internal native ref. Use `<Spotlight controls={spotlight} />` instead of touching this directly. |

### `highlight(viewRef, options?)`

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `durationMs` | `number` | `300` | Animation duration in milliseconds. |

### `<Spotlight />`

Render one per screen or flow.

| Prop | Type | What it does |
| --- | --- | --- |
| `controls` | `SpotlightControls` | Controls from `useSpotlight()` or `tour.spotlight`. |
| `dimOpacity` | `number` | Opacity of the dim overlay. |
| `borderRadius` | `number` | Radius of the cutout. |
| `padding` | `number` | Extra space around the highlighted view. |
| `borderWidth` | `number` | Width of the cutout ring. Use `0` to hide it. |
| `borderColor` | `string` | Ring color. Hex strings like `"#FFFFFF"` are supported. |
| `allowOverlayClick` | `boolean` | Lets backdrop touches pass through to views/buttons underneath. `onBackdropPress` still fires. |
| `onBackdropPress` | `() => void` | Called when the backdrop outside the cutout is tapped. |
| `style` | `ViewStyle` | Style for the zero-size native anchor. Usually not needed. |
| `spotlightRef` | `RefObject<SpotlightRef \| null>` | Deprecated escape hatch. Prefer `controls`. |

### `useSpotlightTour({ steps })`

```tsx
const tour = useSpotlightTour({ steps });
```

| Field | Type | What it does |
| --- | --- | --- |
| `spotlight` | `SpotlightControls` | Pass this to `<Spotlight controls={tour.spotlight} />`. |
| `steps` | `SpotlightTourStep[]` | Your tour config. |
| `currentStep` | `SpotlightTourStep \| null` | Active step, or `null` when idle. |
| `currentIndex` | `number` | Active step index, or `-1` when idle. |
| `isActive` | `boolean` | Whether the tour is currently active. |
| `getTargetProps` | `(id: string) => { ref, collapsable: false }` | Spread on the target view for that step. |
| `start` | `(idOrIndex?: string \| number) => void` | Start the tour. Defaults to the first step. |
| `goTo` | `(idOrIndex: string \| number) => void` | Jump to a step. |
| `next` | `() => void` | Move forward. Stops at the end. |
| `previous` | `() => void` | Move back one step. |
| `stop` | `() => void` | Clear the spotlight and end the tour. |

Step shape:

```ts
type SpotlightTourStep = {
  id: string;
  title?: string;
  description?: string;
  durationMs?: number;
};
```

### `SpotlightView`

Low-level native view export for custom wiring.

Most apps should use:

```tsx
<Spotlight controls={spotlight} />
```

Only reach for `SpotlightView` if you need direct native ref control.

```tsx
import { SpotlightView } from 'react-native-nitro-spotlight';
```

## Example app

Run the example to see multiple targets, animated transitions, backdrop behavior, and tour navigation.

```sh
yarn example start
```

## Tips

- Render `<Spotlight />` once, near the root of the screen.
- Use `collapsable={false}` on custom target views if you wire refs manually.
- Keep tour steps stable with `useMemo`.
- Avoid triggering the same highlight repeatedly during an active animation; the hook already guards against duplicate same-target calls.

## License

MIT
