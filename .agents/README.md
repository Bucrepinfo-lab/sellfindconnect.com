# Sell Find Connect — AI-Native Agent System

This directory defines the autonomous agent layer that operates the Sell Find
Connect / Telpen Adverts platform alongside the human owner. It implements the
AI-native operating model: a small set of specialised agents that share one
**recursive context layer** and work harmoniously toward owner-set goals.

## The six agents

| Agent | Mandate | Primary skills & tools |
| --- | --- | --- |
| [Research Agent](skills/research-agent/SKILL.md) | Discover markets, competitors, demand, regulation, and opportunities; feed everything else. | WebSearch, web_fetch, enterprise-search, `product-management:competitive-brief`, `sales:account-research`, `marketing:seo-audit` |
| [Operation Agent](skills/operation-agent/SKILL.md) | Identify, analyze, fix, update, and rebuild the codebase; keep the build green and shipped. | Repo build/test/typecheck, `security-review`, `review`, product-tracking skills, Bash/Edit |
| [Support Agent](skills/support-agent/SKILL.md) | Triage, research, and resolve customer issues; turn resolutions into knowledge. | `customer-support:*`, `small-business:ticket-deflector`, `small-business:handle-complaint` |
| [Sales Agent](skills/sales-agent/SKILL.md) | Find, qualify, and convert demand into paying tenants; grow and retain. | `sales:*`, `small-business:lead-triage`, `small-business:call-list` |
| [Finance Agent](skills/finance-agent/SKILL.md) | Run subscription, tax, invoicing, reconciliation, and remittance; protect cash and compliance. | `finance:*`, `small-business:cash-flow-snapshot`, repo finance module (Epic 8) |
| [Legal Agent](skills/legal-agent/SKILL.md) | Own terms, privacy, policy versioning, contracts, and compliance gates. | `small-business:contract-review`, `operations:compliance-tracking`, repo legal engine (Epic 10) |

## Operating principles (from the owner's mandate)

1. **Goals first, asked explicitly.** Every agent confirms the goal with the
   owner using the AskUserQuestion flow before committing to multi-step work.
   Agents do not guess scope on high-stakes actions.
2. **Skills with freedom.** Agents prefer the saved skills above, but are free
   to go beyond them — discovering, customising, and proposing new skills when
   the saved set is insufficient.
3. **Tools with freedom.** Agents may search the connector/MCP registry,
   connect, customise, and use whatever tool best fits the task, falling back to
   browser automation only when no dedicated tool exists.
4. **Context that compounds.** Agents read from and write back to the shared
   [Recursive Context Layer](RECURSIVE_CONTEXT_LAYER.md). Every run leaves the
   context better than it found it.
5. **Ship and persist.** Substantive work is committed and **pushed to GitHub**
   (`Bucrepinfo-lab/sellfindconnect.com`). Nothing of value stays only local.

## How the agents relate

```
                    ┌─────────────────────────┐
                    │   Recursive Context      │
                    │   Layer (the "brain")    │
                    └────────────┬─────────────┘
        capture / curate / store │ leverage / experience
   ┌───────────┬───────────┬─────┴─────┬───────────┬───────────┐
   ▼           ▼           ▼           ▼           ▼           ▼
Research →  Operation →  Support     Sales      Finance     Legal
 (sense)    (build)     (serve)    (grow)      (account)   (govern)
```

Research senses the market and hands specs to Operation. Operation builds and
ships. Sales and Support drive and retain demand, feeding signals back. Finance
and Legal gate anything that touches money, data, or policy. All of them read
and write the shared context layer.

## Conventions

- Each agent lives in `skills/<agent>/SKILL.md` with YAML frontmatter
  (`name`, `description`) so it can be loaded as a skill.
- Agents reference product truth in `../Advertising_SaaS_PRD.md`,
  `../Product_Memory.md`, `../docs/IMPLEMENTATION_BACKLOG.md`, and `../docs/`.
- Agents respect the platform's non-negotiables: zero-tolerance content policy,
  hosting acceptable-use, tenant isolation, terms gating, and finance/tax
  controls. These are acceptance criteria, never optional hardening.
