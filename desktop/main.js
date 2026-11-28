// Application PC de Grimoire - Dream Map (Electron).
// Elle affiche la version web de l'app (dossier dist/), avec quelques fonctions en plus :
// - le bouton téléphone/ordinateur redimensionne la fenêtre ;
// - la taille de la fenêtre et le format sont mémorisés ;
// - avant de fermer, on laisse l'app finir d'enregistrer.
const { app, BrowserWindow, ipcMain, net, protocol, screen, shell, Menu } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pathToFileURL } = require('url');
const google = require('./google');
const { autoUpdater } = require('electron-updater');

const SCHEME = 'app';
const HOST = 'dreammap';
const PHONE_SIZE = { width: 412, height: 860 };
const DEFAULT_DESKTOP = { width: 1200, height: 800 };

// Une seule fenêtre Dream Map ouverte à la fois.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Le schéma app:// se comporte comme un vrai site sécurisé (stockage IndexedDB permanent, etc.).
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

// ---------- L'« intérieur » de l'app (la version web) ----------
// Il vient de l'installateur (resources/web), ou d'une mise à jour légère téléchargée dans userData/web-live/<version>
// (sans réinstaller : l'app se recharge simplement). La « coque » PC (ce fichier, preload.js, google.js) porte le numéro
// SHELL : si une nouvelle version demande une coque plus récente, on repasse par l'installateur complet.
const SHELL = require('./package.json').dreamMapShell || 1;
const bundledRoot = app.isPackaged ? path.join(process.resourcesPath, 'web') : path.join(__dirname, '..', 'dist');
const liveDir = () => path.join(app.getPath('userData'), 'web-live');
let webRoot = bundledRoot;
let webVersion = app.getVersion();

function cmpVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}
function readLive() {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(liveDir(), 'version.json'), 'utf8'));
    if (m && m.version && (m.shell || 1) <= SHELL && fs.existsSync(path.join(liveDir(), m.version, 'index.html'))) return m;
  } catch {}
  return null;
}
/** Choisit la version web la plus récente disponible ; efface les anciennes. */
function pickWebRoot() {
  const live = readLive();
  if (live && cmpVersions(live.version, app.getVersion()) > 0) {
    webRoot = path.join(liveDir(), live.version);
    webVersion = live.version;
  } else {
    webRoot = bundledRoot;
    webVersion = app.getVersion();
  }
  try {
    for (const name of fs.readdirSync(liveDir())) {
      if (name === 'version.json' || path.join(liveDir(), name) === webRoot) continue;
      fs.rmSync(path.join(liveDir(), name), { recursive: true, force: true });
    }
  } catch {}
}

// ---------- État de la fenêtre (mémorisé entre deux lancements) ----------
const statePath = () => path.join(app.getPath('userData'), 'window-state.json');
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(statePath(), 'utf8'));
  } catch {
    return {};
  }
}
function saveState(state) {
  try {
    fs.writeFileSync(statePath(), JSON.stringify(state));
  } catch {}
}
let state = { phoneMode: false, desktopBounds: null, phonePosition: null };

/** Vérifie qu'une position est encore visible (ex. écran débranché). */
function visibleBounds(b) {
  if (!b) return null;
  const area = screen.getDisplayMatching(b).workArea;
  const inside = b.x < area.x + area.width - 50 && b.x + b.width > area.x + 50 && b.y >= area.y - 10 && b.y < area.y + area.height - 50;
  return inside ? b : null;
}

function phoneBounds(win) {
  const ref = win ? win.getBounds() : state.desktopBounds || { x: 0, y: 0, ...DEFAULT_DESKTOP };
  const area = screen.getDisplayMatching(ref).workArea;
  const height = Math.min(PHONE_SIZE.height, area.height);
  const saved = visibleBounds(state.phonePosition && { ...state.phonePosition, width: PHONE_SIZE.width, height });
  if (saved) return saved;
  // Centré sur la fenêtre actuelle.
  const x = Math.round(ref.x + (ref.width - PHONE_SIZE.width) / 2);
  const y = Math.max(area.y, Math.round(ref.y + (ref.height - height) / 2));
  return { x, y, width: PHONE_SIZE.width, height };
}

let win = null;
let allowClose = false;

function applyMode(phone) {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  if (win.isFullScreen()) win.setFullScreen(false);
  if (phone) {
    win.setMinimumSize(320, 480);
    win.setBounds(phoneBounds(win));
  } else {
    win.setMinimumSize(720, 500);
    const b = visibleBounds(state.desktopBounds);
    if (b) win.setBounds(b);
    else {
      win.setSize(DEFAULT_DESKTOP.width, DEFAULT_DESKTOP.height);
      win.center();
    }
  }
}

function rememberBounds() {
  if (!win || win.isMaximized() || win.isMinimized() || win.isFullScreen()) return;
  const b = win.getBounds();
  if (state.phoneMode) state.phonePosition = { x: b.x, y: b.y };
  else state.desktopBounds = b;
}

function createWindow() {
  state = { ...state, ...loadState() };
  const initial = state.phoneMode
    ? phoneBounds(null)
    : visibleBounds(state.desktopBounds) || { ...DEFAULT_DESKTOP };

  win = new BrowserWindow({
    ...initial,
    minWidth: state.phoneMode ? 320 : 720,
    minHeight: state.phoneMode ? 480 : 500,
    backgroundColor: '#0f0d1a',
    title: 'Grimoire - Dream Map',
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });
  if (state.desktopMaximized && !state.phoneMode) win.maximize();

  win.once('ready-to-show', () => win.show());
  win.on('moved', rememberBounds);
  win.on('resized', rememberBounds);
  win.on('page-title-updated', (e) => e.preventDefault());

  // Avant de fermer : on demande à l'app de finir d'enregistrer (2 s maximum).
  win.on('close', (e) => {
    rememberBounds();
    state.desktopMaximized = !state.phoneMode && win.isMaximized();
    saveState(state);
    if (allowClose) return;
    e.preventDefault();
    const timer = setTimeout(() => {
      allowClose = true;
      win && win.close();
    }, 2000);
    ipcMain.once('grimoire:ready-to-close', () => {
      clearTimeout(timer);
      allowClose = true;
      win && win.close();
    });
    win.webContents.send('grimoire:before-close');
  });
  win.on('closed', () => {
    win = null;
  });

  // Les liens externes s'ouvrent dans le navigateur habituel.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`${SCHEME}://${HOST}/`)) {
      e.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL(`${SCHEME}://${HOST}/`);
}

// ---------- Messages venant de l'app ----------
// ---------- Mises à jour automatiques (GitHub Releases) ----------
// Au démarrage puis toutes les 4 h (ou sur demande dans les Réglages) : si une nouvelle version existe, elle est
// téléchargée en arrière-plan. L'app propose alors de redémarrer ; sinon elle s'installe à la prochaine fermeture.
// Tout est noté dans userData/update.log (bouton « Journal des mises à jour » dans les Réglages).
let updateState = { status: 'idle' };
const updateLogPath = () => path.join(app.getPath('userData'), 'update.log');
function ulog(level, ...parts) {
  try {
    const line = `${new Date().toISOString()} [${level}] ${parts.map((p) => (p instanceof Error ? p.stack || p.message : typeof p === 'string' ? p : JSON.stringify(p))).join(' ')}\n`;
    const f = updateLogPath();
    if (fs.existsSync(f) && fs.statSync(f).size > 512 * 1024) fs.writeFileSync(f, '');
    fs.appendFileSync(f, line);
  } catch {}
}
function sendUpdate(s) {
  updateState = s;
  if (win && !win.isDestroyed()) win.webContents.send('grimoire:update', s);
}
let updatesReady = false;
function setupUpdates() {
  if (!app.isPackaged && !process.env.DREAMMAP_TEST_UPDATES) return;
  updatesReady = true;
  autoUpdater.logger = { info: (...a) => ulog('info', ...a), warn: (...a) => ulog('warn', ...a), error: (...a) => ulog('error', ...a), debug: () => {} };
  autoUpdater.setFeedURL({ provider: 'github', owner: 'Pink-Rain', repo: 'Grimoire_Dream_Map', releaseType: 'release' });
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  ulog('info', `Démarrage, coque ${app.getVersion()} (n° ${SHELL}), version ${webVersion}`);
  autoUpdater.on('checking-for-update', () => {
    if (updateState.status !== 'downloading' && updateState.status !== 'ready') sendUpdate({ status: 'checking' });
  });
  autoUpdater.on('update-not-available', () => sendUpdate({ status: 'latest', version: webVersion, checkedAt: Date.now() }));
  autoUpdater.on('update-available', (i) => sendUpdate({ status: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) => sendUpdate({ ...updateState, status: 'downloading', percent: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', (i) => sendUpdate({ status: 'ready', version: i.version }));
  autoUpdater.on('error', (e) => {
    ulog('error', e);
    if (updateState.status !== 'ready') sendUpdate({ status: 'error', message: (e && e.message) || String(e) });
  });
  const check = () => checkAll().catch((e) => ulog('error', e));
  setTimeout(check, 8000);
  setInterval(check, 4 * 3600 * 1000);
}

// Mise à jour légère : seulement l'intérieur de l'app, publié avec chaque version (web-update.json + web-<v>.gz).
// DREAMMAP_TEST_UPDATES : adresse locale, seulement pour les tests automatiques.
const RELEASE_FILES = process.env.DREAMMAP_TEST_UPDATES || 'https://github.com/Pink-Rain/Grimoire_Dream_Map/releases/latest/download/';
async function checkLight() {
  const res = await net.fetch(RELEASE_FILES + 'web-update.json', { cache: 'no-store' });
  if (!res.ok) return 'none';
  const m = await res.json();
  if (!m || !m.version || !m.file) return 'none';
  if (cmpVersions(m.version, webVersion) <= 0) return 'latest';
  if ((m.shell || 1) > SHELL) {
    ulog('info', `La version ${m.version} demande une nouvelle coque (${m.shell}) : installateur complet.`);
    return 'shell';
  }
  ulog('info', `Mise à jour légère vers ${m.version}`);
  sendUpdate({ status: 'downloading', version: m.version, percent: 0 });
  const r = await net.fetch(RELEASE_FILES + m.file);
  if (!r.ok) throw new Error(`Téléchargement impossible (${r.status})`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (m.sha256 && crypto.createHash('sha256').update(buf).digest('hex') !== m.sha256) throw new Error('Le fichier de mise à jour est abîmé.');
  sendUpdate({ status: 'downloading', version: m.version, percent: 90 });
  const bundle = JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
  const tmp = path.join(liveDir(), `${m.version}.tmp`);
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const [rel, b64] of Object.entries(bundle.files || {})) {
    const f = path.normalize(path.join(tmp, rel));
    if (!f.startsWith(tmp + path.sep)) continue;
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(b64, 'base64'));
  }
  if (!fs.existsSync(path.join(tmp, 'index.html'))) throw new Error('Mise à jour incomplète.');
  const final = path.join(liveDir(), m.version);
  fs.rmSync(final, { recursive: true, force: true });
  fs.renameSync(tmp, final);
  pendingLight = { version: m.version, shell: m.shell || 1 };
  sendUpdate({ status: 'ready', version: m.version, light: true });
  return 'ready';
}
let pendingLight = null;
/** Recherche : d'abord la mise à jour légère ; l'installateur complet seulement si la coque doit changer. */
async function checkAll() {
  if (!updatesReady) return;
  if (updateState.status === 'downloading' || updateState.status === 'ready' || updateState.status === 'installing') return;
  sendUpdate({ status: 'checking' });
  let r = 'none';
  try {
    r = await checkLight();
  } catch (e) {
    ulog('error', e);
  }
  if (r === 'latest') return sendUpdate({ status: 'latest', version: webVersion, checkedAt: Date.now() });
  if (r === 'ready') return;
  await autoUpdater.checkForUpdates();
}

/** Demande à l'app de finir d'enregistrer (au plus `ms` millisecondes). */
function flushRenderer(ms) {
  return new Promise((resolve) => {
    if (!win || win.isDestroyed()) return resolve();
    const done = () => {
      clearTimeout(t);
      resolve();
    };
    const t = setTimeout(() => {
      ipcMain.removeListener('grimoire:ready-to-close', done);
      resolve();
    }, ms);
    ipcMain.once('grimoire:ready-to-close', done);
    win.webContents.send('grimoire:before-close');
  });
}

ipcMain.on('grimoire:get-update', (e) => {
  e.returnValue = updateState;
});
ipcMain.handle('grimoire:check-update', async () => {
  if (!updatesReady) {
    sendUpdate({ status: 'error', message: 'Les mises à jour ne fonctionnent que dans l’app installée.' });
    return updateState;
  }
  if (updateState.status === 'downloading' || updateState.status === 'ready' || updateState.status === 'installing') return updateState;
  try {
    await checkAll();
  } catch (e) {
    ulog('error', e);
    sendUpdate({ status: 'error', message: (e && e.message) || String(e) });
  }
  return updateState;
});
ipcMain.on('grimoire:install-update', async () => {
  if (updateState.status !== 'ready') return;
  if (updateState.light && pendingLight) {
    // Mise à jour légère : on enregistre, on bascule sur la nouvelle version et on recharge la fenêtre.
    const v = pendingLight;
    ulog('info', `Rechargement sur la version ${v.version}`);
    sendUpdate({ status: 'installing', version: v.version, light: true });
    await flushRenderer(3000);
    fs.writeFileSync(path.join(liveDir(), 'version.json'), JSON.stringify(v));
    pickWebRoot();
    pendingLight = null;
    updateState = { status: 'latest', version: webVersion, checkedAt: Date.now() };
    if (win && !win.isDestroyed()) win.webContents.reloadIgnoringCache();
    return;
  }
  ulog('info', `Redémarrage demandé pour installer ${updateState.version}`);
  sendUpdate({ status: 'installing', version: updateState.version });
  // 1) on finit d'enregistrer, 2) on laisse la fenêtre se fermer sans la retenir, 3) on installe et on relance.
  await flushRenderer(3000);
  allowClose = true;
  setImmediate(() => {
    try {
      autoUpdater.quitAndInstall(true, true);
    } catch (e) {
      ulog('error', e);
      allowClose = false;
      sendUpdate({ status: 'error', message: (e && e.message) || String(e) });
    }
  });
});
ipcMain.on('grimoire:open-update-log', () => {
  if (!fs.existsSync(updateLogPath())) fs.writeFileSync(updateLogPath(), '');
  shell.openPath(updateLogPath());
});

ipcMain.on('grimoire:get-initial', (e) => {
  e.returnValue = { phoneMode: !!state.phoneMode, appVersion: webVersion };
});
// Connexion Google et accès au Drive (voir google.js).
ipcMain.on('grimoire:google-info', (e) => {
  e.returnValue = { configured: google.isConfigured(), account: google.getAccount() };
});
ipcMain.handle('grimoire:google-sign-in', () =>
  google.signIn(() => {
    // Quand la personne revient du navigateur, on remet Dream Map au premier plan.
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  }),
);
ipcMain.handle('grimoire:google-sign-out', () => google.signOut());
ipcMain.handle('grimoire:google-request', (_e, req) => google.authorizedRequest(req));

ipcMain.on('grimoire:set-phone-mode', (_e, on) => {
  rememberBounds();
  state.phoneMode = !!on;
  applyMode(state.phoneMode);
  saveState(state);
});

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  pickWebRoot();

  // Sert les fichiers de l'app web depuis app://dreammap/...
  protocol.handle(SCHEME, (req) => {
    const { pathname } = new URL(req.url);
    let file = path.normalize(path.join(webRoot, decodeURIComponent(pathname)));
    if (!file.startsWith(webRoot)) return new Response('Interdit', { status: 403 });
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(webRoot, 'index.html');
    return net.fetch(pathToFileURL(file).toString());
  });

  google.init();
  createWindow();
  setupUpdates();
});

app.on('window-all-closed', () => app.quit());
