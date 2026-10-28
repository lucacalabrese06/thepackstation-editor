// ─────────────────────────────────────────────────────────────
//  EDITOR SETTINGS
//  Which website this editor changes, and who may use it.
//  Secrets (GitHub App keys, session secret) are NOT kept here:
//  they are set in Cloudflare. See README.md → Setup.
// ─────────────────────────────────────────────────────────────

export const editor = {
  // The website's GitHub repository.
  owner: 'lucacalabrese06',
  repo: 'thepackstation-site',

  // Saves go to the preview branch. Publish merges it into the live branch.
  previewBranch: 'development',
  liveBranch: 'master',

  // Shown as "Open the preview" and "View the website".
  previewUrl: 'https://dev.thepackstation.co.uk',
  liveUrl: 'https://thepackstation.co.uk',

  // GitHub usernames allowed to sign in. Leave empty to allow anyone who
  // can write to the website repository on GitHub.
  allowedUsers: [] as string[],

  // How long a sign-in lasts before asking again.
  sessionHours: 8,
};

// The settings files the editor may change, and where they live.
export const settingsFiles = {
  business: 'src/settings/business.json',
  content: 'src/settings/content.json',
  navigation: 'src/settings/navigation.json',
  machines: 'src/settings/machines.json',
  stock: 'src/settings/stock.json',
  faq: 'src/settings/faq.json',
  forms: 'src/settings/forms.json',
  theme: 'src/settings/theme.json',
} as const;

export type SettingsFile = keyof typeof settingsFiles;

// Where uploaded images go in the website repository.
export const imageFolders = {
  logo: 'public/images/site',
  machine: 'public/images/machines',
} as const;
