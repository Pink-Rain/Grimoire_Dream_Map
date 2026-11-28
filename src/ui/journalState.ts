/**
 * État du journal partagé (filtre, recherche) et liste ordonnée des entrées : sert à la fois à la liste
 * et aux flèches « page précédente / suivante » des pages de lecture.
 */
import { useSyncExternalStore } from 'react';
import { appStore } from '../data/appStore';
import { sleepEndDate, summarizeSleep } from '../data/sleep';
import { normalizeDream, type Dream, type Sleep } from '../data/types';

export type JournalFilter = 'all' | 'dreams' | 'quick' | 'sleeps' | 'lucid';
export type JournalEntry = { kind: 'dream'; id: string; day: string; dream: Dream } | { kind: 'sleep'; id: string; day: string; sleep: Sleep };

let state = { filter: 'all' as JournalFilter, query: '' };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setJournalFilter(filter: JournalFilter) {
  state = { ...state, filter };
  emit();
}
export function setJournalQuery(query: string) {
  state = { ...state, query };
  emit();
}
export function getJournalState() {
  return state;
}
export function useJournalState() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  );
}

function matchDream(d: Dream, query: string) {
  const n = normalizeDream(d);
  const hay = [
    d.title,
    d.text,
    ...n.tags,
    ...n.ambiances,
    ...n.emotions,
    ...n.genres,
    ...n.dreamTypes,
    ...n.placeIds.map((id) => appStore.get('places', id)?.name ?? ''),
    ...n.peopleIds.map((id) => appStore.get('people', id)?.name ?? ''),
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(query);
}

function matchSleep(s: Sleep, query: string) {
  return [...(s.factors ?? []), ...(s.sleepPlaces ?? []), ...(s.wakeEmotions ?? [])].join(' ').toLowerCase().includes(query);
}

/** Entrées du journal, les plus récentes d'abord (une nuit est rangée au jour du réveil). */
export function journalEntries(filter: JournalFilter, rawQuery: string, chronological = false): JournalEntry[] {
  const query = rawQuery.trim().toLowerCase();
  const out: JournalEntry[] = [];
  if (filter !== 'sleeps') {
    for (const d of appStore.list('dreams')) {
      const n = normalizeDream(d);
      if (filter === 'dreams' && n.kind !== 'full') continue;
      if (filter === 'quick' && n.kind !== 'quick') continue;
      if (filter === 'lucid' && !(n.lucidity !== null && n.lucidity >= 1)) continue;
      if (query && !matchDream(d, query)) continue;
      out.push({ kind: 'dream', id: d.id, day: d.dreamDate, dream: d });
    }
  }
  if (filter === 'all' || filter === 'sleeps') {
    for (const s of appStore.list('sleeps')) {
      if (query && !matchSleep(s, query)) continue;
      out.push({ kind: 'sleep', id: s.id, day: sleepEndDate(s), sleep: s });
    }
  }
  // Dans une journée : la nuit d'abord, puis les rêves dans l'ordre où ils ont été notés.
  const key = (e: JournalEntry) =>
    e.kind === 'sleep' ? `0-${String(10000 + (summarizeSleep(e.sleep).bed ?? 0)).padStart(6, '0')}` : `1-${e.dream.createdAt}`;
  out.sort((x, y) => (x.day === y.day ? key(x).localeCompare(key(y)) : chronological ? x.day.localeCompare(y.day) : y.day.localeCompare(x.day)));
  return out;
}

/** Entrée voisine (pour tourner les pages) : « précédente » = plus ancienne. */
export function neighbour(kind: 'dream' | 'sleep', id: string, dir: -1 | 1): JournalEntry | null {
  const { filter, query } = state;
  // Dans l'ordre du temps, comme les pages d'un carnet.
  let list = journalEntries(filter, query, true);
  let i = list.findIndex((e) => e.kind === kind && e.id === id);
  if (i < 0) {
    // Ouvert depuis ailleurs (carte, tracker) : on tourne les pages de tout le journal.
    list = journalEntries('all', '', true);
    i = list.findIndex((e) => e.kind === kind && e.id === id);
    if (i < 0) return null;
  }
  return list[i + dir] ?? null;
}

/** Jours qui ont un rêve ou une nuit (pour le calendrier). */
export function dayMarks(): Map<string, { dream: boolean; sleep: boolean }> {
  const m = new Map<string, { dream: boolean; sleep: boolean }>();
  const get = (d: string) => m.get(d) ?? (m.set(d, { dream: false, sleep: false }), m.get(d)!);
  for (const d of appStore.list('dreams')) get(d.dreamDate).dream = true;
  for (const s of appStore.list('sleeps')) get(sleepEndDate(s)).sleep = true;
  return m;
}
