import { describe, expect, it } from 'vitest';
import { iconPixels, MAX_ICON_PX, MIN_ICON_PX, pointOnRoute, relativePosition, suggestedSize } from './geometry';

describe('géométrie de la carte', () => {
  it('le dessin grossit quand on zoome, dans des limites lisibles', () => {
    const far = iconPixels(5, 3, 43.6);
    const mid = iconPixels(5, 12, 43.6);
    const near = iconPixels(5, 18, 43.6);
    expect(far).toBeGreaterThanOrEqual(MIN_ICON_PX);
    expect(mid).toBeGreaterThan(far);
    expect(near).toBeGreaterThan(mid);
    expect(near).toBeLessThanOrEqual(MAX_ICON_PX);
    // Les écarts restent raisonnables : un « Très grand » fait moins de 3 fois un « Petit ».
    expect(iconPixels(5, 12) / iconPixels(2, 12)).toBeLessThan(3);
  });

  it('un grand lieu est plus grand qu’un petit au même zoom', () => {
    expect(iconPixels(5, 10, 43.6)).toBeGreaterThan(iconPixels(2, 10, 43.6));
  });

  it('« au nord de » place le lieu au-dessus, sans le superposer', () => {
    const mtp = { lat: 43.61, lon: 3.88, size: 5 };
    const n = relativePosition(mtp, 'north', 2);
    expect(n.lat).toBeGreaterThan(mtp.lat);
    expect(n.lon).toBe(mtp.lon);
    expect(relativePosition(mtp, 'south', 2).lat).toBeLessThan(mtp.lat);
    expect(relativePosition(mtp, 'east', 2).lon).toBeGreaterThan(mtp.lon);
    expect(relativePosition(mtp, 'west', 2).lon).toBeLessThan(mtp.lon);
    const inside = relativePosition(mtp, 'in', 2);
    expect(Math.abs(inside.lat - mtp.lat)).toBeLessThan(0.01);
  });

  it('un véhicule reste sur son trajet', () => {
    const a = { lat: 48.85, lon: 2.35 };
    const b = { lat: 43.61, lon: 3.88 };
    expect(pointOnRoute(a, b, 0)).toEqual(a);
    expect(pointOnRoute(a, b, 1)).toEqual(b);
    const m = pointOnRoute(a, b, 0.5);
    expect(m.lat).toBeCloseTo(46.23);
    expect(pointOnRoute(a, b, 7)).toEqual(b);
  });

  it('propose une taille selon le type de lieu réel', () => {
    expect(suggestedSize('city')).toBe(5);
    expect(suggestedSize('country')).toBe(7);
    expect(suggestedSize('village')).toBe(3);
  });
});

import { searchIcons } from './icons';
describe('recherche de dessins', () => {
  it('« lac » trouve des étendues d’eau, pas « glace »', () => {
    const r = searchIcons('lac').slice(0, 5).map((i) => i.label.toLowerCase());
    expect(r.some((l) => l.includes('glace'))).toBe(false);
    expect(r.length).toBeGreaterThan(0);
  });
  it('fonctionne sans accents', () => {
    expect(searchIcons('foret').some((i) => i.label.toLowerCase().includes('forêt'))).toBe(true);
  });
});
