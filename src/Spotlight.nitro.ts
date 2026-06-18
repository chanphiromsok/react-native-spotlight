import type {
  HybridView,
  HybridViewMethods,
  HybridViewProps,
} from 'react-native-nitro-modules';

export interface SpotlightProps extends HybridViewProps {
  color: string;
}
export interface SpotlightMethods extends HybridViewMethods {}

export type Spotlight = HybridView<
  SpotlightProps,
  SpotlightMethods
>;
