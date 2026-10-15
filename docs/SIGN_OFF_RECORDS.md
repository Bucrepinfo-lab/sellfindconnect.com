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

## Legal policy review and sign-off

Received in the same email (09/10/26) as "Legal Policy Review and
Sign-off.pdf". Not yet reviewed or recorded here: the file was not available
in the shared Acrobat or Drive locations. Until it is recorded, the public
Terms, Subscription, Privacy, Prohibited-content and Community pages remain
"not counsel sign-off".
