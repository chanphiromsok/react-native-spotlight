import { useEffect, useState } from 'react';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { Text, View } from 'react-native';
import {
  Spotlight,
  useSpotlight,
  useSpotlightTargets,
} from 'react-native-nitro-spotlight';
import { TooltipCard } from '../components/TooltipCard';
import { ScreenShell } from '../components/ScreenShell';
import { SpotlightButton } from '../components/SpotlightButton';
import { spotlightProps, styles } from '../theme/styles';

// Step state lives here — swap useState for zustand/jotai/redux/context
// and nothing else changes.

const STEPS = [
  {
    id: 'search',
    title: 'Search your library',
    description:
      'Type anything to filter across all your tracks and playlists.',
  },
  {
    id: 'playlist',
    title: 'Drag to reorder',
    description: 'Long-press any row and drag it to the spot you want.',
  },
  {
    id: 'actions',
    title: 'Quick actions',
    description: 'Swipe left for share, delete, and add-to-queue shortcuts.',
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export function CustomStateScreen() {
  const navigation = useNavigation();

  // ── state lives here, completely detached from the spotlight layer ──
  const [stepId, setStepId] = useState<StepId | null>(null);

  // ── spotlight layer ──
  const spotlight = useSpotlight();
  const targets = useSpotlightTargets(spotlight);

  const currentIndex = STEPS.findIndex((s) => s.id === stepId);
  const currentStep = currentIndex >= 0 ? STEPS[currentIndex] : null;

  // Sync state → native highlight
  useEffect(() => {
    if (stepId) targets.highlightById(stepId, { durationMs: 380 });
    else spotlight.clear();
  }, [stepId, targets.highlightById, spotlight.clear]);

  const start = () => setStepId(STEPS[0].id);
  const next = () => {
    const nextIndex = currentIndex + 1;
    setStepId(nextIndex < STEPS.length ? STEPS[nextIndex].id : null);
  };
  const previous = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) setStepId(STEPS[prevIndex].id);
  };
  const stop = () => setStepId(null);

  usePreventRemove(stepId !== null, ({ data }) => {
    stop();
    navigation.dispatch(data.action);
  });

  return (
    <ScreenShell
      title="Custom state"
      copy="useSpotlightTargets handles ref registration. Step state lives in useState — swap for zustand, jotai, redux, or context without touching spotlight code."
    >
      {/* Targets — spread getTargetProps exactly like useSpotlightTour */}
      <View style={styles.flexGap}>
        <View {...targets.getTargetProps('search')} style={styles.card}>
          <Text style={styles.cardLabel}>Step 1</Text>
          <Text style={styles.cardTitle}>Search bar</Text>
          <Text style={styles.cardCopy}>
            Registered with targets.getTargetProps("search").
          </Text>
        </View>

        <View style={styles.row}>
          <View
            {...targets.getTargetProps('playlist')}
            style={styles.feature}
          >
            <Text style={styles.featureIcon}>🎵</Text>
            <Text style={styles.featureTitle}>Playlist</Text>
            <Text style={styles.featureCopy}>Step 2 target.</Text>
          </View>
          <View
            {...targets.getTargetProps('actions')}
            style={styles.feature}
          >
            <Text style={styles.featureIcon}>⚡</Text>
            <Text style={styles.featureTitle}>Actions</Text>
            <Text style={styles.featureCopy}>Step 3 target.</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <SpotlightButton label="Start tour" onPress={start} />
      </View>

      <Spotlight
        controls={spotlight}
        {...spotlightProps}
        onBackdropPress={stop}
      >
        {currentStep && spotlight.targetRect ? (
          <TooltipCard targetRect={spotlight.targetRect}>
            <View style={styles.tooltip}>
              <Text style={styles.tooltipStep}>
                {currentIndex + 1} / {STEPS.length}
              </Text>
              <Text style={styles.tooltipTitle}>{currentStep.title}</Text>
              <Text style={styles.tooltipCopy}>{currentStep.description}</Text>
              <View style={styles.tooltipActions}>
                <SpotlightButton
                  label="Back"
                  variant="ghost"
                  onPress={previous}
                />
                <SpotlightButton label="Next" onPress={next} />
                <SpotlightButton
                  label="Stop"
                  variant="secondary"
                  onPress={stop}
                />
              </View>
            </View>
          </TooltipCard>
        ) : null}
      </Spotlight>
    </ScreenShell>
  );
}
