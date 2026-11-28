/** Les « détails » d'un sommeil, partagés entre le formulaire (SleepEditor) et la page de lecture (SleepPage). */
import { appStore } from '../data/appStore';
import type { Sleep } from '../data/types';
import { EMOTIONS, MOOD_GRID, optionFor, SLEEP_FACTORS, SLEEP_PLACES, SLEEP_QUALITY, WAKE_ENERGY } from './theme';
import { EmojiScale, MoodPicker, WordPicker } from './widgets';

export type SleepFieldsDraft = Pick<Sleep, 'quality' | 'energy' | 'factors' | 'sleepPlaces' | 'wakeMood' | 'wakeMoodEmoji' | 'wakeEmotions'>;
export type SleepEditable = Partial<Omit<Sleep, 'id' | 'createdAt' | 'updatedAt' | 'deleted'>>;

export const SLEEP_FIELDS = ['feel', 'wakeMood', 'context'] as const;
export type SleepField = (typeof SLEEP_FIELDS)[number];
export const SLEEP_FIELD_TITLES: Record<SleepField, string> = {
  feel: 'Ressenti',
  wakeMood: 'Humeur au réveil',
  context: 'La veille et le lieu',
};

export function isSleepFieldEmpty(f: SleepField, d: Partial<SleepFieldsDraft>): boolean {
  if (f === 'feel') return d.quality == null && d.energy == null;
  if (f === 'wakeMood') return d.wakeMood == null && !d.wakeMoodEmoji && !(d.wakeEmotions ?? []).length;
  return !(d.factors ?? []).length && !(d.sleepPlaces ?? []).length;
}

function unique(list: string[]) {
  return Array.from(new Map(list.map((w) => [w.toLowerCase(), w])).values());
}

export function SleepFieldEditor(props: { field: SleepField; draft: Partial<SleepFieldsDraft>; commit: (f: SleepEditable) => void }) {
  const d = props.draft;
  const commit = props.commit;
  const sleeps = appStore.list('sleeps');
  if (props.field === 'feel')
    return (
      <>
        <EmojiScale levels={SLEEP_QUALITY} value={d.quality ?? null} onChange={(quality) => commit({ quality })} name="Qualité du sommeil" placeholder="Qualité du sommeil" testID="quality" />
        <EmojiScale levels={WAKE_ENERGY} value={d.energy ?? null} onChange={(energy) => commit({ energy })} name="Énergie au réveil" placeholder="Énergie au réveil" testID="energy" />
      </>
    );
  if (props.field === 'wakeMood') {
    const emotions = unique([
      ...sleeps.flatMap((x) => x.wakeEmotions ?? []),
      ...appStore.list('dreams').flatMap((x) => (x.emotions ?? []).map((v) => optionFor(EMOTIONS, v).label)),
      ...EMOTIONS.map((o) => o.label),
    ]);
    return (
      <>
        <MoodPicker grid={MOOD_GRID} level={d.wakeMood ?? null} emoji={d.wakeMoodEmoji ?? null} onChange={(wakeMood, wakeMoodEmoji) => commit({ wakeMood, wakeMoodEmoji })} />
        <WordPicker value={d.wakeEmotions ?? []} onChange={(wakeEmotions) => commit({ wakeEmotions })} suggestions={emotions} placeholder="Émotions au réveil… puis Entrée" testID="wake-emotion" />
      </>
    );
  }
  const suggest = (pick: (x: Sleep) => string[] | undefined, base: string[]) => unique([...sleeps.flatMap((x) => pick(x) ?? []), ...base]);
  return (
    <>
      <WordPicker value={d.factors ?? []} onChange={(factors) => commit({ factors })} suggestions={suggest((x) => x.factors, SLEEP_FACTORS)} placeholder="Facteurs : café, écrans, stress… puis Entrée" testID="factor" />
      <WordPicker value={d.sleepPlaces ?? []} onChange={(sleepPlaces) => commit({ sleepPlaces })} suggestions={suggest((x) => x.sleepPlaces, SLEEP_PLACES)} placeholder="Lieu : chez moi, en voyage… puis Entrée" testID="sleep-place" />
    </>
  );
}
