'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  countries,
  evaluateSafetyFields,
  findKenyaConstituency,
  findKenyaCounty,
  industryCategories,
  isSameAdvertText,
  kenyaCounties,
  kenyaLandmarksInCounty,
  uniqueAdvertDrafts,
  supplyChainRoles,
  type AdvertDraft,
  type AdvertPost,
  type ProfileDraft,
  type PublishedProfile,
} from '@telpen/domain';

import { ApiError, apiRequest, isTermsError } from '../lib/api-client';
import { formatDmy } from '../lib/dates';
import { advertStatusLabel, codeLabel, industryLabel } from '../lib/labels';
import { publicApiBaseUrl, readTenantSession } from '../lib/public-api';
import '../styles/business.css';

type MediaItem = {
  id: string;
  caption?: string;
  sourceUrl: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
  review?: { status: string; message: string; canPublish: boolean };
};

type LiveProfile = PublishedProfile & { media?: MediaItem[] };
type LiveAdvert = AdvertPost & { daysRemaining?: number };

type ProfileForm = {
  displayName: string;
  industryCode: string;
  role: string;
  description: string;
  countryCode: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  physicalAddress: string;
  primaryCity: string;
  regions: string;
  remoteAvailable: boolean;
  county: string;
  constituency: string;
  ward: string;
  landmark: string;
};

type AdvertForm = {
  id?: string;
  title: string;
  description: string;
  /** The live advert this edit replaces. */
  replacesAdvertId?: string;
  /** Old draft with no server link (made before 07/11/26): send replacesAdvertId on publish. */
  legacyReplace?: boolean;
};

type Notice = { tone: 'ok' | 'warn' | 'error'; text: string; terms?: boolean } | null;

const EDITABLE_PROFILE = new Set(['DRAFT', 'PENDING_REVIEW', 'REJECTED']);

/**
 * Fallback for edit drafts made before drafts carried sourceAdvertId: this
 * device's memory of which live advert an open edit draft replaces.
 */
const REPLACES_KEY = 'sfc:advert-edit-replaces';

function readReplaces(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(REPLACES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function rememberReplaces(draftId: string, advertId: string | undefined) {
  try {
    const next = readReplaces();
    if (advertId) next[draftId] = advertId;
    else delete next[draftId];
    window.localStorage.setItem(REPLACES_KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked (private mode); the edit still works this session.
  }
}

const emptyProfile: ProfileForm = {
  displayName: '',
  industryCode: '',
  role: 'SUPPLIER',
  description: '',
  countryCode: 'KE',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  physicalAddress: '',
  primaryCity: '',
  regions: '',
  remoteAvailable: false,
  county: '',
  constituency: '',
  ward: '',
  landmark: '',
};

function profileToForm(source: ProfileDraft | PublishedProfile): ProfileForm {
  return {
    displayName: source.displayName ?? '',
    industryCode: source.industryCode ?? '',
    role: source.role ?? 'SUPPLIER',
    description: source.description ?? '',
    countryCode: source.countryCode ?? 'KE',
    phone: source.phone ?? '',
    whatsapp: source.whatsapp ?? '',
    email: source.email ?? '',
    website: source.website ?? '',
    physicalAddress: source.physicalAddress ?? '',
    primaryCity: source.serviceArea?.primaryCity ?? '',
    regions: (source.serviceArea?.regions ?? []).join(', '),
    remoteAvailable: Boolean(source.serviceArea?.remoteAvailable),
    county: source.serviceArea?.county ?? '',
    constituency: source.serviceArea?.constituency ?? '',
    ward: source.serviceArea?.ward ?? '',
    landmark: source.serviceArea?.landmark ?? '',
  };
}

function withHttps(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Only filled fields are sent: the API rejects empty strings for email, URLs and lengths. */
function profilePayload(form: ProfileForm) {
  const regions = form.regions
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 20);
  const serviceArea = {
    ...(form.primaryCity.trim().length >= 2 ? { primaryCity: form.primaryCity.trim() } : {}),
    ...(regions.length ? { regions } : {}),
    ...(form.remoteAvailable ? { remoteAvailable: true } : {}),
    ...(form.county ? { county: form.county } : {}),
    ...(form.county && form.constituency ? { constituency: form.constituency } : {}),
    ...(form.county && form.constituency && form.ward ? { ward: form.ward } : {}),
    ...(form.landmark.trim().length >= 2 ? { landmark: form.landmark.trim().slice(0, 120) } : {}),
  };
  const optional: Record<string, string> = {
    phone: form.phone.trim(),
    whatsapp: form.whatsapp.trim(),
    email: form.email.trim(),
    website: withHttps(form.website),
    physicalAddress: form.physicalAddress.trim(),
  };
  return {
    displayName: form.displayName.trim(),
    industryCode: form.industryCode,
    role: form.role,
    description: form.description.trim(),
    countryCode: form.countryCode,
    ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value)),
    ...(Object.keys(serviceArea).length ? { serviceArea } : {}),
  };
}

function profileProblem(form: ProfileForm): string | null {
  if (form.displayName.trim().length < 2) return 'Add your business name.';
  if (!form.industryCode) return 'Choose your industry.';
  if (form.description.trim().length < 20) return 'Describe your business in at least 20 characters.';
  if (!evaluateSafetyFields(profilePayload(form)).allowed) {
    return 'This text matches something SellFindConnect never allows. Remove it and try again.';
  }
  return null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}

type BusinessData = {
  live: LiveProfile | null;
  editable: ProfileDraft | null;
  draftMedia: MediaItem[];
  advertDrafts: AdvertDraft[];
  adverts: LiveAdvert[];
};

async function fetchBusiness(): Promise<BusinessData> {
  const [drafts, live, aDrafts, aLive] = await Promise.all([
    apiRequest<ProfileDraft[]>('/profiles/drafts'),
    apiRequest<LiveProfile>('/profiles/published/live').catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }),
    apiRequest<AdvertDraft[]>('/adverts/drafts'),
    apiRequest<LiveAdvert[]>('/adverts'),
  ]);
  const editable = drafts.find((draft) => EDITABLE_PROFILE.has(draft.status)) ?? null;
  const draftMedia = editable
    ? await apiRequest<MediaItem[]>(`/profiles/drafts/${editable.id}/media`).catch(() => [])
    : [];
  return {
    live,
    editable,
    draftMedia,
    advertDrafts: uniqueAdvertDrafts(aDrafts.filter((draft) => draft.status === 'DRAFT')),
    adverts: aLive,
  };
}

export function BusinessManager() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [liveProfile, setLiveProfile] = useState<LiveProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfile);
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftMedia, setDraftMedia] = useState<MediaItem[]>([]);
  const [advertDrafts, setAdvertDrafts] = useState<AdvertDraft[]>([]);
  const [adverts, setAdverts] = useState<LiveAdvert[]>([]);
  const [advertForm, setAdvertForm] = useState<AdvertForm | null>(null);

  const apply = useCallback((data: BusinessData) => {
    setLiveProfile(data.live);
    setProfileDraft(data.editable);
    setProfileForm(data.editable ? profileToForm(data.editable) : data.live ? profileToForm(data.live) : emptyProfile);
    setEditingProfile(!data.live || Boolean(data.editable));
    setDraftMedia(data.draftMedia);
    setAdvertDrafts(data.advertDrafts);
    setAdverts(data.adverts);
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    apply(await fetchBusiness());
  }, [apply]);

  useEffect(() => {
    // Initial load; state is only set in the promise callbacks.
    let cancelled = false;
    fetchBusiness()
      .then((data) => {
        if (!cancelled) apply(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNotice({ tone: 'error', text: errorText(error) });
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const run = async (label: string, action: () => Promise<string | void>) => {
    setBusy(label);
    setNotice(null);
    try {
      const done = await action();
      await load();
      if (done) setNotice({ tone: 'ok', text: done });
    } catch (error) {
      setNotice({ tone: 'error', text: errorText(error), terms: isTermsError(error) });
    } finally {
      setBusy('');
    }
  };

  const acceptTerms = () =>
    run('terms', async () => {
      const { sessionToken } = readTenantSession();
      await apiRequest('/auth/terms/accept', {
        method: 'POST',
        auth: false,
        body: { sessionToken, acceptedTerms: true },
      });
      return 'Thanks. You have accepted the current terms. Try again now.';
    });

  const saveProfileDraft = async (): Promise<ProfileDraft> => {
    const problem = profileProblem(profileForm);
    if (problem) throw new Error(problem);
    const payload = profilePayload(profileForm);
    return profileDraft
      ? apiRequest<ProfileDraft>(`/profiles/drafts/${profileDraft.id}`, { method: 'PATCH', body: payload })
      : apiRequest<ProfileDraft>('/profiles/drafts', { method: 'POST', body: payload });
  };

  const saveProfile = () =>
    run('save-profile', async () => {
      const saved = await saveProfileDraft();
      return saved.status === 'PENDING_REVIEW'
        ? 'Saved. This change needs a quick check by our team before it can go live.'
        : 'Saved as a draft. Publish it when you are ready.';
    });

  const publishProfile = () =>
    run('publish-profile', async () => {
      const saved = await saveProfileDraft();
      if (saved.status === 'PENDING_REVIEW') {
        return 'Saved. This change needs a quick check by our team before it can go live.';
      }
      await apiRequest(`/profiles/drafts/${saved.id}/publish`, {
        method: 'POST',
        body: { acceptedTerms: true },
      });
      return 'Your business profile is live.';
    });

  const uploadLogo = (file: File) =>
    run('logo', async () => {
      const draft = profileDraft ?? (await saveProfileDraft());
      const meta = { fileName: file.name.slice(0, 120) || 'logo', mimeType: file.type || 'image/jpeg', fileSizeBytes: file.size };
      const { upload } = await apiRequest<{
        upload: { provider: string; uploadUrl: string; publicUrl: string; objectKey: string; requiredHeaders: Record<string, string> };
      }>(`/profiles/drafts/${draft.id}/media/uploads/prepare`, { method: 'POST', body: meta });
      if (upload.provider.startsWith('development')) {
        throw new Error('Photo uploads are not switched on yet. Your profile works without a logo.');
      }
      const put = await fetch(upload.uploadUrl, { method: 'PUT', headers: upload.requiredHeaders, body: file }).catch(
        () => null,
      );
      if (!put?.ok) throw new Error('The logo could not be uploaded. Try a smaller JPG or PNG.');
      const added = await apiRequest<{ media: MediaItem }>(`/profiles/drafts/${draft.id}/media`, {
        method: 'POST',
        body: {
          ...meta,
          sourceUrl: upload.publicUrl,
          storageProvider: upload.provider,
          objectKey: upload.objectKey,
          caption: 'Logo',
          altText: `${profileForm.displayName.trim() || 'Business'} logo`.slice(0, 160),
          visibility: 'PUBLIC',
        },
      });
      return added.media.review?.canPublish
        ? 'Logo added. Publish your profile to show it.'
        : 'Logo added. It shows once our team has checked it. Publish your profile as normal.';
    });

  const advertBase = () => {
    const source = liveProfile;
    if (!source) return null;
    return {
      displayName: source.displayName,
      industryCode: source.industryCode,
      role: source.role,
      countryCode: source.countryCode,
      ...(source.phone ? { phone: source.phone } : {}),
      ...(source.email ? { email: source.email } : {}),
      ...(source.website ? { website: source.website } : {}),
    };
  };

  const saveAdvertDraft = async (form: AdvertForm): Promise<AdvertDraft> => {
    const base = advertBase();
    if (!base) throw new Error('Publish your business profile first.');
    if (form.title.trim().length < 2) throw new Error('Give your advert a title.');
    if (form.description.trim().length < 20) throw new Error('Describe what you offer in at least 20 characters.');
    const body = { ...base, title: form.title.trim(), description: form.description.trim() };
    if (!evaluateSafetyFields(body).allowed) {
      throw new Error('This text matches something SellFindConnect never allows. Remove it and try again.');
    }
    return form.id
      ? apiRequest<AdvertDraft>(`/adverts/drafts/${form.id}`, { method: 'PATCH', body: { title: body.title, description: body.description } })
      : apiRequest<AdvertDraft>('/adverts/drafts', { method: 'POST', body });
  };

  const saveAdvert = () =>
    run('save-advert', async () => {
      if (!advertForm) return;
      const saved = await saveAdvertDraft(advertForm);
      setAdvertForm({ ...advertForm, id: saved.id });
      return 'Advert saved as a draft.';
    });

  const publishAdvert = () =>
    run('publish-advert', async () => {
      if (!advertForm) return;
      const saved = await saveAdvertDraft(advertForm);
      setAdvertForm({ ...advertForm, id: saved.id });
      // The server archives the replaced advert in the same call (and refuses one
      // that is not ours), so an edit never leaves the listing showing twice.
      await apiRequest(`/adverts/drafts/${saved.id}/publish`, {
        method: 'POST',
        body: {
          acceptedTerms: true,
          // New drafts are linked on the server (sourceAdvertId); only old ones send the id.
          ...(advertForm.legacyReplace && advertForm.replacesAdvertId
            ? { replacesAdvertId: advertForm.replacesAdvertId }
            : {}),
        },
      });
      rememberReplaces(saved.id, undefined);
      setAdvertForm(null);
      return 'Your advert is live. Buyers can now find it in search.';
    });

  const editLiveAdvert = (advert: LiveAdvert) =>
    run('edit-advert', async () => {
      // An old unlinked copy kept on this device is reused as before.
      const replaces = readReplaces();
      const legacy = advertDrafts.find(
        (draft) => !draft.sourceAdvertId && (replaces[draft.id] === advert.id || isSameAdvertText(draft, advert)),
      );
      if (legacy) {
        rememberReplaces(legacy.id, advert.id);
        setAdvertForm({
          id: legacy.id,
          title: legacy.title,
          description: legacy.description,
          replacesAdvertId: advert.id,
          legacyReplace: true,
        });
        return 'Make your changes, then publish to replace the live advert.';
      }
      // The server returns the open edit draft for this advert (from any device),
      // or makes one linked to it.
      const draft = await apiRequest<AdvertDraft>(`/adverts/${advert.id}/edit`, { method: 'POST', body: {} });
      setAdvertForm({
        id: draft.id,
        title: draft.title,
        description: draft.description,
        replacesAdvertId: advert.id,
      });
      return 'Make your changes, then publish to replace the live advert.';
    });

  const continueDraft = (draft: AdvertDraft) => {
    if (draft.sourceAdvertId) {
      setAdvertForm({
        id: draft.id,
        title: draft.title,
        description: draft.description,
        replacesAdvertId: draft.sourceAdvertId,
      });
      return;
    }
    const replacesAdvertId = readReplaces()[draft.id];
    const stillLive = replacesAdvertId && adverts.some((advert) => advert.id === replacesAdvertId);
    setAdvertForm({
      id: draft.id,
      title: draft.title,
      description: draft.description,
      ...(stillLive ? { replacesAdvertId, legacyReplace: true } : {}),
    });
  };

  const pauseAdvert = (advert: LiveAdvert) =>
    run('pause', async () => {
      await apiRequest(`/adverts/${advert.id}/pause`, { method: 'POST' });
      return 'Advert unpublished. It no longer shows in search.';
    });

  const republishAdvert = (advert: LiveAdvert) =>
    run('renew', async () => {
      await apiRequest(`/adverts/${advert.id}/renew`, { method: 'POST', body: { acceptedTerms: true } });
      return 'Advert published again.';
    });

  const deleteAdvert = (advert: LiveAdvert) => {
    if (!window.confirm(`Delete "${advert.title}"? This cannot be undone.`)) return;
    void run('delete', async () => {
      await apiRequest(`/adverts/${advert.id}/archive`, { method: 'POST' });
      return 'Advert deleted.';
    });
  };

  const forgetDevices = () =>
    run('devices', async () => {
      const { sessionToken } = readTenantSession();
      const response = await fetch(`${publicApiBaseUrl.replace(/\/$/, '')}/auth/phone/devices/revoke`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      }).catch(() => null);
      if (!response?.ok) throw new Error('Could not remove trusted devices. Try again.');
      return 'Trusted devices removed. Next time, sign in with an SMS code.';
    });

  if (loading) {
    return (
      <section className="biz" id="business" aria-busy="true">
        <div className="biz-card">
          <p className="biz-sub">Loading your business…</p>
        </div>
      </section>
    );
  }

  const logo = [...draftMedia, ...(liveProfile?.media ?? [])].find((item) => item.caption === 'Logo');
  const logoUrl = logo?.review?.canPublish ? (logo.thumbnailUrl ?? logo.cdnUrl ?? logo.sourceUrl) : undefined;
  const set = (key: keyof ProfileForm) => (event: { target: { value: string } }) =>
    setProfileForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <section className="biz" id="business" aria-label="Your business">
      {notice ? (
        <div className={`biz-note ${notice.tone === 'ok' ? '' : notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
          {notice.terms ? (
            <div className="biz-actions">
              <button className="primary-button" type="button" disabled={busy === 'terms'} onClick={() => void acceptTerms()}>
                Accept current terms
              </button>
              <Link className="secondary-button" href="/terms">
                Read the terms
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="biz-card">
        <div className="biz-actions" style={{ marginTop: 0, justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Business profile</h2>
            {liveProfile ? (
              <span className="biz-pill">Live since {formatDmy(liveProfile.publishedAt)}</span>
            ) : (
              <span className="biz-pill muted">Not published yet</span>
            )}{' '}
            {profileDraft?.status === 'PENDING_REVIEW' ? <span className="biz-pill muted">Change waiting for review</span> : null}
            {profileDraft?.status === 'REJECTED' ? <span className="biz-pill muted">Change not approved – edit and try again</span> : null}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoUrl ? <img className="biz-logo" src={logoUrl} alt={`${profileForm.displayName} logo`} /> : null}
        </div>

        {!liveProfile && !profileDraft ? (
          <p className="biz-sub">
            Start here. Tell buyers who you are and what you do. Once your profile is live you can publish adverts that
            appear in search.
          </p>
        ) : null}

        {liveProfile && !editingProfile ? (
          <>
            <p className="biz-sub">
              <strong>{liveProfile.displayName}</strong> · {codeLabel(liveProfile.role)} · {industryLabel(liveProfile.industryCode)}
            </p>
            <p className="biz-sub">{liveProfile.description}</p>
            <div className="biz-actions">
              <button className="secondary-button" type="button" onClick={() => setEditingProfile(true)}>
                Edit profile
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void publishProfile();
            }}
          >
            <div className="biz-grid two">
              <label className="biz-field">
                <span>Business name</span>
                <input value={profileForm.displayName} onChange={set('displayName')} maxLength={120} required autoComplete="organization" />
              </label>
              <label className="biz-field">
                <span>Industry</span>
                <select value={profileForm.industryCode} onChange={set('industryCode')} required>
                  <option value="">Choose…</option>
                  {industryCategories.map((industry) => (
                    <option key={industry.code} value={industry.code}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="biz-field">
                <span>Your place in the supply chain</span>
                <select value={profileForm.role} onChange={set('role')}>
                  {supplyChainRoles.map((role) => (
                    <option key={role} value={role}>
                      {codeLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="biz-field">
                <span>Country</span>
                <select value={profileForm.countryCode} onChange={set('countryCode')}>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="biz-field" style={{ marginTop: 10 }}>
              <span>What you do (at least 20 characters)</span>
              <textarea value={profileForm.description} onChange={set('description')} maxLength={2000} required />
            </label>
            <h3>Contacts</h3>
            <div className="biz-grid two">
              <label className="biz-field">
                <span>Phone</span>
                <input value={profileForm.phone} onChange={set('phone')} inputMode="tel" maxLength={40} autoComplete="tel" />
              </label>
              <label className="biz-field">
                <span>WhatsApp</span>
                <input value={profileForm.whatsapp} onChange={set('whatsapp')} inputMode="tel" maxLength={40} />
              </label>
              <label className="biz-field">
                <span>Email</span>
                <input value={profileForm.email} onChange={set('email')} type="email" autoComplete="email" />
              </label>
              <label className="biz-field">
                <span>Website</span>
                <input value={profileForm.website} onChange={set('website')} inputMode="url" placeholder="example.co.ke" />
              </label>
            </div>
            <h3>Where buyers find you</h3>
            <p className="biz-sub">Buyers who search your county, constituency or ward will see your business.</p>
            <div className="biz-grid two">
              <label className="biz-field">
                <span>County</span>
                <select
                  value={profileForm.county}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, county: event.target.value, constituency: '', ward: '' }))
                  }
                >
                  <option value="">Choose your county</option>
                  {kenyaCounties
                    .slice()
                    .sort((left, right) => left.name.localeCompare(right.name))
                    .map((item) => (
                      <option key={item.code} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="biz-field">
                <span>Constituency</span>
                <select
                  value={profileForm.constituency}
                  disabled={!profileForm.county}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, constituency: event.target.value, ward: '' }))
                  }
                >
                  <option value="">{profileForm.county ? 'Choose your constituency' : 'Choose a county first'}</option>
                  {(findKenyaCounty(profileForm.county)?.constituencies ?? []).map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="biz-field">
                <span>Ward</span>
                <select value={profileForm.ward} disabled={!profileForm.constituency} onChange={set('ward')}>
                  <option value="">{profileForm.constituency ? 'Choose your ward' : 'Choose a constituency first'}</option>
                  {(findKenyaConstituency(profileForm.county, profileForm.constituency)?.wards ?? []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="biz-field">
                <span>Nearest market, mall or landmark</span>
                <input
                  value={profileForm.landmark}
                  onChange={set('landmark')}
                  maxLength={120}
                  list="landmark-options"
                  placeholder="e.g. Kongowea Market"
                />
                <datalist id="landmark-options">
                  {kenyaLandmarksInCounty(profileForm.county).map((item) => (
                    <option key={item.name} value={item.name} />
                  ))}
                </datalist>
              </label>
            </div>
            <h3>Where you serve</h3>
            <div className="biz-grid two">
              <label className="biz-field">
                <span>Main town or city</span>
                <input value={profileForm.primaryCity} onChange={set('primaryCity')} maxLength={80} />
              </label>
              <label className="biz-field">
                <span>Other areas (comma separated)</span>
                <input value={profileForm.regions} onChange={set('regions')} placeholder="Kiambu, Machakos" />
              </label>
              <label className="biz-field">
                <span>Physical address</span>
                <input value={profileForm.physicalAddress} onChange={set('physicalAddress')} maxLength={500} />
              </label>
              <label className="biz-check">
                <input
                  type="checkbox"
                  checked={profileForm.remoteAvailable}
                  onChange={(event) => setProfileForm((current) => ({ ...current, remoteAvailable: event.target.checked }))}
                />
                <span>We also serve customers remotely</span>
              </label>
            </div>
            <h3>Logo</h3>
            <label className="biz-field">
              <span>JPG or PNG, up to a few MB. It is checked before it shows publicly.</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={Boolean(busy)}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void uploadLogo(file);
                }}
              />
            </label>
            <p className="biz-sub" style={{ marginTop: 10 }}>
              Publishing confirms you accept the current <Link href="/terms">Terms</Link> and{' '}
              <Link href="/community">Community standards</Link>.
            </p>
            <div className="biz-actions">
              <button className="primary-button" type="submit" disabled={Boolean(busy)}>
                {busy === 'publish-profile' ? 'Publishing…' : liveProfile ? 'Publish changes' : 'Publish profile'}
              </button>
              <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void saveProfile()}>
                {busy === 'save-profile' ? 'Saving…' : 'Save draft'}
              </button>
              {liveProfile ? (
                <button className="secondary-button" type="button" onClick={() => setEditingProfile(false)}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        )}
      </div>

      <div className="biz-card" id="adverts">
        <h2>Adverts</h2>
        <p className="biz-sub">Adverts are what buyers see in search. Each one stays live for 40 days and can be renewed.</p>

        {!liveProfile ? (
          <div className="biz-empty">Publish your business profile first, then create your first advert here.</div>
        ) : advertForm ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void publishAdvert();
            }}
          >
            <label className="biz-field">
              <span>Title</span>
              <input
                value={advertForm.title}
                onChange={(event) => setAdvertForm({ ...advertForm, title: event.target.value })}
                maxLength={160}
                required
                placeholder="Fresh vegetables for hotels and shops"
              />
            </label>
            <label className="biz-field" style={{ marginTop: 10 }}>
              <span>What you offer (at least 20 characters)</span>
              <textarea
                value={advertForm.description}
                onChange={(event) => setAdvertForm({ ...advertForm, description: event.target.value })}
                maxLength={2000}
                required
              />
            </label>
            <p className="biz-sub" style={{ marginTop: 10 }}>
              Shown as {liveProfile.displayName} with your profile contacts. Publishing confirms you accept the current{' '}
              <Link href="/terms">Terms</Link>.
            </p>
            <div className="biz-actions">
              <button className="primary-button" type="submit" disabled={Boolean(busy)}>
                {busy === 'publish-advert' ? 'Publishing…' : advertForm.replacesAdvertId ? 'Publish changes' : 'Publish advert'}
              </button>
              <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void saveAdvert()}>
                {busy === 'save-advert' ? 'Saving…' : 'Save draft'}
              </button>
              <button className="secondary-button" type="button" onClick={() => setAdvertForm(null)}>
                Close
              </button>
            </div>
          </form>
        ) : (
          <div className="biz-actions" style={{ marginTop: 0 }}>
            <button className="primary-button" type="button" onClick={() => setAdvertForm({ title: '', description: '' })}>
              New advert
            </button>
          </div>
        )}

        {liveProfile && advertDrafts.length ? (
          <>
            <h3>Drafts</h3>
            <ul className="biz-list">
              {advertDrafts.map((draft) => (
                <li className="biz-item" key={draft.id}>
                  <strong>{draft.title}</strong>
                  <p>Saved {formatDmy(draft.updatedAt)}</p>
                  <div className="biz-actions" style={{ marginTop: 0 }}>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => continueDraft(draft)}
                    >
                      Continue editing
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {liveProfile ? (
          <>
            <h3>Published</h3>
            {adverts.length === 0 ? (
              <div className="biz-empty">No adverts yet. Create one so buyers can find you in search.</div>
            ) : (
              <ul className="biz-list">
                {adverts.map((advert) => {
                  const live = advert.status !== 'PAUSED';
                  return (
                    <li className="biz-item" key={advert.id}>
                      <div>
                        <span className={live ? 'biz-pill' : 'biz-pill muted'}>{advertStatusLabel(advert.status)}</span>
                      </div>
                      <strong>{advert.title}</strong>
                      <p>
                        Published {formatDmy(advert.publishedAt)} · ends {formatDmy(advert.expiresAt)}
                      </p>
                      <div className="biz-actions" style={{ marginTop: 0 }}>
                        {live ? (
                          <Link className="secondary-button" href={`/listing/${advert.id}`}>
                            View
                          </Link>
                        ) : null}
                        <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void editLiveAdvert(advert)}>
                          Edit
                        </button>
                        {live ? (
                          <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void pauseAdvert(advert)}>
                            Unpublish
                          </button>
                        ) : (
                          <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void republishAdvert(advert)}>
                            Publish again
                          </button>
                        )}
                        <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => deleteAdvert(advert)}>
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
      </div>

      <div className="biz-card">
        <h2>Account</h2>
        <div className="biz-actions" style={{ marginTop: 0 }}>
          <Link className="secondary-button" href="/">
            Search businesses
          </Link>
          <Link className="secondary-button" href="/account/privacy-settings">
            Data and privacy
          </Link>
          <Link className="secondary-button" href="/account/delete">
            Delete account
          </Link>
          <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void forgetDevices()}>
            Remove trusted devices
          </button>
        </div>
        <p className="biz-sub" style={{ marginTop: 10 }}>
          Removing trusted devices means every phone, including this one, needs a new SMS code before the PIN works.
        </p>
      </div>
    </section>
  );
}
