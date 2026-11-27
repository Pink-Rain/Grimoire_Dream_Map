import Ionicons from '@expo/vector-icons/Ionicons';
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
  if (s.status === 'ready') {
    key = 'r' + s.version;
    text = `La version ${s.version} est prête. Elle s’installera à la prochaine fermeture, ou tout de suite :`;
    action = { label: 'Redémarrer', onPress: installUpdate };
  } else if (s.status === 'installing') {
    key = 'i' + s.version;
    text = `Installation de la version ${s.version}… L’app va se fermer puis se rouvrir toute seule (environ 30 secondes).`;
  } else if (s.status === 'downloading') {
    key = 'd' + s.version;
    text = `Téléchargement de la version ${s.version}… ${s.percent} %`;
  } else if (s.status === 'available') {
    key = 'a' + s.version;
    text = `Une nouvelle version (${s.version}) est disponible.`;
    action = { label: 'Télécharger', onPress: installUpdate };
  }
  if (!text || hidden === key) return null;

  return (
    <View style={styles.bar} testID="update-banner">
      <Ionicons name="sparkles" size={18} color={colors.ochre} />
      <Txt size={15} style={{ flex: 1 }}>
        {text}
      </Txt>
      {action && <Button small variant="primary" label={action.label} onPress={action.onPress} testID="update-action" />}
      {s.status !== 'installing' && <IconButton icon="close" label="Masquer" size={18} onPress={() => setHidden(key)} />}
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
