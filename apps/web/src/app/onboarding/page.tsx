"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SELL_QUICK_STARTS, FIND_QUICK_INDUSTRIES } from "@telpen/domain";
import type { OnboardingIntent } from "@telpen/domain";
import { publicApiBaseUrl } from "../../lib/public-api";

type Step = "INTENT"|"SELL_ROLE"|"FIND_INDUSTRY"|"LAUNCHING";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("INTENT");
  const [intent, setIntent] = useState<OnboardingIntent|null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const pickIntent = useCallback((i: OnboardingIntent) => {
    setIntent(i);
    setStep(i === "SELL" ? "SELL_ROLE" : "FIND_INDUSTRY");
  }, []);

  const launchSell = async (role: string) => {
    setSelectedRole(role); setLoading(true); setStep("LAUNCHING");
    await fetch(`${publicApiBaseUrl}/onboarding/intent`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: "SELL", role }) });
    router.push("/dashboard/adverts/new?onboarding=1");
  };

  const launchFind = async () => {
    setLoading(true); setStep("LAUNCHING");
    const p = new URLSearchParams({ onboarding: "1" });
    if (selectedIndustry) p.set("industry", selectedIndustry);
    if (query.trim()) p.set("q", query.trim());
    await fetch(`${publicApiBaseUrl}/onboarding/intent`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: "FIND", industry: selectedIndustry, query: query.trim() }) });
    router.push("/dashboard/discover?" + p.toString());
  };

  return (
    <div className="ob">
      {step === "INTENT" && (
        <div className="ob__intent">
          <header className="ob__header">
            <span className="ob__logo">SellFindConnect</span>
            <p className="ob__tagline">Sell it. Find it. Connect.</p>
          </header>
          <h1 className="ob__headline">What do you want to do <em>right now?</em></h1>
          <p className="ob__sub">Pick one — you can do both later.</p>
          <div className="ob__split">
            <button className="ob__card ob__card--sell" onClick={() => pickIntent("SELL")} aria-label="I want to sell or advertise">
              <span className="ob__card-icon" aria-hidden="true">📢</span>
              <span className="ob__card-title">Sell / Advertise</span>
              <span className="ob__card-desc">Publish your business profile and adverts so buyers find you</span>
              <span className="ob__card-cta">Publish in 60 seconds →</span>
            </button>
            <button className="ob__card ob__card--find" onClick={() => pickIntent("FIND")} aria-label="I want to find a supplier or partner">
              <span className="ob__card-icon" aria-hidden="true">🔍</span>
              <span className="ob__card-title">Find / Source</span>
              <span className="ob__card-desc">Search thousands of verified suppliers, distributors and partners</span>
              <span className="ob__card-cta">Start searching →</span>
            </button>
          </div>
          <p className="ob__reassure">Free for 30 days · No card required · Cancel anytime</p>
        </div>
      )}

      {step === "SELL_ROLE" && (
        <div className="ob__step">
          <button className="ob__back" onClick={() => setStep("INTENT")}>← Back</button>
          <h2 className="ob__step-title">What best describes your business?</h2>
          <p className="ob__step-sub">We will set up your profile for the right buyers to find you.</p>
          <div className="ob__roles" role="list">
            {SELL_QUICK_STARTS.map(r => (
              <button key={r.role} className={"ob__role" + (selectedRole === r.role ? " ob__role--selected" : "")} onClick={() => launchSell(r.role)} role="listitem" aria-pressed={selectedRole === r.role}>
                <span className="ob__role-icon" aria-hidden="true">{r.icon}</span>
                <span className="ob__role-body"><span className="ob__role-title">{r.title}</span><span className="ob__role-desc">{r.desc}</span></span>
                <span className="ob__role-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "FIND_INDUSTRY" && (
        <div className="ob__step">
          <button className="ob__back" onClick={() => setStep("INTENT")}>← Back</button>
          <h2 className="ob__step-title">What are you looking for?</h2>
          <p className="ob__step-sub">Pick an industry or search directly — refine later.</p>
          <div className="ob__search-wrap">
            <label htmlFor="ob-search" className="ob__sr-only">Search suppliers or products</label>
            <input id="ob-search" className="ob__search" type="search" placeholder='e.g. "maize flour supplier Nairobi"' value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && launchFind()} autoFocus />
          </div>
          <p className="ob__or">or browse by industry</p>
          <div className="ob__industries" role="list">
            {FIND_QUICK_INDUSTRIES.map(ind => (
              <button key={ind.code} className={"ob__industry" + (selectedIndustry === ind.code ? " ob__industry--selected" : "")} onClick={() => setSelectedIndustry(selectedIndustry === ind.code ? "" : ind.code)} role="listitem" aria-pressed={selectedIndustry === ind.code}>
                <span aria-hidden="true">{ind.icon}</span><span>{ind.label}</span>
              </button>
            ))}
          </div>
          <button className="ob__go" onClick={launchFind} disabled={!query.trim() && !selectedIndustry} aria-busy={loading}>
            {loading ? "Launching..." : "Find suppliers →"}
          </button>
        </div>
      )}

      {step === "LAUNCHING" && (
        <div className="ob__launching" aria-live="polite" aria-busy="true">
          <span className="ob__spinner" aria-hidden="true" />
          <p>{intent === "SELL" ? "Setting up your seller profile..." : "Opening Source Finder..."}</p>
        </div>
      )}
    </div>
  );
}
