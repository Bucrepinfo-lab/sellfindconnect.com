# Sign-off records

Record of signed approvals that unlock gated SellFindConnect actions. Each
entry summarises the signed document. The signed PDFs themselves stay with
the operator (Telpen Systems Ltd) and are not committed here, because they
carry personal contact details and licence numbers.

## SFC-02 — Kenya tax profile approval and tax representative declaration

| Field | Value |
| --- | --- |
| Document ref | SFC-02, prepared 26/09/26 |
| Operator | Telpen Systems Ltd, Ruiru, Kiambu County |
| Received | Email "SELLFINDCONNECT Documents", 09/10/26 |
| Signed by director | Fredrick Mwangi, 05/10/26 |
| Signed by tax advisor | Martin Kariuki Kamau (KRA-licensed tax agent), 07/10/26 |
| Decision | "I approve the Kenya tax profile above for production" — ticked |

### Profile approved

All rows of the draft profile were ticked as correct:

- Country Kenya (KE); VAT on digital marketplace supply
- 16%, tax-inclusive pricing
- Monthly filing on KRA iTax by the 20th
- Registration threshold 0
- eTIMS not required (non-resident simplified path)
- Merchant of record: Telpen Systems Ltd (no Paddle, Lemon Squeezy or Dodo)
- Rates from the finance module; Stripe Tax optional overlay

Section B: Significant Economic Presence tax applies (3% of gross monthly,
by the 20th).

Section C: named tax agent as above. Scope checkboxes and retainer were left
blank.

### Open points before `approvedBy` is set in production

1. **Residency contradicts the profile.** Section A ticks "Telpen Systems Ltd
   is a Kenyan-resident company (ordinary VAT registration / eTIMS apply)",
   but the approved profile row says eTIMS is not required on the
   non-resident simplified path. A resident company files ordinary VAT and
   must use eTIMS. The tax agent should confirm which path applies, and the
   eTIMS row should change if resident.
2. **SEP on a resident company.** Significant Economic Presence tax applies
   to non-residents. If the company is resident, corporate income tax applies
   instead. Confirm with the tax agent.
3. **Blanks on the form:** KRA PIN, country of incorporation, the
   `approvedBy` value in Section D, and the agent's scope and retainer.
4. Paid launch still needs SFC-03 (live payment-provider and Africa's
   Talking credentials review), per the form's own note.

Until points 1–3 are resolved, the seeded Kenya profile stays DRAFT and STK
checkout keeps returning `tax_profile` / `PAYMENT_CHECKOUT_BLOCKED`.

## SFC-01 — Legal policy review and sign-off

| Field | Value |
| --- | --- |
| Document ref | SFC-01, prepared 26/09/26 |
| Received | Email "SELLFINDCONNECT Documents", 09/10/26 |
| Signed by counsel | Wanjiku Kinyanjui, Advocate of the High Court of Kenya and Commissioner for Oaths (stamped), 09/10/26 |
| Signed by director | Fredrick Mwangi, 05/10/26 |
| Decision | "All five policies approved as published" — ticked |

| Policy | Version | Result |
| --- | --- | --- |
| Terms of Service | `terms-2026-08-22` | Approve |
| Subscription terms | `subscription-2026-08-22` | Approve |
| Privacy Policy | `privacy-2026-06-18` | Approve |
| Prohibited content | `zero-tolerance-2026-06-18` | Approve |
| Community standards (Play UGC policy) | `community-2026-08-22` | Approve |

No notes or changes were written against any policy. These versions are now
the production contract, so no version bump or forced re-acceptance is
needed. The live pages no longer need the "not counsel sign-off" caveat.

The form listed points for counsel to check (Kenya Data Protection Act and
ODPC registration, cross-border transfer to Fly.io Frankfurt, Terms §6
indemnity and §9 disclaimer, Consumer Protection Act refunds, 30-day
deletion and 7-year billing retention, zero-tolerance reporting). Counsel
approved without comment. Two remain worth doing as operator housekeeping,
not as blockers:

- ODPC registration as data controller/processor, if not already done.
- The Privacy Policy is dated 25/06/26 and does not mention Stripe, Stripe
  Tax or UGC report/block data. Any future update needs a new version and
  re-acceptance, and should go back to counsel.
