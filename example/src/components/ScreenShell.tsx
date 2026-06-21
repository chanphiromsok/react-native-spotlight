import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { styles } from '../theme/styles';

export function ScreenShell({
  title,
  copy,
  children,
}: {
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.scenarioHeader}>
          <Text style={styles.scenarioTitle}>{title}</Text>
          <Text style={styles.scenarioCopy}>{copy}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}
