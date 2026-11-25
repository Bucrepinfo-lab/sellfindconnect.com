# Claude tools watch — portfolio log

Weekly heads-up on new Anthropic Claude products, tools and features, with the
smallest safe way to adopt the relevant ones across the five Telpen products
(Telpen Edu, SellFindConnect / Telpen Adverts, HarvestHub, InsurOS, Stawi).

Rules carried into every entry: adoption stays behind a provider-neutral adapter
with a spend cap, priced as an add-on so it raises margin; no secrets in the
repo; no autonomous money movement; verify against official Anthropic sources
before reporting. Newest entry first. Dates are dd/mm/yy.

---

## Claude tools watch — 23/11/26

Verified against official Anthropic pages only (anthropic.com/news, the Claude
Platform release notes, the Claude Code changelog). Third-party blogs were
ignored.

**Headline — Claude Fable 5.2 (09/11/26).** New flagship model
(`claude-fable-5-2`): 1M-token context, 128k max output, always-on adaptive
thinking, and ~20% cheaper than Fable 5.1 ($8/$40 per MTok, was $10/$50). Note
it is a *flagship* — still far pricier than the Haiku tier the products use for
cheap, high-volume overlays, so it is an opt-in premium tier, not a blanket
default swap. Mythos 5.2 is verification-gated (cyber) and not relevant.

- *SellFindConnect / Source Finder* — the best fit: richer, better-reasoned
  "why this match" explanations as a Pro add-on. **Adopted this week** (pilot):
  `source-finder-model-tier.ts` registers Fable 5.2 as a validated PREMIUM tier
  with a fail-closed A/B + eligibility selector; default stays `claude-haiku-5-5`.
  Behind the existing adapter + `AiSpendCap`. Draft PR, not merged/deployed.
- *InsurOS* — better underwriting-rationale and claims-adjudication drafting at
  lower cost vs 5.1, kept as decision-support with the human sign-off and audit
  trail unchanged.
- *Telpen Edu / HarvestHub / Stawi* — general quality+cost gain wherever a model
  is already used (support replies, moderation assist, drafting). Stawi's
  propose-not-dispose money rule is untouched.

**Fast mode for Fable 5.2 (09/11/26).** `speed: "fast"` gives up to 2.5x output
tokens/sec at a premium ($16/$80 per MTok). Worth a per-request flag only on
live-chat paths (SellFindConnect chat/RFQ, a support bot); never a default.

**Self-hosted Managed Agents (12/11/26).** Run the whole Managed Agents service
and store agents/sessions/history on your own infrastructure. Access is
sales-gated. Relevant to InsurOS (auditability) and Stawi (data residency) as a
"when we need provable data control" option — a bigger lift, not adopted now.

**Text watermark (16/11/26) — minor.** Claude marks AI-generated text on the
consumer-app 4.x models on supported platforms; a non-default temperature can
disable it. Little bearing on API builds; note for content-provenance talks only.

**Not actionable this period.** Linked billing beta (17/11/26) only helps
customers who have their own Claude org — your end users won't, so the margin
play stays "meter usage yourself behind the adapter, price as an add-on."
Encryption-key webhooks (16/11/26) are niche infra. No Claude Code releases in
the window (newest 2.1.311, 26/10/26). IPO news (10–20/11/26) is not product.

Sources: anthropic.com/news; platform.claude.com/docs/en/release-notes/overview;
code.claude.com/docs/en/changelog.
