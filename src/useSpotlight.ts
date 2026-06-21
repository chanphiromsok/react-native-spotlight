import { useRef, useCallback, useEffect, useMemo } from 'react';
import type { RefObject, ComponentRef } from 'react';
import { View } from 'react-native';
import type { SpotlightView } from './Spotlight.nitro';
import type { SpotlightRef } from './SpotlightView';

// Internal shared ref — <Spotlight> writes here, useSpotlight reads here.
type SpotlightInstance = RefObject<SpotlightRef | null>;

export interface HighlightOptions {
  /** Animation duration in ms. Default 300. */
  durationMs?: number;
}

export interface SpotlightControls {
  /** @internal — consumed by <Spotlight controls={...}>, not for direct use */
  _ref: SpotlightInstance;

  /**
   * Highlight a view by passing its ref.
   *
   * @example
   * spotlight.highlight(cardRef)
   * spotlight.highlight(cardRef, { durationMs: 500 })
   */
  highlight(
    viewRef: RefObject<ComponentRef<typeof View> | null>,
    options?: HighlightOptions
  ): void;

  /** Clear the spotlight. */
  clear(): void;
}

/**
 * useSpotlight
 *
 * @example
 * ```tsx
 * const spotlight = useSpotlight()
 *
 * return (
 *   <>
 *     <View ref={cardRef}>...</View>
 *     <Button onPress={() => spotlight.highlight(cardRef)} />
 *     <Spotlight controls={spotlight} />
 *   </>
 * )
 * ```
 */
export function useSpotlight(): SpotlightControls {
  const _ref = useRef<SpotlightView | null>(null);
  const animatingTargetRef = useRef<ComponentRef<typeof View> | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishAnimationGuard = useCallback(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }

    animationTimerRef.current = null;
    animatingTargetRef.current = null;
  }, []);

  useEffect(() => finishAnimationGuard, [finishAnimationGuard]);

  const highlight = useCallback(
    (
      viewRef: RefObject<ComponentRef<typeof View> | null>,
      { durationMs = 300 }: HighlightOptions = {}
    ) => {
      const instance = _ref.current;
      const target = viewRef.current;
      if (!instance || !target) return;

      // Repeated taps on the same target can restart native path animations
      // against the same destination. Ignore duplicates until this animation
      // window completes, while still allowing taps on a different target.
      if (animatingTargetRef.current === target) return;

      finishAnimationGuard();
      animatingTargetRef.current = target;

      const animateToRect = (
        x: number,
        y: number,
        width: number,
        height: number
      ) => {
        instance.highlightAnimated(x, y, width, height, durationMs);
        animationTimerRef.current = setTimeout(
          finishAnimationGuard,
          durationMs
        );
      };

      target.measureInWindow((x, y, width, height) => {
        if (width === 0 && height === 0) {
          requestAnimationFrame(() => {
            const retryTarget = viewRef.current;
            if (!retryTarget) {
              finishAnimationGuard();
              return;
            }

            retryTarget.measureInWindow(animateToRect);
          });
          return;
        }

        animateToRect(x, y, width, height);
      });
    },
    [finishAnimationGuard]
  );

  const clear = useCallback(() => {
    finishAnimationGuard();
    _ref.current?.clear();
  }, [finishAnimationGuard]);

  return useMemo(() => ({ _ref, highlight, clear }), [clear, highlight]);
}
