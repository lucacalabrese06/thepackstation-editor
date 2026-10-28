// A reusable editor for a list of items (FAQs, products, promises, topics):
// edit fields, add, remove and move items up or down.
import { esc } from './editor';

export interface ListField {
  key: string;
  label: string;
  long?: boolean;
  options?: [string, string][]; // value, label → shows a dropdown
}

export interface ListSpec<T> {
  id: string;
  title: string;
  itemName: string; // e.g. "question"
  fields: ListField[];
  blank: () => T;
  max?: number;
  hint?: string;
}

export function listEditor<T extends Record<string, string>>(root: HTMLElement, items: T[], spec: ListSpec<T>, onChange: () => void) {
  function render() {
    const rows = items
      .map((item, i) => `
      <div class="list-item">
        <div class="row"><strong style="font-size:14px">${esc(spec.itemName[0].toUpperCase() + spec.itemName.slice(1))} ${i + 1}</strong>
          <span class="order-btns">
            <button type="button" data-move="${i}" data-dir="-1" aria-label="Move ${spec.itemName} ${i + 1} up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" data-move="${i}" data-dir="1" aria-label="Move ${spec.itemName} ${i + 1} down" ${i === items.length - 1 ? 'disabled' : ''}>↓</button>
          </span></div>
        ${spec.fields.map((f) => {
          const id = `${spec.id}-${i}-${f.key}`;
          const v = item[f.key] ?? '';
          const control = f.options
            ? `<select id="${id}" class="input" data-i="${i}" data-k="${f.key}">${f.options.map(([val, lab]) => `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`
            : f.long
              ? `<textarea id="${id}" class="input" rows="2" data-i="${i}" data-k="${f.key}">${esc(v)}</textarea>`
              : `<input id="${id}" class="input" data-i="${i}" data-k="${f.key}" value="${esc(v)}">`;
          return `<div class="field"><label for="${id}">${esc(f.label)}</label>${control}</div>`;
        }).join('')}
        <button type="button" class="link-btn" style="align-self:flex-start;color:var(--bad)" data-remove="${i}">Remove this ${esc(spec.itemName)}</button>
      </div>`)
      .join('');
    const canAdd = !spec.max || items.length < spec.max;
    root.innerHTML = `<h2>${esc(spec.title)}</h2>${spec.hint ? `<p class="note">${esc(spec.hint)}</p>` : ''}${rows || `<p class="note">No ${esc(spec.itemName)}s yet.</p>`}
      ${canAdd ? `<button type="button" class="dashed" data-add>+ Add a ${esc(spec.itemName)}</button>` : ''}`;
  }

  root.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.i === undefined) return;
    (items[Number(el.dataset.i)] as Record<string, string>)[el.dataset.k!] = el.value;
    onChange();
  });
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-add],[data-remove],[data-move]');
    if (!b) return;
    if (b.dataset.add !== undefined) items.push(spec.blank());
    if (b.dataset.remove !== undefined) items.splice(Number(b.dataset.remove), 1);
    if (b.dataset.move !== undefined) {
      const i = Number(b.dataset.move);
      const j = i + Number(b.dataset.dir);
      [items[i], items[j]] = [items[j], items[i]];
    }
    render();
    onChange();
  });
  render();
}

// Same, for a plain list of words (e.g. contact topics, towns).
export function wordListEditor(root: HTMLElement, words: string[], spec: { id: string; title: string; itemName: string; hint?: string }, onChange: () => void) {
  const items = words.map((w) => ({ value: w }));
  const sync = () => {
    words.splice(0, words.length, ...items.map((i) => i.value));
    onChange();
  };
  listEditor(root, items, { id: spec.id, title: spec.title, itemName: spec.itemName, hint: spec.hint, fields: [{ key: 'value', label: spec.itemName[0].toUpperCase() + spec.itemName.slice(1) }], blank: () => ({ value: '' }) }, sync);
}
