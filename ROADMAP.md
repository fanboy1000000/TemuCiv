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
| **M3: Depth** | Research, combat, borders, fog of war; the AI learns each system as it lands | Something close to a real game |
| **M4: First complete game** | AI personalities and full strategy, victory conditions, save/load, headless soak games | **The first complete, playable game** |
| **M5: Alpha polish** | UI, balance from simulations, art pass, desktop packaging | Something you can show people |
| **M6+: Full development** | The ages after antiquity, and systems the owner prioritizes after the demo's playtests (e.g. diplomacy, wonders). The M4 game is a small antiquity-only demo that tests the basic ideas; the game itself spans several ages (owner, 2026-10-07) | |
| **Pre-release** | Final name, trademarks, asset licensing, AI-content disclosure, Steam setup | Ready to publish |

## Backlog

Deferred work with an owner and a reason. Items leave the backlog when a sprint plan picks them up.

| Item | Why deferred | Picked up by |
|---|---|---|
| Architecture decision: game loop (order collection, simultaneous turn resolution, battles inside the turn, turn replay; ADR-008), rendering library, UI approach, desktop wrapper (Electron vs Tauri), data format and schema, module layout, test framework | Next sprint's refinement | M0 |
| Design spec: owner writes `vision.md` and `scope.md` (templates in `docs/design/`) | Owner's work, at the owner's pace | M0 |
| Design: route the 2026-10-04 brainstorm rulings (Sprint 1 log, "Owner design rulings") into `docs/design/`, with the owner's OK | Brainstorm still in progress | M0 |
| `run-game` skill: the verified recipe for launching the game and taking screenshots | Needs a runnable build | M1 |
| CI steps for type check, lint, unit tests, data-schema validation and the determinism replay check | Needs code | M1 |
| Headless AI-vs-AI soak games and performance budgets in CI | Needs the simulation and AI players | M3–M4 |
| First harness review (docs/WORKFLOW.md, "Harness evolution") | Due at sprint 5 | S5 |

## Parking lot

Loose ideas. Nothing here is committed; the owner decides what gets promoted.

- LLM-voiced leader personalities for diplomacy dialogue (decisions stay rule-based; flavor only).
- A comedic "cheap knockoff" tone that plays on the working name (the owner's call, and the name itself is
  deferred to pre-release).
