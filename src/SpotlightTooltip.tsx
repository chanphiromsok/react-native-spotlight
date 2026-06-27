import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import type { Rect } from './Spotlight.nitro';
import type { SpotlightControls } from './useSpotlight';

export type SpotlightTooltipPlacement = 'above' | 'below' | 'auto';

export interface SpotlightTooltipProps {
  /** Controls from useSpotlight() or tour.spotlight. */
  controls: SpotlightControls;

  /** Tooltip content — fully unstyled, bring your own design. */
  children: ReactNode;

  /**
   * Where to place the tooltip relative to the cutout.
   * 'auto' picks whichever side has more space. Default: 'auto'.
   */
  placement?: SpotlightTooltipPlacement;

  /** Gap in pixels between the cutout edge and the tooltip. Default: 12. */
  gap?: number;

  /**
   * Called when the user taps the dim backdrop.
   *
   * On Android this is handled by an in-tree Pressable.
   * On iOS the native overlay intercepts backdrop taps — pass the same
   * callback to <Spotlight onBackdropPress={…}> for iOS support.
   */
  onBackdropPress?: () => void;

  /** Style applied to the tooltip container. Use for background, border radius, shadow, etc. */
  style?: ViewStyle;
}

/**
 * SpotlightTooltip
 *
 * Renders tooltip content that appears fully undimmed over the spotlight overlay.
 *
 * iOS — two-cutout architecture:
 *   The tooltip is a normal React view. After layout, it calls setTooltipRect()
 *   so SpotlightView punches a second transparent hole in the native dim layer
 *   at the tooltip's position. The tooltip starts invisible and is shown only
 *   after the hole is confirmed, preventing any flash.
 *
 * Android — elevation:
 *   The React-tree overlay uses elevation 10 000; the tooltip uses 10 001 so
 *   it renders above it without any hole-punching.
 *
 * Visible only when controls.targetRect is non-null (i.e. a highlight is active).
 *
 * @example
 * ```tsx
 * const spotlight = useSpotlight()
 *
 * return (
 *   <>
 *     <YourContent />
 *     <Spotlight controls={spotlight} dimOpacity={0.68} onBackdropPress={spotlight.clear} />
 *     <SpotlightTooltip controls={spotlight} onBackdropPress={spotlight.clear}>
 *       <Text>Here's a tip!</Text>
 *       <Button title="Got it" onPress={spotlight.clear} />
 *     </SpotlightTooltip>
 *   </>
 * )
 * ```
 */
export function SpotlightTooltip({
  controls,
  children,
  placement = 'auto',
  gap = 12,
  onBackdropPress,
  style,
}: SpotlightTooltipProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { targetRect } = controls;
  const tooltipRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);

  const measureAndPunch = useCallback(() => {
    const node = tooltipRef.current;
    const instance = controls._ref.current;
    if (!node || !instance) return;

    node.measureInWindow((x, y, width, height) => {
      if (width === 0 && height === 0) return;
      if (Platform.OS === 'ios') {
        instance.setTooltipRect(x, y, width, height);
      }
      setVisible(true);
    });
  }, [controls._ref]);

  // Hide and re-measure whenever the highlighted target changes.
  useEffect(() => {
    if (!targetRect) {
      setVisible(false);
      if (Platform.OS === 'ios') {
        controls._ref.current?.clearTooltipRect();
      }
      return;
    }

    setVisible(false);
    // Wait one frame so React commits the tooltip's new position to native
    // before we call measureInWindow. onLayout is also wired as a secondary
    // trigger for the initial render case.
    const handle = requestAnimationFrame(measureAndPunch);
    return () => cancelAnimationFrame(handle);
  }, [targetRect, measureAndPunch, controls._ref]);

  // Clear the native hole on unmount.
  useEffect(() => {
    return () => {
      if (Platform.OS === 'ios') {
        controls._ref.current?.clearTooltipRect();
      }
    };
  }, [controls._ref]);

  if (!targetRect) return null;

  const resolved = resolvePlacement(placement, targetRect, screenHeight, gap);
  const tooltipStyle = computeTooltipStyle(
    resolved,
    targetRect,
    screenWidth,
    screenHeight,
    gap
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Android only: full-screen Pressable catches backdrop taps.
          On iOS the native SpotlightView overlay handles them instead. */}
      {Platform.OS === 'android' && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onBackdropPress}
        />
      )}
      <View
        ref={tooltipRef}
        onLayout={measureAndPunch}
        style={[
          styles.tooltip,
          tooltipStyle,
          style,
          !visible && styles.hidden,
        ]}
        pointerEvents="box-none"
      >
        <Pressable onPress={() => {}}>{children}</Pressable>
      </View>
    </View>
  );
}

function resolvePlacement(
  placement: SpotlightTooltipPlacement,
  rect: Rect,
  screenHeight: number,
  gap: number
): 'above' | 'below' {
  if (placement !== 'auto') return placement;
  const spaceBelow = screenHeight - (rect.y + rect.height) - gap;
  const spaceAbove = rect.y - gap;
  return spaceBelow >= spaceAbove ? 'below' : 'above';
}

const TOOLTIP_HORIZONTAL_MARGIN = 16;

function computeTooltipStyle(
  placement: 'above' | 'below',
  rect: Rect,
  screenWidth: number,
  screenHeight: number,
  gap: number
): ViewStyle {
  const maxWidth = screenWidth - TOOLTIP_HORIZONTAL_MARGIN * 2;
  const left = Math.max(
    TOOLTIP_HORIZONTAL_MARGIN,
    Math.min(
      rect.x + rect.width / 2 - maxWidth / 2,
      screenWidth - maxWidth - TOOLTIP_HORIZONTAL_MARGIN
    )
  );

  if (placement === 'below') {
    return { top: rect.y + rect.height + gap, left, maxWidth };
  }

  return { bottom: screenHeight - rect.y + gap, left, maxWidth };
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2147483646,
    elevation: 10001,
  },
  tooltip: {
    position: 'absolute',
  },
  hidden: {
    opacity: 0,
  },
});
