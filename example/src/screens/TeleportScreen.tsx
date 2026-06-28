import { useRef, useState, type ElementRef } from 'react';
import { Text, View } from 'react-native';
import {
  Spotlight,
  SpotlightTooltip,
  useSpotlight,
} from 'react-native-nitro-spotlight';
import { Portal, PortalHost } from 'react-native-teleport';
import { ScreenShell } from '../components/ScreenShell';
import { SpotlightButton } from '../components/SpotlightButton';
import { spotlightProps, styles } from '../theme/styles';

export function TeleportScreen() {
  const spotlight = useSpotlight();
  const targetRef = useRef<ElementRef<typeof View>>(null);
  const [hostMounted, setHostMounted] = useState(true);

  return (
    <ScreenShell
      title="react-native-teleport"
      copy="Spotlight is pre-mounted offscreen in a Portal and pulled into this screen by PortalHost."
    >
      <View ref={targetRef} style={styles.card}>
        <Text style={styles.cardLabel}>Teleport</Text>
        <Text style={styles.cardTitle}>Re-parent the anchor</Text>
        <Text style={styles.cardCopy}>
          Toggle the host to simulate screen mount/unmount.
        </Text>
      </View>

      <View style={styles.actions}>
        <SpotlightButton
          label="Highlight teleported"
          onPress={() => spotlight.highlight(targetRef, { durationMs: 420 })}
        />
        <SpotlightButton
          label={hostMounted ? 'Unmount PortalHost' : 'Mount PortalHost'}
          variant="secondary"
          onPress={() => setHostMounted((value) => !value)}
        />
      </View>

      <View style={styles.offscreen}>
        <Portal
          hostName="spotlight-example-overlay"
          style={styles.portalAnchor}
        >
          <Spotlight
            controls={spotlight}
            {...spotlightProps}
            onBackdropPress={spotlight.clear}
          >
            <SpotlightTooltip controls={spotlight}>
              <View style={styles.tooltip}>
                <Text style={styles.tooltipTitle}>Teleported tooltip</Text>
                <Text style={styles.tooltipCopy}>
                  This tooltip and overlay were teleported here from an
                  offscreen Portal via react-native-teleport.
                </Text>
                <View style={styles.tooltipActions}>
                  <SpotlightButton label="Got it" onPress={spotlight.clear} />
                </View>
              </View>
            </SpotlightTooltip>
          </Spotlight>
        </Portal>
      </View>

      {hostMounted && (
        <PortalHost
          name="spotlight-example-overlay"
          style={styles.portalHost}
        />
      )}
    </ScreenShell>
  );
}
