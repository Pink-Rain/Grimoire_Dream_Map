/**
 * Regroupement des lieux au dézoom : nom de la zone commune la plus précise
 * (quartier → ville → département → région → pays). Même logique dans scripts/map/runtime.js.
 */
import type { PlaceAdmin } from '../data/types';

export const ADMIN_LEVELS = ['district', 'city', 'county', 'state', 'country'] as const;

/** Zone commune la plus précise à tous ces lieux réels, ou null. */
export function commonArea(admins: (PlaceAdmin | undefined)[]): string | null {
  const list = admins.filter((a): a is PlaceAdmin => !!a);
  if (list.length < 2) return null;
  for (const level of ADMIN_LEVELS) {
    const v = list[0][level];
    if (v && list.every((a) => a[level] === v)) return v;
  }
  return null;
}

/** Pour les anciens lieux sans détails : on devine depuis l'adresse « …, Hérault, Occitanie, France ». */
export function adminFromAddress(name: string, address: string | undefined): PlaceAdmin {
  const parts = (address ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const out: PlaceAdmin = {};
  if (parts.length) out.country = parts[parts.length - 1];
  if (parts.length >= 2) out.state = parts[parts.length - 2];
  if (parts.length >= 3) out.county = parts[parts.length - 3];
  if (parts.length >= 4) out.city = parts[parts.length - 4];
  else if (parts.length <= 2) out.city = name;
  return out;
}
