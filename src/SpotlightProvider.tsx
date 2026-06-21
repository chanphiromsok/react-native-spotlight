import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ComponentRef,
  type ReactNode,
  type RefCallback,
} from 'react';
import { View } from 'react-native';
import { Spotlight, type SpotlightComponentProps } from './Spotlight';
import { useSpotlight, type SpotlightControls } from './useSpotlight';
import type { SpotlightTourStep } from './useSpotlightTour';

export interface SpotlightProviderProps extends Omit<
  SpotlightComponentProps,
  'controls' | 'spotlightRef'
> {
  children: ReactNode;
  steps?: SpotlightTourStep[];
}

export interface SpotlightProviderTargetProps {
  ref: RefCallback<ComponentRef<typeof View>>;
  collapsable: false;
}

interface SpotlightSnapshot {
  steps: SpotlightTourStep[];
  currentStep: SpotlightTourStep | null;
  currentIndex: number;
  isActive: boolean;
}

export interface SpotlightController extends SpotlightSnapshot {
  spotlight: SpotlightControls | null;
  getTargetProps(id: string): SpotlightProviderTargetProps;
  start(idOrIndex?: string | number): void;
  start(steps: SpotlightTourStep[], idOrIndex?: string | number): void;
  goTo(idOrIndex: string | number): void;
  next(): void;
  previous(): void;
  stop(): void;
}

const defaultSnapshot: SpotlightSnapshot = {
  steps: [],
  currentStep: null,
  currentIndex: -1,
  isActive: false,
};

function createSpotlightStore() {
  const listeners = new Set<() => void>();
  const targets = new Map<string, ComponentRef<typeof View> | null>();
  let spotlight: SpotlightControls | null = null;
  let snapshot = defaultSnapshot;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const setSnapshot = (
    next: Omit<SpotlightSnapshot, 'currentStep' | 'isActive'>
  ) => {
    const currentStep =
      next.currentIndex >= 0 ? (next.steps[next.currentIndex] ?? null) : null;
    snapshot = {
      ...next,
      currentStep,
      isActive: currentStep != null,
    };
    emit();
  };

  const resolveIndex = (
    idOrIndex: string | number,
    sourceSteps: SpotlightTourStep[] = snapshot.steps
  ) => {
    if (typeof idOrIndex === 'number') return idOrIndex;
    return sourceSteps.findIndex((step) => step.id === idOrIndex);
  };

  const highlightStep = (step: SpotlightTourStep) => {
    const target = targets.get(step.id);
    if (!target || !spotlight) return false;

    spotlight.highlight(
      { current: target },
      step.durationMs == null ? undefined : { durationMs: step.durationMs }
    );
    return true;
  };

  const showStep = (sourceSteps: SpotlightTourStep[], nextIndex: number) => {
    const step = sourceSteps[nextIndex];
    if (!step) return;

    setSnapshot({ steps: sourceSteps, currentIndex: nextIndex });
    if (!highlightStep(step)) {
      requestAnimationFrame(() => highlightStep(step));
    }
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    getSpotlight() {
      return spotlight;
    },
    setSpotlight(nextSpotlight: SpotlightControls | null) {
      spotlight = nextSpotlight;
    },
    setInitialSteps(steps: SpotlightTourStep[]) {
      if (snapshot.steps === steps) return;
      setSnapshot({ steps, currentIndex: snapshot.currentIndex });
    },
    getTargetProps(id: string): SpotlightProviderTargetProps {
      return {
        collapsable: false,
        ref: (target) => {
          targets.set(id, target);
        },
      };
    },
    start(
      stepsOrIdOrIndex?: SpotlightTourStep[] | string | number,
      idOrIndex: string | number = 0
    ) {
      const sourceSteps = Array.isArray(stepsOrIdOrIndex)
        ? stepsOrIdOrIndex
        : snapshot.steps;
      const startAt = Array.isArray(stepsOrIdOrIndex)
        ? idOrIndex
        : (stepsOrIdOrIndex ?? 0);
      const nextIndex = resolveIndex(startAt, sourceSteps);
      showStep(sourceSteps, nextIndex);
    },
    goTo(idOrIndex: string | number) {
      showStep(snapshot.steps, resolveIndex(idOrIndex));
    },
    next() {
      const nextIndex = snapshot.currentIndex + 1;
      if (nextIndex >= snapshot.steps.length) {
        this.stop();
        return;
      }
      showStep(snapshot.steps, nextIndex);
    },
    previous() {
      const previousIndex = snapshot.currentIndex - 1;
      if (previousIndex < 0) return;
      showStep(snapshot.steps, previousIndex);
    },
    stop() {
      spotlight?.clear();
      setSnapshot({ steps: snapshot.steps, currentIndex: -1 });
    },
  };
}

const spotlightStore = createSpotlightStore();

export function SpotlightProvider({
  children,
  steps = [],
  dimOpacity,
  borderRadius,
  padding,
  borderWidth,
  borderColor,
  allowOverlayClick,
  onBackdropPress,
  style,
}: SpotlightProviderProps) {
  const spotlight = useSpotlight();

  useEffect(() => {
    spotlightStore.setSpotlight(spotlight);
    return () => spotlightStore.setSpotlight(null);
  }, [spotlight]);

  useEffect(() => {
    spotlightStore.setInitialSteps(steps);
  }, [steps]);

  const handleBackdropPress = useCallback(() => {
    if (onBackdropPress) {
      onBackdropPress();
      return;
    }
    spotlightStore.stop();
  }, [onBackdropPress]);

  return (
    <>
      {children}
      <Spotlight
        controls={spotlight}
        dimOpacity={dimOpacity}
        borderRadius={borderRadius}
        padding={padding}
        borderWidth={borderWidth}
        borderColor={borderColor}
        allowOverlayClick={allowOverlayClick}
        onBackdropPress={handleBackdropPress}
        style={style}
      />
    </>
  );
}

export function useSpotlightController(): SpotlightController {
  const snapshot = useSyncExternalStore(
    spotlightStore.subscribe,
    spotlightStore.getSnapshot,
    spotlightStore.getSnapshot
  );

  return useMemo(
    () => ({
      ...snapshot,
      spotlight: spotlightStore.getSpotlight(),
      getTargetProps: spotlightStore.getTargetProps,
      start: spotlightStore.start,
      goTo: spotlightStore.goTo,
      next: spotlightStore.next,
      previous: spotlightStore.previous,
      stop: spotlightStore.stop,
    }),
    [snapshot]
  );
}
