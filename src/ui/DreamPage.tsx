/**
 * Page de lecture d'un rêve ou d'une note rapide : tout est joliment affiché, dans l'ordre du formulaire.
 * Toucher un détail ouvre seulement son sélecteur ; le titre et le récit se modifient sur place ;
 * « Modifier » ouvre le formulaire complet. Les détails vides n'apparaissent pas (« + Ajouter un détail »).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { appStore, useStoreVersion } from '../data/appStore';
import { sleepTitle } from '../data/sleep';
import { normalizeDream } from '../data/types';
import { confirmAsync } from '../platform/dialogs';
import { removeMedia } from '../platform/media';
import { AppIcon, type AppIconName } from './AppIcon';
import { Button, Txt, type PressState } from './components';
import { formatLongDate } from './dates';
import { DetailSheet } from './DetailSheet';
import { DREAM_FIELD_TITLES, DREAM_FIELDS, DreamFieldEditor, isDreamFieldEmpty, type DreamEditable, type DreamField } from './dreamFields';
import { MediaSection } from './MediaSection';
import { AddDetailButton, Book, InlineText, Ornament, PageToolbar, SectionLabel, Story, TagLine, Tile } from './reading';
import { CLARITY_LEVELS, colors, DREAM_TYPES, EMOTIONS, fonts, LUCIDITY_LABELS, MOOD_GRID, moodImageFor, optionFor, TIMES_OF_DAY, WEATHERS } from './theme';
import { ColorStain } from './widgets';

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function DreamPage(props: {
  dreamId: string;
  wide: boolean;
  phone: boolean;
  onEdit: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onShowOnMap?: (placeId: string) => void;
  onOpenSleep?: (sleepId: string) => void;
  onDeleted: () => void;
  bottomInset: number;
}) {
  useStoreVersion();
  const [sheet, setSheet] = useState<DreamField | 'add' | null>(null);
  const rec = appStore.get('dreams', props.dreamId);
  if (!rec) return null;
  const d = normalizeDream(rec);
  const commit = (f: DreamEditable) => appStore.save('dreams', props.dreamId, f);
  const quick = d.kind === 'quick';

  async function onDelete() {
    const ok = await confirmAsync('Supprimer ce rêve ?', 'Il sera supprimé, avec ses notes vocales et ses fichiers. Les lieux et personnes restent disponibles.', 'Supprimer');
    if (!ok) return;
    for (const m of d.media) if (m.localId) void removeMedia(m.localId).catch(() => {});
    appStore.remove('dreams', props.dreamId);
    props.onDeleted();
  }

  const sleep = d.sleepId ? appStore.get('sleeps', d.sleepId) : undefined;
  const places = d.placeIds.map((id) => appStore.get('places', id)).filter((p): p is NonNullable<typeof p> => !!p);
  const people = d.peopleIds.map((id) => appStore.get('people', id)).filter((p): p is NonNullable<typeof p> => !!p);
  const moodLevel = d.mood !== null ? MOOD_GRID.find((g) => g.level === d.mood) : undefined;
  const moodImg = d.mood !== null || d.moodEmoji ? moodImageFor(d.moodEmoji, d.mood) : undefined;
  const clarity = d.clarity !== null ? CLARITY_LEVELS.find((c) => c.value === d.clarity) : undefined;
  const missing = DREAM_FIELDS.filter((f) => isDreamFieldEmpty(f, d));
  const media = d.media;

  const header = (
    <View style={{ gap: 12 }}>
      <View style={styles.meta}>
        <AppIcon name={quick ? 'lune-contour' : 'lune-crepuscule'} size={28} />
        <Txt muted size={15}>
          {capitalize(formatLongDate(d.dreamDate))}
        </Txt>
        {sleep && (
          <Pressable onPress={() => props.onOpenSleep?.(sleep.id)} accessibilityRole="button" style={({ hovered }: PressState) => [styles.sleepChip, hovered && { backgroundColor: colors.surface }]} testID="page-sleep">
            <AppIcon name="sommeil" size={18} />
            <Txt muted size={14}>
              {sleepTitle(sleep)}
            </Txt>
          </Pressable>
        )}
      </View>
      <InlineText value={d.title} placeholder="Sans titre — toucher pour écrire" onSave={(title) => commit({ title })} style={[styles.title, props.phone && { fontSize: 30 }]} testID="page-title" />
      <Ornament />
    </View>
  );

  const left = (
    <>
      {header}
      <InlineText
        value={d.text}
        placeholder={quick ? 'Quelques mots… (toucher pour écrire)' : 'Raconte ton rêve… (toucher pour écrire)'}
        onSave={(text) => commit({ text })}
        multiline
        style={styles.storyEdit}
        render={(v) => <Story text={v} size={props.phone ? 17 : 18} />}
        testID="page-text"
      />
      {media.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel>{quick ? 'Notes vocales' : 'Notes vocales et médias'}</SectionLabel>
          <MediaSection value={media} onChange={(m) => commit({ media: m })} readOnly />
        </View>
      )}
      {quick && <Button label="Compléter ce rêve" image="completer" variant="primary" onPress={() => (commit({ kind: 'full' }), props.onEdit())} testID="make-full" />}
    </>
  );

  const details = quick ? null : (
    <>
      {places.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel>Lieux</SectionLabel>
          <View style={styles.wrap}>
            {places.map((p) => (
              <View key={p.id} style={styles.placeChip}>
                <Pressable onPress={() => setSheet('places')} accessibilityRole="button" style={styles.placeMain}>
                  <AppIcon name={p.kind === 'vehicle' ? 'vehicule' : p.real ? 'lieu-reel' : 'imaginaire'} size={22} />
                  <Txt size={16}>{p.name}</Txt>
                </Pressable>
                {p.kind === 'place' && props.onShowOnMap && (
                  <Pressable onPress={() => props.onShowOnMap?.(p.id)} accessibilityRole="button" accessibilityLabel={`Voir ${p.name} sur la carte`} hitSlop={6} testID="page-show-map">
                    <AppIcon name="voir-carte" size={22} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
      {people.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel>Personnes</SectionLabel>
          <TagLine items={people.map((p) => ({ label: p.name, image: p.real ? 'personne' : 'imaginaire' }))} onPress={() => setSheet('people')} />
        </View>
      )}
      {(moodImg || d.lucidity !== null || clarity) && (
        <View style={styles.tiles}>
          {moodImg && <Tile image={moodImg as AppIconName} label={moodLevel?.label ?? '—'} caption="Humeur" onPress={() => setSheet('mood')} testID="tile-mood" />}
          {d.lucidity !== null && <Tile image={`lucidite-b-${d.lucidity}` as AppIconName} label={LUCIDITY_LABELS[d.lucidity]} caption="Lucidité" onPress={() => setSheet('lucidity')} testID="tile-lucidity" />}
          {clarity && <Tile image={clarity.image as AppIconName} label={clarity.label} caption="Clarté" onPress={() => setSheet('lucidity')} testID="tile-clarity" />}
        </View>
      )}
      {d.emotions.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel>Émotions</SectionLabel>
          <TagLine items={d.emotions.map((v) => ({ label: optionFor(EMOTIONS, v).label, tone: 'filled' as const }))} onPress={() => setSheet('mood')} />
        </View>
      )}
      {(d.weather.length > 0 || d.timeOfDay.length > 0) && (
        <Pressable onPress={() => setSheet('weather')} accessibilityRole="button" style={styles.weather} testID="page-weather">
          <SectionLabel>Météo et moment</SectionLabel>
          {[...d.weather.map((w) => optionFor(WEATHERS, w)), ...d.timeOfDay.map((t) => optionFor(TIMES_OF_DAY, t))].map((o, i) =>
            o.image ? <AppIcon key={i} name={o.image as AppIconName} size={30} /> : <Text key={i} style={{ fontSize: 24 }}>{o.emoji}</Text>,
          )}
        </Pressable>
      )}
      {d.tags.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel>Étiquettes</SectionLabel>
          <TagLine items={d.tags.map((t) => ({ label: t, image: 'etiquette' }))} onPress={() => setSheet('tags')} />
        </View>
      )}
      {(d.genres.length > 0 || d.dreamTypes.length > 0 || d.ambiances.length > 0) && (
        <View style={{ gap: 8 }}>
          <SectionLabel>Genre, type et ambiance</SectionLabel>
          <TagLine items={[...d.genres, ...d.dreamTypes.map((v) => optionFor(DREAM_TYPES, v).label), ...d.ambiances].map((label) => ({ label, tone: 'warm' as const }))} onPress={() => setSheet('genre')} />
        </View>
      )}
      {d.colors.length > 0 && (
        <Pressable onPress={() => setSheet('colors')} accessibilityRole="button" style={styles.weather} testID="page-colors">
          <SectionLabel>Couleurs</SectionLabel>
          <ColorStain colors={d.colors} height={40} seed={d.id.charCodeAt(d.id.length - 1)} />
        </Pressable>
      )}
      {missing.length > 0 && <AddDetailButton onPress={() => setSheet('add')} />}
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <Book
        wide={props.wide && !quick}
        bottomInset={props.bottomInset}
        toolbar={<PageToolbar phone={props.phone} onPrev={props.onPrev} onNext={props.onNext} onEdit={props.onEdit} onDelete={onDelete} />}
        left={left}
        right={details}
      />
      <DetailSheet visible={sheet === 'add'} phone={props.phone} title="Ajouter un détail" onClose={() => setSheet(null)} testID="add-detail-sheet">
        <View style={styles.wrap}>
          {missing.map((f) => (
            <Button key={f} label={DREAM_FIELD_TITLES[f]} image="ajouter-petit" onPress={() => setSheet(f)} testID={`add-${f}`} />
          ))}
        </View>
      </DetailSheet>
      {sheet && sheet !== 'add' && (
        <DetailSheet visible phone={props.phone} title={DREAM_FIELD_TITLES[sheet]} onClose={() => setSheet(null)}>
          <DreamFieldEditor field={sheet} draft={d} commit={commit} onShowOnMap={props.onShowOnMap} />
        </DetailSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  sleepChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 38, lineHeight: 44 },
  storyEdit: { color: colors.ink, fontFamily: fonts.body, fontSize: 18, lineHeight: 28 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  placeChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 10, paddingRight: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  placeMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tiles: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
});
