import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { AppIcon, type AppIconName } from './AppIcon';
import { colors, fonts, TOUCH } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type PressState = { pressed: boolean; hovered?: boolean };

const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {};

/** Texte courant (police du thème). */
export function Txt(props: TextProps & { muted?: boolean; faint?: boolean; size?: number; weight?: 'semi' | 'bold'; italic?: boolean }) {
  const { muted, faint, size, weight, italic, style, ...rest } = props;
  return (
    <Text
      {...rest}
      style={[
        {
          color: faint ? colors.faint : muted ? colors.muted : colors.text,
          fontFamily: italic ? fonts.bodyItalic : weight === 'bold' ? fonts.bodyBold : weight === 'semi' ? fonts.bodySemi : fonts.body,
          fontSize: size ?? 17,
          lineHeight: Math.round((size ?? 17) * 1.4),
        },
        style,
      ]}
    />
  );
}

/** Titre en police de vieille carte. */
export function Title(props: TextProps & { size?: number }) {
  const { size, style, ...rest } = props;
  return <Text {...rest} style={[{ color: colors.text, fontFamily: fonts.display, fontSize: size ?? 22 }, style]} />;
}

/** Bouton rond avec une icône (barre du haut, etc.). */
export function IconButton(props: {
  icon?: IconName;
  /** Icône dessinée (prioritaire sur `icon`). */
  image?: AppIconName;
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  testID?: string;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      {...({ title: props.label } as object)}
      testID={props.testID}
      hitSlop={4}
      style={({ pressed, hovered }: PressState) => [
        styles.iconButton,
        props.active && { backgroundColor: colors.surfaceActive },
        (pressed || hovered) && { backgroundColor: colors.surfaceHover },
      ]}
    >
      {props.image ? (
        <AppIcon name={props.image} size={(props.size ?? 24) + 6} />
      ) : (
        <Ionicons name={props.icon ?? 'ellipse'} size={props.size ?? 24} color={props.color ?? (props.active ? colors.accent : colors.text)} />
      )}
    </Pressable>
  );
}

/** Bouton avec texte (et icône facultative). */
export function Button(props: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /** Icône dessinée (prioritaire sur `icon`). */
  image?: AppIconName;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const variant = props.variant ?? 'secondary';
  const fg = variant === 'primary' ? colors.accentText : variant === 'danger' ? colors.danger : variant === 'ghost' ? colors.accent : colors.text;
  return (
    <Pressable
      onPress={props.disabled ? undefined : props.onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!props.disabled }}
      testID={props.testID}
      style={({ pressed, hovered }: PressState) => [
        styles.button,
        props.small && styles.buttonSmall,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonSecondary,
        (pressed || hovered) && !props.disabled && { opacity: 0.85 },
        props.disabled && { opacity: 0.45 },
        props.style,
      ]}
    >
      {props.image ? (
        <AppIcon name={props.image} size={props.small ? 22 : 26} />
      ) : (
        props.icon && <Ionicons name={props.icon} size={props.small ? 17 : 20} color={fg} />
      )}
      <Text style={[styles.buttonText, props.small && { fontSize: 15 }, { color: fg }]}>{props.label}</Text>
    </Pressable>
  );
}

/** Bloc avec un titre (sections des formulaires et réglages). */
export function Section(props: { title: string; hint?: string; children: ReactNode; right?: ReactNode; testID?: string }) {
  return (
    <View style={styles.section} testID={props.testID}>
      <View style={styles.sectionHead}>
        <Title size={18} style={{ flex: 1 }}>
          {props.title}
        </Title>
        {props.right}
      </View>
      {!!props.hint && (
        <Txt muted size={15}>
          {props.hint}
        </Txt>
      )}
      {props.children}
    </View>
  );
}

/** Pastille cliquable (ambiances, étiquettes, personnes, lieux). */
export function Chip(props: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  icon?: IconName;
  image?: AppIconName;
  color?: string;
  testID?: string;
}) {
  const content = (
    <>
      {props.image && <AppIcon name={props.image} size={20} />}
      {!props.image && props.icon && <Ionicons name={props.icon} size={16} color={props.selected ? colors.accentText : props.color ?? colors.muted} />}
      <Text style={[styles.chipText, props.selected && { color: colors.accentText }]} numberOfLines={1}>
        {props.label}
      </Text>
      {props.onRemove && (
        <Pressable onPress={props.onRemove} hitSlop={10} accessibilityLabel={`Retirer ${props.label}`} accessibilityRole="button">
          <Ionicons name="close" size={16} color={props.selected ? colors.accentText : colors.faint} />
        </Pressable>
      )}
    </>
  );
  return (
    <Pressable
      onPress={props.onPress}
      disabled={!props.onPress}
      accessibilityRole={props.onPress ? 'button' : undefined}
      accessibilityState={props.onPress ? { selected: !!props.selected } : undefined}
      testID={props.testID}
      style={({ pressed, hovered }: PressState) => [
        styles.chip,
        props.selected && styles.chipSelected,
        !props.selected && (pressed || hovered) && props.onPress && { backgroundColor: colors.surfaceHover },
      ]}
    >
      {content}
    </Pressable>
  );
}

/** Champ de saisie du thème. */
export function Field(props: TextInputProps & { big?: boolean; inputStyle?: StyleProp<TextStyle> }) {
  const { big, inputStyle, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={colors.faint}
      {...rest}
      style={[styles.field, big && styles.fieldBig, props.multiline && styles.fieldMulti, noOutline, inputStyle, style]}
    />
  );
}

/** Petit libellé au-dessus d'un champ. */
export function Label(props: { children: ReactNode }) {
  return <Text style={styles.label}>{props.children}</Text>;
}

/** Choix exclusif en segments (ex. Réel / Imaginaire). */
export function Segmented<T extends string>(props: {
  value: T;
  options: { value: T; label: string; icon?: IconName; image?: AppIconName; imageOn?: AppIconName }[];
  onChange: (v: T) => void;
  testID?: string;
}) {
  return (
    <View style={styles.segmented} testID={props.testID}>
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => props.onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            testID={props.testID ? `${props.testID}-${o.value}` : undefined}
            style={[styles.segment, on && styles.segmentOn]}
          >
            {o.image ? (
              <AppIcon name={on && o.imageOn ? o.imageOn : o.image} size={22} />
            ) : (
              o.icon && <Ionicons name={o.icon} size={17} color={on ? colors.accentText : colors.muted} />
            )}
            <Text style={[styles.segmentText, on && { color: colors.accentText }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  button: {
    minHeight: TOUCH,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: 14, borderRadius: 10 },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontSize: 17, fontFamily: fonts.bodySemi },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    maxWidth: '100%',
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontFamily: fonts.body, fontSize: 16, flexShrink: 1 },
  field: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 17,
    minHeight: TOUCH,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  fieldBig: { fontFamily: fonts.display, fontSize: 26, borderWidth: 0, borderBottomWidth: 1, borderRadius: 0, paddingHorizontal: 4, backgroundColor: 'transparent' },
  fieldMulti: { minHeight: 140, textAlignVertical: 'top', lineHeight: 25 },
  label: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 14, letterSpacing: 0.4 },
  segmented: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 3, gap: 3 },
  segment: { flex: 1, minHeight: 42, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  segmentOn: { backgroundColor: colors.accent },
  segmentText: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 15 },
});
