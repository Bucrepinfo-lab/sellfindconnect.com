"use client";

import { useState } from "react";

/** "+254712345678" → "07•• ••• 678". Anything that is not a phone number is shown as it is. */
export function hideNumber(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length < 6 || /[a-z@]/i.test(value)) return value;
  const local = d.startsWith("254") ? `0${d.slice(3)}` : d;
  return `${local.slice(0, 2)}•• ••• ${local.slice(-3)}`;
}

/**
 * The person's own number on their profile (owner 27/11/26): hidden by default,
 * so someone looking at the screen cannot read it, with Show / Hide.
 */
export function HiddenNumber({ value, className = "" }: { value: string | null | undefined; className?: string }) {
  const [shown, setShown] = useState(false);
  if (!value) return <span className={className}>—</span>;
  const masked = hideNumber(value);
  return (
    <span className={`hidden-number ${className}`}>
      <span className="hidden-number__value">{shown ? value : masked}</span>
      {masked !== value ? (
        <button type="button" className="hidden-number__toggle" aria-pressed={shown} onClick={() => setShown((v) => !v)}>
          {shown ? "Hide" : "Show"}
        </button>
      ) : null}
    </span>
  );
}
