// Pont sécurisé entre l'app (page web) et l'app PC. Voir src/platform/desktop.ts.
const { contextBridge, ipcRenderer } = require('electron');

const initial = ipcRenderer.sendSync('grimoire:get-initial');
let beforeClose = null;

ipcRenderer.on('grimoire:before-close', async () => {
  try {
    if (beforeClose) await beforeClose();
  } finally {
    ipcRenderer.send('grimoire:ready-to-close');
  }
});

contextBridge.exposeInMainWorld('grimoireDesktop', {
  isDesktopApp: true,
  appVersion: initial.appVersion,
  initialPhoneMode: initial.phoneMode,
  setPhoneMode: (on) => ipcRenderer.send('grimoire:set-phone-mode', !!on),
  onBeforeClose: (handler) => {
    beforeClose = handler;
  },
  update: {
    get: () => ipcRenderer.sendSync('grimoire:get-update'),
    onChange: (cb) => {
      const h = (_e, s) => cb(s);
      ipcRenderer.on('grimoire:update', h);
      return () => ipcRenderer.removeListener('grimoire:update', h);
    },
    install: () => ipcRenderer.send('grimoire:install-update'),
  },
  google: {
    info: () => ipcRenderer.sendSync('grimoire:google-info'),
    signIn: () => ipcRenderer.invoke('grimoire:google-sign-in'),
    signOut: () => ipcRenderer.invoke('grimoire:google-sign-out'),
    request: (req) => ipcRenderer.invoke('grimoire:google-request', req),
  },
});
