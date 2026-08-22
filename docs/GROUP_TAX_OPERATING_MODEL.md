# Group tax operating model (locked)

Status: **Locked** 2026-08-22. Not legal advice. Owner/CPA still names the
Kenyan agent and confirms non-resident / SEP facts before any profile is
APPROVED.

This rule applies to the **SaaS subscription** on every owner product that
charges tenants. Tax regulators come after this compliance packet — not the
other way around. Paid launch stays blocked until a human approves a country
tax profile.

## The locked model

1. **Stay merchant of record.** This operator is the seller on the receipt.
   Do not hand the subscription to Paddle, Lemon Squeezy, Dodo, or any other
   merchant-of-record checkout.
2. **Kenya first** on KRA **iTax** simplified digital-marketplace VAT, **or
   one Kenyan tax representative**. Do not travel. Do not open a Kenyan office
   just to collect VAT.
3. **Keep STK** (Africa's Talking / M-Pesa to the verified login phone) plus
   Stripe for cards. Checkout has no phone field.
4. **Rates** come from the **finance module** (approved country tax rules and
   immutable snapshots) **and Stripe Tax** as the rate engine. Stripe Tax does
   not become the seller and does not file iTax.
5. **Add EU Non-Union OSS later**, when a paying EU consumer actually exists.
   Do not pre-register 27 member states.

eTIMS is **not** required for **non-resident digital-marketplace VAT**.
Resident Kenyan books / POS / chama invoices (Stawi's local books pillar) are
a **different supply** and may still need eTIMS. Do not copy "eTIMS not
required" onto resident invoicing.

Canonical executable copy lives in Sell Find Connect:
`packages/domain/src/tax-operating-model.ts`. This cloud agent can only write
`Bucrepinfo-lab/sellfindconnect.com`. Paste the blocks below into the other
Desktop folders.

## Five products

| Product | Desktop folder | GitHub today | How this model is enforced |
| --- | --- | --- | --- |
| Sell Find Connect / Telpen Adverts | `Adverts\Telpen Adverts` | `Bucrepinfo-lab/sellfindconnect.com` | Code: forbidden MoR providers throw; `GET /v1/finance/launch-readiness` returns the model; STK checkout stays `tax_profile` until Kenya is APPROVED. |
| InsurOS | `insurance` | `Bucrepinfo-lab/InsurOS` (stub README) | Paste the InsurOS block into `README.md` / `COMPLIANCE.md` on Desktop. Do not invent a new remote from this VM. |
| Telpen Edu | `telpen-edu` | no GitHub repo | Paste the Telpen Edu block into that folder's README / COMPLIANCE.md. |
| Stawi | `Mvendoh` | `Bucrepinfo-lab/Stawi` (Cursor push 403) | Paste the Stawi block into `COMPLIANCE.md`. Keep resident eTIMS for chama/POS books; apply **this** model to the **SaaS subscription fee**. |
| Chamaa App snapshot | already inside Stawi | same as Stawi | Same as Stawi. Do not revive a fifth tax path. |

Do not invent remotes for `telpen-edu` or `Mvendoh`.

## Forbidden

- `PAYMENT_PROVIDER=paddle|lemonsqueezy|lemon-squeezy|dodo`
- Treating Stripe Tax as remitter or merchant of record
- Opening a company in every customer country for VAT
- Auto-approving a country tax profile in seed or CI

## Copy-paste: InsurOS (`insurance/README.md` or `COMPLIANCE.md`)

```markdown
## Tax operating model (locked 2026-08-22)

InsurOS stays the merchant of record for its own subscription. Kenya first:
register KRA iTax simplified digital-marketplace VAT or appoint one Kenyan
tax representative. Keep STK (login phone) plus Stripe. Calculate rates in
the finance/country tax rules and Stripe Tax. Add EU Non-Union OSS later.

Do not use Paddle, Lemon Squeezy, or Dodo. Do not travel or incorporate in
Kenya just to collect VAT. eTIMS is not required on the non-resident digital
VAT path. Paid launch stays blocked until a human approves the Kenya tax
profile. See Sell Find Connect `docs/GROUP_TAX_OPERATING_MODEL.md`.
```

## Copy-paste: Telpen Edu (`telpen-edu/README.md` or `COMPLIANCE.md`)

```markdown
## Tax operating model (locked 2026-08-22)

Telpen Edu stays the merchant of record for its own subscription. Kenya first:
KRA iTax simplified digital-marketplace VAT or one Kenyan tax representative.
Keep STK (login phone) plus Stripe. Rates: finance module + Stripe Tax.
EU Non-Union OSS later. No Paddle / Lemon Squeezy / Dodo. Paid launch is
blocked until a human-approved country tax profile exists. See Sell Find
Connect `docs/GROUP_TAX_OPERATING_MODEL.md`.
```

## Copy-paste: Stawi (`Mvendoh/COMPLIANCE.md`)

```markdown
## SaaS subscription tax (locked 2026-08-22)

Stawi stays the merchant of record for its **platform subscription fee**.
Kenya first: KRA iTax simplified digital-marketplace VAT or one Kenyan tax
representative. Keep STK / M-Pesa on the verified login phone plus Stripe
for cards. Rates: country tax rules + Stripe Tax. EU Non-Union OSS later.
Do not adopt Paddle, Lemon Squeezy, or Dodo for that fee.

This does **not** replace resident Kenyan eTIMS / e-invoicing duties on
chama, POS, or books invoices if Stawi is a Kenyan-resident invoicing
product. Those supplies are separate from the SaaS fee. See Sell Find
Connect `docs/GROUP_TAX_OPERATING_MODEL.md`.
```

## Copy-paste: Chamaa App snapshot (already in Stawi)

Use the Stawi block. Do not create a second Kenya VAT registration for the
archived folder.

## Remaining human work (not code)

- Named Kenyan tax agent / iTax contact.
- Confirm the operator is non-resident with no Kenyan permanent establishment.
- Confirm whether Significant Economic Presence tax applies.
- Live `PAYMENT_PROVIDER` / Africa's Talking credentials after the Kenya
  profile is APPROVED.
- Desktop paste of the three blocks above (this VM cannot push InsurOS,
  Stawi, or Telpen Edu).
