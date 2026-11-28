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
  /** Trajet d'un véhicule à montrer (pointillés), et mode « dessiner le trajet » : chaque touche ajoute un point. */
  route?: [number, number][] | null;
  drawing?: boolean;
  onTap?: (lat: number, lon: number) => void;
}
