/** Mémoire de la carte pendant que l'app est ouverte (dernière vue). */
let lastView: { lat: number; lon: number; zoom: number } | null = null;
let placeCountAtView = 0;

export function getLastMapView() {
  return lastView;
}
/** Vue à reprendre en rouvrant la carte, sauf si des lieux ont été ajoutés entre-temps (on recadre alors). */
export function getViewToRestore(placeCount: number) {
  return placeCount === placeCountAtView ? lastView : null;
}
export function setLastMapView(v: { lat: number; lon: number; zoom: number }, placeCount: number) {
  lastView = v;
  placeCountAtView = placeCount;
}
