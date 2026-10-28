// Step 1 of signing in: send the person to GitHub with a one-time state value.
import type { APIRoute } from 'astro';
import { authorizeUrl } from '../../lib/github';
import { randomState, STATE_COOKIE } from '../../lib/session';

export const GET: APIRoute = ({ locals, url, cookies, redirect }) => {
  const env = locals.runtime.env;
  const state = randomState();
  cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/api/callback', maxAge: 600 });
  return redirect(authorizeUrl(env.GITHUB_CLIENT_ID, new URL('/api/callback', url).href, state));
};
