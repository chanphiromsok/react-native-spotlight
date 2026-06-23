// Primary API — this is all most consumers need
export { Spotlight } from './Spotlight';
export { SpotlightWindowOverlay } from './SpotlightWindowOverlay';
export { useSpotlight } from './useSpotlight';
export { useSpotlightTour } from './useSpotlightTour';
export type {
  SpotlightTourControls,
  SpotlightTourOptions,
  SpotlightTourStep,
  SpotlightTargetProps,
} from './useSpotlightTour';

// Escape hatch — for advanced use (custom hybridRef wiring, direct method calls)
export { SpotlightView } from './SpotlightView';
export type {
  SpotlightView as SpotlightViewType,
  Rect,
} from './Spotlight.nitro';

// src/index.ts — add alongside existing exports:
export {
  SpotlightTooltipHost,
  useSpotlightTooltip,
  computeTooltipFrame,
} from './SpotlightTooltipHost';
export type { TooltipPlacement } from './SpotlightTooltipHost';
export type { SpotlightControls, TooltipFrame } from './useSpotlight';
