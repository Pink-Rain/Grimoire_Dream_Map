import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { IconButton } from './components';
import { colors, fonts } from './theme';
import type { LayoutMode } from './useLayoutMode';

export function TopBar(props: {
  title: string;
  onBack?: () => void;
  onSettings?: () => void;
  settingsActive?: boolean;
  layout: LayoutMode;
  topInset: number;
  /** Éléments au milieu (onglets) et à droite (actions). */
  center?: ReactNode;
  actions?: ReactNode;
}) {
  const { layout } = props;
  return (
    <View style={[styles.bar, { paddingTop: props.topInset }]}>
      <View style={styles.row}>
        {props.onBack ? (
          <IconButton image="retour" size={22} label="Retour" onPress={props.onBack} testID="back" />
        ) : (
          <View style={styles.logo}>
            <AppIcon name="logo" size={38} />
          </View>
        )}
        <View style={styles.titleBox}>
          {!props.onBack && <Text style={styles.suite}>GRIMOIRE</Text>}
          <Text style={styles.title} numberOfLines={1}>
            {props.title}
          </Text>
        </View>
        {props.center}
        <View style={{ flex: 1 }} />
        {props.actions}
        {layout.showToggle && (
          <IconButton
            image={layout.phoneMode ? 'vue-pc' : 'telephone'}
            label={layout.phoneMode ? 'Passer en format ordinateur' : 'Passer en format téléphone'}
            onPress={layout.togglePhoneMode}
            testID="toggle-format"
          />
        )}
        {props.onSettings && <IconButton image="reglages-sans-fond" label="Réglages" onPress={props.onSettings} active={props.settingsActive} testID="open-settings" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.bgDeep, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  logo: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  logoGlyph: { color: colors.accent, fontSize: 26 },
  titleBox: { paddingHorizontal: 4, flexShrink: 1, marginRight: 8 },
  suite: { color: colors.faint, fontFamily: fonts.body, fontSize: 10, letterSpacing: 3, lineHeight: 12 },
  title: { color: colors.text, fontSize: 22, fontFamily: fonts.display, lineHeight: 26 },
});
