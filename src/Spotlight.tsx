import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { callback } from 'react-native-nitro-modules';
import type { Rect } from './Spotlight.nitro';
import { SpotlightView, type SpotlightRef } from './SpotlightView';
import type { SpotlightControls } from './useSpotlight';

export interface SpotlightComponentProps {
  /** Controls returned by useSpotlight(). Preferred for app code. */
  controls?: SpotlightControls;

  /** @deprecated Use controls instead. */
  spotlightRef?: RefObject<SpotlightRef | null>;

  /** Opacity of the dim overlay. Omitted values are not sent to native. */
  dimOpacity?: number;

  /** Border radius of the cutout hole. Omitted values are not sent to native. */
  borderRadius?: number;

  /** Padding around the target rect. Omitted values are not sent to native. */
  padding?: number;

  /** Width of the border around the cutout. Set to 0 to remove it. Omitted values are not sent to native. */
  borderWidth?: number;

  /** Color of the border around the cutout. Omitted values are not sent to native. */
  borderColor?: string;

  /** Whether backdrop taps should pass through to Pressables underneath. onBackdropPress still fires. */
  allowOverlayClick?: boolean;

  /** Called when the dimmed backdrop outside the cutout is tapped. */
  onBackdropPress?: () => void;

  /**
   * Called after native highlights a target.
   * Provides the cutout rect in window coordinates — use this to position a tooltip.
   * When using controls, prefer reading controls.targetRect instead.
   */
  onTargetLayout?: (rect: Rect) => void;

  /**
   * Content rendered above the dim overlay (e.g. SpotlightTooltip).
   * Children are siblings of SpotlightView in the React tree, so they
   * composite above the dim layer at higher z-order automatically.
   */
  children?: ReactNode;

  /** Additional style for the overlay. Usually not needed. */
  style?: ViewStyle;
}

/**
 * Spotlight
 *
 * Full-screen overlay that highlights a measured view with a native cutout.
 * Pair with useSpotlight() to drive it.
 *
 * Place children (e.g. SpotlightTooltip) inside to render them above the dim
 * layer without any extra z-index or hole-punching. Works as a regular React
 * Native view — can be wrapped in any portal library (e.g. react-native-teleport)
 * to render from anywhere in the component tree.
 *
 * @example
 * ```tsx
 * const spotlight = useSpotlight()
 *
 * return (
 *   <View style={{ flex: 1 }}>
 *     <YourContent />
 *     <Spotlight controls={spotlight} onBackdropPress={spotlight.clear}>
 *       <SpotlightTooltip controls={spotlight}>
 *         <Text>Here's a tip!</Text>
 *       </SpotlightTooltip>
 *     </Spotlight>
 *   </View>
 * )
 * ```
 */
export function Spotlight({
  controls,
  spotlightRef,
  dimOpacity,
  borderRadius,
  padding,
  borderWidth,
  borderColor,
  allowOverlayClick,
  onBackdropPress,
  onTargetLayout,
  children,
  style,
}: SpotlightComponentProps) {
  // Stable refs so callback() wrappers below never change identity on re-render.
  const onTargetLayoutRef = useRef(onTargetLayout);
  const onBackdropPressRef = useRef(onBackdropPress);
  const controlsRef = useRef(controls);
  const spotlightRefRef = useRef(spotlightRef);
  useEffect(() => {
    onTargetLayoutRef.current = onTargetLayout;
    onBackdropPressRef.current = onBackdropPress;
    controlsRef.current = controls;
    spotlightRefRef.current = spotlightRef;
  });

  // Holds the SpotlightRef without triggering a re-render when it changes.
  const spotlightInstanceRef = useRef<SpotlightRef | null>(null);

  const hybridRef = useCallback((ref: SpotlightRef | null) => {
    spotlightInstanceRef.current = ref;
    const targetRef = controlsRef.current?._ref ?? spotlightRefRef.current;
    if (targetRef) targetRef.current = ref;
  }, []);

  const handleTargetLayout = useCallback((rect: Rect) => {
    controlsRef.current?._onTargetLayout(rect);
    onTargetLayoutRef.current?.(rect);
  }, []);

  const handleBackdropPress = useCallback(() => {
    onBackdropPressRef.current?.();
  }, []);

  // Re-wire the stored instance when the controls/spotlightRef prop changes.
  useEffect(() => {
    const targetRef = controls?._ref ?? spotlightRef;
    if (!targetRef) return;
    targetRef.current = spotlightInstanceRef.current;
    return () => {
      targetRef.current = null;
    };
  }, [controls, spotlightRef]);

  return (
    <View style={[styles.overlay, style]} pointerEvents="box-none">
      <SpotlightView
        hybridRef={callback(hybridRef)}
        dimOpacity={dimOpacity}
        borderRadius={borderRadius}
        padding={padding}
        borderWidth={borderWidth}
        borderColor={borderColor}
        allowOverlayClick={allowOverlayClick}
        onBackdropPress={callback(handleBackdropPress)}
        onTargetLayout={callback(handleTargetLayout)}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2147483647,
  },
});
