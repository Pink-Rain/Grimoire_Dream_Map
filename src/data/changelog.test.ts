import { describe, expect, it } from 'vitest';
import { CHANGELOG } from './changelog';

describe('journal des mises à jour', () => {
  it('la version actuelle de l’app a son entrée, tout en haut', () => {
    const version = require('../../package.json').version;
    expect(CHANGELOG[0].version).toBe(version);
  });
  it('chaque entrée a au moins un changement et une date valide', () => {
    for (const e of CHANGELOG) {
      expect(e.changes.length).toBeGreaterThan(0);
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
