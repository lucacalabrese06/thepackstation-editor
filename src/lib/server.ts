// Small helpers shared by the editor's pages and API routes.
import type { AstroGlobal, APIContext } from 'astro';
import { GitHubError, type GitHub } from './github';
import { editor, settingsFiles, type SettingsFile } from '../settings/editor';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const failed = (problems: string[], status = 400) => json({ ok: false, problems }, status);

// Turns any error into one plain-English sentence for the person using the editor.
export function explain(e: unknown): { message: string; status: number } {
  if (e instanceof GitHubError) {
    if (e.status === 401) return { message: 'Your sign-in has expired. Reload the page and sign in again.', status: 401 };
    if (e.status === 403) return { message: "GitHub didn't allow that change. Check you still have access to the website repository.", status: 403 };
    if (e.status === 404) return { message: "GitHub couldn't find the website files. Check the editor's settings.", status: 404 };
    return { message: e.message, status: e.status >= 400 && e.status < 600 ? e.status : 502 };
  }
  return { message: 'Something went wrong talking to GitHub. Try again in a moment.', status: 502 };
}

// Loads a settings file from the preview branch for a page to edit.
export async function load<T>(Astro: AstroGlobal, file: SettingsFile): Promise<{ data: T; sha: string } | { error: string }> {
  try {
    return await (Astro.locals.gh as GitHub).readJson<T>(settingsFiles[file], editor.previewBranch);
  } catch (e) {
    return { error: explain(e).message };
  }
}

export const isSettingsFile = (v: unknown): v is SettingsFile => typeof v === 'string' && v in settingsFiles;

export async function readBody(context: APIContext, maxBytes: number) {
  const length = Number(context.request.headers.get('content-length') || 0);
  if (length > maxBytes) return null;
  const text = await context.request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
