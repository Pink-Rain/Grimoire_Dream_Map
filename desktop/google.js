// Connexion Google de l'app PC.
// Méthode recommandée par Google pour les applications de bureau : on ouvre le navigateur habituel de la
// personne, elle se connecte chez Google, puis Google renvoie vers un petit serveur local temporaire
// (http://127.0.0.1:port) qui récupère l'autorisation. Protection PKCE contre les interceptions.
// Le « jeton de rafraîchissement » est chiffré par Windows (safeStorage) dans le dossier de l'app.
const { app, net, safeStorage, shell } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const CLIENT_ID = '317356951430-3el87obeq3t4i76hg1jhg7ho06em511u.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Le « code secret » n'est pas dans le dépôt public : il est ajouté au moment de fabriquer le .exe
// (secret GitHub GOOGLE_DESKTOP_CLIENT_SECRET → fichier google-oauth.json).
function loadClientSecret() {
  for (const p of [path.join(__dirname, 'google-oauth.json'), path.join(process.resourcesPath || '', 'google-oauth.json')]) {
    try {
      const secret = JSON.parse(fs.readFileSync(p, 'utf8')).clientSecret;
      if (secret) return secret;
    } catch {}
  }
  return process.env.GOOGLE_DESKTOP_CLIENT_SECRET || '';
}
const CLIENT_SECRET = loadClientSecret();

const authPath = () => path.join(app.getPath('userData'), 'google-auth.json');
let session = null; // { refreshToken, email, accessToken, expiresAt }
let pendingSignIn = null;

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function saveSession() {
  if (!session) {
    try {
      fs.unlinkSync(authPath());
    } catch {}
    return;
  }
  const encrypted = safeStorage.isEncryptionAvailable();
  const token = encrypted ? safeStorage.encryptString(session.refreshToken).toString('base64') : session.refreshToken;
  fs.writeFileSync(authPath(), JSON.stringify({ email: session.email, encrypted, token }));
}

function loadSession() {
  try {
    const s = JSON.parse(fs.readFileSync(authPath(), 'utf8'));
    const refreshToken = s.encrypted ? safeStorage.decryptString(Buffer.from(s.token, 'base64')) : s.token;
    session = { refreshToken, email: s.email || '', accessToken: '', expiresAt: 0 };
  } catch {
    session = null;
  }
}

async function tokenRequest(params) {
  const res = await net.fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error_description || data.error || `Erreur ${res.status}`);
    err.code = data.error;
    throw err;
  }
  return data;
}

async function getAccessToken() {
  if (!session) throw Object.assign(new Error('Non connecté à Google.'), { status: 401 });
  if (session.accessToken && Date.now() < session.expiresAt - 60_000) return session.accessToken;
  try {
    const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: session.refreshToken });
    session.accessToken = t.access_token;
    session.expiresAt = Date.now() + (t.expires_in || 3600) * 1000;
    return session.accessToken;
  } catch (e) {
    if (e.code === 'invalid_grant') {
      // Autorisation retirée ou expirée (mode Test de Google : 7 jours) → il faut se reconnecter.
      session = null;
      saveSession();
      throw Object.assign(new Error('La connexion à Google a expiré. Reconnecte-toi.'), { status: 401 });
    }
    throw Object.assign(new Error('Pas de connexion internet.'), { status: 0 });
  }
}

const PAGE = (title, text) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
  `<body style="background:#0f0d1a;color:#ece8ff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">` +
  `<div style="text-align:center;max-width:420px;padding:24px"><div style="font-size:48px;color:#b69cff">☾</div>` +
  `<h1 style="font-family:Georgia,serif;font-weight:normal">${title}</h1><p style="color:#9d95c7;line-height:1.5">${text}</p></div>`;

/** Ouvre le navigateur pour se connecter. Se termine quand la personne a accepté (ou après 5 minutes). */
function signIn(onBrowserReturn) {
  if (pendingSignIn) return pendingSignIn;
  pendingSignIn = new Promise((resolve, reject) => {
    const verifier = b64url(crypto.randomBytes(48));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));
    let redirectUri = '';
    let done = false;

    const finish = (err, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      server.close();
      pendingSignIn = null;
      err ? reject(err) : resolve(value);
    };

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/') {
        res.writeHead(404).end();
        return;
      }
      const reply = (title, text) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(PAGE(title, text));
        onBrowserReturn && onBrowserReturn();
      };
      if (url.searchParams.get('state') !== state) {
        reply('Lien invalide', 'Recommence la connexion depuis Dream Map.');
        return;
      }
      if (url.searchParams.get('error')) {
        reply('Connexion annulée', 'Tu peux fermer cette page et revenir dans Dream Map.');
        finish(new Error('Connexion annulée.'));
        return;
      }
      try {
        const t = await tokenRequest({
          grant_type: 'authorization_code',
          code: url.searchParams.get('code') || '',
          code_verifier: verifier,
          redirect_uri: redirectUri,
        });
        if (!t.refresh_token) throw new Error('Google n’a pas fourni d’autorisation durable.');
        session = { refreshToken: t.refresh_token, email: '', accessToken: t.access_token, expiresAt: Date.now() + (t.expires_in || 3600) * 1000 };
        session.email = await fetchEmail().catch(() => '');
        saveSession();
        reply('Connexion réussie', 'Tu peux fermer cette page et revenir dans Dream Map.');
        finish(null, { email: session.email });
      } catch (e) {
        reply('Connexion impossible', String(e.message || e));
        finish(e);
      }
    });

    const timer = setTimeout(() => finish(new Error('Connexion abandonnée (délai dépassé).')), 5 * 60_000);

    server.listen(0, '127.0.0.1', () => {
      redirectUri = `http://127.0.0.1:${server.address().port}`;
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        access_type: 'offline',
        prompt: 'consent',
      });
      shell.openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    });
    server.on('error', (e) => finish(e));
  });
  return pendingSignIn;
}

async function fetchEmail() {
  const res = await authorizedRequest({ method: 'GET', url: 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)' });
  return res.status === 200 ? JSON.parse(res.body).user?.emailAddress || '' : '';
}

/** Requête vers Google avec le jeton ajouté. Renvoie { status, body } ; status 0 = pas d'internet. */
async function authorizedRequest(req) {
  if (!/^https:\/\/www\.googleapis\.com\//.test(req.url)) return { status: 400, body: 'Adresse non autorisée' };
  for (let attempt = 0; attempt < 2; attempt++) {
    let token;
    try {
      token = await getAccessToken();
    } catch (e) {
      return { status: e.status ?? 0, body: JSON.stringify({ error: { message: e.message } }) };
    }
    try {
      const res = await net.fetch(req.url, {
        method: req.method,
        headers: { ...(req.headers || {}), Authorization: `Bearer ${token}` },
        body: req.body,
      });
      const body = await res.text();
      if (res.status === 401 && attempt === 0 && session) {
        session.accessToken = ''; // jeton périmé : on en redemande un et on réessaie une fois
        continue;
      }
      return { status: res.status, body };
    } catch {
      return { status: 0, body: '' };
    }
  }
  return { status: 401, body: '' };
}

async function signOut() {
  const token = session && session.refreshToken;
  session = null;
  saveSession();
  if (token) {
    net.fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {});
  }
}

module.exports = {
  isConfigured: () => !!CLIENT_SECRET,
  init: loadSession,
  getAccount: () => (session ? { email: session.email } : null),
  signIn,
  signOut,
  authorizedRequest,
};
