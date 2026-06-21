// Primary API — this is all most consumers need
export { Spotlight } from './Spotlight';
export { useSpotlight } from './useSpotlight';
export type { SpotlightControls, HighlightOptions } from './useSpotlight';
export { useSpotlightTour } from './useSpotlightTour';
export type {
  SpotlightTourControls,
  SpotlightTourOptions,
  SpotlightTourStep,
  SpotlightTargetProps,
} from './useSpotlightTour';
export { SpotlightProvider, useSpotlightController } from './SpotlightProvider';
export type {
  SpotlightController,
  SpotlightProviderProps,
  SpotlightProviderTargetProps,
} from './SpotlightProvider';

// Escape hatch — for advanced use (custom hybridRef wiring, direct method calls)
export { SpotlightView } from './SpotlightView';
export type {
  SpotlightView as SpotlightViewType,
  Rect,
} from './Spotlight.nitro';
