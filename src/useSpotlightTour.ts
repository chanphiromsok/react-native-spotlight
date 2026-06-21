import { useCallback, useMemo, useRef, useState } from 'react';
import type { ComponentRef, RefCallback } from 'react';
import { View } from 'react-native';
import { useSpotlight, type HighlightOptions } from './useSpotlight';

export interface SpotlightTourStep extends HighlightOptions {
  id: string;
  title?: string;
  description?: string;
}

export interface SpotlightTourOptions {
  steps: SpotlightTourStep[];
}

export interface SpotlightTargetProps {
  ref: RefCallback<ComponentRef<typeof View>>;
  collapsable: false;
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
  const targetsRef = useRef(
    new Map<string, ComponentRef<typeof View> | null>()
  );
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

      const target = targetsRef.current.get(step.id);
      if (!target) return;

      setCurrentIndex(nextIndex);
      spotlight.highlight(
        { current: target },
        step.durationMs == null ? undefined : { durationMs: step.durationMs }
      );
    },
    [resolveIndex, spotlight, steps]
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

  const getTargetProps = useCallback(
    (id: string): SpotlightTargetProps => ({
      collapsable: false,
      ref: (target) => {
        targetsRef.current.set(id, target);
      },
    }),
    []
  );

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
