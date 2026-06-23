import { useCallback, useEffect, useState, type RefObject } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { callback } from 'react-native-nitro-modules';
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

  /**
   * iOS only: attach overlay to UIWindow so it covers native headers.
   * Defaults to true. Set false when RN siblings/tooltips must render above it.
   */
  useWindowOverlay?: boolean;

  /** Called when the dimmed backdrop outside the cutout is tapped. */
  onBackdropPress?: () => void;

  /** Additional style for the zero-size native anchor. Usually not needed. */
  style?: ViewStyle;
}

/**
 * Spotlight
 *
 * Drop-in overlay that highlights a measured view with a native cutout.
 * Pair with useSpotlight() to drive it.
 *
 * Renders the native overlay in the current React screen so React Native
 * siblings declared after it (for example tooltips) can draw above it.
 *
 * @example
 * ```tsx
 * const spotlight = useSpotlight()
 *
 * return (
 *   <View style={{ flex: 1 }}>
 *     <YourContent />
 *     <Spotlight controls={spotlight} />
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
  // useWindowOverlay — no longer forwarded to native; SpotlightWindow always manages the overlay
  onBackdropPress,
  style,
}: SpotlightComponentProps) {
  const [spotlightInstance, setSpotlightInstance] =
    useState<SpotlightRef | null>(null);

  const hybridRef = useCallback((ref: SpotlightRef | null) => {
    setSpotlightInstance(ref);
  }, []);

  useEffect(() => {
    const targetRef = controls?._ref ?? spotlightRef;
    if (!targetRef) return;

    if (spotlightInstance) {
      targetRef.current = spotlightInstance;
    }
    return () => {
      targetRef.current?.clear();
      targetRef.current = null;
    };
  }, [controls, spotlightInstance, spotlightRef]);

  return (
    <SpotlightView
      hybridRef={callback(hybridRef)}
      dimOpacity={dimOpacity}
      borderRadius={borderRadius}
      padding={padding}
      borderWidth={borderWidth}
      borderColor={borderColor}
      allowOverlayClick={allowOverlayClick}
      onBackdropPress={callback(onBackdropPress)}
      pointerEvents="none"
      style={[styles.overlay, style]}
    />
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
    elevation: 10000,
  },
});
