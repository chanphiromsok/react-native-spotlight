import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ElementRef,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Spotlight,
  SpotlightWindowOverlay,
  useSpotlight,
} from 'react-native-nitro-spotlight';
import { ScreenShell } from '../components/ScreenShell';
import { SpotlightButton } from '../components/SpotlightButton';
import { spotlightProps, styles } from '../theme/styles';

export function TooltipOverlayScreen() {
  const spotlight = useSpotlight();
  const targetRef = useRef<ElementRef<typeof View>>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const showCoachmark = useCallback(() => {
    setIsTooltipVisible(true);
    requestAnimationFrame(() => {
      spotlight.highlight(targetRef, { durationMs: 300 });
    });
  }, [spotlight, targetRef]);

  const hideCoachmark = useCallback(() => {
    setIsTooltipVisible(false);
    spotlight.clear();
  }, [spotlight]);

  useEffect(() => {
    const timeoutId = setTimeout(showCoachmark, 350);
    return () => clearTimeout(timeoutId);
  }, [showCoachmark]);

  return (
    <ScreenShell
      title="Tooltip overlay layering"
      copy="Reproduces a coachmark tooltip rendered as a React Native sibling above the native Spotlight overlay. The white tooltip must stay visible above the dim layer."
    >
      <View style={styles.flexGap}>
        <View ref={targetRef} collapsable={false} style={styles.card}>
          <Text style={styles.cardLabel}>Target</Text>
          <Text style={styles.cardTitle}>Highlighted card</Text>
          <Text style={styles.cardCopy}>
            If the native overlay is too high in z-order, it will cover the
            tooltip below.
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🕳️</Text>
            <Text style={styles.featureTitle}>Hole view</Text>
            <Text style={styles.featureCopy}>
              The dim layer should have a cutout around the card.
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>💬</Text>
            <Text style={styles.featureTitle}>Tooltip</Text>
            <Text style={styles.featureCopy}>
              The white tooltip must render above the overlay.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <SpotlightButton label="Show tooltip overlay" onPress={showCoachmark} />
        <SpotlightButton
          label="Hide"
          variant="secondary"
          onPress={hideCoachmark}
        />
      </View>

      <SpotlightWindowOverlay>
        <View pointerEvents="box-none" style={styles.windowOverlayHost}>
          <Spotlight
            controls={spotlight}
            {...spotlightProps}
            useWindowOverlay={false}
            style={styles.layeringSpotlight}
          />

          {isTooltipVisible ? (
            <View style={styles.layeringTooltipWrap}>
              <View style={styles.layeringTooltipArrow} />
              <View style={styles.layeringTooltipCard}>
                <Text style={styles.tooltipStep}>Tooltip overlay</Text>
                <Text style={styles.tooltipTitle}>
                  This should be above the dim overlay
                </Text>
                <Text style={styles.tooltipCopy}>
                  If this card is hidden or darkened, the Spotlight native layer is
                  still above React Native tooltip content.
                </Text>
                <View style={styles.tooltipActions}>
                  <Pressable onPress={hideCoachmark} style={styles.button}>
                    <Text style={styles.buttonText}>Done</Text>
                  </Pressable>
                  <Pressable
                    onPress={showCoachmark}
                    style={[styles.button, styles.secondaryButton]}
                  >
                    <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                      Replay
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </SpotlightWindowOverlay>
    </ScreenShell>
  );
}
