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
import { SleepEditor } from './ui/SleepEditor';
import { SleepTracker, StatsScreen } from './ui/SleepTracker';
import { AppIcon, type AppIconName } from './ui/AppIcon';
import { colors, fonts } from './ui/theme';
import { TopBar } from './ui/TopBar';
import { UpdateBanner } from './ui/UpdateBanner';
import { useLayoutMode } from './ui/useLayoutMode';

type Tab = 'map' | 'journal' | 'sleep' | 'stats';
type Overlay =
  | { kind: 'dream'; id: string; initialKind?: 'quick' | 'full'; initialSleepId?: string; initialDate?: string }
  | { kind: 'sleep'; id: string; initialDate?: string }
  | { kind: 'settings' }
  | null;

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
  const [addMenu, setAddMenu] = useState(false);
  const phone = layout.isPhoneLayout;

  const close = () => setOverlay(null);
  const openDream = (id: string) => setOverlay({ kind: 'dream', id });
  const newDream = (initialKind: 'quick' | 'full', sleepId?: string, date?: string) =>
    setOverlay({ kind: 'dream', id: appStore.newId(), initialKind, initialSleepId: sleepId, initialDate: date });
  const openSleep = (id: string) => setOverlay({ kind: 'sleep', id });
  const newSleep = (date?: string) => setOverlay({ kind: 'sleep', id: appStore.newId(), initialDate: date });
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
      if (addMenu) {
        setAddMenu(false);
        return true;
      }
      if (overlay) {
        setOverlay(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [overlay, addMenu]);

  const editor =
    overlay?.kind === 'dream' ? (
      <DreamEditor
        key={overlay.id}
        dreamId={overlay.id}
        initialKind={overlay.initialKind}
        initialSleepId={overlay.initialSleepId}
        initialDate={overlay.initialDate}
        onDeleted={close}
        onShowOnMap={showOnMap}
        onOpenSleep={openSleep}
        bottomInset={insets.bottom}
      />
    ) : overlay?.kind === 'sleep' ? (
      <SleepEditor
        key={overlay.id}
        sleepId={overlay.id}
        initialDate={overlay.initialDate}
        onDeleted={close}
        onOpenDream={openDream}
        onNewDream={(sleepId, date) => newDream('full', sleepId, date)}
        bottomInset={insets.bottom}
      />
    ) : overlay?.kind === 'settings' ? (
      <SettingsScreen bottomInset={insets.bottom} />
    ) : null;

  const TAB_TITLES: Record<Tab, string> = { map: 'Dream Map', journal: 'Journal', sleep: 'Sommeil', stats: 'Statistiques' };
  const tabs = (
    <View style={{ width: 520, flexShrink: 1 }}>
      <Segmented
        value={tab}
        onChange={(t) => setTab(t)}
        options={[
          { value: 'map', label: 'Carte', image: 'carte', imageOn: 'carte-encre' },
          { value: 'journal', label: 'Journal', image: 'journal', imageOn: 'journal-encre' },
          { value: 'sleep', label: 'Sommeil', image: 'sommeil' },
          { value: 'stats', label: 'Statistiques', icon: 'stats-chart-outline' },
        ]}
        testID="tab"
      />
    </View>
  );

  const screen = (forPhone: boolean) =>
    tab === 'map' ? (
      <MapScreen phone={forPhone} bottomInset={forPhone ? 0 : insets.bottom} onOpenDream={openDream} focus={focus} />
    ) : tab === 'journal' ? (
      <DreamList selectedId={!forPhone && overlay?.kind === 'dream' ? overlay.id : null} onOpen={openDream} bottomInset={forPhone ? 0 : insets.bottom} />
    ) : tab === 'sleep' ? (
      <SleepTracker phone={forPhone} bottomInset={forPhone ? 0 : insets.bottom} onOpenSleep={openSleep} onNewSleep={newSleep} />
    ) : (
      <StatsScreen />
    );

  let body;
  if (phone) {
    if (overlay) {
      const title = overlay.kind === 'settings' ? 'Réglages' : overlay.kind === 'sleep' ? 'Sommeil' : 'Rêve';
      body = (
        <>
          <TopBar title={title} layout={layout} topInset={insets.top} onBack={close} />
          <View style={styles.fill}>{editor}</View>
        </>
      );
    } else {
      body = (
        <>
          <TopBar title={TAB_TITLES[tab]} layout={layout} topInset={insets.top} onSettings={toggleSettings} />
          <UpdateBanner />
          <View style={styles.fill}>{screen(true)}</View>
          <BottomBar tab={tab} onTab={setTab} onAdd={() => setAddMenu(true)} bottomInset={insets.bottom} />
          <AddMenu
            visible={addMenu}
            onClose={() => setAddMenu(false)}
            onQuick={() => newDream('quick')}
            onDream={() => newDream('full')}
            onSleep={() => newSleep()}
            bottomInset={insets.bottom}
          />
        </>
      );
    }
  } else {
    const actions = (
      <>
        <Button small label="Sommeil" image="sommeil" onPress={() => newSleep()} testID="new-sleep" />
        <Button small label="Note rapide" image="micro" onPress={() => newDream('quick')} testID="new-quick" />
        <Button small label="Nouveau rêve" image="nouveau-reve-b-encre" variant="primary" onPress={() => newDream('full')} testID="new-dream" />
      </>
    );
    const sidePanel = tab === 'map' || tab === 'sleep' || tab === 'stats';
    const side = editor && (
      <View style={[styles.sidePanel, !sidePanel && styles.sidePanelJournal]}>
        {(overlay?.kind === 'dream' || overlay?.kind === 'sleep') && sidePanel && (
          <View style={styles.sideHead}>
            <Title size={18} style={{ flex: 1 }}>
              {overlay.kind === 'sleep' ? 'Sommeil' : 'Rêve'}
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
        <UpdateBanner />
        <View style={[styles.fill, styles.columns]}>
          {tab === 'journal' ? (
            <>
              <View style={styles.sidebar}>{screen(false)}</View>
              <View style={styles.fill}>{side ?? <Welcome onQuick={() => newDream('quick')} onNew={() => newDream('full')} onSleep={() => newSleep()} />}</View>
            </>
          ) : (
            <>
              <View style={styles.fill}>{screen(false)}</View>
              {side}
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

/** Barre du bas (téléphone) : 4 endroits, et au milieu le bouton « + ». */
function BottomBar(props: { tab: Tab; onTab: (t: Tab) => void; onAdd: () => void; bottomInset: number }) {
  const item = (t: Tab, label: string, image?: AppIconName, icon?: keyof typeof Ionicons.glyphMap) => {
    const on = props.tab === t;
    return (
      <Pressable onPress={() => props.onTab(t)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={styles.tabItem} testID={`tab-${t}`}>
        <View style={[styles.tabIcon, on && styles.tabIconOn]}>
          {image ? <AppIcon name={image} size={28} dim={!on} /> : <Ionicons name={icon!} size={24} color={on ? colors.accent : colors.muted} />}
        </View>
        <Text style={[styles.tabLabel, on && { color: colors.accent }]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(8, props.bottomInset) }]}>
      {item('map', 'Carte', 'carte')}
      {item('journal', 'Journal', 'journal')}
      <Pressable onPress={props.onAdd} accessibilityRole="button" accessibilityLabel="Ajouter" style={styles.fabWrap} testID="add">
        <View style={[styles.fab, styles.fabQuick]}>
          <AppIcon name="nouveau-reve-b-encre" size={34} />
        </View>
        <Text style={styles.tabLabel}>Ajouter</Text>
      </Pressable>
      {item('sleep', 'Sommeil', 'sommeil')}
      {item('stats', 'Statistiques', undefined, 'stats-chart-outline')}
    </View>
  );
}

/** Menu du bouton « + » : les trois types d'ajouts. */
function AddMenu(props: { visible: boolean; onClose: () => void; onQuick: () => void; onDream: () => void; onSleep: () => void; bottomInset: number }) {
  if (!props.visible) return null;
  const pick = (f: () => void) => () => {
    props.onClose();
    f();
  };
  const opt = (label: string, hint: string, image: AppIconName, onPress: () => void, testID: string, primary?: boolean) => (
    <Pressable onPress={pick(onPress)} accessibilityRole="button" style={({ pressed }) => [styles.addOpt, pressed && { backgroundColor: colors.surfaceHover }]} testID={testID}>
      <View style={[styles.addIcon, primary && { backgroundColor: colors.accent }]}>
        <AppIcon name={image} size={34} />
      </View>
      <View style={{ flex: 1 }}>
        <Title size={19}>{label}</Title>
        <Txt faint size={14}>
          {hint}
        </Txt>
      </View>
    </Pressable>
  );
  return (
    <Pressable style={styles.addBackdrop} onPress={props.onClose} accessibilityLabel="Fermer le menu">
      <View style={[styles.addSheet, { paddingBottom: 16 + props.bottomInset }]} testID="add-menu">
        {opt('Note rapide', 'Au réveil : la voix, un titre, quelques mots', 'micro-encre', props.onQuick, 'add-quick', true)}
        {opt('Rêve', 'Raconter un rêve en entier', 'nouveau-reve-b', props.onDream, 'add-dream')}
        {opt('Sommeil', 'Noter une nuit ou une sieste', 'sommeil', props.onSleep, 'add-sleep')}
      </View>
    </Pressable>
  );
}

function Welcome(props: { onQuick: () => void; onNew: () => void; onSleep: () => void }) {
  return (
    <View style={[styles.fill, styles.center, { gap: 10, padding: 24 }]}>
      <AppIcon name="logo-grand" size={150} />
      <Txt faint size={13} style={{ letterSpacing: 4 }}>
        GRIMOIRE
      </Txt>
      <Title size={30}>Dream Map</Title>
      <Txt muted style={{ textAlign: 'center' }}>
        Choisis une entrée dans le journal, ou note-en une nouvelle.
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 }}>
        <Button label="Note rapide" image="micro" onPress={props.onQuick} />
        <Button label="Nouveau rêve" image="nouveau-reve-b-encre" variant="primary" onPress={props.onNew} />
        <Button label="Sommeil" image="sommeil" onPress={props.onSleep} />
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
  tabItem: { alignItems: 'center', justifyContent: 'center', minWidth: 64, minHeight: 52, gap: 2 },
  tabIcon: { width: 44, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabIconOn: { backgroundColor: colors.surfaceActive },
  tabLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  fabWrap: { alignItems: 'center', gap: 2, minWidth: 64 },
  fab: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceActive, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  fabQuick: { backgroundColor: colors.accent, borderColor: colors.accent },
  addBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(5,4,12,0.6)', justifyContent: 'flex-end' },
  addSheet: { backgroundColor: colors.bgDeep, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: colors.border, padding: 12, gap: 6 },
  addOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: 14 },
  addIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceActive, alignItems: 'center', justifyContent: 'center' },
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
