"use client";

/**
 * My profile (owner 26/11/26): one place for what is mine — who I am signed in
 * as, my language, my business page and photos, my records and downloads, and
 * the sign-in and account pages. The session is read from the API; nothing
 * about another person is shown.
 */
import { useEffect, useState } from "react";
import { HiddenNumber } from "../../components/HiddenNumber";
import Link from "next/link";

import { appendSpoken, hideEmail } from "@telpen/domain";

import { LanguagePicker } from "../../components/LanguagePicker";
import { ShareBar } from "../../components/ShareBar";
import { SpeakButton } from "../../components/SpeakButton";
import { formatDmy } from "../../lib/dates";
import { publicApiBaseUrl, readTenantSession, tenantSessionHeaders } from "../../lib/public-api";
import { useStoredSession } from "../../lib/use-session";
import "../../styles/privacy.css";

type Me = {
  user?: { displayName?: string; phone?: string | null; email?: string; contactEmail?: string | null; createdAt?: string };
  tenant?: { displayName?: string; name?: string } | null;
};

type Note = { ok: boolean; text: string } | null;

/** POST to the sign-in API as the signed-in person; the answer's message, or why it was refused. */
async function post(path: string, body: Record<string, string>): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const response = await fetch(`${publicApiBaseUrl}${path}`, {
      method: "POST",
      headers: tenantSessionHeaders(),
      credentials: "include",
      body: JSON.stringify({ sessionToken: readTenantSession().sessionToken, ...body }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: { message: "No network. Try again." } };
  }
}

function messageOf(data: Record<string, unknown>, fallback: string): string {
  const m = data.message;
  if (typeof m === "string") return m;
  if (Array.isArray(m) && typeof m[0] === "string") return m[0];
  return fallback;
}

function Feedback({ note }: { note: Note }) {
  if (!note) return null;
  return (
    <p role="status" className={note.ok ? "sfc-ps__note sfc-ps__note--ok" : "sfc-ps__note sfc-ps__note--bad"}>
      {note.text}
    </p>
  );
}

export default function MyProfilePage() {
  const session = useStoredSession();
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState("");
  const [nameNote, setNameNote] = useState<Note>(null);
  const [phoneNote, setPhoneNote] = useState<Note>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [emailNote, setEmailNote] = useState<Note>(null);

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    setBusy("name");
    const result = await post("/auth/phone/me/name", { displayName: name });
    setBusy("");
    if (result.ok && typeof result.data.displayName === "string") {
      const saved = result.data.displayName;
      setMe((current) => (current ? { ...current, user: { ...current.user, displayName: saved } } : current));
      setNameNote({ ok: true, text: `Saved. You now show as ${saved}.` });
    } else {
      setNameNote({ ok: false, text: messageOf(result.data, "Could not save your name. Try again.") });
    }
  }

  async function saveEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy("email");
    const typed = email ?? me?.user?.contactEmail ?? "";
    const result = await post("/auth/phone/me/email", { email: typed });
    setBusy("");
    if (result.ok && "contactEmail" in result.data) {
      const saved = typeof result.data.contactEmail === "string" ? result.data.contactEmail : null;
      setMe((current) => (current ? { ...current, user: { ...current.user, contactEmail: saved } } : current));
      setEmail(null);
      setEmailNote({ ok: true, text: saved ? "Saved. Receipts and replies can go to this email." : "Your email was removed." });
    } else {
      setEmailNote({ ok: false, text: messageOf(result.data, "Could not save your email. Try again.") });
    }
  }

  async function changePhone(event: React.FormEvent) {
    event.preventDefault();
    setBusy("phone");
    const result = await post("/auth/phone/me/phone", { phone: newPhone, pin });
    setBusy("");
    setPin("");
    if (result.ok && typeof result.data.phone === "string") {
      const moved = result.data.phone;
      setMe((current) => (current ? { ...current, user: { ...current.user, phone: moved } } : current));
      setNewPhone("");
      setPhoneNote({ ok: true, text: messageOf(result.data, "Done. Sign in with your new number and the same PIN.") });
    } else {
      setPhoneNote({ ok: false, text: messageOf(result.data, "Could not change the number. Try again.") });
    }
  }

  useEffect(() => {
    if (!session) return;
    let live = true;
    fetch(`${publicApiBaseUrl}/auth/session`, { headers: tenantSessionHeaders() })
      .then((response) => (response.ok ? (response.json() as Promise<Me>) : Promise.reject(new Error("session"))))
      .then((body) => {
        if (!live) return;
        setMe(body);
        setName(body.user?.displayName ?? "");
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [session]);

  if (!session || failed) {
    return (
      <div className="sfc-ps">
        <header className="sfc-ps__header">
          <h1>My profile</h1>
          <p className="sfc-ps__subtitle">Sign in to see your profile, your language and your records.</p>
        </header>
        <div className="sfc-ps__signed-out">
          <Link href="/dashboard" className="sfc-ps__btn sfc-ps__btn--primary">
            Sign in
          </Link>
          <Link href="/dashboard?signup=1" className="sfc-ps__btn sfc-ps__btn--secondary">
            Create a business account
          </Link>
        </div>
        <section className="sfc-ps__section" aria-labelledby="lang-out">
          <h2 id="lang-out">My language / Lugha yangu</h2>
          <LanguagePicker />
        </section>
      </div>
    );
  }

  const business = me?.tenant?.displayName ?? me?.tenant?.name;
  return (
    <div className="sfc-ps">
      <header className="sfc-ps__header">
        <h1>{me?.user?.displayName ?? "My profile"}</h1>
        <p className="sfc-ps__subtitle">Your sign-in, your language, your business page and your records.</p>
      </header>

      <section className="sfc-ps__section" aria-labelledby="who">
        <h2 id="who">Signed in as</h2>
        {me ? (
          <ul className="sfc-ps__inventory" role="list">
            <li className="sfc-ps__inventory-item">
              <div className="sfc-ps__inventory-left">
                <span className="sfc-ps__inventory-label">Name</span>
                <span className="sfc-ps__inventory-desc">{me.user?.displayName ?? "—"}</span>
              </div>
            </li>
            <li className="sfc-ps__inventory-item">
              <div className="sfc-ps__inventory-left">
                <span className="sfc-ps__inventory-label">Phone number (your login, and the number buyers call)</span>
                <span className="sfc-ps__inventory-desc"><HiddenNumber value={me.user?.phone ?? me.user?.email} /></span>
              </div>
            </li>
            {business ? (
              <li className="sfc-ps__inventory-item">
                <div className="sfc-ps__inventory-left">
                  <span className="sfc-ps__inventory-label">Business</span>
                  <span className="sfc-ps__inventory-desc">{business}</span>
                </div>
              </li>
            ) : null}
            {me.user?.createdAt ? (
              <li className="sfc-ps__inventory-item">
                <div className="sfc-ps__inventory-left">
                  <span className="sfc-ps__inventory-label">Member since</span>
                  <span className="sfc-ps__inventory-desc">{formatDmy(me.user.createdAt)}</span>
                </div>
              </li>
            ) : null}
          </ul>
        ) : (
          <div className="sfc-ps__skeleton" aria-busy="true" />
        )}
      </section>

      <section className="sfc-ps__section" aria-labelledby="nm">
        <h2 id="nm">Change my name</h2>
        <form onSubmit={saveName} className="sfc-ps__form">
          <label className="sfc-ps__field">
            <span>My name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" required />
          </label>
          <SpeakButton onWords={(words) => setName((current) => appendSpoken(current, words, 80))} />
          <button type="submit" className="sfc-ps__btn sfc-ps__btn--primary" disabled={busy === "name"}>
            {busy === "name" ? "Saving…" : "Save my name"}
          </button>
          <Feedback note={nameNote} />
        </form>
      </section>

      <section className="sfc-ps__section" aria-labelledby="em">
        <h2 id="em">My email (optional)</h2>
        <p className="sfc-ps__section-desc">
          For receipts, statements and replies to buyers. You never sign in with it.{" "}
          {me?.user?.contactEmail ? (
            <span className="hidden-number">
              <span className="hidden-number__value">Saved: {showEmail ? me?.user?.contactEmail : hideEmail(me?.user?.contactEmail)}</span>
              <button type="button" className="hidden-number__toggle" aria-pressed={showEmail} onClick={() => setShowEmail((v) => !v)}>
                {showEmail ? "Hide" : "Show"}
              </button>
            </span>
          ) : null}
        </p>
        <form onSubmit={saveEmail} className="sfc-ps__form">
          <label className="sfc-ps__field">
            <span>Email</span>
            <input value={email ?? me?.user?.contactEmail ?? ""} onChange={(event) => setEmail(event.target.value)} type="email" inputMode="email" autoComplete="email" maxLength={254} placeholder="name@gmail.com" />
          </label>
          <button type="submit" className="sfc-ps__btn sfc-ps__btn--primary" disabled={busy === "email"}>
            {busy === "email" ? "Saving…" : (email ?? me?.user?.contactEmail ?? "") ? "Save my email" : "Remove my email"}
          </button>
          <Feedback note={emailNote} />
        </form>
      </section>

      <section className="sfc-ps__section" aria-labelledby="ph">
        <h2 id="ph">Change my phone number</h2>
        <p className="sfc-ps__section-desc">
          You will sign in with the new number and the same PIN. This needs your PIN. No SMS is sent.
        </p>
        <form onSubmit={changePhone} className="sfc-ps__form">
          <label className="sfc-ps__field">
            <span>New phone number</span>
            <input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} type="tel" inputMode="tel" autoComplete="off" placeholder="0712 345 678" required />
          </label>
          <label className="sfc-ps__field sfc-ps__field--pin">
            <span>Your 4-digit PIN</span>
            <input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} type="password" inputMode="numeric" autoComplete="off" maxLength={4} required />
          </label>
          <button type="submit" className="sfc-ps__btn sfc-ps__btn--primary" disabled={busy === "phone"}>
            {busy === "phone" ? "Changing…" : "Change my number"}
          </button>
          <Feedback note={phoneNote} />
        </form>
      </section>

      <section className="sfc-ps__section" aria-labelledby="lang">
        <h2 id="lang">My language / Lugha yangu</h2>
        <p className="sfc-ps__section-desc">Tap-to-speak starts in this language.</p>
        <LanguagePicker />
      </section>

      <section className="sfc-ps__section" aria-labelledby="biz">
        <h2 id="biz">My business page, photos and adverts</h2>
        <p className="sfc-ps__section-desc">
Your picture is your business logo. Change it, your business name, description and contacts, and manage your adverts. You can speak any
          description instead of typing it.
        </p>
        <Link href="/dashboard" className="sfc-ps__btn sfc-ps__btn--primary">
          Open my business
        </Link>
      </section>

      <section className="sfc-ps__section" aria-labelledby="rec">
        <h2 id="rec">My records</h2>
        <p className="sfc-ps__section-desc">See everything we hold about you and ask for a copy to download.</p>
        <Link href="/account/privacy-settings" className="sfc-ps__btn sfc-ps__btn--secondary">
          See and export my records
        </Link>
      </section>

      <section className="sfc-ps__section" aria-labelledby="share">
        <h2 id="share">Tell another business</h2>
        <ShareBar
          label="Share SellFindConnect"
          title="SellFindConnect"
          text="Find suppliers, buyers and transporters across Kenya on SellFindConnect. Free to search."
          url="https://sellfindconnect.com/?via=share"
        />
      </section>

      <section className="sfc-ps__section" aria-labelledby="acc">
        <h2 id="acc">Account</h2>
        <Link href="/account/delete" className="sfc-ps__btn sfc-ps__btn--danger">
          Delete my account
        </Link>
      </section>
    </div>
  );
}
