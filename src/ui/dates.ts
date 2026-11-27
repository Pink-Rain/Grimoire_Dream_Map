/** Convertit "AAAA-MM-JJ" en date locale (midi, pour éviter les soucis de fuseau horaire). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

/** "jeudi 27 novembre 2026" */
export function formatLongDate(s: string): string {
  return parseLocalDate(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** "27 nov. 2026" */
export function formatShortDate(s: string): string {
  return parseLocalDate(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function addDays(s: string, days: number): string {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
