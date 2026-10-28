// A small live preview of the website using the theme being edited.
import { esc } from './editor';
import type { Theme } from '../settings/types';

const stack = (name: string) => (name === 'system-ui' ? 'system-ui, sans-serif' : `'${name}', system-ui, sans-serif`);

export function themePreview(t: Theme, device: 'desktop' | 'phone', words: { banner: string; headline: string; highlight: string; intro: string; button: string; button2: string; section: string }) {
  const c = t.colours;
  const s = t.sizes;
  const phone = device === 'phone';
  const k = phone ? 0.62 : 0.5; // shrink to fit the preview panel
  const px = (n: number, min: number) => Math.max(min, Math.round(n * k * (phone ? 0.85 : 1)));
  const hf = stack(t.fonts.heading);
  const bf = stack(t.fonts.body);
  const heading = `font-family:${hf};font-weight:800;font-synthesis:none;text-transform:${t.headingCapitals ? 'uppercase' : 'none'};letter-spacing:${s.headingTracking / 100}em;line-height:1.05;margin:0;color:${c.text}`;
  const btn = `display:inline-flex;align-items:center;justify-content:center;padding:0 ${Math.round(s.buttonHeight * 0.36)}px;height:${Math.round(s.buttonHeight * 0.62)}px;border-radius:${Math.round(s.radius * 0.6)}px;font-size:${Math.round(s.button * 0.72)}px;font-weight:700;font-family:${bf}`;
  const card = (name: string) => `<div style="background:${c.surface};border:1px solid ${c.border};border-radius:${Math.round(s.radius * 0.8)}px;padding:10px;display:flex;flex-direction:column;gap:4px">
      <strong style="font-size:${Math.round(s.text * 0.72)}px;color:${c.text}">${name}</strong>
      <span style="font-size:${Math.round(s.small * 0.85)}px;color:${c.textMuted};line-height:${s.lineHeight}">Factory-sealed</span></div>`;
  return `<div style="background:${c.background};border:1px solid ${c.border};border-radius:${Math.round(s.radius * 0.9)}px;overflow:hidden;font-family:${bf}">
    <div style="background:${c.accent};color:${c.accentText};font-size:${Math.round(s.small * 0.85)}px;font-weight:600;padding:6px 12px;text-align:center">${esc(words.banner)}</div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:12px">
      <span style="font-family:'JetBrains Mono',monospace;font-size:${Math.round(s.small * 0.8)}px;letter-spacing:.14em;text-transform:uppercase;color:${c.textMuted}">Coming soon · 2026</span>
      <h3 style="${heading};font-size:${px(s.headline, 20)}px">${esc(words.headline)}<br><span class="foil">${esc(words.highlight)}</span></h3>
      <p style="font-size:${Math.round(s.text * 0.78)}px;line-height:${s.lineHeight};color:${c.textMuted};margin:0">${esc(words.intro)}</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <span style="${btn};background:${c.accent};color:${c.accentText}">${esc(words.button)}</span>
        <span style="${btn};background:${c.surfaceRaised};border:1px solid ${c.border};color:${c.text}">${esc(words.button2)}</span>
      </div>
      <h4 style="${heading};font-size:${px(s.section, 15)}px;margin-top:6px">${esc(words.section)}</h4>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${card('Booster packs')}${card('Elite Trainer Boxes')}</div>
      <div style="display:flex;gap:10px;font-size:${Math.round(s.small * 0.9)}px"><span style="color:${c.success}">● Open now</span><span style="color:${c.danger}">● Error message</span></div>
    </div></div>`;
}
