import { useRef, type ElementRef } from 'react';
import { Text, View } from 'react-native';
import {
  Spotlight,
  useSpotlightTour,
} from 'react-native-nitro-spotlight';
import { TooltipCard } from '../components/TooltipCard';
import { ScreenShell } from '../components/ScreenShell';
import { SpotlightButton } from '../components/SpotlightButton';
import { styles } from '../theme/styles';

const CIRCLE_STEPS = [
  {
    id: 'avatar',
    title: 'Your profile',
    description:
      'Tap to edit your photo, display name and bio.',
  },
  {
    id: 'bell',
    title: 'Notifications',
    description: 'See mentions, replies and activity in one place.',
  },
  {
    id: 'fab',
    title: 'Quick compose',
    description: 'Tap the button to start a new post.',
  },
] as const;

export function ShapeScreen() {
  const tour = useSpotlightTour({ steps: [...CIRCLE_STEPS] });

  const avatarRef = useRef<ElementRef<typeof View>>(null);
  const bellRef = useRef<ElementRef<typeof View>>(null);
  const fabRef = useRef<ElementRef<typeof View>>(null);

  return (
    <ScreenShell
      title="Circle cutout"
      copy='Pass shape="circle" to Spotlight for FABs, avatars and icon buttons. borderRadius is ignored — the cutout is a true ellipse.'
    >
      {/* Simulated app UI with circular elements */}
      <View style={circleStyles.toolbar}>
        <View
          {...tour.getTargetProps('avatar')}
          ref={avatarRef}
          style={circleStyles.avatar}
        >
          <Text style={circleStyles.avatarText}>JD</Text>
        </View>

        <Text style={circleStyles.toolbarTitle}>My Feed</Text>

        <View
          {...tour.getTargetProps('bell')}
          ref={bellRef}
          style={circleStyles.iconButton}
        >
          <Text style={circleStyles.iconText}>🔔</Text>
        </View>
      </View>

      <View style={circleStyles.feedPlaceholder}>
        <View style={circleStyles.feedCard} />
        <View style={circleStyles.feedCard} />
        <View style={[circleStyles.feedCard, circleStyles.feedCardShort]} />
      </View>

      <View
        {...tour.getTargetProps('fab')}
        ref={fabRef}
        style={circleStyles.fab}
      >
        <Text style={circleStyles.fabText}>✏️</Text>
      </View>

      <View style={styles.actions}>
        <SpotlightButton label="Start circle tour" onPress={() => tour.start()} />
      </View>

      <Spotlight
        controls={tour.spotlight}
        shape="circle"
        dimOpacity={0.72}
        padding={10}
        borderWidth={2}
        borderColor="#8FB7FF"
        allowOverlayClick
      >
        {tour.currentStep && tour.spotlight.targetRect ? (
          <TooltipCard targetRect={tour.spotlight.targetRect}>
            <View style={styles.tooltip}>
              <Text style={styles.tooltipStep}>
                {tour.currentIndex + 1} / {CIRCLE_STEPS.length}
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

const circleStyles = {
  toolbar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4263EB',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800' as const,
  },
  toolbarTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800' as const,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1B2440',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: '#2B3658',
  },
  iconText: { fontSize: 22 },
  feedPlaceholder: { gap: 12, flex: 1 },
  feedCard: {
    height: 100,
    borderRadius: 18,
    backgroundColor: '#1B2440',
    borderWidth: 1,
    borderColor: '#2B3658',
  },
  feedCardShort: { height: 68 },
  fab: {
    position: 'absolute' as const,
    bottom: 80,
    right: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8FB7FF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  fabText: { fontSize: 24 },
};
