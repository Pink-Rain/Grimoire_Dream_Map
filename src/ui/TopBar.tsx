import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from './components';
import { colors, fonts } from './theme';
import type { LayoutMode } from './useLayoutMode';

export function TopBar(props: {
  title: string;
  onBack?: () => void;
  onSettings?: () => void;
  layout: LayoutMode;
  topInset: number;
}) {
  const { layout } = props;
  return (
    <View style={[styles.bar, { paddingTop: props.topInset }]}>
      <View style={styles.row}>
        {props.onBack ? (
          <IconButton icon="arrow-back" label="Retour" onPress={props.onBack} testID="back" />
        ) : (
          <View style={styles.logo}>
            <Text style={styles.logoGlyph}>☾</Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={1}>
          {props.title}
        </Text>
        {layout.showToggle && (
          <IconButton
            icon={layout.phoneMode ? 'desktop-outline' : 'phone-portrait-outline'}
            label={layout.phoneMode ? 'Passer en format ordinateur' : 'Passer en format téléphone'}
            onPress={layout.togglePhoneMode}
            testID="toggle-format"
          />
        )}
        {props.onSettings && (
          <IconButton icon="settings-outline" label="Réglages" onPress={props.onSettings} testID="open-settings" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  logo: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  logoGlyph: { color: colors.accent, fontSize: 26 },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.title,
    paddingHorizontal: 4,
  },
});
