/**
 * Calculs de la carte (sans affichage) : tailles, positions relatives, véhicules.
 * Les positions sont en latitude/longitude, même pour les lieux imaginaires : ça permet de mélanger
 * vrais lieux (coordonnées réelles, fixes) et lieux rêvés (posés où on veut) sur la même carte.
 */
import { PLACE_SIZES, type Place, type PlaceRelationDir } from '../data/types';

const EARTH_MPP_Z0 = 156543.03392; // mètres par pixel au zoom 0, à l'équateur (tuiles de 256 px)
const M_PER_DEG_LAT = 111_320;

export const MIN_ICON_PX = 16;
export const MAX_ICON_PX = 180;

export function sizeMeters(level: number): number {
  const s = PLACE_SIZES.find((p) => p.level === Math.round(level)) ?? PLACE_SIZES[2];
  return s.meters;
}

export function metersPerPixel(zoom: number, lat: number): number {
  return (EARTH_MPP_Z0 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

/**
 * Taille du dessin à l'écran (px), à la manière d'une carte illustrée : la taille choisie (1 à 7) fixe les
 * proportions entre les dessins, et le zoom les agrandit doucement. (Même calcul dans scripts/map/runtime.js.)
 */
export function iconPixels(level: number, zoom: number, _lat?: number): number {
  const factor = Math.min(1.7, Math.max(0.42, Math.pow(2, (zoom - 12) * 0.3)));
  const px = (22 + 12 * level) * factor;
  return Math.round(Math.min(MAX_ICON_PX, Math.max(MIN_ICON_PX, px)));
}

/** Position d'un lieu imaginaire décrit par rapport à un autre (« au nord de Montpellier »). */
export function relativePosition(
  ref: { lat: number; lon: number; size: number },
  dir: PlaceRelationDir,
  newSize: number,
): { lat: number; lon: number } {
  const d = sizeMeters(ref.size) * 0.35 + sizeMeters(newSize) * 0.5 + 300;
  const dLat = d / M_PER_DEG_LAT;
  const dLon = d / (M_PER_DEG_LAT * Math.max(0.2, Math.cos((ref.lat * Math.PI) / 180)));
  switch (dir) {
    case 'north':
      return { lat: ref.lat + dLat, lon: ref.lon };
    case 'south':
      return { lat: ref.lat - dLat, lon: ref.lon };
    case 'east':
      return { lat: ref.lat, lon: ref.lon + dLon };
    case 'west':
      return { lat: ref.lat, lon: ref.lon - dLon };
    case 'near':
      return { lat: ref.lat + dLat * 0.7, lon: ref.lon + dLon * 0.7 };
    case 'in':
    default:
      // « dans » : au même endroit, légèrement décalé pour qu'on voie les deux dessins.
      return { lat: ref.lat + dLat * 0.05, lon: ref.lon + dLon * 0.05 };
  }
}

/** Position d'un véhicule à la fraction t (0 → départ, 1 → arrivée) de son trajet. */
export function pointOnRoute(from: { lat: number; lon: number }, to: { lat: number; lon: number }, t: number) {
  const k = Math.min(1, Math.max(0, t));
  return { lat: from.lat + (to.lat - from.lat) * k, lon: from.lon + (to.lon - from.lon) * k };
}

/** Taille proposée pour un lieu réel selon son type OpenStreetMap. */
export function suggestedSize(osmType: string | undefined): number {
  const t = (osmType ?? '').toLowerCase();
  if (['country', 'continent'].includes(t)) return 7;
  if (['state', 'region', 'province', 'county'].includes(t)) return 6;
  if (['city', 'municipality'].includes(t)) return 5;
  if (['town', 'district', 'borough', 'suburb', 'island', 'lake', 'forest', 'mountain_range'].includes(t)) return 4;
  if (['village', 'hamlet', 'neighbourhood', 'quarter', 'park', 'beach', 'locality', 'peak'].includes(t)) return 3;
  if (['street', 'square', 'station', 'stadium', 'university', 'school', 'hospital'].includes(t)) return 2;
  return 2;
}

/** Dessin proposé pour un lieu réel selon son type OpenStreetMap. */
export function suggestedIcon(osmKey: string | undefined, osmType: string | undefined): string {
  const t = (osmType ?? '').toLowerCase();
  const k = (osmKey ?? '').toLowerCase();
  const byType: Record<string, string> = {
    country: 'flag-objective',
    state: 'flag-objective',
    city: 'modern-city',
    town: 'village',
    village: 'village',
    hamlet: 'huts-village',
    beach: 'palm-tree',
    island: 'island',
    peak: 'mountaintop',
    mountain_range: 'mountains',
    forest: 'forest',
    wood: 'forest',
    lake: 'waves',
    river: 'river',
    station: 'subway-train',
    church: 'church',
    castle: 'castle',
    lighthouse: 'lighthouse',
    park: 'pine-tree',
    school: 'school-bag',
    hospital: 'hospital',
  };
  if (byType[t]) return byType[t];
  if (k === 'natural') return 'mountains';
  if (k === 'building') return 'house';
  if (k === 'highway') return 'road';
  return 'house';
}

/** Point de départ pour un lieu imaginaire sans repère : près des lieux du rêve, sinon au centre de la carte. */
export function defaultImaginaryPosition(
  dreamPlaces: Pick<Place, 'lat' | 'lon'>[],
  fallback: { lat: number; lon: number },
): { lat: number; lon: number } {
  const pts = dreamPlaces.filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number') as { lat: number; lon: number }[];
  if (!pts.length) return fallback;
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
  return { lat: lat + 0.004, lon: lon + 0.006 };
}

/** Centre par défaut de la carte vide (France). */
export const DEFAULT_CENTER = { lat: 46.6, lon: 2.4, zoom: 5 };
