// Plugin Expo : règles de la sauvegarde automatique d'Android.
// La sauvegarde dans le compte Google est limitée à 25 Mo ; au-delà, Android ne sauvegarde plus RIEN.
// On en exclut donc les médias (notes vocales, images…, dossier « dreammap-media ») pour que les rêves,
// eux, soient toujours sauvegardés. Les médias restent transférés lors d'un passage direct d'un téléphone
// à l'autre (câble / Wi-Fi), qui n'a pas cette limite.
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FULL_BACKUP = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <exclude domain="file" path="dreammap-media/" />
</full-backup-content>
`;

const DATA_EXTRACTION = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="file" path="dreammap-media/" />
    </cloud-backup>
</data-extraction-rules>
`;

module.exports = function withBackupRules(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'dreammap_backup_rules.xml'), FULL_BACKUP);
      fs.writeFileSync(path.join(dir, 'dreammap_data_extraction_rules.xml'), DATA_EXTRACTION);
      return cfg;
    },
  ]);
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:allowBackup'] = 'true';
      app.$['android:fullBackupContent'] = '@xml/dreammap_backup_rules';
      app.$['android:dataExtractionRules'] = '@xml/dreammap_data_extraction_rules';
      cfg.modResults.manifest.$['xmlns:tools'] = cfg.modResults.manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
      app.$['tools:replace'] = ['android:fullBackupContent', 'android:dataExtractionRules'].concat(app.$['tools:replace'] ? String(app.$['tools:replace']).split(',') : []).filter((v, i, a) => a.indexOf(v) === i).join(',');
    }
    return cfg;
  });
};
