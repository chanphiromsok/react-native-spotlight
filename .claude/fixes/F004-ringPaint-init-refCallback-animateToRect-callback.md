# F004 — Miscellaneous Android/Kotlin invariants

## Kotlin property initializer order — no forward references

A property initializer cannot reference a property declared later in the same
class body. The compiler rejects it at build time.

**What broke it**: `ringPaint` initializer used `cachedDensity` which was
declared ~50 lines later.

**Fix**: use `resources.displayMetrics.density` directly in the `ringPaint`
init (same value, no forward dependency). Declare any shared value before the
property that consumes it.

---

## `useSpotlightTargets` map — delete on unmount, not store null

The ref callback receives `null` when a view unmounts. Calling `set(id, null)`
leaves a stale entry; future `get(id)` returns `null`, and `highlightById`
silently no-ops for that id until a full remount.

**Fix in `useSpotlightTargets.ts`**:
```ts
ref: (target) => {
  if (target) targetsRef.current.set(id, target);
  else        targetsRef.current.delete(id);
},
```

---

## `animateToRect` — re-read `_ref.current` inside the closure

`highlight()` snapshots the native ref for `measureInWindow`, then calls
`animateToRect`. If `<Spotlight>` unmounts before `measureInWindow` fires,
the old ref is dead. Always re-read `_ref.current` at the top of
`animateToRect` and bail early when null.

---

## `callback()` from nitro-modules — never call in render

Each `callback(fn)` allocates a new Nitro HostObject. Calling it inside
JSX (e.g. `hybridRef={callback(hybridRef)}`) allocates 3 new wrappers on
every `targetRect` change.

**Fix in `Spotlight.tsx`**: wrap each `callback()` call in `useMemo` so it
runs only when the underlying function identity changes.
