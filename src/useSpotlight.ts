// src/useSpotlight.ts
import { useRef, useCallback, useMemo } from 'react';
import type { ComponentRef } from 'react';
import type { View } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HighlightOptions {
  /** Animate the cutout over this many milliseconds. Omit for an instant snap. */
  durationMs?: number;
}

export interface TooltipFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpotlightControls {
  /** Measure a view ref and animate the cutout to it. */
  highlight: (
    viewRef: React.RefObject<ComponentRef<typeof View> | null>,
    options?: HighlightOptions
  ) => void;
  /** Hide the overlay and detach any tooltip. */
  clear: () => void;
  /**
   * Reparent the RN view identified by `tag` (from findNodeHandle) into
   * SpotlightWindow's tooltip host layer at the given screen-space frame.
   * The view MUST be rendered above NavigationContainer in the React tree.
   */
  showTooltip: (tag: number, frame: TooltipFrame) => void;
  /** Remove the tooltip from SpotlightWindow. */
  hideTooltip: () => void;
  /** Internal ref — prefer the control methods above. */
  _ref: React.RefObject<any>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpotlight(): SpotlightControls {
  const _ref = useRef<any>(null);

  const highlight = useCallback(
    (
      viewRef: React.RefObject<ComponentRef<typeof View> | null>,
      options?: HighlightOptions
    ) => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        const native = _ref.current;
        if (!native) return;
        // Default to 300 ms animation so tour transitions are smooth.
        // Pass durationMs: 0 to snap instantly without animation.
        const durationMs = options?.durationMs;
        if (durationMs === 0) {
          native.highlight(x, y, width, height);
        } else {
          native.highlightAnimated(x, y, width, height, durationMs ?? 300);
        }
      });
    },
    []
  );

  // clear() → native takes no args (spec: `clear() throws -> Void`)
  const clear = useCallback(() => {
    _ref.current?.clear();
    // hideTooltip is also called by the native clear() implementation,
    // but calling it here keeps JS state in sync without waiting for native.
    _ref.current?.hideTooltip();
  }, []);

  const showTooltip = useCallback((tag: number, frame: TooltipFrame) => {
    _ref.current?.showTooltip(tag, frame.x, frame.y, frame.width, frame.height);
  }, []);

  const hideTooltip = useCallback(() => {
    _ref.current?.hideTooltip();
  }, []);

  // Stable object reference — all members are useRef/useCallback with empty deps.
  // Without this, a new object every render would change the `controls` prop on
  // <Spotlight>, trigger its useEffect cleanup, and call clear() immediately after
  // highlight() on the first press (before the second press which sees no state change).
  return useMemo(
    () => ({ highlight, clear, showTooltip, hideTooltip, _ref }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // all members are stable for the lifetime of the hook
  );
}
