import { describe, expect, it } from 'vitest';
import { parseExportBundle, parseShardDoc, pickWinner, shardKeyFor } from './records';
import { DataStore } from './store';
import { MemoryStorage } from './storage/types';
import type { Dream } from './types';

function makeStore(storage = new MemoryStorage(), start = '2026-11-27T10:00:00.000Z') {
  let t = new Date(start).getTime();
  let n = 0;
  const store = new DataStore({
    storage,
    generateId: () => `id-${++n}`,
    now: () => new Date((t += 1000)),
    saveDelayMs: 0,
  });
  return { store, storage, setTime: (iso: string) => (t = new Date(iso).getTime()) };
}

describe('règles de base', () => {
  it('range un élément par mois de création', () => {
    expect(shardKeyFor({ createdAt: '2026-03-04T00:00:00Z' })).toBe('2026-03');
    expect(shardKeyFor({ createdAt: 'n/importe' })).toBe('misc');
  });

  it('la version la plus récente gagne, et le choix est le même dans les deux sens', () => {
    const a = { id: 'x', createdAt: 'c', updatedAt: '2026-01-02', deleted: false };
    const b = { id: 'x', createdAt: 'c', updatedAt: '2026-01-01', deleted: true };
    expect(pickWinner(a, b)).toBe(a);
    expect(pickWinner(b, a)).toBe(a);
    const c = { ...a, deleted: true };
    expect(pickWinner(a, c)).toBe(pickWinner(c, a));
  });
});

describe('DataStore', () => {
  it('crée, modifie et supprime (marque supprimé) un rêve', async () => {
    const { store, storage } = makeStore();
    const id = store.newId();
    const created = store.save('dreams', id, { title: 'Vol', text: '', dreamDate: '2026-11-27' });
    expect(created.id).toBe(id);
    expect(created.deleted).toBe(false);

    const edited = store.save('dreams', id, { text: 'Je volais' });
    expect(edited.title).toBe('Vol');
    expect(edited.createdAt).toBe(created.createdAt);
    expect(edited.updatedAt > created.updatedAt).toBe(true);

    store.remove('dreams', id);
    expect(store.list('dreams')).toHaveLength(0);
    expect(store.get('dreams', id)).toBeUndefined();

    await store.flush();
    const doc = parseShardDoc(storage.items.get('dreams.2026-11')!)!;
    expect(doc.schemaVersion).toBe(1);
    expect(doc.records[0]).toMatchObject({ id, deleted: true, text: 'Je volais' });
  });

  it('relit les données enregistrées', async () => {
    const { store, storage } = makeStore();
    store.save('dreams', store.newId(), { title: 'A', text: 't', dreamDate: '2026-11-27' });
    await store.flush();
    const { store: reloaded } = makeStore(storage);
    await reloaded.load();
    expect(reloaded.list('dreams').map((d) => d.title)).toEqual(['A']);
  });

  it('découpe les données en plusieurs fichiers (un par mois)', async () => {
    const { store, storage, setTime } = makeStore();
    setTime('2026-10-15T00:00:00Z');
    store.save('dreams', store.newId(), { title: 'oct', text: '', dreamDate: '2026-10-15' });
    setTime('2026-11-15T00:00:00Z');
    store.save('dreams', store.newId(), { title: 'nov', text: '', dreamDate: '2026-11-15' });
    await store.flush();
    expect([...storage.items.keys()].sort()).toEqual(['dreams.2026-10', 'dreams.2026-11']);
  });

  it('conserve les champs inconnus ajoutés par une version future', async () => {
    const storage = new MemoryStorage();
    storage.items.set(
      'dreams.2026-11',
      JSON.stringify({
        app: 'grimoire-dream-journal',
        schemaVersion: 9,
        collection: 'dreams',
        shard: '2026-11',
        records: [
          { id: 'z', createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', deleted: false, title: 'old', text: '', dreamDate: '2026-11-01', mood: 'calme' },
        ],
      }),
    );
    const { store } = makeStore(storage);
    await store.load();
    store.save('dreams', 'z', { title: 'new' });
    await store.flush();
    const rec = parseShardDoc(storage.items.get('dreams.2026-11')!)!.records[0] as Dream;
    expect(rec.title).toBe('new');
    expect(rec.mood).toBe('calme');
  });

  it("l'import fusionne : la version la plus récente de chaque élément gagne", async () => {
    const a = makeStore();
    const id1 = a.store.newId();
    a.store.save('dreams', id1, { title: 'v1', text: '', dreamDate: '2026-11-27' });
    const exported = JSON.stringify(a.store.exportBundle());

    const b = makeStore(new MemoryStorage(), '2026-11-28T10:00:00.000Z');
    const parsed = parseExportBundle(exported);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(b.store.importBundle(parsed.bundle)).toEqual({ added: 1, updated: 0, unchanged: 0 });
    // B modifie plus tard -> un nouvel import de l'ancien export ne doit pas écraser.
    b.store.save('dreams', id1, { title: 'v2' });
    expect(b.store.importBundle(parsed.bundle)).toEqual({ added: 0, updated: 0, unchanged: 1 });
    expect(b.store.get('dreams', id1)!.title).toBe('v2');
    // A importe l'export de B -> reçoit v2.
    const back = parseExportBundle(JSON.stringify(b.store.exportBundle()));
    if (!back.ok) throw new Error();
    expect(a.store.importBundle(back.bundle).updated).toBe(1);
    expect(a.store.get('dreams', id1)!.title).toBe('v2');
  });

  it('refuse un fichier qui n’est pas un export Grimoire', () => {
    expect(parseExportBundle('pas du json').ok).toBe(false);
    expect(parseExportBundle('{"foo":1}').ok).toBe(false);
  });
});
