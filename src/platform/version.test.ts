import { describe, expect, it } from 'vitest';
import { compareVersions, parseLatestRelease } from './version';

describe('versions', () => {
  it('compare correctement', () => {
    expect(compareVersions('0.4.0', '0.3.0')).toBeGreaterThan(0);
    expect(compareVersions('v0.10.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.3.1', '0.4.0')).toBeLessThan(0);
  });

  it('lit la dernière version GitHub et son APK', () => {
    const r = parseLatestRelease({
      tag_name: 'v0.4.0',
      html_url: 'https://github.com/x/y/releases/tag/v0.4.0',
      assets: [
        { name: 'Grimoire-Dream-Map-Setup-0.4.0.exe', browser_download_url: 'https://e' },
        { name: 'Grimoire-Dream-Map-0.4.0-test.apk', browser_download_url: 'https://a' },
      ],
    });
    expect(r).toEqual({ version: '0.4.0', apkUrl: 'https://a', pageUrl: 'https://github.com/x/y/releases/tag/v0.4.0' });
    expect(parseLatestRelease({ message: 'Not Found' })).toBeNull();
  });
});
