'use client';

import { BarChart3, Inbox, Megaphone, MessageCircle, Network, Store } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { industryCategories, kenyaCounties, supplyChainRoles } from '@telpen/domain';

import { codeLabel } from '../lib/labels';
import { pendingAdvertProblem, readPendingAdvert, savePendingAdvert, type PendingAdvert } from '../lib/pending-advert';
import { PhoneSignIn } from './PhoneSignIn';

/**
 * "Your business" for a visitor who has no account yet (owner 25/11/26: lazy
 * registration). Every tab can be looked at; each says what it does and why it
 * helps sell. An advert can be written straight away; the account step comes
 * only when they tap Publish, and the advert is kept while they do it.
 */
export function GuestBusinessTour({ onUseEmail }: { onUseEmail: () => void }) {
  const [signIn, setSignIn] = useState(false);
  return (
    <div className="guest-tour">
      <header className="guest-hero">
        <h1>Grow your business on SellFindConnect</h1>
        <p>
          Look around freely. When you are ready, write your advert. We only ask for your number and a PIN at the moment
          you publish it.
        </p>
        <div className="guest-hero-actions">
          <a className="primary-button" href="#adverts">
            <Megaphone size={16} aria-hidden /> Create an advert
          </a>
          <button className="secondary-button" type="button" onClick={() => setSignIn((open) => !open)}>
            Already a member? Sign in
          </button>
        </div>
        {signIn ? (
          <div className="guest-signin">
            <PhoneSignIn onUseEmail={onUseEmail} heading="Welcome back" />
          </div>
        ) : null}
      </header>

      <TourCard
        id="business"
        tone="sun"
        icon={<Store size={22} aria-hidden />}
        title="Business profile"
        lead="Your shop window: who you are, what you do, where you deliver and how to reach you."
        points={['Buyers see your name, county and contacts on every advert', 'Reviews from real customers build trust', 'Made for you automatically from your first advert']}
      />

      <section className="guest-card tone-sell" id="adverts" aria-labelledby="guest-adverts-title">
        <div className="guest-card-head">
          <span className="guest-icon"><Megaphone size={22} aria-hidden /></span>
          <div>
            <h2 id="guest-adverts-title">Create an advert</h2>
            <p>Write it now. It shows in search across Kenya the moment you publish. The first month is free.</p>
          </div>
        </div>
        <GuestAdvertComposer onUseEmail={onUseEmail} />
      </section>

      <TourCard
        id="leads"
        tone="find"
        icon={<Inbox size={22} aria-hidden />}
        title="Leads"
        lead="Requests for quotes and enquiries about your adverts, in one list, so no buyer is missed."
        points={['See who asked and when', 'Views and contact taps for each advert', 'Follow up by phone or WhatsApp']}
      />
      <TourCard
        id="messages"
        tone="connect"
        icon={<MessageCircle size={22} aria-hidden />}
        title="Messages"
        lead="Chat with buyers and suppliers inside SellFindConnect."
        points={['Requests for quotes arrive here', 'Keep every deal conversation in one place', 'Block or report anyone who misbehaves']}
      />
      <TourCard
        id="relationship-graph"
        tone="ok"
        icon={<Network size={22} aria-hidden />}
        title="Connections"
        lead="Who supplies, buys from, transports for or services whom. Your trade links help buyers trust you."
        points={['Show the businesses you work with', 'Get found by their buyers too', 'Spot new suppliers near you']}
      />
      <TourCard
        id="saved-searches"
        tone="sun"
        icon={<BarChart3 size={22} aria-hidden />}
        title="Saved searches and alerts"
        lead="Tell us what you are looking for and we let you know when a new seller lists it."
        points={['Searching is always free', 'Alerts when new matches appear', 'Works for buying and for finding new customers']}
      />
      <p className="guest-foot">
        Searching is free for everyone. <Link href="/">Search businesses</Link> · <Link href="/subscription">Prices</Link>
      </p>
    </div>
  );
}

function TourCard(props: { id: string; tone: string; icon: ReactNode; title: string; lead: string; points: string[] }) {
  return (
    <section className={`guest-card tone-${props.tone}`} id={props.id} aria-labelledby={`${props.id}-title`}>
      <div className="guest-card-head">
        <span className="guest-icon">{props.icon}</span>
        <div>
          <h2 id={`${props.id}-title`}>{props.title}</h2>
          <p>{props.lead}</p>
        </div>
      </div>
      <ul className="guest-points">
        {props.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <a className="text-link" href="#adverts">
        Start with an advert
      </a>
    </section>
  );
}

const empty: PendingAdvert = {
  title: '',
  description: '',
  businessName: '',
  industryCode: 'AGRICULTURE',
  role: 'SUPPLIER',
  county: '',
  savedAt: '',
};

/** The advert first; the account step only at Publish. The text is kept on this device meanwhile. */
function GuestAdvertComposer({ onUseEmail }: { onUseEmail: () => void }) {
  const [form, setForm] = useState<PendingAdvert>(() => (typeof window === 'undefined' ? empty : readPendingAdvert() ?? empty));
  const [problem, setProblem] = useState('');
  const [step, setStep] = useState<'write' | 'account'>('write');
  const set = (patch: Partial<PendingAdvert>) => setForm((current) => ({ ...current, ...patch }));

  const publish = () => {
    const why = pendingAdvertProblem(form);
    setProblem(why ?? '');
    if (why) return;
    savePendingAdvert({ ...form, savedAt: new Date().toISOString() });
    setStep('account');
  };

  if (step === 'account') {
    return (
      <div className="guest-account">
        <div className="guest-preview" aria-label="Your advert">
          <strong>{form.title}</strong>
          <span>
            {form.businessName}
            {form.county ? ` · ${form.county}` : ''}
          </span>
          <p>{form.description}</p>
          <button className="text-link" type="button" onClick={() => setStep('write')}>
            Change the advert
          </button>
        </div>
        <PhoneSignIn
          onUseEmail={onUseEmail}
          heading="Almost live! Save it to your business"
          note="Your phone number becomes your login and the number buyers call. No SMS is sent."
          prefill={{ tenantDisplayName: form.businessName.trim(), industryCode: form.industryCode, primaryRole: form.role }}
        />
      </div>
    );
  }

  return (
    <form
      className="guest-composer"
      onSubmit={(event) => {
        event.preventDefault();
        publish();
      }}
    >
      <label className="field compact-field">
        <span>What are you selling or offering?</span>
        <input value={form.title} maxLength={160} placeholder="e.g. Fresh tomatoes, 20 crates a week" onChange={(e) => set({ title: e.target.value })} />
      </label>
      <label className="field compact-field">
        <span>Describe it</span>
        <textarea
          rows={4}
          maxLength={2000}
          value={form.description}
          placeholder="Sizes, prices, how much you have, where you deliver"
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>
      <div className="guest-grid">
        <label className="field compact-field">
          <span>Business name</span>
          <input value={form.businessName} maxLength={120} autoComplete="organization" onChange={(e) => set({ businessName: e.target.value })} />
        </label>
        <label className="field compact-field">
          <span>County</span>
          <select value={form.county} onChange={(e) => set({ county: e.target.value })}>
            <option value="">Choose your county</option>
            {kenyaCounties.map((county) => (
              <option key={county.code} value={county.name}>
                {county.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact-field">
          <span>Industry</span>
          <select value={form.industryCode} onChange={(e) => set({ industryCode: e.target.value })}>
            {industryCategories.map((industry) => (
              <option key={industry.code} value={industry.code}>
                {industry.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact-field">
          <span>You are a</span>
          <select value={form.role} onChange={(e) => set({ role: e.target.value })}>
            {supplyChainRoles.map((role) => (
              <option key={role} value={role}>
                {codeLabel(role)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {problem ? (
        <p className="biz-note error" role="alert">
          {problem}
        </p>
      ) : null}
      <div className="terms-actions">
        <button className="primary-button" type="submit">
          <Megaphone size={16} aria-hidden /> Publish my advert
        </button>
      </div>
      <p className="form-note">Next you add your phone number and a PIN. Your advert is kept while you do.</p>
    </form>
  );
}
