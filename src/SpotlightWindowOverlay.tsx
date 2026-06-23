import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { SpotlightWindowOverlayView } from './SpotlightWindowOverlayView';

export interface SpotlightWindowOverlayProps {
  children?: ReactNode;
  style?: ViewStyle;
}

/**
 * Renders children in a native window-level overlay on iOS.
 * Use this when custom React Native tooltip/content must appear above native
 * headers while still being layered relative to Spotlight.
 */
export function SpotlightWindowOverlay({
  children,
  style,
}: SpotlightWindowOverlayProps) {
  return (
    <SpotlightWindowOverlayView style={[styles.fill, style]}>
      {children}
    </SpotlightWindowOverlayView>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
