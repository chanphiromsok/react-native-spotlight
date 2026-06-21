import { useRef, type ElementRef } from 'react';
import { View } from 'react-native';
import { Spotlight, useSpotlight } from 'react-native-nitro-spotlight';
import { DemoTargets } from '../components/DemoTargets';
import { ScreenShell } from '../components/ScreenShell';
import { SpotlightButton } from '../components/SpotlightButton';
import { spotlightProps, styles } from '../theme/styles';

export function ManualScreen() {
  const spotlight = useSpotlight();
  const introRef = useRef<ElementRef<typeof View>>(null);
  const featureRef = useRef<ElementRef<typeof View>>(null);
  const clearRef = useRef<ElementRef<typeof View>>(null);

  return (
    <ScreenShell
      title="Manual highlight"
      copy="Pass any view ref to spotlight.highlight(ref). Repeated same-target taps are guarded to avoid animation hitching."
    >
      <DemoTargets
        introRef={introRef}
        featureRef={featureRef}
        clearRef={clearRef}
      />

      <View style={styles.actions}>
        <View style={styles.actionGrid}>
          <SpotlightButton
            label="Intro"
            onPress={() => spotlight.highlight(introRef, { durationMs: 420 })}
          />
          <SpotlightButton
            label="Feature"
            onPress={() => spotlight.highlight(featureRef, { durationMs: 420 })}
          />
          <SpotlightButton
            label="Clear card"
            onPress={() => spotlight.highlight(clearRef, { durationMs: 420 })}
          />
        </View>
        <SpotlightButton
          label="Clear spotlight"
          variant="secondary"
          onPress={spotlight.clear}
        />
      </View>

      <Spotlight
        controls={spotlight}
        {...spotlightProps}
        onBackdropPress={spotlight.clear}
      />
    </ScreenShell>
  );
}
