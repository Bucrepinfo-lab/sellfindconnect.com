/**
 * Where people can share a link (owner 26/11/26: 'the most popular tools …
 * so our share has a niche of marketing'). Ordered by what Kenyans use most:
 * WhatsApp and Facebook lead, then TikTok/YouTube/Instagram (no web share
 * address: the panel copies the link or opens the phone's own share sheet),
 * then X, Telegram, LinkedIn, SMS and email (Media Council of Kenya 2026,
 * Communications Authority, GeoPoll 2025).
 *
 * A PRIVATE link (someone's own policies, conversation or receipt) is only
 * offered on one-to-one channels: never posted to Facebook, X or LinkedIn.
 * Pure and framework-free; nothing is sent until the person taps.
 */
export type ShareChannel = 'whatsapp' | 'facebook' | 'x' | 'telegram' | 'linkedin' | 'sms' | 'email';

export interface ShareTarget {
  id: ShareChannel;
  label: string;
  href: string;
  /** Brand colour for the button background (text is white). */
  color: string;
}

export interface ShareInput {
  /** The message; the link is added after it (not repeated if already inside). */
  text: string;
  url: string;
  /** Email subject; defaults to the first line of the text. */
  title?: string;
}

const PUBLIC_ORDER: ShareChannel[] = ['whatsapp', 'facebook', 'x', 'telegram', 'linkedin', 'sms', 'email'];
const PRIVATE_ORDER: ShareChannel[] = ['whatsapp', 'sms', 'email'];

const LABEL: Record<ShareChannel, string> = {
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  x: 'X (Twitter)',
  telegram: 'Telegram',
  linkedin: 'LinkedIn',
  sms: 'SMS',
  email: 'Email',
};

const COLOR: Record<ShareChannel, string> = {
  whatsapp: '#1FA855',
  facebook: '#1877F2',
  x: '#111111',
  telegram: '#229ED9',
  linkedin: '#0A66C2',
  sms: '#4B5563',
  email: '#6B4E16',
};

/** The message with the link on the end (once). */
export function shareMessage(input: ShareInput): string {
  const text = input.text.trim();
  if (!input.url || text.includes(input.url)) return text;
  return text ? `${text} ${input.url}` : input.url;
}

export function shareTargets(input: ShareInput, options: { privateLink?: boolean } = {}): ShareTarget[] {
  const e = encodeURIComponent;
  const message = shareMessage(input);
  const bare = input.text.trim().split(input.url).join('').trim();
  const subject = (input.title ?? input.text.split('\n')[0] ?? '').trim().slice(0, 120);
  const href: Record<ShareChannel, string> = {
    whatsapp: `https://wa.me/?text=${e(message)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${e(input.url)}`,
    x: `https://x.com/intent/post?text=${e(bare)}&url=${e(input.url)}`,
    telegram: `https://t.me/share/url?url=${e(input.url)}&text=${e(bare)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${e(input.url)}`,
    sms: `sms:?&body=${e(message)}`,
    email: `mailto:?subject=${e(subject)}&body=${e(message)}`,
  };
  const order = options.privateLink ? PRIVATE_ORDER : PUBLIC_ORDER;
  return order.map((id) => ({ id, label: LABEL[id], href: href[id], color: COLOR[id] }));
}

/** What to tell someone after copying, so TikTok, Instagram and YouTube are covered too. */
export const COPIED_HINT = 'Link copied. Paste it into TikTok, Instagram, YouTube or any chat.';
