// Puts everything saved on the preview branch live.
import type { APIRoute } from 'astro';
import { editor } from '../../settings/editor';
import { json, failed, explain } from '../../lib/server';

export const POST: APIRoute = async ({ locals }) => {
  try {
    const result = await locals.gh!.publish(editor.liveBranch, editor.previewBranch, locals.user!.login);
    return json({ ok: true, ...result });
  } catch (e) {
    const { message, status } = explain(e);
    return failed([message], status);
  }
};
