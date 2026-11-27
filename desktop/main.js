// Application PC de Grimoire - Dream Map (Electron).
// Elle affiche la version web de l'app (dossier dist/), avec quelques fonctions en plus :
// - le bouton téléphone/ordinateur redimensionne la fenêtre ;
// - la taille de la fenêtre et le format sont mémorisés ;
// - avant de fermer, on laisse l'app finir d'enregistrer.
const { app, BrowserWindow, ipcMain, net, protocol, screen, shell, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const google = require('./google');

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

const webRoot = app.isPackaged ? path.join(process.resourcesPath, 'web') : path.join(__dirname, '..', 'dist');

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
ipcMain.on('grimoire:get-initial', (e) => {
  e.returnValue = { phoneMode: !!state.phoneMode, appVersion: app.getVersion() };
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
});

app.on('window-all-closed', () => app.quit());
