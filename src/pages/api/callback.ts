// Step 2 of signing in: GitHub sends the person back here with a code.
// We swap it for their GitHub App token, check they're allowed to edit the
// website, and start an encrypted session.
import type { APIRoute } from 'astro';
import { exchangeCode, GitHub } from '../../lib/github';
import { seal, sameText, SESSION_COOKIE, STATE_COOKIE } from '../../lib/session';
import { editor } from '../../settings/editor';

export const GET: APIRoute = async ({ locals, url, cookies, redirect }) => {
  const env = locals.runtime.env;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') ?? '';
  const expected = cookies.get(STATE_COOKIE)?.value ?? '';
  cookies.delete(STATE_COOKIE, { path: '/api/callback' });

  if (!code || !expected || !sameText(state, expected)) return redirect('/?error=state');

  try {
    const token = await exchangeCode(code, env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, new URL('/api/callback', url).href);
    const gh = new GitHub(token, { owner: editor.owner, repo: editor.repo });
    const user = await gh.user();

    const listed = editor.allowedUsers.length === 0 || editor.allowedUsers.some((u) => u.toLowerCase() === user.login.toLowerCase());
    if (!listed || !(await gh.canWrite())) return redirect(`/?error=access&who=${encodeURIComponent(user.login)}`);

    const hours = editor.sessionHours;
    const sealed = await seal({ ...user, token, exp: Date.now() + hours * 3600_000 }, env.SESSION_SECRET);
    cookies.set(SESSION_COOKIE, sealed, { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: hours * 3600 });
    return redirect('/machines');
  } catch {
    return redirect('/?error=github');
  }
};
