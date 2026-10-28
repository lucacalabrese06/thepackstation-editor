// Shapes of the settings files (the .json files in this folder).
// The editor app reads and writes those files; you don't need to edit this one.

export type LaunchStatus = 'coming-soon' | 'live';
export type MachineStatus = 'live' | 'coming-soon';
export type IconName =
  | 'home' | 'locations' | 'gallery' | 'support' | 'check' | 'clock' | 'mail' | 'store'
  | 'arrow' | 'back' | 'pack' | 'box' | 'gift' | 'layers' | 'star' | 'card' | 'pin'
  | 'instagram' | 'tiktok' | 'facebook' | 'phone';

export interface Business {
  name: string;
  strapline: string;
  tagline: string;
  website: string;
  email: string;
  phone: string;
  supportHours: string;
  responseTime: string;
  social: { instagram: string; tiktok: string; facebook: string };
  launchStatus: LaunchStatus;
  launchMessage: string;
  launchWhen: string;
  logo: string; // '' = the built-in Pack Station icon, else e.g. '/images/site/logo.png'
}

export interface MenuItem {
  label: string;
  link: string;
  icon: IconName;
}

export interface FooterColumn {
  heading: string;
  links: { label: string; link: string }[];
}

export interface OpeningHours {
  days: string;
  times: string;
}

export interface Machine {
  code: string;
  status: MachineStatus;
  name: string;
  venue: string;
  town: string;
  postcode: string;
  hours: OpeningHours[];
  payment: string;
  photo?: string;
  mapLink?: string;
}

export interface StockItem {
  name: string;
  detail: string;
  tag: string;
  icon: IconName;
}

export interface Point {
  title: string;
  detail: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Colours {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  success: string;
  danger: string;
}

export type HeadingFont = 'Dela Gothic One' | 'Bebas Neue' | 'Bricolage Grotesque' | 'Fredoka' | 'Outfit';
export type BodyFont = 'Outfit' | 'DM Sans' | 'Nunito' | 'Bricolage Grotesque' | 'system-ui';

export interface Sizes {
  headline: number; // px, big headline at the top of pages (shrinks on phones)
  section: number; // px, section headings
  text: number; // px, paragraphs
  small: number; // px, small labels
  button: number; // px, button text
  buttonHeight: number; // px
  radius: number; // px, corner roundness
  lineHeight: number; // e.g. 1.6
  headingTracking: number; // % letter spacing on headings
}

export interface Theme {
  colours: Colours;
  fonts: { heading: HeadingFont; body: BodyFont };
  sizes: Sizes;
  headingCapitals: boolean;
}

export interface Content {
  homeBrowserTitle: string;
  footerNotice: string;
  launchBanner: { text: string; followButton: string };
  comingSoonPanel: { followButton: string; hostButton: string };
  home: Record<string, string>;
  locations: Record<string, string>;
  machinePage: Record<string, string>;
  gallery: { tiles: { picture: 'machine' | 'card' | 'pack'; title: string; caption: string; badge: string }[]; [key: string]: any };
  support: Record<string, string>;
  contactForm: Record<string, string>;
  thanks: Record<string, string>;
  notFound: Record<string, string>;
}
