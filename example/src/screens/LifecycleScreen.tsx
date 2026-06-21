import { useRef, useState, type ElementRef } from 'react';
import { Text, View } from 'react-native';
import { Spotlight, useSpotlight } from 'react-native-nitro-spotlight';
import { ScreenShell } from '../components/ScreenShell';
import { SpotlightButton } from '../components/SpotlightButton';
import { spotlightProps, styles } from '../theme/styles';

export function LifecycleScreen() {
  const [mounted, setMounted] = useState(true);

  return (
    <ScreenShell
      title="Unmount cleanup"
      copy="Highlight a target, then unmount the child screen. The native overlay should be removed immediately."
    >
      {mounted ? (
        <LifecycleChild onUnmount={() => setMounted(false)} />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>Child unmounted</Text>
          <Text style={styles.emptyCopy}>
            If a spotlight was active, it should be gone now.
          </Text>
          <SpotlightButton
            label="Mount child again"
            onPress={() => setMounted(true)}
          />
        </View>
      )}
    </ScreenShell>
  );
}

function LifecycleChild({ onUnmount }: { onUnmount: () => void }) {
  const spotlight = useSpotlight();
  const targetRef = useRef<ElementRef<typeof View>>(null);

  return (
    <View style={styles.flexGap}>
      <View ref={targetRef} style={styles.card}>
        <Text style={styles.cardLabel}>Lifecycle</Text>
        <Text style={styles.cardTitle}>Screen can move off</Text>
        <Text style={styles.cardCopy}>
          The iOS/Android anchors clean up when this subtree detaches.
        </Text>
      </View>
      <SpotlightButton
        label="Highlight"
        onPress={() => spotlight.highlight(targetRef, { durationMs: 420 })}
      />
      <SpotlightButton
        label="Unmount child now"
        variant="secondary"
        onPress={onUnmount}
      />
      <Spotlight controls={spotlight} {...spotlightProps} />
    </View>
  );
}
