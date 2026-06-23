import { useCallback, useEffect, useRef, useState, type ElementRef } from 'react';
import { Text, View } from 'react-native';
import { Spotlight, useSpotlight } from 'react-native-nitro-spotlight';
import { ScreenShell } from '../components/ScreenShell';
import { SpotlightButton } from '../components/SpotlightButton';
import { spotlightProps, styles } from '../theme/styles';

export function LifecycleScreen() {
  const spotlight = useSpotlight();
  const [mounted, setMounted] = useState(true);

  const handleUnmountChild = useCallback(() => {
    spotlight.clear();
    setMounted(false);
  }, [spotlight]);

  const handleMountChild = useCallback(() => {
    spotlight.clear();
    setMounted(true);
  }, [spotlight]);

  useEffect(() => {
    return () => {
      spotlight.clear();
    };
  }, [spotlight]);

  return (
    <ScreenShell
      title="Unmount cleanup"
      copy="Highlight a target, then unmount the child screen. The native overlay should be removed immediately."
      overlay={
        mounted ? (
          <Spotlight
            controls={spotlight}
            {...spotlightProps}
            style={styles.fullscreenSpotlight}
          />
        ) : null
      }
    >
      {mounted ? (
        <LifecycleChild spotlight={spotlight} onUnmount={handleUnmountChild} />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>Child unmounted</Text>
          <Text style={styles.emptyCopy}>
            If a spotlight was active, it should be gone now.
          </Text>
          <SpotlightButton
            label="Mount child again"
            onPress={handleMountChild}
          />
        </View>
      )}
    </ScreenShell>
  );
}

function LifecycleChild({
  spotlight,
  onUnmount,
}: {
  spotlight: ReturnType<typeof useSpotlight>;
  onUnmount: () => void;
}) {
  const targetRef = useRef<ElementRef<typeof View>>(null);

  const handleHighlight = useCallback(() => {
    spotlight.highlight(targetRef, { durationMs: 420 });
  }, [spotlight]);

  const handleUnmount = useCallback(() => {
    spotlight.clear();
    onUnmount();
  }, [onUnmount, spotlight]);

  useEffect(() => {
    return () => {
      spotlight.clear();
    };
  }, [spotlight]);

  return (
    <View collapsable={false} style={styles.lifecycleStage}>
      <View ref={targetRef} collapsable={false} style={styles.card}>
        <Text style={styles.cardLabel}>Lifecycle</Text>
        <Text style={styles.cardTitle}>Screen can move off</Text>
        <Text style={styles.cardCopy}>
          The iOS/Android anchors clean up when this subtree detaches.
        </Text>
      </View>
      <SpotlightButton
        label="Highlight"
        onPress={handleHighlight}
      />
      <SpotlightButton
        label="Unmount child now"
        variant="secondary"
        onPress={handleUnmount}
      />
    </View>
  );
}
