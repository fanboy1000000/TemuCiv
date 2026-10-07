# TemuCiv Roadmap

> The forward view: milestones, the backlog of deferred work, and a parking lot for ideas. Only the Orchestrator
> edits it; at every sprint close, unscheduled follow-ups are routed into the backlog (docs/WORKFLOW.md, step 8).
> Sprint-level plans live in the sprint logs, and shipped work in `docs/sprints/INDEX.md`.

## Milestones

Milestones are ordered by dependency. The sprints each one takes are projections, not commitments.

| Milestone | Goal | Delivers |
|---|---|---|
| **M0: Design** (current) | Governance, architecture, the owner's vision and scope | Workflow and gates; `docs/architecture.md`; `docs/design/vision.md` and `scope.md` |
| **M1: Foundation** | Project skeleton, hex grid, map generation, rendering, camera; CI for types, lint, tests and determinism | A map you can scroll |
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
| Sprint 2 opening, from the Sprint 1 learnings (proposed 2026-10-08, pending the owner's approval): adopt ponytail's "build the minimum" ladder in CONVENTIONS, with review questions and marked shortcuts; tests in proportion to risk (rewording invariant 7); a GitHub branch rule for `main`; bring the harness review forward and apply the ladder to the whole rulebook; review prompts that treat edge cases of a mistake-guard as notes | Owner decisions first (CONVENTIONS changes) | S2 |
| Architecture decision: game loop (order collection, simultaneous turn resolution, battles inside the turn, turn replay; ADR-008), rendering library, UI approach, desktop wrapper (Electron vs Tauri), data format and schema, module layout, test framework | Sprint 2: the owner asked for a sprint that analyzes the technical design choices (2026-10-07) | S2 |
| ADR-005's supported envelopes: configurable map size, player count and game length limits with performance targets, so "built to scale" can be tested (Codex S1 cycle 1, warning) | Belongs to the architecture decision | S2 |
| Design brainstorm, carried over: which economy pays for units and buildings (lean: one coin plus a few physical goods hauled by logistics); the big shape of logistics (routes designed once, then automatic: proposed) and of cities (stability, sanitation) | The owner moved to the technical sprint first | M0 |
| Design spec: owner writes `vision.md` and `scope.md` (templates in `docs/design/`) | Owner's work, at the owner's pace | M0 |
| Design: route the 2026-10-04 brainstorm rulings (Sprint 1 log, "Owner design rulings") into `docs/design/`, with the owner's OK | Brainstorm still in progress | M0 |
| `run-game` skill: the verified recipe for launching the game and taking screenshots | Needs a runnable build | M1 |
| CI steps for type check, lint, unit tests, data-schema validation and the determinism replay check | Needs code | M1 |
| Headless AI-vs-AI soak games and performance budgets in CI | Needs the simulation and AI players | M3–M4 |
| First harness review (docs/WORKFLOW.md, "Harness evolution"); include whether refinement-level dual review pays for itself and whether sprint logs should stay outside the review hash (Codex S1 notes) | Due at sprint 5 | S5 |
| Read-only agents (reviewer, constraint-validator, trace) have unrestricted Bash; replace with an enforced read/test allowlist (Codex S1 cycle 1, warning) | No agent has run yet; needs a mechanism Claude Code supports | Before the first agent-built sprint |
| Worktree sequence for parallel agents: compare via shared refs (HEAD vs main), and state who stages, commits and merges (Codex S1 cycle 1, warning) | Settled in the first sprint that runs parallel worktree agents | First parallel build sprint |
| Rename "research" as a system (WORKFLOW, AGENTS, the simulation agent, the design README, ADR-002's `SetResearch` example): progress is the leader web in rings (Sprint 1 review note) | Renamed with the module layout | S2 |
| A GitHub branch rule for `main` (only reviewed closes: no force-push, no merges on GitHub); the local hooks can't see cherry-pick, rebase or GitHub-side changes (Sprint 1 review note) | Changes the owner's GitHub settings; ask first | Before the first agent-built sprint |
| A plain-language glossary (HEAD, worktree, hash, staging, CI run states) and a one-page close checklist for the owner (Codex S1 cycle 1, note) | Nice to have | Any docs sprint |

## Parking lot

Loose ideas. Nothing here is committed; the owner decides what gets promoted.

- LLM-voiced leader personalities for diplomacy dialogue (decisions stay rule-based; flavor only).
- A comedic "cheap knockoff" tone that plays on the working name (the owner's call, and the name itself is
  deferred to pre-release).
