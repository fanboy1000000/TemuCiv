# TemuCiv Roadmap

> The forward view: milestones, the backlog of deferred work, and a parking lot for ideas. Only the Orchestrator
> edits it; at every sprint close, unscheduled follow-ups are routed into the backlog (docs/WORKFLOW.md, step 8).
> Sprint-level plans live in the sprint logs, and shipped work in `docs/sprints/INDEX.md`.

## Milestones

Milestones are ordered by dependency. The sprints each one takes are projections, not commitments.

| Milestone | Goal | Delivers |
|---|---|---|
| **M0: Design** (current) | Governance, architecture, the owner's vision and scope | Workflow and gates; `docs/architecture.md` (done, S2); `docs/design/vision.md` and `scope.md` |
| **M0.5: Prototype** (owner, 2026-10-15) | Feel how the untested ideas play together before production: a rough, throwaway build in slices, one sprint each. 1: solo sandbox (moves budget, coin and goods, hauling); 2: a rival and armies; 3: progress and the category scores | Builds the owner plays; the lessons go into `docs/design/`. The code is thrown away, and production (M1) starts fresh |
| **M1: Foundation** | Project skeleton, hex grid, map generation, rendering, camera; CI for types, tests and determinism | A map you can scroll |
| **M2: Core loop** | Units, movement, turns, cities, yields, production; a first AI player that plays them (ADR-009) | Found cities and grow, next to an AI rival |
| **M3: Depth** | Progress (the leader web in rings), combat, borders, fog of war; the AI learns each system as it lands | Something close to a real game |
| **M4: First complete game** | AI personalities and full strategy, victory conditions, save/load, headless soak games | **The first complete, playable game** |
| **M5: Alpha polish** | UI, balance from simulations, art pass, desktop packaging | Something you can show people |
| **M6+: Full development** | The ages after antiquity, and systems the owner prioritizes after the demo's playtests (e.g. diplomacy, wonders). The M4 game is a small antiquity-only demo that tests the basic ideas; the game itself spans several ages (owner, 2026-10-07) | |
| **Pre-release** | Final name, trademarks, asset licensing, AI-content disclosure, Steam setup | Ready to publish |

## Backlog

Deferred work with an owner and a reason. Items leave the backlog when a sprint plan picks them up.

| Item | Why deferred | Picked up by |
|---|---|---|
| Design brainstorm, carried over: the economy (coin and goods, C2, ruled 2026-10-15, Sprint 2 log; details parked for the economy spec); the big shape of logistics (routes designed once, then automatic: proposed) and of cities (stability, sanitation); ruling a large empire (moves budget K1–K6 ruled 2026-10-13, Sprint 2 log; all six challenges done; next: what runs the parts nobody spends a move on; showing where a move pays off is left to the interface design) | The owner moved to the technical sprint first | M0 |
| Design spec: owner writes `vision.md` and `scope.md` (templates in `docs/design/`) | Owner's work, at the owner's pace | M0 |
| Design: route the brainstorm rulings (Sprint 1 and Sprint 2 logs, "Owner design rulings") into `docs/design/`, with the owner's OK; include renaming "research" to "progress" in `docs/design/README.md` | Brainstorm still in progress | M0 |
| `run-game` skill: the verified recipe for launching the game and taking screenshots | Needs a runnable build | M1 |
| M1 setup per ADR-011: Vite, TypeScript strict (`erasableSyntaxOnly`), one TypeScript project per part of `src/`, `node:test`, Playwright; CI steps for the type check, tests, data-schema validation, the `src/sim` search for `Math.random`/`Date.now`/`new Date(`, and the determinism replay | Needs code | M1 |
| Headless AI-vs-AI soak games and performance budgets in CI | Needs the simulation and AI players | M3–M4 |
| Read-only agents (reviewer, constraint-validator, trace) have unrestricted Bash; replace with an enforced read/test allowlist (Codex S1 cycle 1, warning) | No agent has run yet; needs a mechanism Claude Code supports | Before the first agent-built sprint |
| Worktree sequence for parallel agents: compare via shared refs (HEAD vs main), and state who stages, commits and merges (Codex S1 cycle 1, warning) | Settled in the first sprint that runs parallel worktree agents | First parallel build sprint |
| Guard leftovers from Sprint 1's last review (reviewer cycle 13, judged implausible as mistakes): also check the other shell's joined text; a bash comment ending in a backslash before a continued PR merge; Notes, not blockers: the receipt guards `main`; GitHub's ruleset can't stop PR merges by agents (shared account) | Declined at the S1 close to avoid reopening the review | When a guard gap is hit in practice (S2: kept as notes; `gh api` merges now listed as a known limit in WORKFLOW) |
| A plain-language glossary (HEAD, worktree, hash, staging, CI run states) and a one-page close checklist for the owner (Codex S1 cycle 1, note) | Nice to have | Any docs sprint |

## Parking lot

Loose ideas. Nothing here is committed; the owner decides what gets promoted.

- Steam Deck and controller support: not a target for now (owner, 2026-10-08); it would mean reworking the
  interface and the performance budgets (ADR-005).
- LLM-voiced leader personalities for diplomacy dialogue (decisions stay rule-based; flavor only).
- A comedic "cheap knockoff" tone that plays on the working name (the owner's call, and the name itself is
  deferred to pre-release).
