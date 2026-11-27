/**
 * My profile (owner 26/11/26): a person may change their own name and move
 * their account to a new phone number. Pure rules, used by the API and the web.
 */
export const PERSON_NAME_MIN = 2;
export const PERSON_NAME_MAX = 80;

export type PersonNameCheck = { ok: true; name: string } | { ok: false; error: string };

/** A real-looking name: letters, spaces, apostrophes, dots and hyphens. */
export function cleanPersonName(raw: string | null | undefined): PersonNameCheck {
  const name = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (name.length < PERSON_NAME_MIN) return { ok: false, error: 'Write your name, at least 2 letters.' };
  if (name.length > PERSON_NAME_MAX) return { ok: false, error: `Keep your name under ${PERSON_NAME_MAX} letters.` };
  if (/(https?:|www\.|\.com\b)/i.test(name)) return { ok: false, error: 'Use your name, not a website.' };
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u.test(name)) {
    return { ok: false, error: 'Use letters only in your name, no numbers or signs.' };
  }
  return { ok: true, name };
}

/** Why a phone change is refused before any PIN is checked; null when it may go on. */
export function phoneChangeProblem(currentE164: string | null | undefined, nextE164: string | null | undefined): string | null {
  if (!nextE164) return 'Enter the full new phone number, for example 0712 345 678.';
  if (currentE164 && currentE164 === nextE164) return 'That is already your number.';
  return null;
}

/**
 * My email (owner 27/11/26): optional, for receipts, statements and replies to
 * buyers. Never used to sign in (phone + PIN stays). An empty box removes it.
 */
export type ContactEmailCheck = { ok: true; email: string | null } | { ok: false; error: string };

export function contactEmail(raw: string | null | undefined): ContactEmailCheck {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value) return { ok: true, email: null };
  if (value.length > 254 || !/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/.test(value)) {
    return { ok: false, error: 'Enter an email like name@gmail.com, or leave it empty.' };
  }
  if (value.endsWith('.invalid')) return { ok: false, error: 'Enter your own email address.' };
  return { ok: true, email: value };
}

/** "amina@gmail.com" → "am•••@gmail.com", so someone looking at the screen cannot read it. */
export function hideEmail(email: string | null | undefined): string {
  if (!email) return '—';
  const at = email.indexOf('@');
  if (at < 1) return email;
  return `${email.slice(0, Math.min(2, at))}•••${email.slice(at)}`;
}
