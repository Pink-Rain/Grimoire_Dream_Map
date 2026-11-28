/**
 * Les « détails » d'un rêve, partagés entre le formulaire complet (DreamEditor) et la page de lecture
 * (DreamPage), où toucher un détail ouvre seulement son sélecteur.
 */
import { appStore } from '../data/appStore';
import type { Dream } from '../data/types';
import { normalizeDream } from '../data/types';
import { PeopleSection, PlacesSection } from './DreamSections';
import { MediaSection } from './MediaSection';
import { AMBIANCES, CLARITY_LEVELS, DREAM_TYPES, EMOTIONS, GENRES, MOOD_GRID, optionFor, TIME_CHOICES, TIMES_OF_DAY, WEATHER_CHOICES, WEATHERS } from './theme';
import { ColorPicker, CompactEmojiPicker, EmojiScale, LucidityScale, MoodPicker, WordPicker } from './widgets';

export type DreamDraft = ReturnType<typeof normalizeDream>;
export type DreamEditable = Partial<Omit<Dream, 'id' | 'createdAt' | 'updatedAt' | 'deleted'>>;

/** Dans l'ordre du formulaire. */
export const DREAM_FIELDS = ['media', 'places', 'people', 'mood', 'lucidity', 'weather', 'tags', 'genre', 'colors'] as const;
export type DreamField = (typeof DREAM_FIELDS)[number];

export const DREAM_FIELD_TITLES: Record<DreamField, string> = {
  media: 'Notes vocales et médias',
  places: 'Lieux',
  people: 'Personnes',
  mood: 'Humeur et émotions',
  lucidity: 'Lucidité et clarté',
  weather: 'Météo et moment',
  tags: 'Étiquettes et mots-clés',
  genre: 'Genre, type et ambiance',
  colors: 'Couleurs du rêve',
};

export function isDreamFieldEmpty(field: DreamField, d: DreamDraft): boolean {
  switch (field) {
    case 'media':
      return d.media.length === 0;
    case 'places':
      return d.placeIds.length === 0;
    case 'people':
      return d.peopleIds.length === 0;
    case 'mood':
      return d.mood === null && !d.moodEmoji && d.emotions.length === 0;
    case 'lucidity':
      return d.lucidity === null && d.clarity === null;
    case 'weather':
      return d.weather.length === 0 && d.timeOfDay.length === 0;
    case 'tags':
      return d.tags.length === 0;
    case 'genre':
      return d.genres.length === 0 && d.dreamTypes.length === 0 && d.ambiances.length === 0;
    case 'colors':
      return d.colors.length === 0;
  }
}

function uniqueCi(list: string[]): string[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    const k = w.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Étiquettes réutilisables : celles déjà utilisées dans le journal + une liste de départ. */
export function dreamSuggestions() {
  const dreams = appStore.list('dreams');
  const labelsOf = (list: typeof EMOTIONS, pick: (d: Dream) => string[] | undefined) =>
    uniqueCi([...dreams.flatMap((d) => (pick(d) ?? []).map((v) => optionFor(list, v).label)), ...list.map((o) => o.label)]);
  return {
    tags: Array.from(new Set(dreams.flatMap((d) => d.tags ?? []))).sort((a, b) => a.localeCompare(b)),
    emotions: labelsOf(EMOTIONS, (d) => d.emotions),
    types: labelsOf(DREAM_TYPES, (d) => d.dreamTypes),
    ambiances: uniqueCi([...dreams.flatMap((d) => d.ambiances ?? []), ...AMBIANCES]),
    genres: uniqueCi([...dreams.flatMap((d) => d.genres ?? []), ...GENRES]),
  };
}

/** Le ou les sélecteurs d'un détail. */
export function DreamFieldEditor(props: { field: DreamField; draft: DreamDraft; commit: (f: DreamEditable) => void; onShowOnMap?: (placeId: string) => void }) {
  const { draft, commit } = props;
  const s = dreamSuggestions();
  switch (props.field) {
    case 'media':
      return <MediaSection value={draft.media} onChange={(media) => commit({ media })} />;
    case 'places':
      return <PlacesSection value={draft.placeIds} onChange={(placeIds) => commit({ placeIds })} onShowOnMap={props.onShowOnMap} />;
    case 'people':
      return <PeopleSection value={draft.peopleIds} onChange={(peopleIds) => commit({ peopleIds })} />;
    case 'mood':
      return (
        <>
          <MoodPicker grid={MOOD_GRID} level={draft.mood} emoji={draft.moodEmoji} onChange={(mood, moodEmoji) => commit({ mood, moodEmoji })} />
          <WordPicker
            value={draft.emotions.map((v) => optionFor(EMOTIONS, v).label)}
            onChange={(emotions) => commit({ emotions })}
            suggestions={s.emotions}
            placeholder="Émotions : peur, joie, nostalgie… puis Entrée"
            testID="emotion"
          />
        </>
      );
    case 'lucidity':
      return (
        <>
          <LucidityScale value={draft.lucidity} onChange={(lucidity) => commit({ lucidity })} />
          <EmojiScale levels={CLARITY_LEVELS} value={draft.clarity} onChange={(clarity) => commit({ clarity })} name="Clarté" placeholder="Clarté : de très flou à très net" testID="clarity" />
        </>
      );
    case 'weather':
      return (
        <>
          <CompactEmojiPicker options={WEATHER_CHOICES} legacy={WEATHERS} value={draft.weather} onChange={(weather) => commit({ weather })} testID="weather" />
          <CompactEmojiPicker options={TIME_CHOICES} legacy={TIMES_OF_DAY} value={draft.timeOfDay} onChange={(timeOfDay) => commit({ timeOfDay })} testID="time" />
        </>
      );
    case 'tags':
      return <WordPicker value={draft.tags} onChange={(tags) => commit({ tags })} suggestions={s.tags} placeholder="Mot-clé puis Entrée" testID="tag" />;
    case 'genre':
      return (
        <>
          <WordPicker value={draft.genres} onChange={(genres) => commit({ genres })} suggestions={s.genres} placeholder="Genre : aventure, horreur… puis Entrée" testID="genre" />
          <WordPicker
            value={draft.dreamTypes.map((v) => optionFor(DREAM_TYPES, v).label)}
            onChange={(dreamTypes) => commit({ dreamTypes })}
            suggestions={s.types}
            placeholder="Type : cauchemar, récurrent… puis Entrée"
            testID="type"
          />
          <WordPicker value={draft.ambiances} onChange={(ambiances) => commit({ ambiances })} suggestions={s.ambiances} placeholder="Ambiance : paisible, étrange… puis Entrée" testID="ambiance" />
        </>
      );
    case 'colors':
      return <ColorPicker value={draft.colors} onChange={(c) => commit({ colors: c })} />;
  }
}
