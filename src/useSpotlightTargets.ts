import { useCallback, useMemo, useRef } from 'react';
import type { ComponentRef, RefCallback } from 'react';
import { View } from 'react-native';
import type { HighlightOptions, SpotlightControls } from './useSpotlight';

export interface SpotlightTargetProps {
  ref: RefCallback<ComponentRef<typeof View>>;
  collapsable: false;
}

export interface SpotlightTargets {
  /** Spread on the target view for a given step id. */
  getTargetProps(id: string): SpotlightTargetProps;
  /** Highlight the registered view for a given step id. No-op if the id is not registered. */
  highlightById(id: string, options?: HighlightOptions): void;
}

/**
 * useSpotlightTargets
 *
 * Handles the id → native View mapping only. Step state (current step,
 * navigation) lives wherever you want — local useState, zustand, jotai,
 * redux, context, whatever.
 *
 * @example
 * ```tsx
 * const spotlight = useSpotlight()
 * const targets = useSpotlightTargets(spotlight)
 *
 * // state lives in your store
 * const { step, setStep } = useMyStore()
 *
 * useEffect(() => {
 *   if (step) targets.highlightById(step, { durationMs: 300 })
 *   else spotlight.clear()
 * }, [step])
 *
 * return (
 *   <>
 *     <View {...targets.getTargetProps('filter')} />
 *     <View {...targets.getTargetProps('save')} />
 *     <Spotlight controls={spotlight} />
 *   </>
 * )
 * ```
 */
export function useSpotlightTargets(
  spotlight: SpotlightControls
): SpotlightTargets {
  const targetsRef = useRef(
    new Map<string, ComponentRef<typeof View> | null>()
  );

  const getTargetProps = useCallback((id: string): SpotlightTargetProps => ({
    collapsable: false,
    ref: (target) => {
      targetsRef.current.set(id, target);
    },
  }), []);

  const highlightById = useCallback(
    (id: string, options?: HighlightOptions) => {
      const target = targetsRef.current.get(id);
      if (!target) return;
      spotlight.highlight({ current: target }, options);
    },
    [spotlight]
  );

  return useMemo(
    () => ({ getTargetProps, highlightById }),
    [getTargetProps, highlightById]
  );
}
