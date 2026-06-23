import { getHostComponent, type HybridView } from 'react-native-nitro-modules';
import type {
  SpotlightWindowOverlayMethods,
  SpotlightWindowOverlayProps,
} from './SpotlightWindowOverlay.nitro';
const SpotlightWindowOverlayConfig = require('../nitrogen/generated/shared/json/SpotlightWindowOverlayViewConfig.json');

export const SpotlightWindowOverlayView = getHostComponent<
  SpotlightWindowOverlayProps,
  SpotlightWindowOverlayMethods
>('SpotlightWindowOverlayView', () => SpotlightWindowOverlayConfig);

export type SpotlightWindowOverlayRef = HybridView<
  SpotlightWindowOverlayProps,
  SpotlightWindowOverlayMethods
>;
