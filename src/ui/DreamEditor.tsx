import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import { localDateString } from '../data/records';
import { normalizeDream, type Dream } from '../data/types';
import { confirmAsync } from '../platform/dialogs';
import { removeMedia } from '../platform/media';
import { AppIcon } from './AppIcon';
import { Button, Field, IconButton, Section, Txt } from './components';
import { addDays, formatLongDate } from './dates';
import { PeopleSection, PlacesSection } from './DreamSections';
import { MediaSection } from './MediaSection';
import { AMBIANCES, ATMOSPHERE_LEVELS, CLARITY_LEVELS, colors, DREAM_TYPES, EMOTIONS, fonts, MOOD_LEVELS, TIMES_OF_DAY, WEATHERS } from './theme';
import { ColorPicker, EmojiPicker, EmojiScale, LucidityScale, WordPicker } from './widgets';

type Draft = ReturnType<typeof normalizeDream>;
type Editable = Partial<Omit<Dream, 'id' | 'createdAt' | 'updatedAt' | 'deleted'>>;

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
    d.emotions.length > 0
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
  onDeleted: () => void;
  onShowOnMap?: (placeId: string) => void;
  bottomInset: number;
}) {
  useStoreVersion();
  const existing = appStore.get('dreams', props.dreamId);
  const [draft, setDraft] = useState<Draft>(() => (existing ? normalizeDream(existing) : emptyDraft(props.dreamId, props.initialKind ?? 'full')));
  const exists = useRef(!!existing);
  const [saved, setSaved] = useState(!!existing);

  function commit(fields: Editable) {
    const next = { ...draft, ...fields } as Draft;
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

  const allTags = Array.from(new Set(appStore.list('dreams').flatMap((d) => d.tags ?? []))).sort((a, b) => a.localeCompare(b));
  const customAmbiances = Array.from(new Set(appStore.list('dreams').flatMap((d) => d.ambiances ?? []))).filter((a) => !AMBIANCES.includes(a));
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
      <Field big value={draft.title} onChangeText={(v) => commit({ title: v })} placeholder="Titre du rêve" maxLength={200} testID="dream-title" />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <ScrollView style={styles.flex} contentContainerStyle={[styles.content, { paddingBottom: 32 + props.bottomInset }]} keyboardShouldPersistTaps="handled">
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
            <Button label="Compléter ce rêve" icon="book-outline" variant="primary" onPress={() => commit({ kind: 'full' })} testID="make-full" />
          </>
        ) : (
          <>
            <Field multiline value={draft.text} onChangeText={(v) => commit({ text: v })} placeholder="Raconte ton rêve…" testID="dream-text" style={{ minHeight: 200 }} />
            <Section title="Notes vocales et médias" hint="Enregistre ta voix, ajoute des images, des musiques, des vidéos, des fichiers ou des liens.">
              <MediaSection value={draft.media} onChange={(media) => commit({ media })} />
            </Section>
            <Section title="Lieux" hint="Les lieux réels gardent leurs vraies coordonnées ; les lieux imaginaires se posent où tu veux sur la carte.">
              <PlacesSection value={draft.placeIds} onChange={(placeIds) => commit({ placeIds })} onShowOnMap={props.onShowOnMap} />
            </Section>
            <Section title="Personnes">
              <PeopleSection value={draft.peopleIds} onChange={(peopleIds) => commit({ peopleIds })} />
            </Section>
            <Section title="Type de rêve">
              <EmojiPicker options={DREAM_TYPES} value={draft.dreamTypes} onChange={(dreamTypes) => commit({ dreamTypes })} allowCustom customPlaceholder="Autre type… puis Entrée" testID="type" />
            </Section>
            <Section title="Émotions ressenties">
              <EmojiPicker options={EMOTIONS} value={draft.emotions} onChange={(emotions) => commit({ emotions })} allowCustom customPlaceholder="Autre émotion… puis Entrée" testID="emotion" />
            </Section>
            <Section title="Humeur">
              <EmojiScale levels={MOOD_LEVELS} value={draft.mood} onChange={(mood) => commit({ mood })} name="Humeur" placeholder="Comment te sentais-tu dans ce rêve ?" testID="mood" />
            </Section>
            <Section title="Lucidité">
              <LucidityScale value={draft.lucidity} onChange={(lucidity) => commit({ lucidity })} />
            </Section>
            <Section title="Clarté du rêve">
              <EmojiScale levels={CLARITY_LEVELS} value={draft.clarity} onChange={(clarity) => commit({ clarity })} name="Clarté" placeholder="Ton souvenir est-il flou ou net ?" testID="clarity" />
            </Section>
            <Section title="Ambiance">
              <EmojiScale
                levels={ATMOSPHERE_LEVELS}
                value={draft.atmosphere}
                onChange={(atmosphere) => commit({ atmosphere })}
                name="Atmosphère"
                placeholder="L’atmosphère du rêve, de cauchemardesque à féerique"
                testID="atmosphere"
              />
              <WordPicker
                value={draft.ambiances}
                onChange={(ambiances) => commit({ ambiances })}
                suggestions={[...AMBIANCES, ...customAmbiances]}
                alwaysShowSuggestions
                placeholder="Autre ambiance…"
                testID="ambiance"
              />
            </Section>
            <Section title="Météo du rêve">
              <EmojiPicker options={WEATHERS} value={draft.weather} onChange={(weather) => commit({ weather })} allowCustom customPlaceholder="Autre météo… puis Entrée" testID="weather" />
            </Section>
            <Section title="Jour ou nuit">
              <EmojiPicker options={TIMES_OF_DAY} value={draft.timeOfDay} onChange={(timeOfDay) => commit({ timeOfDay })} testID="time" />
            </Section>
            <Section title="Couleurs du rêve">
              <ColorPicker value={draft.colors} onChange={(c) => commit({ colors: c })} />
            </Section>
            <Section title="Étiquettes et mots-clés">
              <WordPicker value={draft.tags} onChange={(tags) => commit({ tags })} suggestions={allTags} placeholder="Ajouter un mot-clé puis Entrée…" testID="tag" />
            </Section>
          </>
        )}

        <View style={styles.footer}>
          <Txt faint size={14}>
            {saved ? 'Enregistré automatiquement' : quick ? 'Parle ou écris pour créer la note' : 'Commence à écrire pour créer le rêve'}
          </Txt>
          <Button label="Supprimer" image="supprimer" variant="danger" small onPress={onDelete} testID="delete-dream" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
