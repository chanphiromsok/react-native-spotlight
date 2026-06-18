import type {
  HybridView,
  HybridViewProps,
  HybridViewMethods,
} from 'react-native-nitro-modules';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpotlightProps extends HybridViewProps {
  dimOpacity: number;
  cornerRadius: number;
  padding: number;
  // Called after native measures the target — JS uses this to position tooltip
  onTargetLayout?: (rect: Rect) => void;
}

export interface SpotlightMethods extends HybridViewMethods {
  highlight(x: number, y: number, width: number, height: number): void;

  highlightAnimated(
    x: number,
    y: number,
    width: number,
    height: number,
    durationMs: number
  ): void;

  clear(): void;
}

export type SpotlightView = HybridView<SpotlightProps, SpotlightMethods>;
