// Saves one settings file to the preview branch, after the same checks the
// website's build runs. Body: { file, data, sha, summary }
import type { APIRoute } from 'astro';
import { checkers } from '../../lib/validate';
import { editor, settingsFiles } from '../../settings/editor';
import { json, failed, explain, isSettingsFile, readBody } from '../../lib/server';

export const POST: APIRoute = async (context) => {
  const gh = context.locals.gh!;
  const body = await readBody(context, 512 * 1024);
  if (!body) return failed(['That change was too large or not readable. Reload the page and try again.']);

  const { file, data, sha, summary } = body as { file: unknown; data: unknown; sha: unknown; summary: unknown };
  if (!isSettingsFile(file) || typeof sha !== 'string' || !data || typeof data !== 'object') return failed(['Unknown section. Reload the page and try again.']);

  const problems = (checkers[file] as (v: unknown) => string[])(data);
  if (problems.length) return failed(problems);

  const who = context.locals.user!.login;
  const message = `${typeof summary === 'string' && summary.trim() ? summary.trim().slice(0, 100) : `Update ${file}`} (via editor, @${who})`;

  try {
    const result = await gh.writeJson(settingsFiles[file], data, { branch: editor.previewBranch, sha, message });
    return json({ ok: true, sha: result.sha });
  } catch (e) {
    const { message: m, status } = explain(e);
    return failed([m], status);
  }
};
