// Saves an uploaded image to the website's images folder on the preview
// branch. The browser resizes and compresses it first.
// Body: { kind: 'logo' | 'machine', name, dataUrl }  →  { ok, path }
import type { APIRoute } from 'astro';
import { editor, imageFolders } from '../../settings/editor';
import { json, failed, explain, readBody } from '../../lib/server';

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const MAX_BYTES = 1_500_000;

// Checks the file really is the image type it claims to be.
function looksRight(bytes: Uint8Array, ext: string) {
  const hex = [...bytes.subarray(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (ext === 'png') return hex.startsWith('89504e47');
  if (ext === 'jpg') return hex.startsWith('ffd8ff');
  if (ext === 'webp') return hex.startsWith('52494646') && hex.slice(16, 24) === '57454250';
  return false;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image';

export const POST: APIRoute = async (context) => {
  const gh = context.locals.gh!;
  const body = await readBody(context, 2_200_000);
  if (!body) return failed(['That image is too large. Try a smaller photo.']);

  const { kind, name, dataUrl } = body as { kind: unknown; name: unknown; dataUrl: unknown };
  if (kind !== 'logo' && kind !== 'machine') return failed(['Unknown image type.']);
  const match = typeof dataUrl === 'string' && /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return failed(['Images must be PNG, JPG or WebP.']);

  const ext = TYPES[match[1]];
  const base64 = match[2];
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (bytes.length > MAX_BYTES) return failed(['That image is still too large after shrinking. Try a different photo.']);
  if (!looksRight(bytes, ext)) return failed(["That file isn't a valid image."]);

  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const file = `${slug(typeof name === 'string' ? name : kind)}-${stamp}.${ext}`;
  const repoPath = `${imageFolders[kind]}/${file}`;
  const sitePath = repoPath.replace(/^public/, '');

  try {
    await gh.writeFile(repoPath, base64, {
      branch: editor.previewBranch,
      message: `Upload ${kind === 'logo' ? 'logo' : 'machine photo'} ${file} (via editor, @${context.locals.user!.login})`,
    });
    return json({ ok: true, path: sitePath });
  } catch (e) {
    const { message, status } = explain(e);
    return failed([message], status);
  }
};
