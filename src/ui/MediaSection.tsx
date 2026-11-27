import Ionicons from '@expo/vector-icons/Ionicons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { randomUUID } from 'expo-crypto';
import { useEffect, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MediaItem, MediaType } from '../data/types';
import { notify, confirmAsync } from '../platform/dialogs';
import { openMedia, pickAndStore, removeMedia, storeRecording, uriFor } from '../platform/media';
import { AppIcon } from './AppIcon';
import { Button, Field, IconButton, Txt, type PressState } from './components';
import { colors, fonts } from './theme';

export function formatDuration(ms: number | undefined): string {
  const s = Math.max(0, Math.round((ms ?? 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function youtubeId(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i.exec(url);
  return m ? m[1] : null;
}

function useMediaUri(localId: string | undefined): string | null | undefined {
  const [uri, setUri] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    if (!localId) setUri(null);
    else uriFor(localId).then((u) => alive && setUri(u), () => alive && setUri(null));
    return () => {
      alive = false;
    };
  }, [localId]);
  return uri;
}

// ---------------------------------------------------------------- Enregistreur

export function VoiceRecorder(props: { onRecorded: (item: MediaItem) => void; big?: boolean }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [busy, setBusy] = useState(false);

  async function start() {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        notify('Micro refusé', 'Autorise l’accès au micro pour enregistrer une note vocale.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      notify('Enregistrement impossible', String(e));
    }
  }

  async function stop() {
    if (busy) return;
    setBusy(true);
    try {
      const durationMs = state.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      const uri = recorder.uri;
      if (!uri) throw new Error('Aucun son enregistré.');
      const localId = await storeRecording(uri);
      const n = new Date();
      props.onRecorded({
        id: randomUUID(),
        type: 'audio',
        name: `Note vocale de ${String(n.getHours()).padStart(2, '0')}h${String(n.getMinutes()).padStart(2, '0')}`,
        localId,
        durationMs,
        createdAt: n.toISOString(),
      });
    } catch (e) {
      notify('Enregistrement impossible', String(e));
    } finally {
      setBusy(false);
    }
  }

  const rec = state.isRecording;
  return (
    <View style={[styles.recorder, rec && styles.recorderOn]}>
      <Pressable
        onPress={rec ? stop : start}
        accessibilityRole="button"
        accessibilityLabel={rec ? 'Arrêter l’enregistrement' : 'Enregistrer une note vocale'}
        testID={rec ? 'record-stop' : 'record-start'}
        style={({ pressed }) => [rec ? [styles.recButton, props.big && styles.recButtonBig, styles.recButtonOn] : null, pressed && { opacity: 0.85 }]}
      >
        {rec ? <AppIcon name="stop" size={props.big ? 44 : 32} /> : <AppIcon name="micro-bouton" size={props.big ? 84 : 62} />}
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="semi">{rec ? 'Enregistrement…' : busy ? 'Enregistrement du son…' : 'Note vocale'}</Txt>
        <Txt muted size={15}>
          {rec ? `${formatDuration(state.durationMillis)} — touche le carré pour arrêter` : 'Touche le micro et raconte ton rêve'}
        </Txt>
      </View>
      {rec && <View style={styles.recDot} />}
    </View>
  );
}

// ---------------------------------------------------------------- Lecteur

function AudioRow(props: { item: MediaItem; onRemove: () => void }) {
  const uri = useMediaUri(props.item.localId);
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);
  const duration = (status.duration || 0) * 1000 || props.item.durationMs || 0;
  const pos = (status.currentTime || 0) * 1000;
  const ratio = duration ? Math.min(1, pos / duration) : 0;
  const missing = uri === null;

  return (
    <View style={styles.row} testID="media-audio">
      <IconButton
        image={status.playing ? 'pause' : 'lecture'}
        label={status.playing ? 'Pause' : 'Écouter'}
        color={colors.accent}
        onPress={() => {
          if (missing) return notify('Son absent', 'Ce son a été enregistré sur un autre appareil.');
          if (status.playing) player.pause();
          else {
            if (status.didJustFinish || (duration && pos >= duration - 200)) void player.seekTo(0);
            player.play();
          }
        }}
      />
      <View style={{ flex: 1, gap: 6 }}>
        <Txt numberOfLines={1}>{props.item.name}</Txt>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${ratio * 100}%` }]} />
        </View>
        <Txt faint size={13}>
          {missing ? 'Fichier sur un autre appareil' : `${formatDuration(pos)} / ${formatDuration(duration)}`}
        </Txt>
      </View>
      <IconButton image="supprimer" size={20} label="Supprimer ce son" onPress={props.onRemove} />
    </View>
  );
}

// ---------------------------------------------------------------- Autres médias

const DRAWN: Partial<Record<MediaType, 'image' | 'musique' | 'video' | 'fichier' | 'lien-b' | 'video-lien'>> = { image: 'image', music: 'musique', video: 'video', file: 'fichier', link: 'lien-b', youtube: 'video-lien' };

function MediaTypeIcon({ type }: { type: MediaType }) {
  const drawn = DRAWN[type];
  return drawn ? <AppIcon name={drawn} size={30} /> : <Ionicons name={TYPE_ICON[type]} size={22} color={colors.accent} />;
}

const TYPE_ICON: Record<MediaType, keyof typeof Ionicons.glyphMap> = {
  audio: 'mic-outline',
  music: 'musical-notes-outline',
  image: 'image-outline',
  video: 'film-outline',
  file: 'document-outline',
  link: 'link-outline',
  youtube: 'logo-youtube',
};

function ImageThumb(props: { item: MediaItem; onOpen: (uri: string) => void; onRemove: () => void }) {
  const uri = useMediaUri(props.item.localId);
  return (
    <View style={styles.thumbWrap} testID="media-image">
      <Pressable onPress={() => uri && props.onOpen(uri)} accessibilityRole="imagebutton" accessibilityLabel={props.item.name}>
        {uri ? (
          <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbMissing]}>
            <AppIcon name="image-vide" size={40} />
          </View>
        )}
      </Pressable>
      <Pressable onPress={props.onRemove} style={styles.thumbRemove} accessibilityRole="button" accessibilityLabel={`Retirer ${props.item.name}`} hitSlop={6}>
        <AppIcon name="retirer" size={20} />
      </Pressable>
    </View>
  );
}

function LinkRow(props: { item: MediaItem; onRemove: () => void }) {
  const yt = props.item.type === 'youtube' && props.item.url ? youtubeId(props.item.url) : null;
  return (
    <View style={styles.row} testID={`media-${props.item.type}`}>
      <Pressable
        onPress={() => props.item.url && Linking.openURL(props.item.url)}
        accessibilityRole="link"
        style={({ hovered }: PressState) => [styles.linkMain, hovered && { backgroundColor: colors.surfaceHover }]}
      >
        {yt ? (
          <Image source={{ uri: `https://img.youtube.com/vi/${yt}/mqdefault.jpg` }} style={styles.ytThumb} />
        ) : (
          <View style={styles.fileIcon}>
            <MediaTypeIcon type={props.item.type} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Txt numberOfLines={1}>{props.item.name}</Txt>
          <Txt faint size={13} numberOfLines={1}>
            {props.item.url}
          </Txt>
        </View>
        <AppIcon name="ouvrir-lien" size={22} />
      </Pressable>
      <IconButton image="retirer" size={18} label="Retirer ce lien" onPress={props.onRemove} />
    </View>
  );
}

function FileRow(props: { item: MediaItem; onRemove: () => void }) {
  return (
    <View style={styles.row} testID={`media-${props.item.type}`}>
      <Pressable
        onPress={() => props.item.localId && openMedia(props.item.localId, props.item.mime, props.item.name).catch((e) => notify('Ouverture impossible', String(e.message ?? e)))}
        accessibilityRole="button"
        style={({ hovered }: PressState) => [styles.linkMain, hovered && { backgroundColor: colors.surfaceHover }]}
      >
        <View style={styles.fileIcon}>
          <MediaTypeIcon type={props.item.type} />
        </View>
        <Txt numberOfLines={1} style={{ flex: 1 }}>
          {props.item.name}
        </Txt>
        <AppIcon name={Platform.OS === 'web' ? 'telecharger' : 'partager'} size={22} />
      </Pressable>
      <IconButton image="retirer" size={18} label="Retirer ce fichier" onPress={props.onRemove} />
    </View>
  );
}

// ---------------------------------------------------------------- Section complète

export function MediaSection(props: { value: MediaItem[]; onChange: (v: MediaItem[]) => void; voiceOnly?: boolean }) {
  const [viewer, setViewer] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');

  const add = (m: MediaItem) => props.onChange([...props.value, m]);
  const remove = async (m: MediaItem) => {
    const ok = await confirmAsync('Retirer ce média ?', `« ${m.name} » sera retiré du rêve.`, 'Retirer');
    if (!ok) return;
    props.onChange(props.value.filter((x) => x.id !== m.id));
    if (m.localId) void removeMedia(m.localId).catch(() => {});
  };

  async function pick(kind: 'image' | 'audio' | 'video' | 'any') {
    try {
      const f = await pickAndStore(kind);
      if (!f) return;
      const mime = f.mime ?? '';
      const type: MediaType = mime.startsWith('image/') || kind === 'image' ? 'image' : mime.startsWith('audio/') || kind === 'audio' ? 'music' : mime.startsWith('video/') || kind === 'video' ? 'video' : 'file';
      add({ id: randomUUID(), type, name: f.name, localId: f.localId, mime: f.mime, createdAt: new Date().toISOString() });
    } catch (e) {
      notify('Ajout impossible', String(e));
    }
  }

  function addLink() {
    let url = linkUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const yt = youtubeId(url);
    let host = url;
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {}
    add({ id: randomUUID(), type: yt ? 'youtube' : 'link', name: linkName.trim() || (yt ? 'Vidéo YouTube' : host), url, createdAt: new Date().toISOString() });
    setLinkUrl('');
    setLinkName('');
    setLinkOpen(false);
  }

  const audios = props.value.filter((m) => m.type === 'audio' || m.type === 'music');
  const images = props.value.filter((m) => m.type === 'image');
  const links = props.value.filter((m) => m.type === 'link' || m.type === 'youtube');
  const files = props.value.filter((m) => m.type === 'file' || m.type === 'video');

  return (
    <View style={{ gap: 12 }}>
      <VoiceRecorder onRecorded={add} big={props.voiceOnly} />
      {audios.map((m) => (
        <AudioRow key={m.id} item={m} onRemove={() => remove(m)} />
      ))}
      {!props.voiceOnly && (
        <>
          {images.length > 0 && (
            <View style={styles.thumbs}>
              {images.map((m) => (
                <ImageThumb key={m.id} item={m} onOpen={setViewer} onRemove={() => remove(m)} />
              ))}
            </View>
          )}
          {links.map((m) => (
            <LinkRow key={m.id} item={m} onRemove={() => remove(m)} />
          ))}
          {files.map((m) => (
            <FileRow key={m.id} item={m} onRemove={() => remove(m)} />
          ))}
          <View style={styles.addRow}>
            <Button small label="Image" image="image" onPress={() => pick('image')} testID="add-image" />
            <Button small label="Musique" image="musique" onPress={() => pick('audio')} testID="add-music" />
            <Button small label="Vidéo" image="video" onPress={() => pick('video')} testID="add-video" />
            <Button small label="Fichier" image="fichier" onPress={() => pick('any')} testID="add-file" />
            <Button small label="Lien / YouTube" image="lien-b" onPress={() => setLinkOpen((o) => !o)} testID="add-link" />
          </View>
          {linkOpen && (
            <View style={styles.linkForm}>
              <Field value={linkUrl} onChangeText={setLinkUrl} placeholder="Adresse (https://…)" autoCapitalize="none" keyboardType="url" testID="link-url" />
              <Field value={linkName} onChangeText={setLinkName} placeholder="Nom (facultatif)" testID="link-name" />
              <Button label="Ajouter le lien" image="ajouter-petit" variant="primary" onPress={addLink} disabled={!linkUrl.trim()} testID="link-add" />
            </View>
          )}
        </>
      )}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewer(null)} accessibilityLabel="Fermer l’image">
          {viewer && <Image source={{ uri: viewer }} style={styles.viewerImg} resizeMode="contain" />}
          <Text style={styles.viewerHint}>Touche pour fermer</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  recorder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  recorderOn: { borderColor: colors.danger },
  recButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  recButtonBig: { width: 76, height: 76, borderRadius: 38 },
  recButtonOn: { backgroundColor: '#8c2f45' },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  trackFill: { height: 4, backgroundColor: colors.accent },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { width: 96, height: 96 },
  thumb: { width: 96, height: 96, borderRadius: 12, backgroundColor: colors.bg },
  thumbMissing: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(10,9,24,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderRadius: 12, minHeight: 48 },
  fileIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surfaceActive, alignItems: 'center', justifyContent: 'center' },
  ytThumb: { width: 64, height: 36, borderRadius: 6, backgroundColor: colors.bg },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linkForm: { gap: 8 },
  viewer: { flex: 1, backgroundColor: 'rgba(5,4,12,0.94)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  viewerImg: { width: '100%', height: '90%' },
  viewerHint: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, marginTop: 8 },
});
