"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

import { publicApiBaseUrl, readTenantSession, tenantSessionHeaders } from "../../../lib/public-api";
import "../../../styles/privacy.css";

type DeletedWith = "ACCOUNT" | "MANUAL" | "RETENTION_POLICY";
interface Item {
  category: string;
  label: string;
  description: string;
  deletedWith: DeletedWith;
}
interface Summary {
  dataInventory: Item[];
  deletion: { status: string; scheduledAt: string } | null;
}

const BADGE: Record<DeletedWith, { label: string; cls: string }> = {
  ACCOUNT: { label: "Deleted with account", cls: "badge--account" },
  MANUAL: { label: "Manual only", cls: "badge--manual" },
  RETENTION_POLICY: { label: "Retention policy", cls: "badge--retention" },
};

function subscribeSession(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function sessionState(): "in" | "out" {
  const session = readTenantSession();
  return session.sessionToken && session.tenantId ? "in" : "out";
}

export default function PrivacySettingsPage() {
  const session = useSyncExternalStore(subscribeSession, sessionState, () => "unknown" as const);
  const hasSession = session === "in";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [exportState, setExportState] = useState<"idle" | "loading" | "queued">("idle");
  const [error, setError] = useState("");
  const [rejected, setRejected] = useState(false);
  const signedOut = session === "out" || rejected;

  useEffect(() => {
    if (!hasSession) return;
    fetch(`${publicApiBaseUrl}/privacy/data-summary`, { headers: tenantSessionHeaders() })
      .then((response) => {
        if (response.status === 401 || response.status === 403) {
          setRejected(true);
          return Promise.reject(new Error("signed-out"));
        }
        if (!response.ok) {
          throw new Error("Failed to load.");
        }
        return response.json() as Promise<Summary>;
      })
      .then(setSummary)
      .catch((caught: Error) => {
        if (caught.message !== "signed-out") setError("Could not load your data summary. Try again in a moment.");
      });
  }, [hasSession]);

  const doExport = async () => {
    setExportState("loading");
    try {
      const response = await fetch(`${publicApiBaseUrl}/privacy/export`, {
        method: "POST",
        headers: tenantSessionHeaders(),
      });
      if (!response.ok) {
        throw new Error("Export failed.");
      }
      setExportState("queued");
    } catch {
      setError("Export failed.");
      setExportState("idle");
    }
  };

  if (session === "unknown") {
    return (
      <div className="sfc-ps">
        <header className="sfc-ps__header">
          <h1>Data &amp; Privacy</h1>
        </header>
      </div>
    );
  }

  if (signedOut) {
    return (
      <div className="sfc-ps">
        <header className="sfc-ps__header">
          <h1>Data &amp; Privacy</h1>
          <p className="sfc-ps__subtitle">
            Sign in to see the data we hold, export it, or delete your account.
          </p>
        </header>
        <div className="sfc-ps__signed-out">
          <Link href="/dashboard" className="sfc-ps__btn sfc-ps__btn--primary">
            Sign in
          </Link>
          <Link href="/dashboard?signup=1" className="sfc-ps__btn sfc-ps__btn--secondary">
            Create a business account
          </Link>
        </div>
        <p className="sfc-ps__subtitle">
          Read the <Link href="/privacy">Privacy Policy</Link> or see{" "}
          <Link href="/account/delete">how to delete an account</Link> without signing in.
        </p>
      </div>
    );
  }

  return (
    <div className="sfc-ps">
      <header className="sfc-ps__header">
        <h1>Data &amp; Privacy</h1>
        <p className="sfc-ps__subtitle">Manage your data, request exports, and control your account.</p>
      </header>
      {error && (
        <p className="sfc-ps__error" role="alert">
          {error}
        </p>
      )}
      {summary?.deletion?.status === "REQUESTED" && (
        <div className="sfc-ps__alert sfc-ps__alert--warn" role="alert">
          <strong>Deletion scheduled — </strong>
          <span>
            Permanent deletion on{" "}
            <strong>
              {new Date(summary.deletion.scheduledAt).toLocaleDateString("en-KE", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </strong>
            . <Link href="/account/delete">Cancel</Link>
          </span>
        </div>
      )}
      <section className="sfc-ps__section" aria-labelledby="inv">
        <h2 id="inv">Data we hold</h2>
        {summary ? (
          <ul className="sfc-ps__inventory" role="list">
            {summary.dataInventory.map((item) => {
              const badge = BADGE[item.deletedWith];
              return (
                <li key={item.category} className="sfc-ps__inventory-item">
                  <div className="sfc-ps__inventory-left">
                    <span className="sfc-ps__inventory-label">{item.label}</span>
                    <span className="sfc-ps__inventory-desc">{item.description}</span>
                  </div>
                  <span className={"sfc-ps__badge " + badge.cls}>{badge.label}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="sfc-ps__skeleton" aria-busy="true" />
        )}
      </section>
      <section className="sfc-ps__section" aria-labelledby="exp">
        <h2 id="exp">Export your data</h2>
        <p className="sfc-ps__section-desc">
          Download a copy of your data as JSON. Ready within 24 hours, available for 7 days.
        </p>
        {exportState === "queued" ? (
          <div className="sfc-ps__export-confirm" role="status">
            Export requested — we will notify you when ready.
          </div>
        ) : (
          <button
            className="sfc-ps__btn sfc-ps__btn--secondary"
            onClick={doExport}
            disabled={exportState === "loading"}
          >
            {exportState === "loading" ? "Requesting..." : "Request data export"}
          </button>
        )}
      </section>
      <section className="sfc-ps__section sfc-ps__section--danger" aria-labelledby="del">
        <h2 id="del">Delete account</h2>
        <p className="sfc-ps__section-desc">
          Permanently delete your account and all associated data after a 30-day grace period.
        </p>
        <Link href="/account/delete" className="sfc-ps__btn sfc-ps__btn--danger">
          Delete my account
        </Link>
        <p className="sfc-ps__section-footnote">
          Read our <Link href="/privacy">Privacy Policy</Link> to understand what data is retained.
        </p>
      </section>
    </div>
  );
}
