"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { publicApiBaseUrl, readTenantSession, tenantSessionHeaders } from "../../../lib/public-api";
import "../../../styles/privacy.css";

type Step = "CONFIRM" | "REASON" | "SCHEDULED" | "CANCELLED";

const REASONS = [
  "I no longer need SellFindConnect",
  "I have privacy concerns",
  "The service did not meet my needs",
  "I am switching to another platform",
  "Other",
];

function subscribeSession(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function hasTenantSession() {
  const session = readTenantSession();
  return Boolean(session.sessionToken && session.tenantId);
}

export default function AccountDeletionPage() {
  const router = useRouter();
  const signedIn = useSyncExternalStore(subscribeSession, hasTenantSession, () => false);
  const [step, setStep] = useState<Step>("CONFIRM");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequest = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${publicApiBaseUrl}/privacy/deletion`, {
        method: "POST",
        headers: tenantSessionHeaders(),
        body: JSON.stringify({ reason }),
      });
      const payload = (await response.json()) as { message?: string; scheduledAt?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "failed");
      }
      setDate(
        payload.scheduledAt
          ? new Date(payload.scheduledAt).toLocaleDateString("en-KE", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "the end of the 30-day grace period",
      );
      setStep("SCHEDULED");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Deletion request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${publicApiBaseUrl}/privacy/deletion`, {
        method: "DELETE",
        headers: tenantSessionHeaders(),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "failed");
      }
      setStep("CANCELLED");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Cancel failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!signedIn) {
    return (
      <div className="sfc-delete">
        <div className="sfc-delete__card">
          <h1 className="sfc-delete__title">Sign in to delete your account</h1>
          <p className="sfc-delete__body">
            Account deletion requires a signed-in session. Sign in on the web app, then return to
            this page. The public privacy policy stays available without signing in.
          </p>
          <div className="sfc-delete__actions">
            <button className="sfc-delete__btn sfc-delete__btn--ghost" onClick={() => router.push("/privacy")}>
              Privacy policy
            </button>
            <button className="sfc-delete__btn sfc-delete__btn--primary" onClick={() => router.push("/")}>
              Go to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sfc-delete">
      <div className="sfc-delete__card">
        {step === "CONFIRM" && (
          <>
            <span className="sfc-delete__icon sfc-delete__icon--warn">&#9888;</span>
            <h1 className="sfc-delete__title">Delete your account?</h1>
            <p className="sfc-delete__body">
              This permanently deletes your profile, adverts, conversations, and media after a 30-day
              grace period.
            </p>
            <ul className="sfc-delete__list">
              <li>Profile and adverts unpublished immediately</li>
              <li>
                Data erased after <strong>30-day grace period</strong>
              </li>
              <li>Cancel any time before grace period ends</li>
              <li>Active subscriptions not refunded</li>
            </ul>
            {error && (
              <p className="sfc-delete__error" role="alert">
                {error}
              </p>
            )}
            <div className="sfc-delete__actions">
              <button className="sfc-delete__btn sfc-delete__btn--ghost" onClick={() => router.back()}>
                Keep my account
              </button>
              <button
                className="sfc-delete__btn sfc-delete__btn--ghost"
                onClick={() => router.push("/account/privacy-settings")}
              >
                Data and privacy
              </button>
              <button className="sfc-delete__btn sfc-delete__btn--danger" onClick={() => setStep("REASON")}>
                Continue
              </button>
            </div>
          </>
        )}
        {step === "REASON" && (
          <>
            <h1 className="sfc-delete__title">Why are you leaving?</h1>
            <p className="sfc-delete__body">Optional — helps us improve.</p>
            <div className="sfc-delete__reasons" role="radiogroup">
              {REASONS.map((item) => (
                <label
                  key={item}
                  className={"sfc-delete__reason" + (reason === item ? " sfc-delete__reason--selected" : "")}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={item}
                    checked={reason === item}
                    onChange={() => setReason(item)}
                  />
                  {item}
                </label>
              ))}
            </div>
            {error && (
              <p className="sfc-delete__error" role="alert">
                {error}
              </p>
            )}
            <div className="sfc-delete__actions">
              <button className="sfc-delete__btn sfc-delete__btn--ghost" onClick={() => setStep("CONFIRM")}>
                Back
              </button>
              <button
                className="sfc-delete__btn sfc-delete__btn--danger"
                onClick={handleRequest}
                disabled={loading}
              >
                {loading ? "Scheduling..." : "Schedule deletion"}
              </button>
            </div>
          </>
        )}
        {step === "SCHEDULED" && (
          <>
            <span className="sfc-delete__icon sfc-delete__icon--ok">&#10003;</span>
            <h1 className="sfc-delete__title">Deletion scheduled</h1>
            <p className="sfc-delete__body">
              Account will be permanently deleted on <strong>{date}</strong>. You can cancel before
              that date.
            </p>
            {error && (
              <p className="sfc-delete__error" role="alert">
                {error}
              </p>
            )}
            <div className="sfc-delete__actions">
              <button
                className="sfc-delete__btn sfc-delete__btn--ghost"
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? "Cancelling..." : "Cancel deletion"}
              </button>
              <button
                className="sfc-delete__btn sfc-delete__btn--primary"
                onClick={() => router.push("/dashboard")}
              >
                Go to dashboard
              </button>
            </div>
          </>
        )}
        {step === "CANCELLED" && (
          <>
            <span className="sfc-delete__icon sfc-delete__icon--ok">&#10003;</span>
            <h1 className="sfc-delete__title">Deletion cancelled</h1>
            <p className="sfc-delete__body">Your deletion has been cancelled. Everything is back to normal.</p>
            <div className="sfc-delete__actions">
              <button
                className="sfc-delete__btn sfc-delete__btn--primary"
                onClick={() => router.push("/dashboard")}
              >
                Go to dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
