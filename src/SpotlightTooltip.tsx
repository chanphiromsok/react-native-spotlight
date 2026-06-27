import type { ReactNode } from 'react';
import {
  Modal,
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
   * Called when the user taps outside the tooltip (on the dim backdrop).
   * Wire this to spotlight.clear() or tour.stop() to dismiss.
   */
  onBackdropPress?: () => void;

  /** Style applied to the tooltip container. Use for background, border radius, shadow, etc. */
  style?: ViewStyle;
}

/**
 * SpotlightTooltip
 *
 * Renders tooltip content ABOVE the dim overlay on iOS by using a Modal,
 * which is presented in a separate UIViewController layer sitting on top of
 * the UIWindow where the spotlight overlay lives.
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
 *     <Spotlight controls={spotlight} dimOpacity={0.68} />
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
    <Modal
      transparent
      animationType="none"
      visible
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* Full-screen backdrop — tap fires onBackdropPress */}
      <Pressable style={styles.backdrop} onPress={onBackdropPress}>
        {/* Tooltip box — tap is consumed here, does not bubble to backdrop */}
        <View style={[styles.tooltip, tooltipStyle, style]}>
          <Pressable onPress={() => {}}>{children}</Pressable>
        </View>
      </Pressable>
    </Modal>
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
  // Center tooltip on the cutout, clamped to screen edges.
  const left = Math.max(
    TOOLTIP_HORIZONTAL_MARGIN,
    Math.min(
      rect.x + rect.width / 2 - maxWidth / 2,
      screenWidth - maxWidth - TOOLTIP_HORIZONTAL_MARGIN
    )
  );

  if (placement === 'below') {
    return {
      top: rect.y + rect.height + gap,
      left,
      maxWidth,
    };
  }

  // 'above': position by bottom edge so the tooltip grows upward.
  return {
    bottom: screenHeight - rect.y + gap,
    left,
    maxWidth,
  };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  tooltip: {
    position: 'absolute',
  },
});
