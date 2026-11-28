import { useMemo, useRef } from 'react';
import { appStore, useStoreVersion } from '../data/appStore';
import type { Place, PlaceAdmin } from '../data/types';
import { adminFromAddress } from './cluster';
import { pointOnPath, pointOnRoute } from './geometry';
import { iconBody } from './icons';

/** Ce que la page de la carte reçoit pour chaque lieu. */
export interface MapPlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  size: number;
  layer: number;
  real: boolean;
  kind: 'place' | 'vehicle';
  icon: string;
  colors: string[];
  draggable: boolean;
  /** Vrais lieux : quartier, ville… pour nommer les regroupements au dézoom. */
  admin?: PlaceAdmin;
}

/**
 * Prépare les lieux pour la carte : couleurs d'aquarelle (couleurs des rêves où le lieu apparaît, les plus
 * récents d'abord), position des véhicules (tirée au hasard sur le trajet à chaque ouverture de la carte).
 */
export function useMapPlaces(filterDreamId?: string | null, dragId?: string | null): MapPlace[] {
  const version = useStoreVersion();
  const routeT = useRef(new Map<string, number>());

  return useMemo(() => {
    const dreams = appStore.list('dreams').sort((a, b) => b.dreamDate.localeCompare(a.dreamDate));
    const colorsByPlace = new Map<string, string[]>();
    for (const d of dreams) {
      for (const pid of d.placeIds ?? []) {
        const list = colorsByPlace.get(pid) ?? [];
        for (const c of d.colors ?? []) if (!list.includes(c) && list.length < 4) list.push(c);
        colorsByPlace.set(pid, list);
      }
    }
    const onlyIds = filterDreamId ? new Set(appStore.get('dreams', filterDreamId)?.placeIds ?? []) : null;
    const all = appStore.list('places');
    const byId = new Map(all.map((p) => [p.id, p]));
    const out: MapPlace[] = [];
    const toMap = (p: Place, lat: number, lon: number): MapPlace => ({
      id: p.id,
      name: p.name,
      lat,
      lon,
      size: p.size,
      layer: p.layer ?? 0,
      real: p.real,
      kind: p.kind,
      icon: iconBody(p.icon),
      colors: colorsByPlace.get(p.id) ?? [],
      // On ne peut déplacer un lieu imaginaire qu'après avoir touché son bouton « glisser » (évite les erreurs).
      draggable: p.kind === 'place' && !p.real && p.id === dragId,
      admin: p.real ? (p.admin ?? adminFromAddress(p.name, p.address)) : undefined,
    });
    for (const p of all) {
      if (onlyIds && !onlyIds.has(p.id)) continue;
      if (p.kind === 'vehicle') {
        // Position tirée au hasard sur TOUT le trajet (dessiné à la main, sinon la ligne entre les deux lieux).
        if (!routeT.current.has(p.id)) routeT.current.set(p.id, 0.02 + Math.random() * 0.96);
        const t = routeT.current.get(p.id)!;
        const drawn = p.route?.points;
        if (drawn && drawn.length >= 2) {
          const pt = pointOnPath(drawn, t);
          out.push(toMap(p, pt.lat, pt.lon));
          continue;
        }
        const a = p.route ? byId.get(p.route.fromId) : undefined;
        const b = p.route ? byId.get(p.route.toId) : undefined;
        if (!a || !b || a.lat === undefined || a.lon === undefined || b.lat === undefined || b.lon === undefined) continue;
        const pt = pointOnRoute({ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }, t);
        out.push(toMap(p, pt.lat, pt.lon));
      } else if (p.lat !== undefined && p.lon !== undefined) {
        out.push(toMap(p, p.lat, p.lon));
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, filterDreamId, dragId]);
}
