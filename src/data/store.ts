import {
  makeExportBundle,
  makeShardDoc,
  mergeRecordLists,
  parseShardDoc,
  parseStorageKey,
  shardKeyFor,
  storageKey,
} from './records';
import type { TextStorage } from './storage/types';
import { BaseRecord, COLLECTIONS, CollectionName, Dream, ExportBundle } from './types';

type RecordTypes = { dreams: Dream };

export interface StoreOptions {
  storage: TextStorage;
  generateId: () => string;
  now?: () => Date;
  /** Délai avant d'écrire sur le disque après une modification (ms). */
  saveDelayMs?: number;
}

export interface ImportResult {
  added: number;
  updated: number;
  unchanged: number;
}

/**
 * Les données de l'app, gardées en mémoire et enregistrées par morceaux (un fichier par mois).
 * Toute l'app passe par ici : c'est ce qui garantit les règles (UUID, dates, marque « supprimé »).
 */
export class DataStore {
  private storage: TextStorage;
  private generateId: () => string;
  private now: () => Date;
  private saveDelayMs: number;

  /** collection -> morceau -> (id -> élément) */
  private data = new Map<CollectionName, Map<string, Map<string, BaseRecord>>>();
  /** Morceaux modifiés pas encore écrits sur le disque : "dreams.2026-11". */
  private dirty = new Set<string>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saving: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  private version = 0;

  constructor(opts: StoreOptions) {
    this.storage = opts.storage;
    this.generateId = opts.generateId;
    this.now = opts.now ?? (() => new Date());
    this.saveDelayMs = opts.saveDelayMs ?? 400;
    for (const c of COLLECTIONS) this.data.set(c, new Map());
  }

  /** Charge tous les morceaux depuis le stockage local. */
  async load(): Promise<void> {
    const names = await this.storage.list();
    for (const name of names) {
      const parsed = parseStorageKey(name);
      if (!parsed || !COLLECTIONS.includes(parsed.collection as CollectionName)) continue;
      const text = await this.storage.read(name);
      const doc = text ? parseShardDoc(text) : null;
      if (!doc) continue;
      const shard = this.shardMap(doc.collection, doc.shard);
      for (const r of mergeRecordLists([...shard.values()], doc.records)) shard.set(r.id, r);
    }
    this.emit();
  }

  // ---------- Lecture ----------

  /** Éléments non supprimés d'une collection. */
  list<C extends CollectionName>(collection: C): RecordTypes[C][] {
    const out: RecordTypes[C][] = [];
    for (const shard of this.data.get(collection)!.values()) {
      for (const r of shard.values()) if (!r.deleted) out.push(r as RecordTypes[C]);
    }
    return out;
  }

  get<C extends CollectionName>(collection: C, id: string): RecordTypes[C] | undefined {
    for (const shard of this.data.get(collection)!.values()) {
      const r = shard.get(id);
      if (r) return r.deleted ? undefined : (r as RecordTypes[C]);
    }
    return undefined;
  }

  // ---------- Écriture ----------

  newId(): string {
    return this.generateId();
  }

  /**
   * Crée un élément, ou modifie l'élément existant avec cet id.
   * `id`, `createdAt`, `updatedAt` et `deleted` sont gérés ici automatiquement.
   */
  save<C extends CollectionName>(
    collection: C,
    id: string,
    fields: Partial<Omit<RecordTypes[C], keyof BaseRecord>>,
  ): RecordTypes[C] {
    const nowIso = this.now().toISOString();
    const existing = this.findAny(collection, id);
    const record = {
      ...(existing ?? { id, createdAt: nowIso }),
      ...fields,
      id,
      updatedAt: nowIso,
      deleted: false,
    } as BaseRecord;
    this.put(collection, record);
    return record as RecordTypes[C];
  }

  /** Supprime un élément (marque « supprimé », il reste stocké pour la synchro). */
  remove(collection: CollectionName, id: string): void {
    const existing = this.findAny(collection, id);
    if (!existing || existing.deleted) return;
    this.put(collection, { ...existing, deleted: true, updatedAt: this.now().toISOString() });
  }

  // ---------- Pour la synchro ----------

  /** Tous les morceaux existants, ex. [{collection: 'dreams', shard: '2026-11'}]. */
  shardKeys(): { collection: CollectionName; shard: string }[] {
    const out: { collection: CollectionName; shard: string }[] = [];
    for (const [collection, shards] of this.data) {
      for (const [shard, records] of shards) if (records.size) out.push({ collection, shard });
    }
    return out;
  }

  /** Tous les éléments d'un morceau, y compris ceux marqués supprimés. */
  shardRecords(collection: CollectionName, shard: string): BaseRecord[] {
    return [...(this.data.get(collection)?.get(shard)?.values() ?? [])];
  }

  /** Fusionne des éléments reçus (règle : le plus récent gagne). Renvoie le nombre d'éléments changés. */
  mergeRecords(collection: CollectionName, incoming: BaseRecord[]): number {
    if (!COLLECTIONS.includes(collection)) return 0;
    let changed = 0;
    for (const r of incoming) {
      const existing = this.findAny(collection, r.id);
      if (existing && mergeRecordLists([existing], [r])[0] === existing) continue;
      this.put(collection, r, false);
      changed++;
    }
    if (changed) this.emit();
    return changed;
  }

  // ---------- Export / import ----------

  exportBundle(): ExportBundle {
    const shards = [];
    for (const [collection, shardMap] of this.data) {
      for (const [shard, records] of shardMap) {
        if (records.size) shards.push(makeShardDoc(collection, shard, [...records.values()]));
      }
    }
    return makeExportBundle(shards, this.now());
  }

  /** Fusionne un export dans les données actuelles (la version la plus récente de chaque élément gagne). */
  importBundle(bundle: ExportBundle): ImportResult {
    const result: ImportResult = { added: 0, updated: 0, unchanged: 0 };
    for (const doc of bundle.shards) {
      if (!COLLECTIONS.includes(doc.collection)) continue;
      for (const incoming of doc.records) {
        const existing = this.findAny(doc.collection, incoming.id);
        if (!existing) {
          result.added++;
          this.put(doc.collection, incoming, false);
        } else if (mergeRecordLists([existing], [incoming])[0] !== existing) {
          result.updated++;
          this.put(doc.collection, incoming, false);
        } else {
          result.unchanged++;
        }
      }
    }
    this.emit();
    return result;
  }

  // ---------- Enregistrement ----------

  /** Écrit immédiatement sur le disque tout ce qui n'est pas encore enregistré. */
  flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saving = this.saving.then(() => this.writeDirty());
    return this.saving;
  }

  hasUnsavedChanges(): boolean {
    return this.dirty.size > 0;
  }

  // ---------- Abonnement (pour l'interface) ----------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Change à chaque modification : permet à l'interface de savoir quand se redessiner. */
  getVersion(): number {
    return this.version;
  }

  // ---------- Interne ----------

  private shardMap(collection: CollectionName, shard: string): Map<string, BaseRecord> {
    const col = this.data.get(collection)!;
    let m = col.get(shard);
    if (!m) {
      m = new Map();
      col.set(shard, m);
    }
    return m;
  }

  /** Cherche un élément, y compris s'il est marqué supprimé. */
  private findAny(collection: CollectionName, id: string): BaseRecord | undefined {
    for (const shard of this.data.get(collection)!.values()) {
      const r = shard.get(id);
      if (r) return r;
    }
    return undefined;
  }

  private put(collection: CollectionName, record: BaseRecord, notify = true) {
    const shard = shardKeyFor(record);
    this.shardMap(collection, shard).set(record.id, record);
    this.dirty.add(storageKey(collection, shard));
    this.scheduleSave();
    if (notify) this.emit();
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, this.saveDelayMs);
  }

  private async writeDirty() {
    const keys = [...this.dirty];
    this.dirty.clear();
    for (const key of keys) {
      const parsed = parseStorageKey(key)!;
      const collection = parsed.collection as CollectionName;
      const records = [...this.shardMap(collection, parsed.shard).values()];
      try {
        await this.storage.write(key, JSON.stringify(makeShardDoc(collection, parsed.shard, records)));
      } catch (e) {
        // On réessaiera à la prochaine modification.
        this.dirty.add(key);
        console.warn('Échec de l’enregistrement de', key, e);
      }
    }
  }

  private emit() {
    this.version++;
    for (const l of this.listeners) l();
  }
}
