/**
 * Accès au dossier caché de l'app dans le Google Drive de la personne (appDataFolder).
 * L'app ne voit que ce dossier : ni les autres fichiers du Drive, ni ceux des autres apps.
 */

export interface RemoteFile {
  id: string;
  name: string;
  /** Empreinte du contenu calculée par Google : change à chaque modification. */
  md5Checksum?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface DriveApi {
  list(): Promise<RemoteFile[]>;
  download(id: string): Promise<string>;
  create(name: string, content: string): Promise<RemoteFile>;
  update(id: string, content: string): Promise<RemoteFile>;
  remove(id: string): Promise<void>;
}

/** Une requête HTTP vers Google ; le jeton de connexion est ajouté par la plateforme. */
export interface HttpRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: string;
}
export interface HttpResponse {
  status: number;
  body: string;
}
export type AuthorizedRequest = (req: HttpRequest) => Promise<HttpResponse>;

/** Erreur venant de Google, avec un message compréhensible. */
export class DriveError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FILE_FIELDS = 'id,name,md5Checksum,createdTime,modifiedTime';

export function createDriveApi(request: AuthorizedRequest): DriveApi {
  async function call(req: HttpRequest): Promise<string> {
    const res = await request(req);
    if (res.status >= 200 && res.status < 300) return res.body;
    throw new DriveError(res.status, describeError(res));
  }

  return {
    async list() {
      const files: RemoteFile[] = [];
      let pageToken = '';
      do {
        const q = new URLSearchParams({
          spaces: 'appDataFolder',
          pageSize: '1000',
          fields: `nextPageToken,files(${FILE_FIELDS})`,
        });
        if (pageToken) q.set('pageToken', pageToken);
        const data = JSON.parse(await call({ method: 'GET', url: `${API}/files?${q}` }));
        files.push(...(data.files ?? []));
        pageToken = data.nextPageToken ?? '';
      } while (pageToken);
      return files;
    },

    download(id) {
      return call({ method: 'GET', url: `${API}/files/${encodeURIComponent(id)}?alt=media` });
    },

    async create(name, content) {
      const boundary = 'dreammap' + Math.random().toString(36).slice(2);
      const meta = JSON.stringify({ name, parents: ['appDataFolder'], mimeType: 'application/json' });
      const body =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`;
      const text = await call({
        method: 'POST',
        url: `${UPLOAD}/files?uploadType=multipart&fields=${FILE_FIELDS}`,
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      });
      return JSON.parse(text);
    },

    async update(id, content) {
      const text = await call({
        method: 'PATCH',
        url: `${UPLOAD}/files/${encodeURIComponent(id)}?uploadType=media&fields=${FILE_FIELDS}`,
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: content,
      });
      return JSON.parse(text);
    },

    async remove(id) {
      try {
        await call({ method: 'DELETE', url: `${API}/files/${encodeURIComponent(id)}` });
      } catch (e) {
        if (!(e instanceof DriveError && e.status === 404)) throw e;
      }
    },
  };
}

function describeError(res: HttpResponse): string {
  let detail = '';
  try {
    detail = JSON.parse(res.body)?.error?.message ?? '';
  } catch {}
  if (res.status === 0) return 'Pas de connexion internet.';
  if (res.status === 401) return 'La connexion à Google a expiré. Reconnecte-toi.';
  if (res.status === 403)
    return `Google refuse l'accès${detail ? ` (${detail})` : ''}. Vérifie que ton adresse est dans les « utilisateurs tests ».`;
  if (res.status === 429 || res.status >= 500) return 'Google est momentanément indisponible. Nouvel essai bientôt.';
  return `Erreur Google ${res.status}${detail ? ` : ${detail}` : ''}`;
}
