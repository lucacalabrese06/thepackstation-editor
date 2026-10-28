// Shared browser code for every editor page: reading the page's data,
// saving, uploading images and showing plain-English problems.

export interface PageData<T> {
  file: string;
  data: T;
  sha: string;
}

export function pageData<T>(): PageData<T> {
  const el = document.getElementById('page-data');
  if (!el?.textContent) throw new Error('No page data');
  return JSON.parse(el.textContent) as PageData<T>;
}

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

let leaving = false;

export function showProblems(problems: string[]) {
  const box = document.getElementById('problems');
  if (!box) return alertFallback(problems);
  if (!problems.length) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  box.hidden = false;
  box.innerHTML = '<strong>Please fix before saving:</strong><ul></ul>';
  const ul = box.querySelector('ul')!;
  for (const p of problems) {
    const li = document.createElement('li');
    li.textContent = p;
    ul.append(li);
  }
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function alertFallback(problems: string[]) {
  if (problems.length) window.alert(problems.join('\n'));
}

export function busy(button: HTMLButtonElement | null, on: boolean, label = 'Saving…') {
  if (!button) return;
  if (on) {
    button.dataset.label = button.textContent ?? '';
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label ?? button.textContent;
    button.disabled = false;
  }
}

async function post(url: string, body: unknown) {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({ ok: false, problems: [`The editor returned an error (${res.status}). Try again.`] }));
    return data as { ok: boolean; problems?: string[]; [k: string]: unknown };
  } catch {
    return { ok: false, problems: ["Couldn't reach the editor. Check your internet connection and try again."] };
  }
}

// Saves a whole settings file, then goes to the Publish page.
export async function save(file: string, data: unknown, sha: string, summary: string, button: HTMLButtonElement | null) {
  showProblems([]);
  busy(button, true);
  const result = await post('/api/save', { file, data, sha, summary });
  if (!result.ok) {
    busy(button, false);
    showProblems(result.problems ?? ['Something went wrong.']);
    return false;
  }
  leaving = true;
  window.location.href = `/publish?saved=${encodeURIComponent(summary)}`;
  return true;
}

// Saves several settings files in turn (only the ones that changed).
export async function saveMany(items: { file: string; data: unknown; sha: string; changed: boolean }[], summary: string, button: HTMLButtonElement | null) {
  const todo = items.filter((i) => i.changed);
  if (!todo.length) {
    showProblems(['Nothing has changed yet.']);
    return false;
  }
  showProblems([]);
  busy(button, true);
  for (const item of todo) {
    const result = await post('/api/save', { file: item.file, data: item.data, sha: item.sha, summary });
    if (!result.ok) {
      busy(button, false);
      showProblems(result.problems ?? ['Something went wrong.']);
      return false;
    }
  }
  leaving = true;
  window.location.href = `/publish?saved=${encodeURIComponent(summary)}`;
  return true;
}

// Shrinks a photo in the browser, then saves it to the website's images.
export async function uploadImage(file: File, kind: 'logo' | 'machine', name: string): Promise<string | null> {
  if (!/^image\//.test(file.type)) {
    showProblems(["That file isn't an image. Choose a photo or a PNG/JPG file."]);
    return null;
  }
  let dataUrl: string;
  try {
    dataUrl = await resize(file, kind);
  } catch {
    showProblems(["That image couldn't be opened. Try a JPG or PNG instead."]);
    return null;
  }
  const result = await post('/api/upload', { kind, name, dataUrl });
  if (!result.ok) {
    showProblems(result.problems ?? ['The image could not be saved.']);
    return null;
  }
  return result.path as string;
}

async function resize(file: File, kind: 'logo' | 'machine'): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  if (kind === 'logo') {
    // Square 512 × 512 PNG, image centred and fully visible.
    canvas.width = canvas.height = 512;
    const scale = Math.min(512 / bitmap.width, 512 / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.drawImage(bitmap, (512 - w) / 2, (512 - h) / 2, w, h);
    return canvas.toDataURL('image/png');
  }
  // Photos: longest side 1600px, JPEG.
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

// Reads an image file for an instant on-screen preview.
export const previewUrl = (file: File) => URL.createObjectURL(file);

// Same {placeholder} filling the website does.
export function fill(text: string, values: Record<string, string>) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? values[k] : m));
}

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Warns before leaving a page with unsaved changes.
export function guardUnsaved(isDirty: () => boolean) {
  window.addEventListener('beforeunload', (e) => {
    if (!leaving && isDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
