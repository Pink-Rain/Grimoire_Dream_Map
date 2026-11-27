import type { MapPlace } from './useMapPlaces';

export interface DreamMapProps {
  places: MapPlace[];
  selectedId: string | null;
  /** Centrer sur un lieu : changer l'objet (n) pour relancer. */
  focus?: { id: string; n: number } | null;
  /** Changer ce nombre pour recadrer sur tous les lieux. */
  fitSignal?: number;
  onSelect: (id: string | null) => void;
  onMove: (id: string, lat: number, lon: number) => void;
}
