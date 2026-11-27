/** Calculs du sommeil (sans affichage, testés dans sleep.test.ts). */
import type { Sleep } from './types';

/** « 23:30 » → minutes depuis minuit (1410), ou null si invalide. */
export function parseTime(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Saisie libre (« 2330 », « 7h05 », « 7:5 ») → « HH:MM », ou null. */
export function normalizeTime(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  let h: number;
  let m: number;
  const parts = input.split(/[^\d]+/).filter(Boolean);
  if (parts.length >= 2) {
    h = Number(parts[0]);
    m = Number(parts[1]);
  } else if (digits.length <= 2) {
    h = Number(digits);
    m = 0;
  } else {
    h = Number(digits.slice(0, digits.length - 2));
    m = Number(digits.slice(-2));
  }
  if (!digits || isNaN(h) || isNaN(m) || h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDuration(min: number | null): string {
  if (min === null || min < 0) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

export interface SleepSummary {
  /** Minutes depuis le minuit du jour du coucher (peuvent dépasser 1440). */
  bed: number | null;
  asleep: number | null;
  wake: number | null;
  up: number | null;
  interruptions: { from: number; to: number }[];
  /** Coucher → endormissement. */
  fallAsleep: number | null;
  /** Endormissement → réveil, moins les réveils. */
  sleep: number | null;
  /** Total des réveils pendant le sommeil. */
  awake: number;
  /** Réveil → lever. */
  getUp: number | null;
  /** Coucher → lever (ou réveil). */
  inBed: number | null;
  /** Jours ajoutés à la date du coucher pour obtenir le jour du réveil. */
  wakeDayOffset: number;
  /** Sieste : coucher entre 9 h et 19 h. */
  isNap: boolean;
}

/** Remet chaque heure après la précédente (en passant minuit autant que nécessaire). */
function after(prev: number | null, t: number | null): number | null {
  if (t === null) return null;
  if (prev === null) return t;
  let v = t;
  while (v < prev) v += 1440;
  return v;
}

export function summarizeSleep(s: Pick<Sleep, 'bedTime' | 'asleepTime' | 'wakeTime' | 'upTime' | 'interruptions'>): SleepSummary {
  const bed = parseTime(s.bedTime);
  const asleep = after(bed, parseTime(s.asleepTime));
  const startSleep = asleep ?? bed;
  // Réveils : chacun après l'endormissement, rangés dans l'ordre de la nuit.
  const ints = (s.interruptions ?? [])
    .map((i) => {
      const from = after(startSleep, parseTime(i.from));
      const to = after(from, parseTime(i.to));
      return from !== null && to !== null ? { from, to } : null;
    })
    .filter((x): x is { from: number; to: number } => !!x)
    .sort((a, b) => a.from - b.from);
  const lastPoint = ints.length ? ints[ints.length - 1].to : startSleep;
  const wake = after(lastPoint, parseTime(s.wakeTime));
  const up = after(wake ?? lastPoint, parseTime(s.upTime));

  const awake = ints.reduce((sum, i) => sum + (i.to - i.from), 0);
  const fallAsleep = bed !== null && asleep !== null ? asleep - bed : null;
  const sleepStart = asleep ?? null;
  const sleep = sleepStart !== null && wake !== null ? Math.max(0, wake - sleepStart - awake) : null;
  const getUp = wake !== null && up !== null ? up - wake : null;
  const end = up ?? wake;
  const inBed = bed !== null && end !== null ? end - bed : null;
  const anchor = wake ?? up ?? asleep ?? bed ?? 0;
  const bedMod = bed ?? asleep;
  return {
    bed,
    asleep,
    wake,
    up,
    interruptions: ints,
    fallAsleep,
    sleep,
    awake,
    getUp,
    inBed,
    wakeDayOffset: Math.floor(anchor / 1440),
    isNap: bedMod !== null && bedMod >= 9 * 60 && bedMod < 19 * 60,
  };
}

/** Ajoute des jours à une date AAAA-MM-JJ. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + days, 12);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** Jour où le sommeil se termine (sert à le ranger avec les rêves de ce matin-là). */
export function sleepEndDate(s: Pick<Sleep, 'date' | 'bedTime' | 'asleepTime' | 'wakeTime' | 'upTime' | 'interruptions'>): string {
  return shiftDate(s.date, summarizeSleep(s).wakeDayOffset);
}

/** Date proposée pour un nouveau sommeil : la veille si on le note le matin (nuit passée), sinon aujourd'hui. */
export function defaultSleepDate(now: Date = new Date()): string {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return now.getHours() < 14 ? shiftDate(today, -1) : today;
}

/**
 * Date du coucher quand on n'a pas choisi la date soi-même : le matin, l'app propose « hier » ; mais si on
 * s'est couché après minuit (avant 9 h), le coucher a eu lieu aujourd'hui.
 */
export function autoSleepDate(bedTime: string | null | undefined, now: Date = new Date()): string {
  const proposed = defaultSleepDate(now);
  const bed = parseTime(bedTime ?? null);
  if (now.getHours() < 14 && bed !== null && bed < 9 * 60) return shiftDate(proposed, 1);
  return proposed;
}

/** Libellé court d'un sommeil : « Nuit du 26 au 27 nov. » ou « Sieste du 27 nov. ». */
export function sleepTitle(s: Pick<Sleep, 'date' | 'bedTime' | 'asleepTime' | 'wakeTime' | 'upTime' | 'interruptions'>): string {
  const sum = summarizeSleep(s);
  const fmt = (d: string, withMonth: boolean) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day, 12).toLocaleDateString('fr-FR', withMonth ? { day: 'numeric', month: 'short' } : { day: 'numeric' });
  };
  if (sum.isNap) return `Sieste du ${fmt(s.date, true)}`;
  const end = sleepEndDate(s);
  return end === s.date ? `Nuit du ${fmt(s.date, true)}` : `Nuit du ${fmt(s.date, false)} au ${fmt(end, true)}`;
}

/** Sommeils qui peuvent contenir un rêve noté à cette date (fin du sommeil ce jour-là, ou coucher ce jour-là). */
export function candidateSleepsFor<T extends Pick<Sleep, 'date' | 'bedTime' | 'asleepTime' | 'wakeTime' | 'upTime' | 'interruptions'>>(
  sleeps: T[],
  dreamDate: string,
): T[] {
  return sleeps.filter((s) => sleepEndDate(s) === dreamDate || s.date === dreamDate);
}

/** Sommeil à lier automatiquement à un nouveau rêve : la seule nuit (hors sieste) qui finit ce jour-là. */
export function autoSleepFor<T extends Pick<Sleep, 'date' | 'bedTime' | 'asleepTime' | 'wakeTime' | 'upTime' | 'interruptions'>>(
  sleeps: T[],
  dreamDate: string,
): T | null {
  const nights = sleeps.filter((s) => sleepEndDate(s) === dreamDate && !summarizeSleep(s).isNap);
  return nights.length === 1 ? nights[0] : null;
}

/** Un morceau de barre du tracker : minutes depuis midi du jour de la ligne (0 → 1440 = midi suivant). */
export interface TrackerSegment {
  row: string;
  start: number;
  end: number;
  /** au lit éveillé avant de dormir, sommeil, réveil pendant la nuit, au lit après le réveil */
  kind: 'bed' | 'sleep' | 'awake' | 'up';
}

/**
 * Découpe un sommeil en barres pour le tracker façon bullet journal : une ligne par jour, de midi à midi,
 * pour qu'une nuit tienne sur une seule ligne et qu'une sieste apparaisse aussi.
 */
export function trackerSegments(s: Pick<Sleep, 'date' | 'bedTime' | 'asleepTime' | 'wakeTime' | 'upTime' | 'interruptions'>): TrackerSegment[] {
  const sum = summarizeSleep(s);
  const first = sum.bed ?? sum.asleep ?? sum.wake;
  if (first === null) return [];
  const row = first >= 720 ? s.date : shiftDate(s.date, -1);
  const shift = first >= 720 ? -720 : 720;
  const out: TrackerSegment[] = [];
  const push = (a: number | null, b: number | null, kind: TrackerSegment['kind']) => {
    if (a === null || b === null || b <= a) return;
    const start = Math.max(0, a + shift);
    const end = Math.min(1440, b + shift);
    if (end > start) out.push({ row, start, end, kind });
  };
  const sleepStart = sum.asleep ?? sum.bed;
  if (sum.asleep !== null) push(sum.bed, sum.asleep, 'bed');
  if (sleepStart !== null && sum.wake !== null) {
    let cursor = sleepStart;
    for (const i of sum.interruptions) {
      push(cursor, i.from, 'sleep');
      push(i.from, i.to, 'awake');
      cursor = Math.max(cursor, i.to);
    }
    push(cursor, sum.wake, 'sleep');
  }
  push(sum.wake, sum.up, 'up');
  return out;
}

/** Ajoute (ou retire) des minutes à une heure « HH:MM », en passant minuit si besoin. */
export function addMinutes(t: string, delta: number): string {
  const m = parseTime(t);
  if (m === null) return t;
  const v = (((m + delta) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
}

/**
 * Réveil pendant la nuit : quand on remplit une seule des deux heures, l'autre se met toute seule
 * 5 minutes après (ou avant). On peut ensuite la changer à la main.
 */
export function completeInterruption(i: { from: string; to: string }, changed: 'from' | 'to'): { from: string; to: string } {
  if (changed === 'from' && i.from && !i.to) return { ...i, to: addMinutes(i.from, 5) };
  if (changed === 'to' && i.to && !i.from) return { ...i, from: addMinutes(i.to, -5) };
  return i;
}
