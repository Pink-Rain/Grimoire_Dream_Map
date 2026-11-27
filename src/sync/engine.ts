/**
 * Moteur de synchronisation avec le dossier caché du Drive.
 *
 * Principe : un fichier Drive par morceau local (ex. « dreams.2026-11.json »).
 * Pour chaque morceau :
 *   1. si le fichier Drive a changé depuis la dernière synchro → on le télécharge et on fusionne
 *      (pour chaque élément, la version la plus récente gagne) ;
 *   2. si le résultat diffère de ce qu'il y a sur le Drive → on envoie notre version.
 * Les morceaux qui n'ont bougé d'aucun côté ne sont ni téléchargés ni envoyés : la synchro reste rapide
 * même quand le journal grossit.
 *
 * Si deux appareils envoient en même temps, l'un peut écraser l'autre sur le Drive ; mais chaque appareil
 * garde ses données, et la synchro suivante remet tout d'accord (rien n'est perdu).
 */
import { makeShardDoc, parseShardDoc, parseStorageKey, recordsHash, storageKey } from '../data/records';
import type { DataStore } from '../data/store';
import { COLLECTIONS, type CollectionName } from '../data/types';
import type { DriveApi, RemoteFile } from './drive';

const SUFFIX = '.json';

/** Ce qu'on retient de la dernière synchro, morceau par morceau. */
export interface SyncState {
  shards: Record<string, { remoteId: string; remoteMd5: string; contentHash: string }>;
}

export function emptySyncState(): SyncState {
  return { shards: {} };
}

export interface SyncResult {
  downloaded: number;
  uploaded: number;
  /** Nombre d'éléments modifiés sur cet appareil par la synchro. */
  received: number;
}

export async function syncOnce(store: DataStore, drive: DriveApi, previous: SyncState): Promise<{ state: SyncState; result: SyncResult }> {
  const state: SyncState = { shards: { ...previous.shards } };
  const result: SyncResult = { downloaded: 0, uploaded: 0, received: 0 };

  // Fichiers du Drive, regroupés par nom (normalement un seul par nom).
  const remote = new Map<string, RemoteFile[]>();
  for (const f of await drive.list()) {
    if (!f.name.endsWith(SUFFIX)) continue;
    const key = f.name.slice(0, -SUFFIX.length);
    const parsed = parseStorageKey(key);
    if (!parsed || !COLLECTIONS.includes(parsed.collection as CollectionName)) continue; // fichier inconnu : on n'y touche pas
    remote.set(key, [...(remote.get(key) ?? []), f]);
  }

  const keys = new Set<string>([...remote.keys(), ...store.shardKeys().map((k) => storageKey(k.collection, k.shard))]);

  for (const key of keys) {
    const { collection, shard } = parseStorageKey(key) as { collection: CollectionName; shard: string };
    // En cas de doublons (deux appareils ont créé le même fichier en même temps), on garde le plus ancien.
    const files = [...(remote.get(key) ?? [])].sort((a, b) => (a.createdTime ?? '').localeCompare(b.createdTime ?? ''));
    const primary = files[0];
    const known = state.shards[key];

    let remoteHash: string | null = null;
    const remoteUnchanged = files.length === 1 && known && known.remoteId === primary.id && known.remoteMd5 === (primary.md5Checksum ?? '');
    if (remoteUnchanged) {
      remoteHash = known.contentHash;
    } else {
      for (const f of files) {
        const doc = parseShardDoc(await drive.download(f.id));
        result.downloaded++;
        if (!doc || doc.collection !== collection || doc.shard !== shard) continue;
        result.received += store.mergeRecords(collection, doc.records);
        if (files.length === 1) remoteHash = recordsHash(doc.records);
      }
    }

    const records = store.shardRecords(collection, shard);
    const localHash = recordsHash(records);
    if (primary && localHash === remoteHash) {
      state.shards[key] = { remoteId: primary.id, remoteMd5: primary.md5Checksum ?? '', contentHash: localHash };
      continue;
    }
    if (!records.length) continue;

    const content = JSON.stringify(makeShardDoc(collection, shard, records));
    const saved = primary ? await drive.update(primary.id, content) : await drive.create(key + SUFFIX, content);
    result.uploaded++;
    state.shards[key] = { remoteId: saved.id, remoteMd5: saved.md5Checksum ?? '', contentHash: localHash };
    for (const extra of files.slice(1)) await drive.remove(extra.id);
  }

  return { state, result };
}
