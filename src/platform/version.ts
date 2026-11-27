/** Compare deux numéros de version « 1.2.3 » (un « v » devant est accepté). Renvoie >0 si a est plus récent. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .trim()
      .replace(/^v/i, '')
      .split(/[.-]/)
      .slice(0, 3)
      .map((x) => parseInt(x, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export interface LatestRelease {
  version: string;
  apkUrl: string | null;
  pageUrl: string;
}

/** Lit la dernière version publiée sur GitHub (dépôt public, sans compte). */
export function parseLatestRelease(data: any): LatestRelease | null {
  if (!data || typeof data.tag_name !== 'string') return null;
  const apk = (data.assets ?? []).find((a: any) => typeof a?.name === 'string' && a.name.endsWith('.apk'));
  return { version: data.tag_name.replace(/^v/i, ''), apkUrl: apk?.browser_download_url ?? null, pageUrl: data.html_url ?? '' };
}

export const RELEASES_API = 'https://api.github.com/repos/Pink-Rain/Grimoire_Dream_Map/releases/latest';
