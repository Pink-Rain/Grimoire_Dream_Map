/**
 * Android : connexion Google native (module @react-native-google-signin/google-signin).
 * Google reconnaît l'app grâce au client OAuth « Android » du projet Google Cloud
 * (nom du paquet com.pinkrain.grimoire.dreammap + empreinte SHA-1 de la clé qui signe l'APK).
 * Accès demandé : seulement le dossier caché de l'app dans le Drive (drive.appdata).
 */
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import type { SyncAuth } from './auth';
import type { HttpRequest, HttpResponse } from './drive';

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
let ready = false;
let email: string | null = null;

function setup() {
  if (ready) return;
  GoogleSignin.configure({ scopes: [SCOPE] });
  ready = true;
}

/** Messages compréhensibles pour les erreurs de connexion. */
function explain(e: unknown): Error {
  if (isErrorWithCode(e)) {
    if (e.code === statusCodes.SIGN_IN_CANCELLED) return new Error('Connexion annulée.');
    if (e.code === statusCodes.IN_PROGRESS) return new Error('Une connexion est déjà en cours.');
    if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return new Error('Les services Google Play sont absents ou à mettre à jour sur ce téléphone.');
    if (e.code === '10' || /DEVELOPER_ERROR/.test(e.message))
      return new Error('Google ne reconnaît pas encore l’app sur ce téléphone (client Android à créer dans Google Cloud).');
    if (e.code === '7' || /NETWORK_ERROR/.test(e.message)) return new Error('Pas de connexion internet.');
  }
  return e instanceof Error ? e : new Error(String(e));
}

async function send(req: HttpRequest, token: string): Promise<HttpResponse> {
  const res = await fetch(req.url, { method: req.method, headers: { ...(req.headers ?? {}), Authorization: `Bearer ${token}` }, body: req.body });
  return { status: res.status, body: await res.text() };
}

export function nativeAuth(): SyncAuth {
  return {
    configured: true,
    account: () => (email ? { email } : null),
    async restore() {
      setup();
      if (!GoogleSignin.hasPreviousSignIn()) return;
      const r = await GoogleSignin.signInSilently();
      if (r.type === 'success' && r.data.scopes.includes(SCOPE)) email = r.data.user.email;
    },
    async signIn() {
      setup();
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        let r = await GoogleSignin.signIn();
        if (r.type !== 'success') throw new Error('Connexion annulée.');
        if (!r.data.scopes.includes(SCOPE)) {
          const more = await GoogleSignin.addScopes({ scopes: [SCOPE] });
          if (!more || more.type !== 'success' || !more.data.scopes.includes(SCOPE))
            throw new Error('Sans l’accès au dossier de l’app dans ton Drive, la synchro ne peut pas marcher.');
          r = more;
        }
        email = r.data.user.email;
        return { email };
      } catch (e) {
        throw explain(e);
      }
    },
    async signOut() {
      try {
        await GoogleSignin.revokeAccess();
      } catch {}
      await GoogleSignin.signOut().catch(() => null);
      email = null;
    },
    async request(req) {
      let token = (await GoogleSignin.getTokens()).accessToken;
      let res = await send(req, token);
      if (res.status === 401) {
        // Jeton expiré : on en redemande un neuf.
        await GoogleSignin.clearCachedAccessToken(token);
        token = (await GoogleSignin.getTokens()).accessToken;
        res = await send(req, token);
      }
      return res;
    },
  };
}
