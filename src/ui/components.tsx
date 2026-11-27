import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, TOUCH } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Bouton rond avec une icône (barre du haut, etc.). */
export function IconButton(props: { icon: IconName; label: string; onPress: () => void; color?: string; testID?: string }) {
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      // `title` = bulle d'aide au survol de la souris sur PC.
      {...({ title: props.label } as object)}
      testID={props.testID}
      hitSlop={4}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.iconButton,
        (pressed || hovered) && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <Ionicons name={props.icon} size={24} color={props.color ?? colors.text} />
    </Pressable>
  );
}

/** Bouton avec texte (et icône facultative). */
export function Button(props: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const variant = props.variant ?? 'secondary';
  const fg = variant === 'primary' ? colors.accentText : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      testID={props.testID}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
        (pressed || hovered) && { opacity: 0.85 },
        props.style,
      ]}
    >
      {props.icon && <Ionicons name={props.icon} size={20} color={fg} />}
      <Text style={[styles.buttonText, { color: fg }]}>{props.label}</Text>
    </Pressable>
  );
}

export function Section(props: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: TOUCH,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontSize: 16, fontWeight: '600' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
});
