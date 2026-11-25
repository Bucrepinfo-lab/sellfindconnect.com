'use client';

import { ApiError, apiRequest } from './api-client';
import type { PendingAdvert } from './pending-advert';

type LiveProfile = {
  displayName: string;
  industryCode: string;
  role: string;
  countryCode: string;
  phone?: string;
  email?: string;
  website?: string;
};

/**
 * Publish an advert written before sign-up (owner 25/11/26). If the business
 * has no live profile yet, a simple one is made from what the person already
 * typed (name, industry, role, county, what they offer), so they never meet
 * "publish your profile first". Returns a message for the screen.
 */
export async function publishPendingAdvert(advert: PendingAdvert): Promise<string> {
  let profile = await apiRequest<LiveProfile>('/profiles/published/live').catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });

  if (!profile) {
    const draft = await apiRequest<{ id: string; status: string }>('/profiles/drafts', {
      method: 'POST',
      body: {
        displayName: advert.businessName.trim(),
        industryCode: advert.industryCode,
        role: advert.role,
        countryCode: 'KE',
        description: `${advert.title.trim()}. ${advert.description.trim()}`.slice(0, 1000),
        ...(advert.county ? { serviceArea: { county: advert.county } } : {}),
      },
    });
    if (draft.status === 'PENDING_REVIEW') {
      return 'Your business needs a quick check by our team. Your advert is saved and goes live as soon as it is approved.';
    }
    await apiRequest(`/profiles/drafts/${draft.id}/publish`, { method: 'POST', body: { acceptedTerms: true } });
    profile = await apiRequest<LiveProfile>('/profiles/published/live');
  }

  const saved = await apiRequest<{ id: string }>('/adverts/drafts', {
    method: 'POST',
    body: {
      displayName: profile.displayName,
      industryCode: profile.industryCode,
      role: profile.role,
      countryCode: profile.countryCode,
      ...(profile.phone ? { phone: profile.phone } : {}),
      ...(profile.email ? { email: profile.email } : {}),
      ...(profile.website ? { website: profile.website } : {}),
      title: advert.title.trim(),
      description: advert.description.trim(),
    },
  });
  await apiRequest(`/adverts/drafts/${saved.id}/publish`, { method: 'POST', body: { acceptedTerms: true } });
  return 'Your advert is live. Buyers can find it in search now.';
}
