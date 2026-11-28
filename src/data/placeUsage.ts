import { appStore } from './appStore';

/**
 * Ce qui utilise un lieu : on ne peut supprimer un lieu que s'il n'est dans aucun rêve
 * (et qu'aucun véhicule ne s'en sert comme départ ou arrivée).
 */
export function placeUsage(placeId: string): { dreams: number; vehicles: string[]; deletable: boolean } {
  const dreams = appStore.list('dreams').filter((d) => d.placeIds?.includes(placeId)).length;
  const vehicles = appStore
    .list('places')
    .filter((p) => p.kind === 'vehicle' && p.id !== placeId && (p.route?.fromId === placeId || p.route?.toId === placeId))
    .map((p) => p.name);
  return { dreams, vehicles, deletable: dreams === 0 && vehicles.length === 0 };
}

/** Explication quand on ne peut pas supprimer. */
export function placeUsageReason(u: { dreams: number; vehicles: string[] }): string {
  const parts: string[] = [];
  if (u.dreams) parts.push(`il apparaît dans ${u.dreams} rêve${u.dreams > 1 ? 's' : ''}`);
  if (u.vehicles.length) parts.push(`${u.vehicles.length > 1 ? 'les véhicules' : 'le véhicule'} « ${u.vehicles.join(' », « ')} » y passe${u.vehicles.length > 1 ? 'nt' : ''}`);
  return `On ne peut pas le supprimer : ${parts.join(', et ')}. Retire-le d’abord de ${u.dreams ? 'ces rêves' : 'ces trajets'}.`;
}
