import { Text, View } from 'react-native';
import { type useSpotlightTour } from 'react-native-nitro-spotlight';
import { styles } from '../theme/styles';

export function TourTargets({
  tour,
}: {
  tour: ReturnType<typeof useSpotlightTour>;
}) {
  return (
    <View style={styles.flexGap}>
      <View {...tour.getTargetProps('intro')} style={styles.card}>
        <Text style={styles.cardLabel}>Tour step</Text>
        <Text style={styles.cardTitle}>Registered target</Text>
        <Text style={styles.cardCopy}>
          getTargetProps adds the ref and collapsable=false.
        </Text>
      </View>
      <View style={styles.row}>
        <View {...tour.getTargetProps('feature')} style={styles.feature}>
          <Text style={styles.featureIcon}>🧭</Text>
          <Text style={styles.featureTitle}>Feature</Text>
          <Text style={styles.featureCopy}>Jump here by id.</Text>
        </View>
        <View {...tour.getTargetProps('clear')} style={styles.feature}>
          <Text style={styles.featureIcon}>🏁</Text>
          <Text style={styles.featureTitle}>Finish</Text>
          <Text style={styles.featureCopy}>End and clean up.</Text>
        </View>
      </View>
    </View>
  );
}
