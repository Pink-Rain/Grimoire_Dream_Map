import { describe, expect, it, vi } from 'vitest';

const dreams = [
  { id: 'a', dreamDate: '2026-11-27', createdAt: '2026-11-27T07:00:00Z', title: 'A', text: '', kind: 'full', lucidity: 2 },
  { id: 'b', dreamDate: '2026-11-27', createdAt: '2026-11-27T09:00:00Z', title: 'B', text: '', kind: 'quick' },
  { id: 'c', dreamDate: '2026-11-25', createdAt: '2026-11-25T07:00:00Z', title: 'C', text: 'mer', kind: 'full' },
];
const sleeps = [{ id: 's', date: '2026-11-26', bedTime: '23:00', wakeTime: '07:00', interruptions: [] }];
vi.mock('../data/appStore', () => ({
  appStore: { list: (c: string) => (c === 'dreams' ? dreams : c === 'sleeps' ? sleeps : []), get: () => undefined },
}));

describe('journal', async () => {
  const j = await import('./journalState');
  it('range les entrées (plus récentes d’abord, la nuit avant les rêves du jour)', () => {
    expect(j.journalEntries('all', '').map((e) => e.id)).toEqual(['s', 'a', 'b', 'c']);
    expect(j.journalEntries('sleeps', '').map((e) => e.id)).toEqual(['s']);
    expect(j.journalEntries('quick', '').map((e) => e.id)).toEqual(['b']);
    expect(j.journalEntries('lucid', '').map((e) => e.id)).toEqual(['a']);
    expect(j.journalEntries('all', 'mer').map((e) => e.id)).toEqual(['c']);
  });
  it('tourne les pages dans l’ordre du temps', () => {
    expect(j.neighbour('dream', 'a', -1)?.id).toBe('s');
    expect(j.neighbour('dream', 'a', 1)?.id).toBe('b');
    expect(j.neighbour('sleep', 's', -1)?.id).toBe('c');
    expect(j.neighbour('dream', 'b', 1)).toBeNull();
  });
});
