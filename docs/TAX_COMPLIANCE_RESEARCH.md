# Multi-country tax remittance — remote compliance research

Status: Research for owner/CPA review. Not legal or tax advice.
Date: 2026-08-22
Live product: digital SaaS subscription (first month free, then 10 local-currency
units / month) on web/PWA. Native Play billing is out of scope.

This note answers: how to comply with country tax statutes **without travelling
or opening an office in every country** a visitor uses. The earlier launch
checklist (Country Finance Admin, eTIMS, travelling) mixed a product RBAC role
with a resident-company process. Competitors who sell **digital services** do
not do that.

## What you actually owe tax on

Two different supplies. Do not mix them.

| Supply | Who is the seller | Tax today |
| --- | --- | --- |
| **Platform SaaS fee** (the 10-unit subscription) | Sell Find Connect / Telpen | Destination VAT/GST on a digital service, plus some countries' digital income taxes (Kenya SEP). This is the paid-launch gate. |
| **Counterparty marketplace payments** (buyer pays a supplier for goods/services found on the site) | Usually the supplier, unless the platform is a marketplace facilitator / intermediary | Not in the current STK checkout path. If SFC later collects those payments, many countries treat the **platform** as the VAT collector. |

Browsing from a country does **not** create a filing duty. Registration is
triggered when you **charge** a customer who is treated as located in that
country, and that country's digital-services rules say you must register.

## You do not need to travel

KRA's own FAQ for foreign digital suppliers is online-only:

1. Register under the **simplified tax registration framework on iTax**, or
2. If you skip that, **appoint a tax representative** in Kenya (a CPA / tax
   agent). They file and pay. You still do not fly in.

Sources:

- [KRA: VAT on Digital Marketplace Supply FAQs](https://www.kra.go.ke/helping-tax-payers/faqs/vat-on-digital-marketplace-supply)
- [KRA non-resident DMS registration user guide (PDF)](https://www.kra.go.ke/images/publications/USERGUIDE---DST-NON-RESIDENT-REGISTRATION-REVIEWED-FINAL-18.12.2020-1.pdf)
- [KRA non-resident filing and SWIFT payment user guide (PDF)](https://www.kra.go.ke/images/publications/User-Guide-on-Filing-and-Payment-of-VAT-on-DMS----August-2022.pdf)

**eTIMS is not required** for this non-resident simplified path. KRA FAQ
questions 20 and 27: non-resident digital marketplace suppliers are exempt from
Electronic Tax Register / Electronic Tax Invoice rules. They must still issue an
ordinary invoice or receipt that shows value and VAT. Do not treat eTIMS
onboarding as a paid-launch blocker unless a Kenyan advisor says the operator
is actually a **resident** VAT person.

A **Country Finance Admin** in this product is an access role
(`COUNTRY_FINANCE_ADMIN`) that can run the tax-return workbench. It can be the
owner plus a remote Kenyan tax agent. It is not a job that requires a Nairobi
office.

## How competitors actually comply

They pick one of three operating models. Almost nobody on a digital-only SaaS
or ads product opens a company in every customer country.

### 1. Stay the seller — simplified remote VAT (Google, Meta, Netflix, most SaaS)

This is what large digital advertisers and streaming companies use for Kenya
and similar digital-marketplace VAT regimes: register once on the revenue
authority's **non-resident portal**, charge local VAT at checkout, file monthly
or quarterly **from wherever they sit**, and pay by SWIFT / local bank
instruction.

- Kenya: iTax simplified DMS registration; PIN issued online; monthly VAT by
  the 20th; pay in KES via SWIFT to a KRA collection account. No travel.
  [KRA FAQ](https://www.kra.go.ke/helping-tax-payers/faqs/vat-on-digital-marketplace-supply).
- EU: one **Non-Union OSS** registration in a single member state covers B2C
  digital services in all 27 states. [Stripe OSS overview](https://stripe.com/guides/introduction-to-eu-vat-and-european-vat-oss).
- South Africa: electronic-services VAT with a **R2.3 million** compulsory
  threshold from 1 April 2026 (was R1 million). Many small foreign sellers are
  below it. [SARS VAT registration](https://www.sars.gov.za/types-of-tax/value-added-tax/register-for-vat/).
- Nigeria: FIRS simplified VAT for non-resident suppliers / digital
  intermediaries; platforms that collect payment are often treated as the
  deemed supplier.

They usually add a **tax engine** (Stripe Tax, Avalara, Anrok, Taxually) to
pick the rate and store evidence (IP, billing country, tax ID). The engine
**calculates**. A human or a filing partner **submits** the return on the
government portal unless they buy a filing add-on.

Stripe Tax already lists Kenya as a **customer-location** VAT jurisdiction for
digital products, threshold **1 transaction**, and links the same KRA remote-
seller guide. Stripe does **not** become the taxpayer unless you use a
Merchant-of-Record product. [Stripe Tax Africa / Kenya](https://docs.stripe.com/tax/supported-countries/africa/collect-tax?tax-jurisdiction-africa=kenya).

### 2. Local operating company (Jumia, Jiji Kenya)

Jumia-style marketplaces that hold inventory, run last-mile, and employ staff
**incorporate locally** and run full resident VAT, PAYE, and e-invoicing. Jiji
Kenya presents as a local classifieds business (`jiji.co.ke`), which is the
resident path.

That is the expensive, physical model. It is the right model for warehouses and
payroll, **not** for a web/PWA SaaS fee collected from another country.

### 3. Merchant of Record (Paddle, Lemon Squeezy)

The MoR is the **legal seller** on the receipt. They already hold VAT
registrations (Paddle lists Kenya VAT at 16% for B2B and B2C) and remit for
you. Typical list price around **5% + a fixed fee** per transaction.

[Paddle: countries they charge VAT/sales tax for](https://www.paddle.com/help/sell/tax/which-countries-does-paddle-charge-sales-tax-or-vat-for).

This is convenient for card-charged indie SaaS. It is a **poor fit** for Sell
Find Connect's locked rail: the verified **login phone is the only STK Push
destination**, checkout has no phone field, and the price is 10 local-currency
units. An MoR checkout is usually cards, their merchant entity, and often USD.
Handing the SaaS subscription to Paddle would also split tax snapshots away
from the finance module and still leave **SEP** (income tax on the operator)
as the operator's problem in Kenya.

Do not adopt MoR for the Kenya web/PWA subscription. Login-phone STK is the
locked SaaS rail, and this operator stays the seller of record.

## Kenya specifically (pilot)

Two taxes can stack. They are not substitutes.

| Tax | Kind | Remote path | Rate / timing (as published 2026) |
| --- | --- | --- | --- |
| **VAT on digital marketplace / electronic supplies** | Indirect tax collected from the customer | iTax simplified registration **or** Kenyan tax representative | 16% general rate. Monthly return and payment by the 20th. No turnover threshold for non-residents. No eTIMS. [KRA VAT](https://www.kra.go.ke/individual/filing-paying/types-of-taxes/value-added-tax), [KRA DMS FAQ](https://www.kra.go.ke/helping-tax-payers/faqs/vat-on-digital-marketplace-supply). |
| **Significant Economic Presence (SEP)** | Direct tax on the non-resident's Kenyan-source digital income | Register / representative; monthly | DST (1.5%) was **repealed** and replaced by SEP. Effective **3% of gross** (10% deemed profit × 30%). Finance Act 2025 removed the KES 5 million de minimis, so size does not exempt. Due by the 20th of the following month. [PwC Kenya significant developments](https://taxsummaries.pwc.com/kenya/corporate/significant-developments). Older KRA FAQs still say “VAT and DST”; treat DST as the predecessor name. |

Practical Kenya packet (all remote):

1. Decide the operator is **non-resident with no Kenyan permanent establishment**.
   Opening a local office or hiring staff in Kenya can create a PE and *then*
   resident rules (including eTIMS) start to apply. Avoid that unless you
   intend to.
2. File the iTax simplified DMS application (certificate of incorporation in
   the home country, contact person, overseas tax ID). KRA emails a PIN.
3. Put a Kenyan tax agent on a monthly retainer to file VAT (and SEP if the
   advisor confirms it applies) and to be the named tax representative if iTax
   self-service is painful. This **is** the convenient Country Finance Admin.
4. Charge 16% VAT on the SaaS fee (tax-inclusive 10 KES already matches the
   draft profile). Remit VAT; SEP is paid from margin, not added on top of the
   customer invoice unless the advisor says otherwise.
5. Keep STK credentials review as a **payments** gate, not a tax-office visit.

## Convenient path by country as you grow

Do not pre-register everywhere. Use the finance module's country tax profile:
DRAFT until the first paid customer in that country, then remote-register if
that country's threshold is met.

| Region | Convenient remote method | When it bites |
| --- | --- | --- |
| Kenya | iTax simplified DMS + optional local agent | First paid Kenyan customer (threshold 0). |
| EU consumers | One Non-Union OSS member state | First B2C digital sale into the EU (non-EU seller threshold €0). B2B is often reverse charge. |
| UK | Separate VAT registration (no OSS) | Digital B2C; UK process is online, not 27 trips. |
| South Africa | SARS electronic services | Compulsory around **R2.3m / 12 months** from 1 April 2026; stay unregistered below that unless the advisor says otherwise. |
| Nigeria / Ghana / others | FIRS / GRA simplified non-resident VAT | When that country's published digital-services threshold is crossed. |
| US sales tax | Economic-nexus engines (Stripe Tax / Avalara) | Only if you sell to US buyers and hit a state's nexus; not the Kenya pilot. |

## Locked operating model for Sell Find Connect (and the other four owner products)

**Stay the merchant of record. Do not travel. Do not incorporate per country
for VAT.** This is no longer a recommendation. See
`docs/GROUP_TAX_OPERATING_MODEL.md` and
`packages/domain/src/tax-operating-model.ts`.

1. **Kenya first**, remote iTax (or a Nairobi CPA as representative). Approve
   the DRAFT 16% VAT profile only after that packet exists.
2. Keep **STK + Stripe** as payment adapters. Use Stripe Tax (or the existing
   finance rule table) for rates. The finance workbench already stores
   snapshots, returns, and remittance evidence. Stripe Tax is a rate engine,
   not the remitter.
3. Hire **one Kenyan tax agent** (email + iTax), not a Country Finance
   department in every market.
4. Add the next country only when a paying tenant's billing country requires
   it. Use OSS for the EU instead of 27 PINs.
5. Do not adopt Merchant of Record (Paddle / Lemon Squeezy / Dodo). Those
   providers are rejected in the payment adapter factory.

## What this does not decide

The owner and a qualified tax advisor still decide:

- Whether the operator is non-resident for Kenyan tax (home-country
  incorporation and no Kenyan PE).
- Whether SEP applies to this specific entity and how it interacts with any
  tax treaty.
- The named contact on the iTax form (that can be the agent).
- Live `PAYMENT_PROVIDER` / Africa's Talking credentials.

This document is not an approval of the Kenya tax profile and does not unlock
paid checkout.
