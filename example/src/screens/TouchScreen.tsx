import { useRef, useState, type ElementRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Spotlight, useSpotlight } from 'react-native-nitro-spotlight';
import { ScreenShell } from '../components/ScreenShell';
import { SpotlightButton } from '../components/SpotlightButton';
import { spotlightProps, styles } from '../theme/styles';

export function TouchScreen() {
  const spotlight = useSpotlight();
  const targetRef = useRef<ElementRef<typeof View>>(null);
  const [buttonPresses, setButtonPresses] = useState(0);
  const [backdropPresses, setBackdropPresses] = useState(0);

  return (
    <ScreenShell
      title="Touch pass-through"
      copy="allowOverlayClick lets backdrop touches hit buttons underneath. onBackdropPress still fires too."
    >
      <View ref={targetRef} style={styles.card}>
        <Text style={styles.cardLabel}>Touch contract</Text>
        <Text style={styles.cardTitle}>Backdrop can pass through</Text>
        <Text style={styles.cardCopy}>
          Turn on the spotlight, then tap the counter button under the dim
          overlay.
        </Text>
      </View>

      <View style={styles.counterRow}>
        <Pressable
          style={styles.counterButton}
          onPress={() => setButtonPresses((count) => count + 1)}
        >
          <Text style={styles.buttonText}>
            Underlay button: {buttonPresses}
          </Text>
        </Pressable>
        <Text style={styles.counterText}>Backdrop taps: {backdropPresses}</Text>
      </View>

      <View style={styles.actions}>
        <SpotlightButton
          label="Highlight touch card"
          onPress={() => spotlight.highlight(targetRef, { durationMs: 420 })}
        />
        <SpotlightButton
          label="Clear"
          variant="secondary"
          onPress={spotlight.clear}
        />
      </View>

      <Spotlight
        controls={spotlight}
        {...spotlightProps}
        allowOverlayClick
        onBackdropPress={() => setBackdropPresses((count) => count + 1)}
      />
    </ScreenShell>
  );
}
