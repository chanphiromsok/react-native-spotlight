import type {
  HybridView,
  HybridViewMethods,
  HybridViewProps,
} from 'react-native-nitro-modules';

export interface SpotlightWindowOverlayProps extends HybridViewProps {}

export interface SpotlightWindowOverlayMethods extends HybridViewMethods {}

export type SpotlightWindowOverlayView = HybridView<
  SpotlightWindowOverlayProps,
  SpotlightWindowOverlayMethods
>;
