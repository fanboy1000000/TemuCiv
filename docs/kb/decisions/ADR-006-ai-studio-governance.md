# ADR-006: An AI-only studio workflow, adapted from StatsTid

| Field | Value |
|---|---|
| **Status** | accepted (owner rulings, 2026-09-30) |
| **Sprint** | S1 |
| **Areas** | all |

## Decision (plain language)

TemuCiv is built by AI agents under a governance model adapted from the owner's StatsTid project
(github.com/fanboy1000000/StatsTid, 144 sprints of AI-only development). The owner chose **option B**: stay
close to StatsTid, with **its machinery from day one** (specialist agents, mechanical hooks, dual-lens review
including per-task review in high-risk areas). **Codex** is the external review lens. The code lives in a
**public GitHub repository**, with GitHub Actions for CI.

## What was adopted

- A short constitution (`docs/CONVENTIONS.md`) given word for word to every agent: invariants, trade-offs,
  project status and the explanation standard.
- The refinement gate (`refine-requirements`): propose where the architecture decides, ask where design intent
  decides.
- Tests derived from the spec (here, the owner's design) that must be seen failing (RED evidence, mutation).
- The "brief challenge" instruction in every agent. In StatsTid, 14 of 14 agent contradictions in one sprint were
  correct.
- Dual-lens review (reviewer agent on Fable + Codex) with severities and a 5-cycle cap.
- State in files (sprint logs, handoff blocks), a knowledge base (ADR/PAT/FAIL), a roadmap with a backlog.
- Mechanical enforcement: a sprint-close guard, a model-routing guard, local CI and GitHub CI, with the lessons
  behind StatsTid's gates (untracked files, red CI nobody read, failures that were only warnings).

## What was deliberately changed

StatsTid's own purpose is to test how far AI governance can go. TemuCiv's purpose is to ship a fun game, so:
- **Size budgets** on governance docs, enforced by CI. StatsTid's governance text grew to about the size of its
  production code, and its sprint logs to 75–146 KB each.
- **Leaner model routing:** the model is set in each role's definition; the reviewer is checked to be a Fable
  model, not one exact version (StatsTid's exact-version pin needed a four-place update per release).
- **Stronger close gate:** the review stamp includes a hash of the reviewed files, so any change after review
  forces a new review; StatsTid checked the commit only.
- **Game-specific additions:** design conformance in place of legal/payroll verification, determinism checks,
  headless soak games, performance budgets, screenshot verification and the owner's playtest as the fun oracle.
- **Earned governance:** new rules come from real failures, recorded as FAIL entries; every fifth sprint each
  mechanism must justify itself.

## Public repository

- The code is visible to everyone. Without a license file, all rights are reserved by default, which suits the
  commercial goal. Release-related legal questions are deferred to the pre-release phase (CONVENTIONS.md).
- Secrets must never be committed. A secret scan (gitleaks) runs on every push, over the full history.
- GitHub Actions minutes are free for public repositories.

## Consequences

- Every sprint pays the review cost, including Codex. If the harness review shows a mechanism catching nothing,
  it's proposed for removal.
