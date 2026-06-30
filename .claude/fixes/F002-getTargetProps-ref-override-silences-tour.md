# F002 — JSX explicit `ref` silently overrides `getTargetProps` ref callback

## What must be true

Never add an explicit `ref={someRef}` to a view that already has
`{...tour.getTargetProps('id')}` spread on it.

In JSX, an explicit `ref` prop wins over the same prop from a spread.
The tour's ref callback is silently dropped, the target map stays empty,
and `highlightById` becomes a no-op with no error.

## Where it is enforced

`useSpotlightTargets.ts` — `getTargetProps` returns `{ ref: RefCallback, collapsable: false }`.
That ref callback must be the view's ONLY ref.

## Failure history

`ShapeScreen.tsx` declared `const avatarRef = useRef()` and then
`<View {...getTargetProps('avatar')} ref={avatarRef}>`. The cutout never
appeared because `targetsRef.current` was always empty — the explicit ref
replaced the callback before any view mounted.

## Fix pattern

```tsx
// WRONG
<View {...tour.getTargetProps('avatar')} ref={avatarRef} />

// RIGHT — getTargetProps is the only ref
<View {...tour.getTargetProps('avatar')} />
```

If you need imperative access to the view for another purpose, use a separate
`onLayout` or a context-level ref rather than a `ref` prop on the same element.
