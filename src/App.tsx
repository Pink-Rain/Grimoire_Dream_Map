import { EBGaramond_400Regular } from '@expo-google-fonts/eb-garamond/400Regular';
import { EBGaramond_400Regular_Italic } from '@expo-google-fonts/eb-garamond/400Regular_Italic';
import { EBGaramond_600SemiBold } from '@expo-google-fonts/eb-garamond/600SemiBold';
import { EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond/700Bold';
import { IMFellEnglish_400Regular } from '@expo-google-fonts/im-fell-english/400Regular';
import { IMFellEnglish_400Regular_Italic } from '@expo-google-fonts/im-fell-english/400Regular_Italic';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { appStore } from './data/appStore';
import { desktop } from './platform/desktop';
import { syncManager } from './sync/syncManager';
import { DreamEditor } from './ui/DreamEditor';
import { Button, Segmented, Title, Txt } from './ui/components';
import { DreamList } from './ui/DreamList';
import { MapScreen } from './ui/MapScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { colors, fonts } from './ui/theme';
import { TopBar } from './ui/TopBar';
import { useLayoutMode } from './ui/useLayoutMode';

type Tab = 'map' | 'journal';
type Overlay = { kind: 'dream'; id: string; initialKind?: 'quick' | 'full' } | { kind: 'settings' } | null;

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
  const [fontsLoaded, fontError] = useFonts({
    IMFellEnglish_400Regular,
    IMFellEnglish_400Regular_Italic,
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    EBGaramond_600SemiBold,
    EBGaramond_700Bold,
    ...Ionicons.font,
  });

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
  if (!ready || (!fontsLoaded && !fontError)) {
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
  const [tab, setTab] = useState<Tab>('map');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const phone = layout.isPhoneLayout;

  const close = () => setOverlay(null);
  const openDream = (id: string) => setOverlay({ kind: 'dream', id });
  const newDream = (initialKind: 'quick' | 'full') => setOverlay({ kind: 'dream', id: appStore.newId(), initialKind });
  const toggleSettings = () => setOverlay((o) => (o?.kind === 'settings' ? null : { kind: 'settings' }));
  const showOnMap = (placeId: string) => {
    setTab('map');
    if (phone) setOverlay(null);
    setFocus({ id: placeId, n: Date.now() });
  };

  // Bouton « retour » d'Android : ferme l'écran ouvert.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (overlay) {
        setOverlay(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [overlay]);

  const editor =
    overlay?.kind === 'dream' ? (
      <DreamEditor key={overlay.id} dreamId={overlay.id} initialKind={overlay.initialKind} onDeleted={close} onShowOnMap={showOnMap} bottomInset={insets.bottom} />
    ) : overlay?.kind === 'settings' ? (
      <SettingsScreen bottomInset={insets.bottom} />
    ) : null;

  const tabs = (
    <View style={{ width: 240 }}>
      <Segmented
        value={tab}
        onChange={(t) => setTab(t)}
        options={[
          { value: 'map', label: 'Carte', icon: 'map-outline' },
          { value: 'journal', label: 'Journal', icon: 'book-outline' },
        ]}
        testID="tab"
      />
    </View>
  );

  let body;
  if (phone) {
    if (overlay) {
      const title = overlay.kind === 'settings' ? 'Réglages' : 'Rêve';
      body = (
        <>
          <TopBar title={title} layout={layout} topInset={insets.top} onBack={close} />
          <View style={styles.fill}>{editor}</View>
        </>
      );
    } else {
      body = (
        <>
          <TopBar title={tab === 'map' ? 'Dream Map' : 'Journal'} layout={layout} topInset={insets.top} onSettings={toggleSettings} />
          <View style={styles.fill}>
            {tab === 'map' ? (
              <MapScreen phone bottomInset={0} onOpenDream={openDream} focus={focus} />
            ) : (
              <DreamList selectedId={null} onOpen={openDream} bottomInset={0} />
            )}
          </View>
          <BottomBar tab={tab} onTab={setTab} onQuick={() => newDream('quick')} onNew={() => newDream('full')} bottomInset={insets.bottom} />
        </>
      );
    }
  } else {
    const actions = (
      <>
        <Button small label="Note rapide" icon="mic" onPress={() => newDream('quick')} testID="new-quick" />
        <Button small label="Nouveau rêve" icon="add" variant="primary" onPress={() => newDream('full')} testID="new-dream" />
      </>
    );
    const side = editor && (
      <View style={[styles.sidePanel, tab === 'journal' && styles.sidePanelJournal]}>
        {overlay?.kind === 'dream' && tab === 'map' && (
          <View style={styles.sideHead}>
            <Title size={18} style={{ flex: 1 }}>
              Rêve
            </Title>
            <Button small variant="ghost" label="Fermer" icon="close" onPress={close} testID="close-panel" />
          </View>
        )}
        {editor}
      </View>
    );
    body = (
      <>
        <TopBar title="Dream Map" layout={layout} topInset={insets.top} onSettings={toggleSettings} settingsActive={overlay?.kind === 'settings'} center={tabs} actions={actions} />
        <View style={[styles.fill, styles.columns]}>
          {tab === 'map' ? (
            <>
              <View style={styles.fill}>
                <MapScreen phone={false} bottomInset={insets.bottom} onOpenDream={openDream} focus={focus} />
              </View>
              {side}
            </>
          ) : (
            <>
              <View style={styles.sidebar}>
                <DreamList selectedId={overlay?.kind === 'dream' ? overlay.id : null} onOpen={openDream} bottomInset={insets.bottom} />
              </View>
              <View style={styles.fill}>{side ?? <Welcome onQuick={() => newDream('quick')} onNew={() => newDream('full')} />}</View>
            </>
          )}
        </View>
      </>
    );
  }

  if (layout.showPhoneFrame) {
    // Format téléphone dans un navigateur : l'app s'affiche dans un cadre de la taille d'un téléphone.
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: '#05040c' }]}>
        <View style={styles.phoneFrame}>{body}</View>
      </View>
    );
  }
  return <View style={styles.fill}>{body}</View>;
}

function BottomBar(props: { tab: Tab; onTab: (t: Tab) => void; onQuick: () => void; onNew: () => void; bottomInset: number }) {
  const item = (t: Tab, icon: keyof typeof Ionicons.glyphMap, label: string) => {
    const on = props.tab === t;
    return (
      <Pressable onPress={() => props.onTab(t)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={styles.tabItem} testID={`tab-${t}`}>
        <Ionicons name={on ? (icon.replace('-outline', '') as typeof icon) : icon} size={24} color={on ? colors.accent : colors.muted} />
        <Text style={[styles.tabLabel, on && { color: colors.accent }]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(8, props.bottomInset) }]}>
      {item('map', 'map-outline', 'Carte')}
      <Pressable onPress={props.onQuick} accessibilityRole="button" accessibilityLabel="Note rapide" style={styles.fabWrap} testID="new-quick">
        <View style={[styles.fab, styles.fabQuick]}>
          <Ionicons name="mic" size={26} color={colors.accentText} />
        </View>
        <Text style={styles.tabLabel}>Note rapide</Text>
      </Pressable>
      <Pressable onPress={props.onNew} accessibilityRole="button" accessibilityLabel="Nouveau rêve" style={styles.fabWrap} testID="new-dream">
        <View style={styles.fab}>
          <Ionicons name="add" size={28} color={colors.text} />
        </View>
        <Text style={styles.tabLabel}>Nouveau rêve</Text>
      </Pressable>
      {item('journal', 'book-outline', 'Journal')}
    </View>
  );
}

function Welcome(props: { onQuick: () => void; onNew: () => void }) {
  return (
    <View style={[styles.fill, styles.center, { gap: 10, padding: 24 }]}>
      <Text style={{ color: colors.accent, fontSize: 56 }}>☾</Text>
      <Txt faint size={13} style={{ letterSpacing: 4 }}>
        GRIMOIRE
      </Txt>
      <Title size={30}>Dream Map</Title>
      <Txt muted style={{ textAlign: 'center' }}>
        Choisis un rêve dans la liste, ou note-en un nouveau.
      </Txt>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <Button label="Note rapide" icon="mic" onPress={props.onQuick} />
        <Button label="Nouveau rêve" icon="add" variant="primary" onPress={props.onNew} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  columns: { flexDirection: 'row' },
  sidebar: { width: 360, borderRightWidth: 1, borderRightColor: colors.border },
  sidePanel: { width: 520, borderLeftWidth: 1, borderLeftColor: colors.border, backgroundColor: colors.bg },
  sidePanelJournal: { width: undefined, flex: 1, borderLeftWidth: 0 },
  sideHead: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 6,
    backgroundColor: colors.bgDeep,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', minWidth: 72, minHeight: 52, gap: 2 },
  tabLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  fabWrap: { alignItems: 'center', gap: 2, minWidth: 72 },
  fab: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceActive, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  fabQuick: { backgroundColor: colors.accent, borderColor: colors.accent },
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
