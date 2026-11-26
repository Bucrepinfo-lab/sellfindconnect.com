import { describe, expect, it } from 'vitest';
import { shareMessage, shareTargets } from './share-targets';

/** Owner 26/11/26: share where Kenyans actually are; private links stay one-to-one. */
describe('shareTargets', () => {
  const input = { text: 'Fresh maize in Nakuru', url: 'https://example.com/l/1' };

  it('leads with WhatsApp and Facebook, then X, Telegram, LinkedIn, SMS, email', () => {
    expect(shareTargets(input).map((t) => t.id)).toEqual(['whatsapp', 'facebook', 'x', 'telegram', 'linkedin', 'sms', 'email']);
  });

  it('builds working share addresses with the link encoded', () => {
    const by = Object.fromEntries(shareTargets(input).map((t) => [t.id, t.href]));
    expect(by.whatsapp).toBe('https://wa.me/?text=Fresh%20maize%20in%20Nakuru%20https%3A%2F%2Fexample.com%2Fl%2F1');
    expect(by.facebook).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2Fl%2F1');
    expect(by.x).toContain('https://x.com/intent/post?text=Fresh%20maize%20in%20Nakuru&url=https%3A%2F%2Fexample.com%2Fl%2F1');
    expect(by.telegram).toContain('https://t.me/share/url?url=https%3A%2F%2Fexample.com%2Fl%2F1');
    expect(by.linkedin).toContain('linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Fl%2F1');
    expect(by.sms!.startsWith('sms:?&body=')).toBe(true);
    expect(by.email!.startsWith('mailto:?subject=Fresh%20maize%20in%20Nakuru&body=')).toBe(true);
  });

  it('never posts a private link to Facebook, X or LinkedIn', () => {
    const ids = shareTargets(input, { privateLink: true }).map((t) => t.id);
    expect(ids).toEqual(['whatsapp', 'sms', 'email']);
  });

  it('does not repeat a link already inside the text', () => {
    expect(shareMessage({ text: 'See https://example.com/l/1 now', url: 'https://example.com/l/1' })).toBe('See https://example.com/l/1 now');
    const x = shareTargets({ text: 'See https://example.com/l/1', url: 'https://example.com/l/1' }).find((t) => t.id === 'x')!;
    expect(decodeURIComponent(x.href.split('text=')[1]!.split('&url=')[0]!)).toBe('See');
  });
});
