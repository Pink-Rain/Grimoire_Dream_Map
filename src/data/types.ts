/**
 * Format des données de Grimoire - Dream Map.
 *
 * RÈGLES (voir AGENTS.md) :
 * - On n'ajoute que des champs. On ne renomme ni ne supprime jamais un champ.
 * - Chaque élément a un `id` (UUID), `createdAt`, `updatedAt` et `deleted`.
 * - On ne supprime jamais un élément : on met `deleted: true` (marque « supprimé »).
 * - Les champs inconnus (ajoutés par une version plus récente de l'app) sont conservés tels quels.
 */

/** Version du format de données. À augmenter quand on ajoute des champs ou des collections. */
export const SCHEMA_VERSION = 5;

/** Identifiant écrit dans chaque fichier pour reconnaître nos fichiers. */
export const APP_ID = 'grimoire-dream-map';

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

/** Un rêve noté dans le journal. */
export interface Dream extends BaseRecord {
  // --- v1 ---
  /** Date du rêve, format AAAA-MM-JJ (date locale). */
  dreamDate: string;
  title: string;
  /** Description du rêve (pour une entrée rapide : les quelques détails notés). */
  text: string;
  // --- v2 (peuvent manquer sur les anciens rêves : utiliser normalizeDream) ---
  /** « quick » = entrée rapide au réveil, « full » = rêve complet. */
  kind?: DreamKind;
  /** Lucidité de 0 (pas du tout) à 5 (contrôle total). null = non renseigné. */
  lucidity?: number | null;
  /** Humeur de 1 (très mauvaise) à 5 (excellente). null = non renseigné. */
  mood?: number | null;
  /** Ambiances (mots choisis dans une liste ou ajoutés). */
  ambiances?: string[];
  /** Étiquettes et mots-clés libres. */
  tags?: string[];
  /** Couleurs du rêve (#rrggbb) : taches d'aquarelle sous ses lieux sur la carte. */
  colors?: string[];
  /** Personnes présentes (ids de la collection people). */
  peopleIds?: string[];
  /** Lieux et véhicules du rêve (ids de la collection places). */
  placeIds?: string[];
  /** Notes vocales, images, musiques, vidéos, fichiers, liens. */
  media?: MediaItem[];
  // --- v3 ---
  /** Météo(s) du rêve (identifiants de WEATHERS, ou mots libres). */
  weather?: string[];
  /** Clarté du souvenir, de 1 (très flou) à 5 (très net). */
  clarity?: number | null;
  /** Atmosphère du monde rêvé, de 1 (cauchemardesque) à 5 (féerique). */
  atmosphere?: number | null;
  /** Moment(s) du jour dans le rêve (identifiants de TIMES_OF_DAY). */
  timeOfDay?: string[];
  /** Types de rêve : cauchemar, récurrent, faux réveil… (identifiants de DREAM_TYPES, ou mots libres). */
  dreamTypes?: string[];
  /** Émotions ressenties (identifiants de EMOTIONS, ou mots libres). */
  emotions?: string[];
  // --- v4 ---
  /** Emoji choisi pour l'humeur (la note `mood` va maintenant de 0 à 5). */
  moodEmoji?: string | null;
  /** Genre du rêve (aventure, horreur…), en étiquettes. */
  genres?: string[];
  /** Sommeil (nuit ou sieste) pendant lequel ce rêve a eu lieu. */
  sleepId?: string | null;
}

export type DreamKind = 'quick' | 'full';

export type MediaType = 'audio' | 'image' | 'video' | 'music' | 'file' | 'link' | 'youtube';

/** Un média attaché à un rêve. Les fichiers sont gardés à part (voir src/platform/media). */
export interface MediaItem {
  id: string;
  type: MediaType;
  /** Nom affiché. */
  name: string;
  /** Adresse web (liens, YouTube). */
  url?: string;
  /** Nom du fichier enregistré sur l'appareil (notes vocales, images, fichiers…). */
  localId?: string;
  mime?: string;
  /** Durée des sons, en millisecondes. */
  durationMs?: number;
  createdAt: string;
}

/** Une personne qui apparaît dans des rêves (réutilisable). */
export interface Person extends BaseRecord {
  name: string;
  /** true = existe pour de vrai, false = personnage imaginaire. */
  real: boolean;
}

/** Position d'un lieu imaginaire décrite par rapport à un autre lieu. */
export type PlaceRelationDir = 'north' | 'south' | 'east' | 'west' | 'in' | 'near';

/** Un lieu (réel ou imaginaire) ou un véhicule, dessiné sur la carte. Réutilisable entre rêves. */
export interface Place extends BaseRecord {
  name: string;
  /** « place » = lieu, « vehicle » = véhicule qui circule entre deux lieux. */
  kind: 'place' | 'vehicle';
  /** true = lieu qui existe pour de vrai (coordonnées fixes), false = imaginaire. */
  real: boolean;
  /** Dessin (nom d'icône game-icons, ex. « wood-cabin »). */
  icon: string;
  /** Taille de 1 (minuscule) à 7 (immense) : voir PLACE_SIZES. */
  size: number;
  /** Position. Réel : vraies coordonnées. Imaginaire : position choisie sur la carte. */
  lat?: number;
  lon?: number;
  /** Adresse complète trouvée par la recherche (lieux réels). */
  address?: string;
  /** Lieu imaginaire décrit par rapport à un autre : « au nord de … ». */
  relation?: { dir: PlaceRelationDir; placeId: string };
  /** Ordre de superposition : plus grand = dessiné par-dessus. */
  layer?: number;
  /** Véhicule : trajet entre deux lieux. */
  route?: { fromId: string; toId: string };
  /** (v5) Lieux réels : quartier, ville, département, région, pays (pour regrouper sur la carte au dézoom). */
  admin?: PlaceAdmin;
}

export interface PlaceAdmin {
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
}

/**
 * Un sommeil (nuit ou sieste) : troisième type d'entrée, indépendant des rêves. (v3)
 * Les heures sont « HH:MM » ; chacune est comprise comme venant après la précédente
 * (coucher → endormissement → réveils → réveil → lever), en passant minuit si besoin.
 */
export interface Sleep extends BaseRecord {
  /** Jour du coucher, AAAA-MM-JJ. */
  date: string;
  bedTime?: string | null;
  asleepTime?: string | null;
  wakeTime?: string | null;
  upTime?: string | null;
  /** Réveils pendant le sommeil. */
  interruptions?: { id: string; from: string; to: string }[];
  // --- v4 ---
  /** Qualité du sommeil, de 1 à 5. */
  quality?: number | null;
  /** Énergie au réveil, de 1 à 5. */
  energy?: number | null;
  // --- v5 ---
  /** Facteurs de la veille (café, écrans, stress…), en étiquettes. */
  factors?: string[];
  /** Lieu du sommeil (chez moi, en voyage…), en étiquettes. */
  sleepPlaces?: string[];
  /** Humeur au réveil : niveau 0 à 5 et emoji choisi (même grille que les rêves). */
  wakeMood?: number | null;
  wakeMoodEmoji?: string | null;
  /** Émotions au réveil, en étiquettes. */
  wakeEmotions?: string[];
}

/** Noms des collections. On peut en ajouter, jamais en renommer. */
export type CollectionName = 'dreams' | 'people' | 'places' | 'sleeps';
export const COLLECTIONS: CollectionName[] = ['dreams', 'people', 'places', 'sleeps'];

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

/** Tailles des lieux : taille réelle approximative (mètres) qui fixe la taille du dessin selon le zoom. */
export const PLACE_SIZES: { level: number; label: string; meters: number }[] = [
  { level: 1, label: 'Minuscule', meters: 40 },
  { level: 2, label: 'Petit', meters: 200 },
  { level: 3, label: 'Moyen', meters: 1_000 },
  { level: 4, label: 'Grand', meters: 5_000 },
  { level: 5, label: 'Très grand', meters: 25_000 },
  { level: 6, label: 'Immense', meters: 120_000 },
  { level: 7, label: 'Gigantesque', meters: 600_000 },
];

/** Complète un rêve ancien avec les valeurs par défaut des champs v2. */
export function normalizeDream(
  d: Dream,
): Required<Pick<Dream, 'kind' | 'ambiances' | 'tags' | 'colors' | 'peopleIds' | 'placeIds' | 'media' | 'weather' | 'timeOfDay' | 'dreamTypes' | 'emotions' | 'genres'>> &
  Dream & {
    lucidity: number | null;
    mood: number | null;
    clarity: number | null;
    atmosphere: number | null;
    moodEmoji: string | null;
    sleepId: string | null;
  } {
  return {
    ...d,
    kind: d.kind ?? 'full',
    lucidity: d.lucidity ?? null,
    mood: d.mood ?? null,
    ambiances: d.ambiances ?? [],
    tags: d.tags ?? [],
    colors: d.colors ?? [],
    peopleIds: d.peopleIds ?? [],
    placeIds: d.placeIds ?? [],
    media: d.media ?? [],
    weather: d.weather ?? [],
    clarity: d.clarity ?? null,
    atmosphere: d.atmosphere ?? null,
    timeOfDay: d.timeOfDay ?? [],
    dreamTypes: d.dreamTypes ?? [],
    emotions: d.emotions ?? [],
    moodEmoji: d.moodEmoji ?? null,
    genres: d.genres ?? [],
    sleepId: d.sleepId ?? null,
  };
}
