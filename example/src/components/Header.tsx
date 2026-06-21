import { Text, View } from 'react-native';
import { styles } from '../theme/styles';

export function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>react-native-nitro-spotlight</Text>
      <Text style={styles.title}>Vibe spotlight lab</Text>
      <Text style={styles.subtitle}>
        A navigation-based example with one screen per scenario: manual, tour,
        touch, unmount cleanup, and react-native-teleport.
      </Text>
    </View>
  );
}
