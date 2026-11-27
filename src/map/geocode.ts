/**
 * Recherche de vrais lieux (nom → coordonnées) avec OpenStreetMap, gratuitement :
 * Photon (komoot) en priorité, Nominatim en secours. Aucune carte n'est affichée : on garde juste
 * le nom, l'adresse et les coordonnées.
 */
import type { PlaceAdmin } from '../data/types';

export interface GeoResult {
  name: string;
  address: string;
  lat: number;
  lon: number;
  osmKey?: string;
  osmType?: string;
  /** Quartier, ville, département, région, pays. */
  admin?: PlaceAdmin;
}

const CITY_TYPES = ['city', 'town', 'village', 'hamlet', 'municipality'];

function clean(a: PlaceAdmin): PlaceAdmin {
  const out: PlaceAdmin = {};
  for (const k of ['district', 'city', 'county', 'state', 'country'] as const) if (a[k]) out[k] = a[k];
  return out;
}

type Fetch = typeof fetch;

export async function searchPlaces(query: string, fetchImpl: Fetch = fetch): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const r = await searchPhoton(q, fetchImpl);
    if (r.length) return r;
  } catch {}
  return searchNominatim(q, fetchImpl);
}

function uniqueJoin(parts: (string | undefined)[]): string {
  const out: string[] = [];
  for (const p of parts) if (p && !out.includes(p)) out.push(p);
  return out.join(', ');
}

export async function searchPhoton(q: string, fetchImpl: Fetch = fetch): Promise<GeoResult[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=fr&limit=8`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = await res.json();
  const out: GeoResult[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const [lon, lat] = f.geometry?.coordinates ?? [];
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;
    const name = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || p.city || q;
    const address = uniqueJoin([p.street && p.name ? p.street : undefined, p.city !== name ? p.city : undefined, p.county, p.state, p.country]);
    const type: string = p.osm_value ?? p.type;
    const admin = clean({
      district: p.district ?? (['suburb', 'quarter', 'neighbourhood'].includes(type) ? p.name : undefined),
      city: p.city ?? (CITY_TYPES.includes(type) ? p.name : undefined),
      county: p.county ?? (type === 'county' ? p.name : undefined),
      state: p.state ?? (type === 'state' ? p.name : undefined),
      country: p.country ?? (type === 'country' ? p.name : undefined),
    });
    out.push({ name, address, lat, lon, osmKey: p.osm_key, osmType: p.type === 'other' ? p.osm_value : p.osm_value ?? p.type, admin });
  }
  return dedupe(out);
}

export async function searchNominatim(q: string, fetchImpl: Fetch = fetch): Promise<GeoResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=8&accept-language=fr&addressdetails=1`;
  const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  return dedupe(
    (data as any[]).map((r) => {
      const display: string = r.display_name ?? '';
      const name: string = r.name || display.split(',')[0] || q;
      return {
        name,
        address: display.split(',').slice(1).map((s) => s.trim()).filter(Boolean).join(', '),
        lat: Number(r.lat),
        lon: Number(r.lon),
        osmKey: r.category,
        osmType: r.addresstype || r.type,
        admin: clean({
          district: r.address?.suburb ?? r.address?.quarter ?? r.address?.neighbourhood,
          city: r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.municipality,
          county: r.address?.county,
          state: r.address?.state,
          country: r.address?.country,
        }),
      };
    }),
  );
}

function dedupe(list: GeoResult[]): GeoResult[] {
  const seen = new Set<string>();
  return list.filter((r) => {
    const k = `${r.name}|${r.address}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
