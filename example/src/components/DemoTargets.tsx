import type { ElementRef } from 'react';
import { Text, View } from 'react-native';
import { styles } from '../theme/styles';

export function DemoTargets({
  introRef,
  featureRef,
  clearRef,
}: {
  introRef: React.RefObject<ElementRef<typeof View> | null>;
  featureRef: React.RefObject<ElementRef<typeof View> | null>;
  clearRef: React.RefObject<ElementRef<typeof View> | null>;
}) {
  return (
    <View style={styles.flexGap}>
      <View ref={introRef} style={styles.card}>
        <Text style={styles.cardLabel}>Step 1</Text>
        <Text style={styles.cardTitle}>Point at any view</Text>
        <Text style={styles.cardCopy}>
          The hook measures this view and sends its window rect to native.
        </Text>
      </View>

      <View style={styles.row}>
        <View ref={featureRef} style={styles.feature}>
          <Text style={styles.featureIcon}>✨</Text>
          <Text style={styles.featureTitle}>Animated</Text>
          <Text style={styles.featureCopy}>Smooth cutout movement.</Text>
        </View>

        <View ref={clearRef} style={styles.feature}>
          <Text style={styles.featureIcon}>🎯</Text>
          <Text style={styles.featureTitle}>Clear</Text>
          <Text style={styles.featureCopy}>Hide the overlay anytime.</Text>
        </View>
      </View>
    </View>
  );
}
