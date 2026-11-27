/**
 * Format des données de Grimoire.
 *
 * RÈGLES (voir AGENTS.md) :
 * - On n'ajoute que des champs. On ne renomme ni ne supprime jamais un champ.
 * - Chaque élément a un `id` (UUID), `createdAt`, `updatedAt` et `deleted`.
 * - On ne supprime jamais un élément : on met `deleted: true` (marque « supprimé »).
 * - Les champs inconnus (ajoutés par une version plus récente de l'app) sont conservés tels quels.
 */

/** Version du format de données. À augmenter quand on ajoute des champs ou des collections. */
export const SCHEMA_VERSION = 1;

/** Identifiant écrit dans chaque fichier pour reconnaître nos fichiers. */
export const APP_ID = 'grimoire-dream-journal';

/** Champs communs à tous les éléments synchronisables. */
export interface BaseRecord {
  /** Identifiant unique (UUID v4). Ne change jamais. */
  id: string;
  /** Date de création, ISO 8601 (ex. 2026-11-27T15:04:05.123Z). Ne change jamais. */
  createdAt: string;
  /** Date de dernière modification, ISO 8601. Sert à décider quelle version gagne. */
  updatedAt: string;
  /** Marque « supprimé ». L'élément reste stocké pour que la suppression se synchronise. */
  deleted: boolean;
  /** Champs ajoutés par des versions futures : conservés sans y toucher. */
  [extra: string]: unknown;
}

/** Un rêve noté dans le journal. (schemaVersion 1) */
export interface Dream extends BaseRecord {
  /** Date du rêve, format AAAA-MM-JJ (date locale). */
  dreamDate: string;
  title: string;
  text: string;
}

/** Noms des collections. On peut en ajouter, jamais en renommer. */
export type CollectionName = 'dreams';
export const COLLECTIONS: CollectionName[] = ['dreams'];

/**
 * Un « morceau » (shard) d'une collection = un fichier.
 * Les éléments sont rangés par mois de création (`createdAt`), qui ne change jamais :
 * un élément reste donc toujours dans le même fichier.
 */
export interface ShardDoc<T extends BaseRecord = BaseRecord> {
  app: typeof APP_ID;
  schemaVersion: number;
  collection: CollectionName;
  /** Clé du morceau, ex. "2026-11". */
  shard: string;
  records: T[];
}

/** Fichier produit par « Exporter mes données ». */
export interface ExportBundle {
  app: typeof APP_ID;
  kind: 'export';
  schemaVersion: number;
  exportedAt: string;
  shards: ShardDoc[];
}
