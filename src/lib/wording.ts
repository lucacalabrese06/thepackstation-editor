// Friendly labels for every piece of wording in content.json, grouped into
// the tabs shown on the Page wording screen. "long" fields get a bigger box.
// A field not listed here still appears, with a label made from its name.

export interface WordingField {
  key: string;
  label: string;
  long?: boolean;
  hint?: string;
}

export interface WordingTab {
  id: string;
  label: string;
  path: string[]; // where the fields live in content.json ([] = top level)
  fields: WordingField[];
}

export const wordingTabs: WordingTab[] = [
  {
    id: 'home', label: 'Home', path: ['home'],
    fields: [
      { key: 'headline', label: 'Headline' },
      { key: 'headlineHighlight', label: 'Rainbow line under the headline' },
      { key: 'intro', label: 'Intro paragraph', long: true },
      { key: 'comingSoonBadge', label: 'Coming-soon badge' },
      { key: 'findButton', label: 'Main button' },
      { key: 'galleryButton', label: 'Second button (once live)' },
      { key: 'stockLabel', label: "Small label above \"What's inside\"" },
      { key: 'stockHeading', label: "What's inside: heading" },
      { key: 'stockIntro', label: "What's inside: intro", long: true },
      { key: 'stepsLabel', label: 'Small label above "How it works"' },
      { key: 'stepsHeading', label: 'How it works: heading' },
      { key: 'comingSoonHeading', label: 'Coming-soon panel: heading' },
      { key: 'comingSoonText', label: 'Coming-soon panel: text', long: true },
      { key: 'openNowHeading', label: 'Once live: heading', hint: '{count} becomes e.g. "3 machines".' },
      { key: 'openNowText', label: 'Once live: text' },
      { key: 'openNowButton', label: 'Once live: button' },
      { key: 'googleDescription', label: 'Description in Google results', long: true },
    ],
  },
  {
    id: 'locations', label: 'Locations', path: ['locations'],
    fields: [
      { key: 'heading', label: 'Heading' },
      { key: 'introNoMachines', label: 'Text while there are no machines', long: true },
      { key: 'introWithMachines', label: 'Text once machines are listed', long: true },
      { key: 'mapBadge', label: 'Map badge' },
      { key: 'mapHeading', label: 'Map message' },
      { key: 'areasHeading', label: 'Heading above towns we\'re talking to' },
      { key: 'statusOpen', label: 'Label for open machines' },
      { key: 'statusSoon', label: 'Label for announced machines' },
      { key: 'panelHeading', label: 'Bottom panel: heading' },
      { key: 'panelText', label: 'Bottom panel: text', long: true },
      { key: 'label', label: 'Small label above the heading' },
      { key: 'browserTitle', label: 'Browser tab title' },
      { key: 'googleDescription', label: 'Description in Google results', long: true },
    ],
  },
  {
    id: 'machinePage', label: 'Machine pages', path: ['machinePage'],
    fields: [
      { key: 'backLink', label: 'Back link' },
      { key: 'postcodeLabel', label: 'Postcode label' },
      { key: 'paymentLabel', label: 'Payment label' },
      { key: 'directionsButton', label: 'Directions button' },
      { key: 'reportButton', label: 'Report button' },
      { key: 'googleDescription', label: 'Description in Google results', long: true, hint: '{name} and {town} fill in for each machine.' },
    ],
  },
  {
    id: 'gallery', label: 'Gallery', path: ['gallery'],
    fields: [
      { key: 'heading', label: 'Heading' },
      { key: 'intro', label: 'Intro paragraph', long: true },
      { key: 'photoSoonBadge', label: 'Badge before photos are added' },
      { key: 'noPhotosNote', label: 'Note before photos are added' },
      { key: 'label', label: 'Small label above the heading' },
      { key: 'browserTitle', label: 'Browser tab title' },
      { key: 'googleDescription', label: 'Description in Google results', long: true },
    ],
  },
  {
    id: 'support', label: 'Support', path: ['support'],
    fields: [
      { key: 'heading', label: 'Heading' },
      { key: 'intro', label: 'Intro', long: true },
      { key: 'emailCardHeading', label: 'Email card: heading' },
      { key: 'phoneCardHeading', label: 'Phone card: heading' },
      { key: 'phoneCardText', label: 'Phone card: text' },
      { key: 'hoursCardHeading', label: 'Reply-times card: heading' },
      { key: 'hoursCardText', label: 'Reply-times card: text' },
      { key: 'hostCardHeading', label: 'Host card: heading' },
      { key: 'hostCardText', label: 'Host card: text' },
      { key: 'faqHeading', label: 'FAQ heading' },
      { key: 'label', label: 'Small label above the heading' },
      { key: 'browserTitle', label: 'Browser tab title' },
      { key: 'googleDescription', label: 'Description in Google results', long: true },
    ],
  },
  {
    id: 'contactForm', label: 'Contact form', path: ['contactForm'],
    fields: [
      { key: 'heading', label: 'Heading' },
      { key: 'nameLabel', label: 'Name label' },
      { key: 'emailLabel', label: 'Email label' },
      { key: 'topicLabel', label: 'Topic label' },
      { key: 'machineLabel', label: 'Machine code label' },
      { key: 'messageLabel', label: 'Message label' },
      { key: 'sendButton', label: 'Send button' },
      { key: 'sendingButton', label: 'Button while sending' },
      { key: 'note', label: 'Note under the button' },
      { key: 'errorMessage', label: 'Message if sending fails', long: true },
    ],
  },
  {
    id: 'thanks', label: 'Message sent', path: ['thanks'],
    fields: [
      { key: 'heading', label: 'Heading' },
      { key: 'text', label: 'Text', long: true },
      { key: 'extra', label: 'Line before the email address' },
      { key: 'supportButton', label: 'Support button' },
      { key: 'homeButton', label: 'Home button' },
      { key: 'browserTitle', label: 'Browser tab title' },
    ],
  },
  {
    id: 'notFound', label: 'Page not found', path: ['notFound'],
    fields: [
      { key: 'heading', label: 'Heading' },
      { key: 'text', label: 'Text' },
      { key: 'homeButton', label: 'Home button' },
      { key: 'supportButton', label: 'Support button' },
      { key: 'browserTitle', label: 'Browser tab title' },
    ],
  },
  {
    id: 'banner', label: 'Banner', path: ['launchBanner'],
    fields: [
      { key: 'text', label: 'Yellow banner text (while coming soon)' },
      { key: 'followButton', label: 'Banner link' },
    ],
  },
  {
    id: 'panel', label: 'Coming-soon panel buttons', path: ['comingSoonPanel'],
    fields: [
      { key: 'followButton', label: 'Follow button' },
      { key: 'hostButton', label: 'Host button' },
    ],
  },
  {
    id: 'footer', label: 'Footer and titles', path: [],
    fields: [
      { key: 'footerNotice', label: 'Trademark line in the footer', long: true, hint: 'Leave empty to hide it. We recommend keeping it.' },
      { key: 'homeBrowserTitle', label: 'Browser tab title on the home page' },
    ],
  },
];

export const humanise = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
