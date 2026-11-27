/**
 * Journal des mises à jour.
 * - Dans l'app (Réglages) : seulement les trois dernières versions.
 * - Sur la page GitHub (nouveautes.html, générée par scripts/build-site.mjs) : tout l'historique.
 * RÈGLE : à chaque nouvelle version, ajouter une entrée EN HAUT de changelog.json, avec le même numéro que
 * package.json (un test le vérifie). Phrases courtes, simples, sans jargon.
 */
import data from './changelog.json';

export interface ChangelogEntry {
  version: string;
  /** AAAA-MM-JJ */
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = data;

/** Ce que l'app affiche : les trois dernières versions. */
export const RECENT_CHANGES: ChangelogEntry[] = CHANGELOG.slice(0, 3);
