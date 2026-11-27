import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { desktop, type DesktopUpdateState } from '../platform/desktop';
import { compareVersions, parseLatestRelease, RELEASES_API, type LatestRelease } from '../platform/version';
import { Button, IconButton, Txt } from './components';
import { colors } from './theme';

const APP_VERSION: string = require('../../package.json').version;

/** App PC : suit l'état de la mise à jour automatique. */
function useDesktopUpdate(): DesktopUpdateState {
  const [s, setS] = useState<DesktopUpdateState>(() => desktop?.update?.get() ?? { status: 'idle' });
  useEffect(() => desktop?.update?.onChange(setS), []);
  return s;
}

/** Android (hors Play Store) : regarde s'il existe une version plus récente sur GitHub. */
function useAndroidUpdate(): LatestRelease | null {
  const [latest, setLatest] = useState<LatestRelease | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let alive = true;
    const check = () =>
      fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const rel = parseLatestRelease(d);
          if (alive && rel && rel.apkUrl && compareVersions(rel.version, APP_VERSION) > 0) setLatest(rel);
        })
        .catch(() => {});
    void check();
    const t = setInterval(check, 6 * 3600 * 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return latest;
}

/** Bandeau discret en haut de l'app quand une mise à jour est prête ou disponible. */
export function UpdateBanner() {
  const d = useDesktopUpdate();
  const a = useAndroidUpdate();
  const [hidden, setHidden] = useState<string | null>(null);

  let text: string | null = null;
  let action: { label: string; onPress: () => void } | null = null;
  let key = '';
  if (d.status === 'ready') {
    key = 'd' + d.version;
    text = `La version ${d.version} est prête. Elle s’installera à la prochaine fermeture, ou tout de suite :`;
    action = { label: 'Redémarrer', onPress: () => desktop?.update?.install() };
  } else if (d.status === 'downloading') {
    key = 'dl' + d.version;
    text = `Téléchargement de la version ${d.version}… ${d.percent} %`;
  } else if (a) {
    key = 'a' + a.version;
    text = `Une nouvelle version (${a.version}) est disponible.`;
    action = { label: 'Télécharger', onPress: () => Linking.openURL(a.apkUrl!) };
  }
  if (!text || hidden === key) return null;

  return (
    <View style={styles.bar} testID="update-banner">
      <Ionicons name="sparkles" size={18} color={colors.ochre} />
      <Txt size={15} style={{ flex: 1 }}>
        {text}
      </Txt>
      {action && <Button small variant="primary" label={action.label} onPress={action.onPress} testID="update-action" />}
      <IconButton icon="close" label="Masquer" size={18} onPress={() => setHidden(key)} />
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
    backgroundColor: colors.surfaceActive,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
