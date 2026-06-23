import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, Text, View } from 'react-native';
import { Header } from '../components/Header';
import type { RootStackParamList } from '../navigation/types';
import { styles } from '../theme/styles';

const SCENARIOS: Array<{
  name: keyof RootStackParamList;
  title: string;
  icon: string;
  copy: string;
}> = [
  {
    name: 'Manual',
    title: 'Manual highlight',
    icon: '🎯',
    copy: 'Highlight any measured ref directly.',
  },
  {
    name: 'Tour',
    title: 'Product tour',
    icon: '🧭',
    copy: 'Run next/back/stop with useSpotlightTour.',
  },
  {
    name: 'Touch',
    title: 'Touch behavior',
    icon: '👆',
    copy: 'Test allowOverlayClick and backdrop press.',
  },
  {
    name: 'TooltipOverlay',
    title: 'Tooltip overlay layering',
    icon: '💬',
    copy: 'Reproduce tooltip vs native overlay z-order.',
  },
  {
    name: 'Lifecycle',
    title: 'Unmount cleanup',
    icon: '🧼',
    copy: 'Unmount while highlighted and verify cleanup.',
  },
  {
    name: 'Teleport',
    title: 'Teleport host',
    icon: '🌀',
    copy: 'Preload offscreen and pull in with PortalHost.',
  },
];

export function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Header />

        <View style={styles.scenarioList}>
          {SCENARIOS.map((scenario) => (
            <Pressable
              key={scenario.name}
              accessibilityRole="button"
              onPress={() => navigation.navigate(scenario.name)}
              style={({ pressed }) => [
                styles.navCard,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.navIcon}>{scenario.icon}</Text>
              <View style={styles.navCopyWrap}>
                <Text style={styles.navTitle}>{scenario.title}</Text>
                <Text style={styles.navCopy}>{scenario.copy}</Text>
              </View>
              <Text style={styles.navArrow}>→</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
