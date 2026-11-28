import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import { localDateString } from '../data/records';
import { normalizeDream, type Dream } from '../data/types';
import { confirmAsync } from '../platform/dialogs';
import { removeMedia } from '../platform/media';
import { autoSleepFor, candidateSleepsFor, formatDuration as formatSleep, sleepTitle, summarizeSleep } from '../data/sleep';
import { AppIcon } from './AppIcon';
import { Button, Chip, Field, IconButton, Section, Txt } from './components';
import { addDays, formatLongDate } from './dates';
import { DREAM_FIELD_TITLES, DREAM_FIELDS, DreamFieldEditor, type DreamDraft, type DreamEditable } from './dreamFields';
import { SaveBar, SavedAt } from './SaveBar';
import { MediaSection } from './MediaSection';
import { colors, fonts } from './theme';

type Draft = DreamDraft;
type Editable = DreamEditable;

function emptyDraft(id: string, kind: 'quick' | 'full'): Draft {
  return normalizeDream({
    id,
    createdAt: '',
    updatedAt: '',
    deleted: false,
    dreamDate: localDateString(),
    title: '',
    text: '',
    kind,
  });
}

/** Le rêve contient-il quelque chose (sinon on ne le crée pas) ? */
function hasContent(d: Draft) {
  return (
    !!d.title.trim() ||
    !!d.text.trim() ||
    d.media.length > 0 ||
    d.placeIds.length > 0 ||
    d.peopleIds.length > 0 ||
    d.tags.length > 0 ||
    d.ambiances.length > 0 ||
    d.colors.length > 0 ||
    d.lucidity !== null ||
    d.mood !== null ||
    d.clarity !== null ||
    d.atmosphere !== null ||
    d.weather.length > 0 ||
    d.timeOfDay.length > 0 ||
    d.dreamTypes.length > 0 ||
    d.emotions.length > 0 ||
    d.genres.length > 0
  );
}

/**
 * Éditeur d'un rêve, en deux modes :
 * - entrée rapide (au réveil) : titre, note vocale, quelques détails ;
 * - rêve complet : récit, médias, lieux, personnes, lucidité, humeur, ambiance, couleurs, étiquettes.
 * Enregistre tout seul à chaque modification ; un nouveau rêve n'est créé qu'à la première saisie.
 */
export function DreamEditor(props: {
  dreamId: string;
  initialKind?: 'quick' | 'full';
  /** Nouveau rêve créé depuis un sommeil : lié à lui, à sa date. */
  initialSleepId?: string;
  initialDate?: string;
  onOpenSleep?: (sleepId: string) => void;
  onDeleted: () => void;
  onShowOnMap?: (placeId: string) => void;
  /** Bouton « Enregistrer » : tout est déjà enregistré, on referme le formulaire. */
  onDone?: () => void;
  bottomInset: number;
}) {
  useStoreVersion();
  const existing = appStore.get('dreams', props.dreamId);
  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) return normalizeDream(existing);
    const d = emptyDraft(props.dreamId, props.initialKind ?? 'full');
    if (props.initialDate) d.dreamDate = props.initialDate;
    if (props.initialSleepId) d.sleepId = props.initialSleepId;
    return d;
  });
  const exists = useRef(!!existing);
  const [saved, setSaved] = useState(!!existing);

  function commit(fields: Editable) {
    const next = { ...draft, ...fields } as Draft;
    if (!exists.current && hasContent(next) && !next.sleepId) {
      // Premier enregistrement : on lie le rêve à la nuit qui vient de se terminer, s'il n'y en a qu'une.
      const auto = autoSleepFor(appStore.list('sleeps'), next.dreamDate);
      if (auto) next.sleepId = auto.id;
    }
    setDraft(next);
    if (!exists.current && !hasContent(next)) return;
    const { id, createdAt, updatedAt, deleted, ...rest } = next;
    appStore.save('dreams', props.dreamId, rest);
    exists.current = true;
    setSaved(true);
  }

  async function onDelete() {
    if (!exists.current) return props.onDeleted();
    const ok = await confirmAsync('Supprimer ce rêve ?', 'Il sera supprimé, avec ses notes vocales et ses fichiers. Les lieux et personnes restent disponibles.', 'Supprimer');
    if (!ok) return;
    for (const m of draft.media) if (m.localId) void removeMedia(m.localId).catch(() => {});
    appStore.remove('dreams', props.dreamId);
    props.onDeleted();
  }

  const quick = draft.kind === 'quick';

  const header = (
    <View style={{ gap: 10 }}>
      <View style={styles.topRow}>
        <View style={[styles.badge, quick && styles.badgeQuick]}>
          {quick ? <AppIcon name="eclair-encre" size={18} /> : <AppIcon name="lune-crepuscule" size={18} />}
          <Txt size={14} weight="semi" style={{ color: quick ? colors.accentText : colors.ochre }}>
            {quick ? 'Note rapide' : 'Rêve complet'}
          </Txt>
        </View>
        <View style={styles.dateRow}>
          <IconButton image="chevron-gauche" label="Jour précédent" size={16} onPress={() => commit({ dreamDate: addDays(draft.dreamDate, -1) })} />
          <Txt muted size={15} testID="dream-date" style={{ textAlign: 'center', flexShrink: 1 }}>
            {formatLongDate(draft.dreamDate)}
          </Txt>
          <IconButton image="chevron-droit" label="Jour suivant" size={16} onPress={() => commit({ dreamDate: addDays(draft.dreamDate, 1) })} />
        </View>
      </View>
      {saved && <SavedAt at={appStore.get('dreams', props.dreamId)?.updatedAt} />}
      <SleepLink sleepId={draft.sleepId} dreamDate={draft.dreamDate} onChange={(sleepId) => commit({ sleepId })} onOpen={props.onOpenSleep} />
      <Field big value={draft.title} onChangeText={(v) => commit({ title: v })} placeholder="Titre du rêve" maxLength={200} testID="dream-title" />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <ScrollView style={styles.flex} contentContainerStyle={[styles.content, { paddingBottom: 24 }]} keyboardShouldPersistTaps="handled">
        {header}

        {quick ? (
          <>
            <MediaSection value={draft.media} onChange={(media) => commit({ media })} voiceOnly />
            <Field
              multiline
              value={draft.text}
              onChangeText={(v) => commit({ text: v })}
              placeholder="Quelques détails : un lieu, une personne, une sensation…"
              style={{ minHeight: 110 }}
              testID="dream-text"
            />
            <Button label="Compléter ce rêve" image="completer" variant="primary" onPress={() => commit({ kind: 'full' })} testID="make-full" />
          </>
        ) : (
          <>
            <Field multiline value={draft.text} onChangeText={(v) => commit({ text: v })} placeholder="Raconte ton rêve…" testID="dream-text" style={{ minHeight: 160 }} />
            {DREAM_FIELDS.map((f) => (
              <Section key={f} title={DREAM_FIELD_TITLES[f]}>
                <DreamFieldEditor field={f} draft={draft} commit={commit} onShowOnMap={props.onShowOnMap} />
              </Section>
            ))}
          </>
        )}

      </ScrollView>
      <SaveBar onSave={props.onDone} onDelete={onDelete} bottomInset={props.bottomInset} deleteTestID="delete-dream" />
    </KeyboardAvoidingView>
  );
}

/** Nuit (ou sieste) du rêve : affichage, lien, ou propositions. */
function SleepLink(props: { sleepId: string | null; dreamDate: string; onChange: (id: string | null) => void; onOpen?: (id: string) => void }) {
  const linked = props.sleepId ? appStore.get('sleeps', props.sleepId) : undefined;
  if (linked) {
    const sum = summarizeSleep(linked);
    return (
      <View style={styles.sleepLink} testID="dream-sleep">
        <AppIcon name="sommeil" size={26} />
        <Pressable onPress={() => props.onOpen?.(linked.id)} accessibilityRole="button" style={{ flex: 1 }}>
          <Txt size={15} weight="semi">
            {sleepTitle(linked)}
          </Txt>
          {sum.sleep !== null && (
            <Txt faint size={13}>
              {formatSleep(sum.sleep)} de sommeil
            </Txt>
          )}
        </Pressable>
        <IconButton image="retirer" size={16} label="Détacher ce rêve de ce sommeil" onPress={() => props.onChange(null)} />
      </View>
    );
  }
  const candidates = candidateSleepsFor(appStore.list('sleeps'), props.dreamDate);
  if (!candidates.length) return null;
  return (
    <View style={styles.sleepSuggest}>
      <Txt faint size={14}>Rêvé pendant :</Txt>
      {candidates.map((c) => (
        <Chip key={c.id} label={sleepTitle(c)} image="sommeil" onPress={() => props.onChange(c.id)} testID="link-sleep" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sleepLink: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft },
  sleepSuggest: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, maxWidth: 820, width: '100%', alignSelf: 'center', flexGrow: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ochre,
  },
  badgeQuick: { backgroundColor: colors.accent, borderColor: colors.accent },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 8 },
  title: { fontFamily: fonts.display },
});
