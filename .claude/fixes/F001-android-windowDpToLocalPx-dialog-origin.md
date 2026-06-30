# F001 — Android `windowDpToLocalPx`: dialog vs main-activity coordinate origin

## What must be true

`measureInWindow` DIP coordinates have different origins depending on the window:

- **Main activity**: origin = `visibleFrame.top` (status-bar height px).
  → `refY = cachedVisibleFrame.top`
- **Dialog/sheet** (different `windowToken` from the activity): origin = the
  overlay's own screen y-position.
  → `refY = cachedOverlayOrigin[1]`

## How it is detected

`refreshGeometryCache()` in `SpotlightOverlayView.kt` sets `cachedIsDialogWindow`
by comparing `this.windowToken` to `activity.window.decorView.windowToken`.
`windowDpToLocalPx()` picks `refY` from that cached flag.

**Never use a position heuristic** (`overlayOrigin > visibleFrame.top`) — this
fires for any overlay below a navigation header in the main activity and always
gives the wrong result there.

## Failure history

1. Original code used `refY = visibleFrame.top` always.
   → BottomSheet cutout placed ~1000 px off-screen above the sheet.

2. Position-heuristic fix used `refY = overlayOrigin[1]` whenever
   `overlayOrigin[1] > visibleFrame.top`.
   → Main-activity cutout shifted downward by nav-header height
     (user: "hole offset y to bottom").

3. Current fix: window-token comparison. Correct for all three scenarios:
   main activity, portal/Teleport at root (Android 15+ edge-to-edge),
   and BottomSheetDialogFragment.

## Scenarios to verify after any coordinate change

1. Main activity, overlay in React tree below a nav header.
2. Main activity, overlay via Teleport `PortalHost` at root (edge-to-edge).
3. Overlay inside a `BottomSheetDialogFragment` / `formSheet`.
