// Checks every settings file and returns plain-English problems.
// Used by the site's build (a problem stops the build) and, as an identical
// copy, by the editor app before it saves anything. Keep the two in step.

import type { Business, Machine, StockItem, Point, Faq, Theme, Content, MenuItem, FooterColumn } from '../settings/types';

export interface AllSettings {
  business: Business;
  machines: { machines: Machine[]; comingSoonAreas: string[] };
  stock: { stock: StockItem[]; promises: Point[]; steps: Point[] };
  faq: { faq: Faq[]; contactTopics: string[] };
  forms: { contactEndpoint: string };
  theme: Theme;
  content: Content;
  navigation: { links: Record<string, string>; headerMenu: MenuItem[]; footerMenu: FooterColumn[] };
}

export const HEADING_FONTS = ['Dela Gothic One', 'Bebas Neue', 'Bricolage Grotesque', 'Fredoka', 'Outfit'];
export const BODY_FONTS = ['Outfit', 'DM Sans', 'Nunito', 'Bricolage Grotesque', 'system-ui'];
export const STOCK_ICONS = ['pack', 'layers', 'box', 'gift', 'star', 'card'];
export const MENU_ICONS = ['home', 'locations', 'gallery', 'support', 'store', 'mail'];
export const SIZE_LIMITS: Record<string, [number, number, string]> = {
  headline: [32, 80, 'Big headline'],
  section: [20, 52, 'Section headings'],
  text: [14, 22, 'Paragraphs'],
  small: [10, 16, 'Small labels'],
  button: [13, 20, 'Button text'],
  buttonHeight: [40, 64, 'Button height'],
  radius: [0, 28, 'Corner roundness'],
  lineHeight: [1.3, 2, 'Line spacing'],
  headingTracking: [-2, 8, 'Heading letter spacing'],
};

const hex = /^#[0-9a-fA-F]{6}$/;
const https = /^https:\/\/[^\s]+$/;
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isLink = (link: string) => typeof link === 'string' && (link.startsWith('/') || https.test(link));
const imagePath = /^\/images\/[A-Za-z0-9/_.-]+\.(png|jpe?g|webp|svg)$/i;

export function checkBusiness(b: Business): string[] {
  const p: string[] = [];
  if (!b.name?.trim()) p.push('Business details: the business name is empty.');
  if (!['coming-soon', 'live'].includes(b.launchStatus)) p.push("Business details: website status must be 'coming-soon' or 'live'.");
  if (!https.test(b.website ?? '') || b.website.endsWith('/')) p.push('Business details: the website address must start with https:// and have no slash at the end.');
  if (!email.test(b.email ?? '')) p.push(`Business details: "${b.email}" doesn't look like an email address.`);
  for (const [name, link] of Object.entries(b.social ?? {})) {
    if (link && !https.test(link)) p.push(`Business details: the ${name} link must start with https:// or be left empty.`);
  }
  if (b.logo && !imagePath.test(b.logo)) p.push('Business details: the logo must be an image saved in /images/.');
  return p;
}

export function checkMachines(m: AllSettings['machines']): string[] {
  const p: string[] = [];
  const seen = new Set<string>();
  (m.machines ?? []).forEach((x, i) => {
    const where = `Machine ${i + 1}${x.code ? ` (${x.code})` : ''}`;
    if (!x.code || !/^[A-Za-z0-9-]+$/.test(x.code)) p.push(`${where}: the code must use only letters, numbers and dashes, e.g. TPS-01.`);
    const key = (x.code || '').toLowerCase();
    if (key && seen.has(key)) p.push(`${where}: another machine already uses this code.`);
    seen.add(key);
    if (!['live', 'coming-soon'].includes(x.status)) p.push(`${where}: status must be open now or opening soon.`);
    const labels = { name: 'name', venue: 'where in the venue', town: 'town', postcode: 'postcode', payment: 'payment' } as const;
    for (const [field, label] of Object.entries(labels)) {
      if (!String(x[field as keyof typeof labels] ?? '').trim()) p.push(`${where}: the ${label} is empty.`);
    }
    if (!Array.isArray(x.hours) || x.hours.length === 0) p.push(`${where}: add at least one line of opening hours.`);
    else x.hours.forEach((h, j) => { if (!h.days?.trim() || !h.times?.trim()) p.push(`${where}: opening hours line ${j + 1} needs both days and times.`); });
    if (x.photo && !imagePath.test(x.photo)) p.push(`${where}: the photo must be an image saved in /images/.`);
    if (x.mapLink && !https.test(x.mapLink)) p.push(`${where}: the Google Maps link must start with https:// or be left empty.`);
  });
  return p;
}

export function checkStock(s: AllSettings['stock']): string[] {
  const p: string[] = [];
  (s.stock ?? []).forEach((x, i) => {
    if (!x.name?.trim()) p.push(`What we stock, item ${i + 1}: the name is empty.`);
    if (!STOCK_ICONS.includes(x.icon)) p.push(`What we stock, item ${i + 1}: pick one of the icons.`);
  });
  [...(s.promises ?? []), ...(s.steps ?? [])].forEach((x) => { if (!x.title?.trim()) p.push('What we stock: a promise or step has no title.'); });
  return p;
}

export function checkFaq(f: AllSettings['faq']): string[] {
  const p: string[] = [];
  (f.faq ?? []).forEach((x, i) => { if (!x.q?.trim() || !x.a?.trim()) p.push(`FAQs, question ${i + 1}: needs both a question and an answer.`); });
  if (!f.contactTopics?.length) p.push('FAQs: add at least one contact form topic.');
  return p;
}

export function checkForms(f: AllSettings['forms']): string[] {
  return f.contactEndpoint && !/^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(f.contactEndpoint)
    ? ["Contact form: the Formspree link should look like 'https://formspree.io/f/abcdwxyz' or be left empty."]
    : [];
}

export function checkTheme(t: Theme): string[] {
  const p: string[] = [];
  for (const [name, value] of Object.entries(t.colours ?? {})) {
    if (!hex.test(value)) p.push(`Colours: ${name} must be a colour like #FFD43B.`);
  }
  if (!HEADING_FONTS.includes(t.fonts?.heading)) p.push('Fonts: pick a heading font from the list.');
  if (!BODY_FONTS.includes(t.fonts?.body)) p.push('Fonts: pick a body font from the list.');
  for (const [key, [min, max, label]] of Object.entries(SIZE_LIMITS)) {
    const v = (t.sizes as unknown as Record<string, number>)?.[key];
    if (typeof v !== 'number' || Number.isNaN(v) || v < min || v > max) p.push(`Fonts and sizes: ${label} must be between ${min} and ${max}.`);
  }
  if (typeof t.headingCapitals !== 'boolean') p.push('Fonts and sizes: headings in capitals must be on or off.');
  return p;
}

export function checkContent(c: Content): string[] {
  const p: string[] = [];
  (c.gallery?.tiles ?? []).forEach((tile, i) => {
    if (!['machine', 'card', 'pack'].includes(tile.picture)) p.push(`Page wording, gallery tile ${i + 1}: picture must be machine, card or pack.`);
  });
  return p;
}

export function checkNavigation(n: AllSettings['navigation']): string[] {
  const p: string[] = [];
  for (const [name, link] of Object.entries(n.links ?? {})) {
    if (!isLink(link)) p.push(`Menus and links: "${name}" must start with / or https://.`);
  }
  (n.headerMenu ?? []).forEach((item, i) => {
    if (!item.label?.trim()) p.push(`Menus and links: top menu item ${i + 1} has no label.`);
    if (!isLink(item.link)) p.push(`Menus and links: top menu "${item.label}" link must start with / or https://.`);
    if (!MENU_ICONS.includes(item.icon)) p.push(`Menus and links: top menu "${item.label}" needs one of the icons.`);
  });
  if ((n.headerMenu ?? []).length > 5) p.push("Menus and links: the top menu has more than 5 items, so it won't fit on a phone.");
  (n.footerMenu ?? []).forEach((col) => col.links.forEach((item) => {
    if (!isLink(item.link)) p.push(`Menus and links: footer "${col.heading}" → "${item.label}" must start with / or https://.`);
  }));
  return p;
}

export const checkers = {
  business: checkBusiness,
  machines: checkMachines,
  stock: checkStock,
  faq: checkFaq,
  forms: checkForms,
  theme: checkTheme,
  content: checkContent,
  navigation: checkNavigation,
} as const;

export function checkAll(s: AllSettings): string[] {
  return (Object.keys(checkers) as (keyof typeof checkers)[]).flatMap((k) => (checkers[k] as (v: unknown) => string[])(s[k]));
}
