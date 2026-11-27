import { describe, expect, it } from 'vitest';
import { adminFromAddress, commonArea } from './cluster';

const comedie = { district: 'Écusson', city: 'Montpellier', county: 'Hérault', state: 'Occitanie', country: 'France' };
const gare = { district: 'Gares', city: 'Montpellier', county: 'Hérault', state: 'Occitanie', country: 'France' };
const villefranche = { city: 'Villefranche-de-Rouergue', county: 'Aveyron', state: 'Occitanie', country: 'France' };
const paris = { city: 'Paris', county: 'Paris', state: 'Île-de-France', country: 'France' };

describe('regroupement au dézoom', () => {
  it('prend la zone commune la plus précise', () => {
    expect(commonArea([comedie, gare])).toBe('Montpellier');
    expect(commonArea([comedie, villefranche])).toBe('Occitanie');
    expect(commonArea([comedie, villefranche, paris])).toBe('France');
    expect(commonArea([comedie])).toBeNull();
    expect(commonArea([comedie, { country: 'Japon' }])).toBeNull();
  });
  it('devine les zones depuis une ancienne adresse', () => {
    expect(adminFromAddress('Montpellier', 'Hérault, Occitanie, France')).toMatchObject({ county: 'Hérault', state: 'Occitanie', country: 'France' });
    expect(adminFromAddress('Montpellier', 'Occitanie, France')).toMatchObject({ city: 'Montpellier', state: 'Occitanie' });
  });
});
