import { describe, expect, it, vi } from 'vitest';

vi.mock('./appStore', () => ({
  appStore: {
    list: (c: string) =>
      c === 'dreams'
        ? [{ id: 'd', placeIds: ['a'] }]
        : [
            { id: 'a', kind: 'place', name: 'A' },
            { id: 'b', kind: 'place', name: 'B' },
            { id: 'c', kind: 'place', name: 'C' },
            { id: 'v', kind: 'vehicle', name: 'Train', route: { fromId: 'b', toId: 'a' } },
          ],
  },
}));

describe('supprimer un lieu', async () => {
  const { placeUsage, placeUsageReason } = await import('./placeUsage');
  it('seulement s’il ne sert à aucun rêve ni trajet', () => {
    expect(placeUsage('a')).toMatchObject({ dreams: 1, deletable: false });
    expect(placeUsage('b')).toMatchObject({ dreams: 0, vehicles: ['Train'], deletable: false });
    expect(placeUsage('c').deletable).toBe(true);
    expect(placeUsage('v').deletable).toBe(true);
    expect(placeUsageReason(placeUsage('a'))).toContain('1 rêve');
  });
});
