import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import type { Rect } from 'react-native-nitro-spotlight';

interface TooltipCardProps {
  targetRect: Rect;
  children: ReactNode;
  style?: ViewStyle;
}

const GAP = 12;
const MARGIN = 16;

/**
 * Example of building your own positioned tooltip using spotlight.targetRect.
 * Place this as a child of <Spotlight> so it renders above the native dim layer.
 */
export function TooltipCard({ targetRect, children, style }: TooltipCardProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const spaceBelow = screenHeight - (targetRect.y + targetRect.height) - GAP;
  const placeBelow = spaceBelow >= targetRect.y - GAP;

  const maxWidth = screenWidth - MARGIN * 2;
  const left = Math.max(
    MARGIN,
    Math.min(
      targetRect.x + targetRect.width / 2 - maxWidth / 2,
      screenWidth - maxWidth - MARGIN
    )
  );

  const positionStyle: ViewStyle = placeBelow
    ? { top: targetRect.y + targetRect.height + GAP, left, maxWidth }
    : { bottom: screenHeight - targetRect.y + GAP, left, maxWidth };

  return (
    <View style={[styles.container, positionStyle, style]} pointerEvents="box-none">
      <Pressable>{children}</Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute' },
});
