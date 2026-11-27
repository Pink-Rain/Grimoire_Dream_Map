import { describe, expect, it } from 'vitest';
import { hashText } from '../data/records';
import { DataStore } from '../data/store';
import { MemoryStorage } from '../data/storage/types';
import type { DriveApi, RemoteFile } from './drive';
import { emptySyncState, syncOnce, type SyncState } from './engine';

/** Faux Google Drive en mémoire, qui compte les opérations. */
class FakeDrive implements DriveApi {
  files = new Map<string, RemoteFile & { content: string }>();
  ops = { list: 0, download: 0, create: 0, update: 0, remove: 0 };
  private n = 0;
  private clock = 0;
  private meta(f: RemoteFile & { content: string }): RemoteFile {
    const { content, ...rest } = f;
    return rest;
  }
  private md5(s: string) {
    return hashText(s);
  }
  async list() {
    this.ops.list++;
    return [...this.files.values()].map((f) => this.meta(f));
  }
  async download(id: string) {
    this.ops.download++;
    return this.files.get(id)!.content;
  }
  async create(name: string, content: string) {
    this.ops.create++;
    const f = { id: `f${++this.n}`, name, content, md5Checksum: this.md5(content), createdTime: String(++this.clock).padStart(5, '0') };
    this.files.set(f.id, f);
    return this.meta(f);
  }
  async update(id: string, content: string) {
    this.ops.update++;
    const f = this.files.get(id)!;
    Object.assign(f, { content, md5Checksum: this.md5(content) });
    return this.meta(f);
  }
  async remove(id: string) {
    this.ops.remove++;
    this.files.delete(id);
  }
  resetOps() {
    this.ops = { list: 0, download: 0, create: 0, update: 0, remove: 0 };
  }
}

class Device {
  store: DataStore;
  state: SyncState = emptySyncState();
  private t: number;
  constructor(name: string, startIso: string) {
    this.t = new Date(startIso).getTime();
    let n = 0;
    this.store = new DataStore({ storage: new MemoryStorage(), generateId: () => `${name}-${++n}`, now: () => new Date((this.t += 1000)), saveDelayMs: 0 });
  }
  at(iso: string) {
    this.t = new Date(iso).getTime();
    return this;
  }
  async sync(drive: DriveApi) {
    const { state, result } = await syncOnce(this.store, drive, this.state);
    this.state = state;
    return result;
  }
  titles() {
    return this.store.list('dreams').map((d) => d.title).sort();
  }
}

describe('synchro Drive', () => {
  it('envoie puis reçoit les rêves d’un appareil à l’autre', async () => {
    const drive = new FakeDrive();
    const pc = new Device('pc', '2026-11-27T10:00:00Z');
    const phone = new Device('phone', '2026-11-27T10:00:30Z');
    pc.store.save('dreams', pc.store.newId(), { title: 'Forêt', text: '', dreamDate: '2026-11-27' });
    expect(await pc.sync(drive)).toMatchObject({ uploaded: 1 });
    expect(await phone.sync(drive)).toMatchObject({ downloaded: 1, received: 1, uploaded: 0 });
    expect(phone.titles()).toEqual(['Forêt']);
  });

  it('ne refait rien quand rien n’a changé', async () => {
    const drive = new FakeDrive();
    const pc = new Device('pc', '2026-11-27T10:00:00Z');
    const phone = new Device('phone', '2026-11-27T10:00:30Z');
    pc.store.save('dreams', pc.store.newId(), { title: 'A', text: '', dreamDate: '2026-11-27' });
    await pc.sync(drive);
    await phone.sync(drive);
    await pc.sync(drive);
    drive.resetOps();
    expect(await pc.sync(drive)).toEqual({ downloaded: 0, uploaded: 0, received: 0 });
    expect(await phone.sync(drive)).toEqual({ downloaded: 0, uploaded: 0, received: 0 });
    expect(drive.ops).toEqual({ list: 2, download: 0, create: 0, update: 0, remove: 0 });
  });

  it('ne touche qu’au morceau (mois) modifié', async () => {
    const drive = new FakeDrive();
    const pc = new Device('pc', '2026-10-01T10:00:00Z');
    pc.store.save('dreams', pc.store.newId(), { title: 'Octobre', text: '', dreamDate: '2026-10-01' });
    pc.at('2026-11-01T10:00:00Z');
    const id = pc.store.newId();
    pc.store.save('dreams', id, { title: 'Novembre', text: '', dreamDate: '2026-11-01' });
    await pc.sync(drive);
    drive.resetOps();
    pc.store.save('dreams', id, { text: 'modifié' });
    expect(await pc.sync(drive)).toMatchObject({ uploaded: 1, downloaded: 0 });
  });

  it('conflit : la modification la plus récente gagne, sur les deux appareils', async () => {
    const drive = new FakeDrive();
    const pc = new Device('pc', '2026-11-27T10:00:00Z');
    const phone = new Device('phone', '2026-11-27T10:00:00Z');
    const id = pc.store.newId();
    pc.store.save('dreams', id, { title: 'v0', text: '', dreamDate: '2026-11-27' });
    await pc.sync(drive);
    await phone.sync(drive);
    pc.at('2026-11-27T11:00:00Z').store.save('dreams', id, { title: 'pc (11h)' });
    phone.at('2026-11-27T12:00:00Z').store.save('dreams', id, { title: 'téléphone (12h)' });
    await pc.sync(drive);
    await phone.sync(drive);
    await pc.sync(drive);
    expect(pc.titles()).toEqual(['téléphone (12h)']);
    expect(phone.titles()).toEqual(['téléphone (12h)']);
  });

  it('une suppression se propage', async () => {
    const drive = new FakeDrive();
    const pc = new Device('pc', '2026-11-27T10:00:00Z');
    const phone = new Device('phone', '2026-11-27T10:30:00Z');
    const id = pc.store.newId();
    pc.store.save('dreams', id, { title: 'À supprimer', text: '', dreamDate: '2026-11-27' });
    await pc.sync(drive);
    await phone.sync(drive);
    phone.store.remove('dreams', id);
    await phone.sync(drive);
    await pc.sync(drive);
    expect(pc.titles()).toEqual([]);
  });

  it('rien n’est perdu si deux appareils envoient en même temps', async () => {
    const drive = new FakeDrive();
    const pc = new Device('pc', '2026-11-27T10:00:00Z');
    const phone = new Device('phone', '2026-11-27T10:00:30Z');
    pc.store.save('dreams', pc.store.newId(), { title: 'du PC', text: '', dreamDate: '2026-11-27' });
    phone.store.save('dreams', phone.store.newId(), { title: 'du téléphone', text: '', dreamDate: '2026-11-27' });
    // Les deux listent un Drive vide puis créent chacun « dreams.2026-11.json » → doublon.
    await Promise.all([pc.sync(drive), phone.sync(drive)]);
    expect([...drive.files.values()].filter((f) => f.name === 'dreams.2026-11.json')).toHaveLength(2);
    await pc.sync(drive);
    await phone.sync(drive);
    expect([...drive.files.values()].filter((f) => f.name === 'dreams.2026-11.json')).toHaveLength(1);
    expect(pc.titles()).toEqual(['du PC', 'du téléphone']);
    expect(phone.titles()).toEqual(['du PC', 'du téléphone']);
  });

  it('se remet d’aplomb si le Drive a été vidé', async () => {
    const drive = new FakeDrive();
    const pc = new Device('pc', '2026-11-27T10:00:00Z');
    pc.store.save('dreams', pc.store.newId(), { title: 'A', text: '', dreamDate: '2026-11-27' });
    await pc.sync(drive);
    drive.files.clear();
    expect(await pc.sync(drive)).toMatchObject({ uploaded: 1 });
    expect(drive.files.size).toBe(1);
  });

  it('ignore les fichiers inconnus du Drive', async () => {
    const drive = new FakeDrive();
    await drive.create('autre-chose.txt', 'bonjour');
    await drive.create('futurecollection.2026-11.json', '{}');
    const pc = new Device('pc', '2026-11-27T10:00:00Z');
    expect(await pc.sync(drive)).toEqual({ downloaded: 0, uploaded: 0, received: 0 });
    expect(drive.files.size).toBe(2);
  });
});
