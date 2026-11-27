import { APP_ID, BaseRecord, CollectionName, ExportBundle, SCHEMA_VERSION, ShardDoc } from './types';

/** Le morceau (fichier) dans lequel un élément est rangé : mois de création "AAAA-MM". */
export function shardKeyFor(record: Pick<BaseRecord, 'createdAt'>): string {
  const key = record.createdAt.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(key) ? key : 'misc';
}

/** Nom de stockage d'un morceau, ex. "dreams.2026-11". */
export function storageKey(collection: CollectionName, shard: string): string {
  return `${collection}.${shard}`;
}

export function parseStorageKey(key: string): { collection: string; shard: string } | null {
  const m = /^([a-z][a-zA-Z0-9]*)\.([\w-]+)$/.exec(key);
  return m ? { collection: m[1], shard: m[2] } : null;
}

/**
 * Règle de conflit : la version la plus récente (`updatedAt`) gagne.
 * En cas d'égalité parfaite, on choisit de façon déterministe (même résultat sur tous les appareils).
 */
export function pickWinner<T extends BaseRecord>(a: T, b: T): T {
  if (a.updatedAt > b.updatedAt) return a;
  if (b.updatedAt > a.updatedAt) return b;
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}

/** Fusionne deux listes d'éléments, élément par élément. */
export function mergeRecordLists<T extends BaseRecord>(local: T[], incoming: T[]): T[] {
  const byId = new Map<string, T>();
  for (const r of local) byId.set(r.id, r);
  for (const r of incoming) {
    const existing = byId.get(r.id);
    byId.set(r.id, existing ? pickWinner(existing, r) : r);
  }
  return [...byId.values()];
}

/** Vérifie qu'un objet ressemble à un élément valide (sans rejeter les champs inconnus). */
export function isValidRecord(value: unknown): value is BaseRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string' &&
    typeof r.deleted === 'boolean'
  );
}

export function makeShardDoc(collection: CollectionName, shard: string, records: BaseRecord[]): ShardDoc {
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, collection, shard, records };
}

/** Lit un morceau depuis du texte JSON. Renvoie null si ce n'est pas un fichier Dream Map valide. */
export function parseShardDoc(text: string): ShardDoc | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  return toShardDoc(data);
}

function toShardDoc(data: unknown): ShardDoc | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.app !== APP_ID || typeof d.collection !== 'string' || typeof d.shard !== 'string') return null;
  if (!Array.isArray(d.records)) return null;
  return {
    ...(d as object),
    app: APP_ID,
    schemaVersion: typeof d.schemaVersion === 'number' ? d.schemaVersion : 1,
    collection: d.collection as CollectionName,
    shard: d.shard,
    records: d.records.filter(isValidRecord),
  } as ShardDoc;
}

export function makeExportBundle(shards: ShardDoc[], now: Date = new Date()): ExportBundle {
  return { app: APP_ID, kind: 'export', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), shards };
}

export type ParseBundleResult = { ok: true; bundle: ExportBundle } | { ok: false; reason: string };

export function parseExportBundle(text: string): ParseBundleResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: "Ce fichier n'est pas lisible (ce n'est pas un export Dream Map)." };
  }
  const d = data as Record<string, unknown> | null;
  if (!d || d.app !== APP_ID || d.kind !== 'export' || !Array.isArray(d.shards)) {
    return { ok: false, reason: "Ce fichier n'est pas un export Dream Map." };
  }
  const shards = d.shards.map(toShardDoc).filter((s): s is ShardDoc => s !== null);
  return {
    ok: true,
    bundle: {
      app: APP_ID,
      kind: 'export',
      schemaVersion: typeof d.schemaVersion === 'number' ? d.schemaVersion : 1,
      exportedAt: typeof d.exportedAt === 'string' ? d.exportedAt : '',
      shards,
    },
  };
}

/** Date locale du jour au format AAAA-MM-JJ. */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
