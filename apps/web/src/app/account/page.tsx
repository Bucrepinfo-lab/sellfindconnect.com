"use client";

/**
 * My profile (owner 26/11/26): one place for what is mine — who I am signed in
 * as, my language, my business page and photos, my records and downloads, and
 * the sign-in and account pages. The session is read from the API; nothing
 * about another person is shown.
 */
import { useEffect, useState } from "react";
import Link from "next/link";

import { LanguagePicker } from "../../components/LanguagePicker";
import { formatDmy } from "../../lib/dates";
import { publicApiBaseUrl, tenantSessionHeaders } from "../../lib/public-api";
import { useStoredSession } from "../../lib/use-session";
import "../../styles/privacy.css";

type Me = {
  user?: { displayName?: string; phone?: string | null; email?: string; createdAt?: string };
  tenant?: { displayName?: string; name?: string } | null;
};

export default function MyProfilePage() {
  const session = useStoredSession();
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!session) return;
    let live = true;
    fetch(`${publicApiBaseUrl}/auth/session`, { headers: tenantSessionHeaders() })
      .then((response) => (response.ok ? (response.json() as Promise<Me>) : Promise.reject(new Error("session"))))
      .then((body) => {
        if (live) setMe(body);
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
                <span className="sfc-ps__inventory-desc">{me.user?.phone ?? me.user?.email ?? "—"}</span>
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
        <p className="sfc-ps__section-footnote">
          To change your name or phone number, write to <span style={{ userSelect: "all" }}>telpeninfo@gmail.com</span> from
          your registered contact.
        </p>
      </section>

      <section className="sfc-ps__section" aria-labelledby="lang">
        <h2 id="lang">My language / Lugha yangu</h2>
        <p className="sfc-ps__section-desc">Tap-to-speak starts in this language.</p>
        <LanguagePicker />
      </section>

      <section className="sfc-ps__section" aria-labelledby="biz">
        <h2 id="biz">My business page, photos and adverts</h2>
        <p className="sfc-ps__section-desc">
          Change your business name, logo, photos, description and contacts, and manage your adverts. You can speak any
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

      <section className="sfc-ps__section" aria-labelledby="acc">
        <h2 id="acc">Account</h2>
        <Link href="/account/delete" className="sfc-ps__btn sfc-ps__btn--danger">
          Delete my account
        </Link>
      </section>
    </div>
  );
}
