// Signed-in sessions, kept in an encrypted cookie.
// The cookie holds the GitHub login and the short-lived GitHub token, sealed
// with AES-GCM using SESSION_SECRET, so it can't be read or forged.

export interface Session {
  login: string;
  name: string;
  avatar: string;
  token: string;
  exp: number; // ms since epoch
}

export const SESSION_COOKIE = 'ps_session';
export const STATE_COOKIE = 'ps_state';

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64Url = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64Url = (text: string) => {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function keyFrom(secret: string) {
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function seal(session: Session, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFrom(secret), enc.encode(JSON.stringify(session)));
  return `${toB64Url(iv)}.${toB64Url(new Uint8Array(data))}`;
}

export async function unseal(value: string | undefined, secret: string, now = Date.now()): Promise<Session | null> {
  if (!value || !value.includes('.')) return null;
  try {
    const [iv, data] = value.split('.');
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64Url(iv) }, await keyFrom(secret), fromB64Url(data));
    const session = JSON.parse(dec.decode(plain)) as Session;
    if (!session.login || !session.token || typeof session.exp !== 'number' || session.exp < now) return null;
    return session;
  } catch {
    return null;
  }
}

export const randomState = () => toB64Url(crypto.getRandomValues(new Uint8Array(24)));

// Constant-time comparison for the sign-in state check.
export function sameText(a: string, b: string) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
