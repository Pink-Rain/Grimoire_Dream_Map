import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { appStore } from './data/appStore';
import { desktop } from './platform/desktop';
import { syncManager } from './sync/syncManager';
import { DreamEditor } from './ui/DreamEditor';
import { DreamList } from './ui/DreamList';
import { SettingsScreen } from './ui/SettingsScreen';
import { colors, fonts } from './ui/theme';
import { TopBar } from './ui/TopBar';
import { useLayoutMode } from './ui/useLayoutMode';

type Screen = { kind: 'list' } | { kind: 'dream'; id: string } | { kind: 'settings' };

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    appStore.load().then(
      () => {
        setReady(true);
        void syncManager.start();
      },
      (e) => setError(String(e)),
    );
    return installAutoFlush();
  }, []);

  if (error) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Text style={{ color: colors.danger, padding: 24 }}>Impossible de lire les données : {error}</Text>
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <Main />;
}

/** S'assure que tout est écrit sur le disque quand l'app passe en arrière-plan ou se ferme. */
function installAutoFlush(): () => void {
  const sub = AppState.addEventListener('change', (s) => {
    if (s !== 'active') void appStore.flush();
  });
  let offWeb = () => {};
  if (Platform.OS === 'web') {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void appStore.flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    offWeb = () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }
  desktop?.onBeforeClose(() => appStore.flush());
  return () => {
    sub.remove();
    offWeb();
  };
}

function Main() {
  const layout = useLayoutMode();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });

  const goList = () => setScreen({ kind: 'list' });
  const openDream = (id: string) => setScreen({ kind: 'dream', id });
  const newDream = () => setScreen({ kind: 'dream', id: appStore.newId() });
  const openSettings = () => setScreen((s) => (s.kind === 'settings' && !layout.isPhoneLayout ? { kind: 'list' } : { kind: 'settings' }));

  // Bouton « retour » d'Android : revient à la liste.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.kind === 'list') return false;
      goList();
      return true;
    });
    return () => sub.remove();
  }, [screen.kind]);

  const content =
    screen.kind === 'dream' ? (
      <DreamEditor key={screen.id} dreamId={screen.id} onDeleted={goList} bottomInset={insets.bottom} />
    ) : screen.kind === 'settings' ? (
      <SettingsScreen bottomInset={insets.bottom} />
    ) : null;

  let body;
  if (layout.isPhoneLayout) {
    const title = screen.kind === 'dream' ? 'Rêve' : screen.kind === 'settings' ? 'Réglages' : 'Dream Map';
    body = (
      <>
        <TopBar
          title={title}
          layout={layout}
          topInset={insets.top}
          onBack={screen.kind === 'list' ? undefined : goList}
          onSettings={screen.kind === 'list' ? openSettings : undefined}
        />
        <View style={styles.fill}>
          {content ?? <DreamList selectedId={null} onOpen={openDream} onNew={newDream} bottomInset={insets.bottom} />}
        </View>
      </>
    );
  } else {
    body = (
      <>
        <TopBar title="Dream Map" layout={layout} topInset={insets.top} onSettings={openSettings} />
        <View style={[styles.fill, styles.columns]}>
          <View style={styles.sidebar}>
            <DreamList selectedId={screen.kind === 'dream' ? screen.id : null} onOpen={openDream} onNew={newDream} bottomInset={insets.bottom} />
          </View>
          <View style={styles.fill}>{content ?? <Welcome />}</View>
        </View>
      </>
    );
  }

  if (layout.showPhoneFrame) {
    // Format téléphone dans un navigateur : l'app s'affiche dans un cadre de la taille d'un téléphone.
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: '#07060d' }]}>
        <View style={styles.phoneFrame}>{body}</View>
      </View>
    );
  }
  return <View style={styles.fill}>{body}</View>;
}

function Welcome() {
  return (
    <View style={[styles.fill, styles.center, { gap: 8, padding: 24 }]}>
      <Text style={{ color: colors.accent, fontSize: 56 }}>☾</Text>
      <Text style={{ color: colors.faint, fontSize: 13, letterSpacing: 3 }}>GRIMOIRE</Text>
      <Text style={{ color: colors.text, fontSize: 26, fontFamily: fonts.title }}>Dream Map</Text>
      <Text style={{ color: colors.muted, fontSize: 16, textAlign: 'center' }}>
        Choisis un rêve dans la liste, ou note-en un nouveau.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  columns: { flexDirection: 'row' },
  sidebar: { width: 340, borderRightWidth: 1, borderRightColor: colors.border },
  phoneFrame: {
    width: 412,
    height: '100%',
    maxHeight: 900,
    borderRadius: 28,
    borderWidth: 8,
    borderColor: '#2a2440',
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
});
