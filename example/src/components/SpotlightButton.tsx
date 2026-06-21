import { Pressable, Text } from 'react-native';
import { styles } from '../theme/styles';

export function SpotlightButton({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'ghost' && styles.ghostButton,
        pressed && styles.pressedButton,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.secondaryButtonText,
          variant === 'ghost' && styles.ghostButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
