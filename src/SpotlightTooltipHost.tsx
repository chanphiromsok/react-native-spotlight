// src/SpotlightTooltipHost.tsx
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { StyleSheet, View, findNodeHandle } from 'react-native';
import type { SpotlightControls, TooltipFrame } from './useSpotlight';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface SpotlightTooltipContextValue {
  show: (
    content: ReactNode,
    targetRect: TooltipFrame,
    placement?: TooltipPlacement
  ) => void;
  hide: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SpotlightTooltipCtx = createContext<SpotlightTooltipContextValue | null>(
  null
);

export function useSpotlightTooltip(): SpotlightTooltipContextValue {
  const ctx = useContext(SpotlightTooltipCtx);
  if (!ctx) {
    throw new Error(
      'useSpotlightTooltip must be used inside <SpotlightTooltipHost>'
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

const TOOLTIP_W = 260;
const TOOLTIP_H = 120;
const GAP = 16;
const EDGE_PAD = 8;

export function computeTooltipFrame(
  target: TooltipFrame,
  placement: TooltipPlacement = 'bottom'
): TooltipFrame {
  switch (placement) {
    case 'bottom':
      return {
        x: Math.max(EDGE_PAD, target.x + target.width / 2 - TOOLTIP_W / 2),
        y: target.y + target.height + GAP,
        width: TOOLTIP_W,
        height: TOOLTIP_H,
      };
    case 'top':
      return {
        x: Math.max(EDGE_PAD, target.x + target.width / 2 - TOOLTIP_W / 2),
        y: target.y - TOOLTIP_H - GAP,
        width: TOOLTIP_W,
        height: TOOLTIP_H,
      };
    case 'left':
      return {
        x: target.x - TOOLTIP_W - GAP,
        y: target.y + target.height / 2 - TOOLTIP_H / 2,
        width: TOOLTIP_W,
        height: TOOLTIP_H,
      };
    case 'right':
      return {
        x: target.x + target.width + GAP,
        y: target.y + target.height / 2 - TOOLTIP_H / 2,
        width: TOOLTIP_W,
        height: TOOLTIP_H,
      };
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface SpotlightTooltipHostProps {
  spotlight: SpotlightControls;
  children: ReactNode;
}

/**
 * Wrap your app (or any subtree) with SpotlightTooltipHost to enable
 * useSpotlightTooltip() in all descendant screens.
 *
 * The spotlight overlay uses the FullWindowOverlay pattern — it attaches a
 * container directly to the main UIWindow as its last subview, sitting above
 * navigation headers without a secondary UIWindow.
 * Because the tooltip slot and the overlay container are in the SAME UIWindow,
 * reparenting the slot view is a same-window move and never triggers
 * UIViewControllerHierarchyInconsistency — so SpotlightTooltipHost can be
 * placed anywhere: above NavigationContainer, inside a screen, wherever.
 *
 * Recommended placement (keeps context available app-wide):
 *
 *   <SpotlightTooltipHost spotlight={spotlight}>
 *     <NavigationContainer>
 *       <RootNavigator />
 *     </NavigationContainer>
 *   </SpotlightTooltipHost>
 */
export function SpotlightTooltipHost({
  spotlight,
  children,
}: SpotlightTooltipHostProps) {
  const slotRef = useRef<ComponentRef<typeof View>>(null);
  const [slotContent, setSlotContent] = useState<ReactNode>(null);

  const show = useCallback(
    (
      content: ReactNode,
      targetRect: TooltipFrame,
      placement: TooltipPlacement = 'bottom'
    ) => {
      // 1. Mount the content into the off-screen slot
      setSlotContent(content);

      // 2. Wait one frame for Fabric to commit the slot UIView to the native tree,
      //    then reparent it into SpotlightWindow's tooltip host layer.
      requestAnimationFrame(() => {
        const tag = findNodeHandle(slotRef.current);
        if (tag == null) {
          console.warn('[SpotlightTooltipHost] findNodeHandle returned null');
          return;
        }
        const frame = computeTooltipFrame(targetRect, placement);
        spotlight.showTooltip(tag, frame);
      });
    },
    [spotlight]
  );

  const hide = useCallback(() => {
    // 1. Tell native to remove the view from SpotlightWindow immediately
    spotlight.hideTooltip();

    // 2. Clear slot content after a short delay so the UIView isn't destroyed
    //    before the native detach completes
    setTimeout(() => setSlotContent(null), 50);
  }, [spotlight]);

  return (
    <SpotlightTooltipCtx.Provider value={{ show, hide }}>
      {children}

      {/*
        The tooltip slot — always mounted, always off-screen.
        Its UIView is reparented into SpotlightWindow by show(), returned by hide().
        CRITICAL: This must remain a sibling of {children} (NavigationContainer),
        NOT a descendant of it, to avoid RNSScreen in the UIView's ancestor chain.
      */}
      <View
        ref={slotRef}
        collapsable={false}
        pointerEvents="box-none"
        style={styles.slot}
      >
        {slotContent}
      </View>
    </SpotlightTooltipCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    // No width/height — children define their own dimensions.
    // Native frame is set via spotlight.showTooltip() frame argument.
  },
});
