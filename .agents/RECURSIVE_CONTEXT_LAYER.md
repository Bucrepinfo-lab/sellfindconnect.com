# Recursive Context Layer

The recursive context layer is the shared "brain" that makes the six agents act
as one system instead of six disconnected tools. It turns scattered signals
(editors, mail, browsing, preferences, product data) into legible, reusable
context, then turns that context into value — and feeds the result back in.

It is **recursive**: every execution and every experience produces new signal
that re-enters the loop and improves the next decision.

## The loop

```
   ┌──────────► 1. CAPTURE ──────────► 2. CURATE ──────────► 3. STORE ──┐
   │           (sense signal)        (read/clean/file)     (make legible) │
   │                                                                      ▼
   └──── 5. EXPERIENCE ◄──────────── 4. EXECUTE ◄──────────────────────────
        (value & feedback)          (leverage context)
```

### 1. Capture — sense every source
Pull signal from the owner's working surfaces: editors and the codebase, email,
calendar, browsing history, stated preferences (see the root `CLAUDE.md`),
connected MCP tools (Slack, HubSpot, QuickBooks, Airtable, etc.), and the
product's own telemetry (analytics events, search behaviour, leads, chat
outcomes, match feedback).

### 2. Curate — routines that decide what matters
Run read / clean / file / ignore / act routines over captured signal. Strip
noise, deduplicate, normalise (the platform already ships Unicode + safety
sanitisation helpers in `@telpen/domain`), and classify each item: is this a
goal, a fact, a task, a risk, or background?

### 3. Store — make context legible
Persist curated context where the right agent will find it:
- **Product truth** → `Advertising_SaaS_PRD.md`, `Product_Memory.md`,
  `docs/IMPLEMENTATION_BACKLOG.md`.
- **Durable facts & decisions** → `Product_Memory.md` decision log (append-only,
  dated, absolute dates).
- **Operational knowledge** → `docs/` runbooks and KB articles.
- **Per-agent working memory** → each agent's notes under its skill folder.

### 4. Execute — leverage context
Direct and set goals (always confirmed with the owner), ideate and prototype,
create artifacts, run skills and tasks, then review and ship. Shipping means:
keep the build green, update the docs in the same change, and **push to GitHub**.

### 5. Experience — context becomes value
Release to users, realise value, collect reactions and feedback (NPS, disputes,
reviews, conversion, renewals, referrals, churn), and send those signals back to
the brain layer. The next Capture cycle starts richer than the last.

## Who owns which stage

| Stage | Lead agent(s) | Notes |
| --- | --- | --- |
| Capture | Research | Operation captures code/tech signal; Support captures voice-of-customer. |
| Curate | Research + Operation | Each agent curates its own domain's signal. |
| Store | All | Product_Memory + docs are the canonical store. |
| Execute | Operation (build), Sales (grow), Support (serve) | Finance & Legal gate. |
| Experience | Sales + Support | Feed conversion, retention, and sentiment back. |

## Invariants

- Context never overrides the platform's zero-tolerance, acceptable-use,
  tenant-isolation, terms-gating, or finance/tax controls.
- Sensitive personal data is curated and stored per the privacy policy and only
  with lawful basis; it is never persisted casually into shared context.
- Every recursion is auditable: decisions land in the dated `Product_Memory.md`
  log so the system can explain *why* it acted.
