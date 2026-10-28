// Loads what the Colours and Fonts pages need: the theme plus some real
// wording for the preview.
import type { AstroGlobal } from 'astro';
import { load } from './server';
import type { Content, Theme, Business } from '../settings/types';

export async function loadThemePage(Astro: AstroGlobal) {
  const [theme, content, business] = await Promise.all([load<Theme>(Astro, 'theme'), load<Content>(Astro, 'content'), load<Business>(Astro, 'business')]);
  if ('error' in theme) return { error: theme.error };
  const c = 'data' in content ? content.data : null;
  const b = 'data' in business ? business.data : null;
  const fillIn = (t: string) =>
    t.replace(/\{(\w+)\}/g, (m, k: string) => ({ businessName: b?.name, launchWhen: b?.launchWhen, launchMessage: b?.launchMessage })[k] ?? m);
  return {
    pageData: {
      data: theme.data,
      sha: theme.sha,
      words: {
        banner: fillIn(c?.launchBanner.text ?? 'Our first machines are on the way.'),
        headline: c?.home.headline ?? 'Sealed packs.',
        highlight: c?.home.headlineHighlight ?? 'No queues. No doubts.',
        intro: fillIn(c?.home.intro ?? ''),
        button: c?.home.findButton ?? 'Find a machine',
        button2: c?.home.galleryButton ?? 'See our machines',
        section: c?.home.stockHeading ?? "What you'll find in our machines",
      },
    },
  };
}
