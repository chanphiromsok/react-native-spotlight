import { useMemo } from 'react';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { Text, View } from 'react-native';
import {
  Spotlight,
  useSpotlightTour,
} from 'react-native-nitro-spotlight';
import { TooltipCard } from '../components/TooltipCard';
import { ScreenShell } from '../components/ScreenShell';
import { SpotlightButton } from '../components/SpotlightButton';
import { TourTargets } from '../components/TourTargets';
import { spotlightProps, styles } from '../theme/styles';

export function TourScreen() {
  const navigation = useNavigation();
  const steps = useMemo(
    () => [
      {
        id: 'intro',
        title: 'Start here',
        description: 'Targets are registered with tour.getTargetProps(id).',
      },
      {
        id: 'feature',
        title: 'Move smoothly',
        description: 'The same Spotlight component animates between steps.',
      },
      {
        id: 'clear',
        title: 'Finish cleanly',
        description:
          'Next on the last step clears the overlay and ends the tour.',
      },
    ],
    []
  );
  const tour = useSpotlightTour({ steps });

  usePreventRemove(tour.isActive, ({ data }) => {
    tour.stop();
    navigation.dispatch(data.action);
  });

  return (
    <ScreenShell
      title="Product tour"
      copy="Use useSpotlightTour() for onboarding and coach marks. No provider needed."
    >
      <TourTargets tour={tour} />

      <View style={styles.actions}>
        <SpotlightButton label="Start tour" onPress={() => tour.start()} />
        <SpotlightButton
          label="Jump to feature"
          variant="secondary"
          onPress={() => tour.goTo('feature')}
        />
      </View>

      <Spotlight
        controls={tour.spotlight}
        {...spotlightProps}
        allowOverlayClick
      >
        {tour.currentStep && tour.spotlight.targetRect ? (
          <TooltipCard targetRect={tour.spotlight.targetRect}>
            <View style={styles.tooltip}>
              <Text style={styles.tooltipStep}>
                {tour.currentIndex + 1} / {tour.steps.length}
              </Text>
              <Text style={styles.tooltipTitle}>{tour.currentStep.title}</Text>
              <Text style={styles.tooltipCopy}>
                {tour.currentStep.description}
              </Text>
              <View style={styles.tooltipActions}>
                <SpotlightButton
                  label="Back"
                  variant="ghost"
                  onPress={tour.previous}
                />
                <SpotlightButton label="Next" onPress={tour.next} />
                <SpotlightButton
                  label="Stop"
                  variant="secondary"
                  onPress={tour.stop}
                />
              </View>
            </View>
          </TooltipCard>
        ) : null}
      </Spotlight>
    </ScreenShell>
  );
}
