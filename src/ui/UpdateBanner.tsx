import { AppIcon } from './AppIcon';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { installUpdate, useUpdateState } from '../platform/updates';
import { Button, IconButton, Txt } from './components';
import { colors } from './theme';

/** Bandeau discret en haut de l'app quand une mise à jour se télécharge, est prête ou disponible. */
export function UpdateBanner() {
  const s = useUpdateState();
  const [hidden, setHidden] = useState<string | null>(null);

  let text: string | null = null;
  let action: { label: string; onPress: () => void } | null = null;
  let key = '';
  if (s.status === 'ready' && s.light) {
    key = 'r' + s.version;
    text = `La version ${s.version} est prête : l’app se recharge en 2 secondes, sans rien réinstaller.`;
    action = { label: 'Mettre à jour', onPress: installUpdate };
  } else if (s.status === 'ready') {
    key = 'r' + s.version;
    text = `La version ${s.version} est prête. Elle s’installera à la prochaine fermeture, ou tout de suite :`;
    action = { label: 'Redémarrer', onPress: installUpdate };
  } else if (s.status === 'installing') {
    key = 'i' + s.version;
    text = s.light ? `Mise à jour vers la version ${s.version}…` : `Installation de la version ${s.version}… L’app va se fermer puis se rouvrir toute seule (environ 30 secondes).`;
  } else if (s.status === 'apk-ready') {
    key = 'k' + s.version;
    text = `La version ${s.version} est téléchargée. Il reste à confirmer l’installation :`;
    action = { label: 'Installer', onPress: installUpdate };
  } else if (s.status === 'downloading') {
    key = 'd' + s.version;
    text = `Téléchargement de la version ${s.version}… ${s.percent} %`;
  } else if (s.status === 'available') {
    key = 'a' + s.version;
    text = `Une nouvelle version (${s.version}) est disponible.`;
    action = { label: 'Mettre à jour', onPress: installUpdate };
  }
  if (!text || hidden === key) return null;

  return (
    <View style={styles.bar} testID="update-banner">
      <AppIcon name="nouvelle-version" size={24} />
      <Txt size={15} style={{ flex: 1 }}>
        {text}
      </Txt>
      {action && <Button small variant="primary" label={action.label} onPress={action.onPress} testID="update-action" />}
      {s.status !== 'installing' && <IconButton image="fermer" label="Masquer" size={16} onPress={() => setHidden(key)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 2,
    minHeight: 48,
    backgroundColor: colors.surfaceActive,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
