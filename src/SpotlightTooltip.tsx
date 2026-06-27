import type { ReactNode } from 'react';
import {
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

  /** Style applied to the tooltip container. Use for background, border radius, shadow, etc. */
  style?: ViewStyle;
}

/**
 * SpotlightTooltip
 *
 * Renders tooltip content above the dim overlay. Must be placed as a child
 * of <Spotlight> — React UIView subviews composite above the native
 * CAShapeLayer dim layer automatically, so no hole-punching is needed.
 *
 * Backdrop press is handled by <Spotlight onBackdropPress={...}>.
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
 *     <Spotlight controls={spotlight} onBackdropPress={spotlight.clear}>
 *       <SpotlightTooltip controls={spotlight}>
 *         <Text>Here's a tip!</Text>
 *         <Button title="Got it" onPress={spotlight.clear} />
 *       </SpotlightTooltip>
 *     </Spotlight>
 *   </>
 * )
 * ```
 */
export function SpotlightTooltip({
  controls,
  children,
  placement = 'auto',
  gap = 12,
  style,
}: SpotlightTooltipProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { targetRect } = controls;

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
    <View style={[styles.tooltip, tooltipStyle, style]} pointerEvents="box-none">
      {/* Pressable consumes the touch so it doesn't reach SpotlightView's backdrop handler. */}
      <Pressable onPress={() => {}}>{children}</Pressable>
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
  tooltip: {
    position: 'absolute',
  },
});
