'use client';

/**
 * Advert written before having an account (owner 25/11/26, "lazy registration"):
 * a visitor writes the advert first; the account step comes only at Publish.
 * The text waits on this device until the account exists, then BusinessManager
 * publishes it. Storage can be blocked (private tabs): every access is guarded.
 */
export type PendingAdvert = {
  title: string;
  description: string;
  businessName: string;
  industryCode: string;
  role: string;
  county: string;
  savedAt: string;
};

const KEY = 'sfc.pendingAdvert';

export function readPendingAdvert(): PendingAdvert | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PendingAdvert>;
    return typeof value.title === 'string' && typeof value.description === 'string' ? (value as PendingAdvert) : null;
  } catch {
    return null;
  }
}

export function savePendingAdvert(advert: PendingAdvert): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(advert));
  } catch {
    // Kept in memory only for this page.
  }
}

export function clearPendingAdvert(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Why this advert can't be published yet, in plain words; null when it's ready. */
export function pendingAdvertProblem(a: Pick<PendingAdvert, 'title' | 'description' | 'businessName'>): string | null {
  if (a.title.trim().length < 2) return 'Say what you are selling or offering.';
  if (a.description.trim().length < 20) return 'Describe it in at least 20 characters, for example sizes, prices or where you deliver.';
  if (a.businessName.trim().length < 2) return 'Add your business name.';
  return null;
}
