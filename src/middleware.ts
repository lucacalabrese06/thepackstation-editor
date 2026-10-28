// Runs before every request. Anything other than the sign-in screen and
// static files needs a valid session; otherwise people are sent to sign in.
import { defineMiddleware } from 'astro:middleware';
import { unseal, SESSION_COOKIE } from './lib/session';
import { GitHub } from './lib/github';
import { editor } from './settings/editor';

const PUBLIC = ['/', '/api/login', '/api/callback', '/favicon.svg', '/robots.txt'];
const isPublic = (path: string) => PUBLIC.includes(path) || path.startsWith('/fonts/') || path.startsWith('/_astro/');

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const env = context.locals.runtime?.env;
  const session = env ? await unseal(context.cookies.get(SESSION_COOKIE)?.value, env.SESSION_SECRET) : null;

  if (session) {
    context.locals.user = { login: session.login, name: session.name, avatar: session.avatar };
    context.locals.gh = new GitHub(session.token, { owner: editor.owner, repo: editor.repo });
  }

  if (!session && !isPublic(pathname)) {
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ ok: false, problems: ['Your sign-in has expired. Reload the page and sign in again.'] }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/?expired=1');
  }

  // Security headers are set on the response itself (not a copy) so the
  // sign-in cookie Astro attaches to it isn't lost.
  const response = await next();
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy':
      `default-src 'self'; img-src 'self' data: blob: https://avatars.githubusercontent.com ${new URL(editor.previewUrl).origin} ${new URL(editor.liveUrl).origin}; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self' https://github.com; base-uri 'self'`,
  };
  for (const [name, value] of Object.entries(headers)) {
    try {
      response.headers.set(name, value);
    } catch {
      // Some responses have read-only headers; Cloudflare's _headers file covers those.
    }
  }
  return response;
});
