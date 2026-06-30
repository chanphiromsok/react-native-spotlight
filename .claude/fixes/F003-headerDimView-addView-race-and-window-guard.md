# F003 — `headerDimView` addView race condition and cross-window guard

## Race condition (rapid highlight/clear)

`hideHeaderDim()` sets `headerDimAdded = false` synchronously then posts
`removeView` asynchronously (via `dv.post {}`). If `showHeaderDim()` fires
before that post runs, `headerDimAdded == false` but the view is still
attached. Calling `addView` on an already-parented view throws
`"The specified child already has a parent"`.

**Fix in `HybridSpotlightView.kt` `showHeaderDim()`**:
```kotlin
if (headerDimAdded) return
// Re-adopt if the async removeView hasn't run yet
if (headerDimView.parent === dv) {
  headerDimAdded = true
  return
}
dv.addView(...)
```

## Cross-window guard (dialog/sheet)

When the Spotlight overlay is inside a dialog window, `showHeaderDim()` must
NOT add the strip to the activity's decor — it renders behind the dialog and
is invisible, while incorrectly dimming the activity underneath.

**Fix**: first guard in `showHeaderDim()`:
```kotlin
if (spotlightView.windowToken != dv.windowToken) return
```

## Failure history

- Rapid unmount/remount (fast navigation between screens) caused the app to
  accumulate multiple dim strips on the decor view, then crash on the next
  highlight with "already has a parent".
- Adding the dim strip while the overlay was in a BottomSheetDialogFragment
  placed it behind the sheet, doubling the dim on the activity content but
  leaving the sheet itself undimmed.
