import { describe, expect, it } from 'vitest';
import { searchPlaces } from './geocode';

const photonMontpellier = {
  features: [
    {
      geometry: { coordinates: [3.8767, 43.6112] },
      properties: { name: 'Montpellier', osm_key: 'place', osm_value: 'city', type: 'city', state: 'Occitanie', country: 'France', county: 'Hérault' },
    },
    {
      geometry: { coordinates: [3.88, 43.6] },
      properties: { name: 'Place de la Comédie', street: 'Place de la Comédie', city: 'Montpellier', osm_key: 'highway', osm_value: 'pedestrian', type: 'street', country: 'France' },
    },
  ],
};

function fakeFetch(map: Record<string, unknown | number>) {
  return (async (url: string) => {
    for (const [k, v] of Object.entries(map)) {
      if (url.includes(k)) {
        if (typeof v === 'number') return { ok: false, status: v, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => v };
      }
    }
    throw new Error('offline');
  }) as unknown as typeof fetch;
}

describe('recherche de vrais lieux', () => {
  it('lit les résultats de Photon', async () => {
    const r = await searchPlaces('montpellier', fakeFetch({ 'photon.komoot.io': photonMontpellier }));
    expect(r[0]).toMatchObject({ name: 'Montpellier', lat: 43.6112, lon: 3.8767, osmType: 'city' });
    expect(r[0].address).toContain('France');
    expect(r[1].address).toContain('Montpellier');
  });

  it('passe à Nominatim si Photon ne répond pas', async () => {
    const r = await searchPlaces(
      'tour eiffel',
      fakeFetch({
        'photon.komoot.io': 503,
        'nominatim.openstreetmap.org': [{ name: 'Tour Eiffel', display_name: 'Tour Eiffel, Paris, France', lat: '48.858', lon: '2.294', category: 'tourism', type: 'attraction', addresstype: 'tourism' }],
      }),
    );
    expect(r[0]).toMatchObject({ name: 'Tour Eiffel', lat: 48.858, lon: 2.294 });
    expect(r[0].address).toBe('Paris, France');
  });

  it('ne cherche rien pour moins de 2 lettres', async () => {
    expect(await searchPlaces('a', fakeFetch({}))).toEqual([]);
  });
});
