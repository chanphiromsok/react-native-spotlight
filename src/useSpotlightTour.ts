import { useCallback, useMemo, useState } from 'react';
import { useSpotlight, type HighlightOptions } from './useSpotlight';
import {
  useSpotlightTargets,
  type SpotlightTargetProps,
} from './useSpotlightTargets';

export type { SpotlightTargetProps };

export interface SpotlightTourStep extends HighlightOptions {
  id: string;
  title?: string;
  description?: string;
}

export interface SpotlightTourOptions {
  steps: SpotlightTourStep[];
}

export interface SpotlightTourControls {
  spotlight: ReturnType<typeof useSpotlight>;
  steps: SpotlightTourStep[];
  currentStep: SpotlightTourStep | null;
  currentIndex: number;
  isActive: boolean;
  getTargetProps(id: string): SpotlightTargetProps;
  start(idOrIndex?: string | number): void;
  goTo(idOrIndex: string | number): void;
  next(): void;
  previous(): void;
  stop(): void;
}

export function useSpotlightTour({
  steps,
}: SpotlightTourOptions): SpotlightTourControls {
  const spotlight = useSpotlight();
  const { getTargetProps, highlightById } = useSpotlightTargets(spotlight);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const currentStep = currentIndex >= 0 ? (steps[currentIndex] ?? null) : null;
  const isActive = currentStep != null;

  const resolveIndex = useCallback(
    (idOrIndex: string | number): number => {
      if (typeof idOrIndex === 'number') return idOrIndex;
      return steps.findIndex((step) => step.id === idOrIndex);
    },
    [steps]
  );

  const goTo = useCallback(
    (idOrIndex: string | number) => {
      const nextIndex = resolveIndex(idOrIndex);
      const step = steps[nextIndex];
      if (!step) return;

      setCurrentIndex(nextIndex);
      highlightById(
        step.id,
        step.durationMs == null ? undefined : { durationMs: step.durationMs }
      );
    },
    [resolveIndex, highlightById, steps]
  );

  const start = useCallback(
    (idOrIndex: string | number = 0) => {
      goTo(idOrIndex);
    },
    [goTo]
  );

  const next = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= steps.length) {
      spotlight.clear();
      setCurrentIndex(-1);
      return;
    }

    goTo(nextIndex);
  }, [currentIndex, goTo, spotlight, steps.length]);

  const previous = useCallback(() => {
    const previousIndex = currentIndex - 1;
    if (previousIndex < 0) return;
    goTo(previousIndex);
  }, [currentIndex, goTo]);

  const stop = useCallback(() => {
    spotlight.clear();
    setCurrentIndex(-1);
  }, [spotlight]);

  return useMemo(
    () => ({
      spotlight,
      steps,
      currentStep,
      currentIndex,
      isActive,
      getTargetProps,
      start,
      goTo,
      next,
      previous,
      stop,
    }),
    [
      spotlight,
      steps,
      currentStep,
      currentIndex,
      isActive,
      getTargetProps,
      start,
      goTo,
      next,
      previous,
      stop,
    ]
  );
}
