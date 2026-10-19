# TemuCiv Roadmap

> The forward view: milestones, the backlog of deferred work, and a parking lot for ideas. Only the Orchestrator
> edits it; at every sprint close, unscheduled follow-ups are routed into the backlog (docs/WORKFLOW.md, step 8).
> Sprint-level plans live in the sprint logs, and shipped work in `docs/sprints/INDEX.md`.

## Milestones

Milestones are ordered by dependency. The sprints each one takes are projections, not commitments.

| Milestone | Goal | Delivers |
|---|---|---|
| **M0: Design** (current) | Governance, architecture, the owner's vision and scope | Workflow and gates; `docs/architecture.md` (done, S2); `docs/design/vision.md` and `scope.md` (the owner's, alongside M0.5) |
| **M0.5: Prototype** (owner, 2026-10-15) | Feel how the untested ideas play together before production: a rough, throwaway build in slices, one sprint each. 1: solo sandbox (moves budget, coin and goods, hauling; done, Sprint 3); 2: a rival and armies (done, Sprint 4: armies, baggage and supply, a passive rival); 3: a draft of the leader web, and a starting army (Sprint 5; the category scores wait for a slice in which the rival acts, owner W1, Sprint 5 log) | Builds the owner plays; the lessons go into `docs/design/`. The code is thrown away, and production (M1) starts fresh |
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
| Design brainstorm, carried over: the economy (coin and goods, ruled 2026-10-15 as C2, Sprint 2 log; details parked for the economy spec); the big shape of logistics (routes designed once, then automatic: proposed) and of cities (stability, sanitation); ruling a large empire (moves budget: K1 and K3–K6 ruled 2026-10-13, K2 replaced by K5, investing still a lean; open: anything beyond last orders for the parts nobody spends a move on; showing where a move pays off is left to the interface design) | Paused for the prototype: some answers will come from play (owner, 2026-10-15) | M0–M0.5 |
| Design spec: owner writes `vision.md` and `scope.md` (templates in `docs/design/`) | Owner's work, at the owner's pace | M0 |
| Design: route the brainstorm rulings (Sprint 1, 2 and 3 logs, "Owner design rulings") into `docs/design/`, with the owner's OK; include renaming "research" to "progress" in `docs/design/README.md` | Brainstorm still in progress | M0 |
| `run-game` skill: the verified recipe for launching the game and taking screenshots | Needs a runnable build | M1 |
| M1 setup per ADR-011: Vite, TypeScript strict (`erasableSyntaxOnly`), one TypeScript project per part of `src/`, `node:test`, Playwright; CI steps for the type check, tests, data-schema validation, the `src/sim` search for `Math.random`/`Date.now`/`new Date(`, and the determinism replay | Needs code | M1 |
| Headless AI-vs-AI soak games and performance budgets in CI; measure each order or action kind's coverage across many seeds, not only the CI seed (the prototype's smoke game, S5 TASK-504) | Needs the simulation and AI players | M3–M4 |
| Read-only agents (reviewer, constraint-validator, trace) have unrestricted Bash; replace with an enforced read/test allowlist (Codex S1 cycle 1, warning) | Needs a mechanism Claude Code supports. Sprint 3: one agent builds the throwaway prototype in the shared tree, and the read-only agents' risk is the same as in Sprints 1 and 2. Sprint 4: the reviewer wrote a scratch file outside the repository (cycle 5) | Before the first sprint that builds in parallel worktrees (M1) |
| Worktree sequence for parallel agents: compare via shared refs (HEAD vs main), and state who stages, commits and merges (Codex S1 cycle 1, warning) | Settled in the first sprint that runs parallel worktree agents | First parallel build sprint |
| Guard leftovers from Sprint 1's last review (reviewer cycle 13, judged implausible as mistakes): also check the other shell's joined text; a bash comment ending in a backslash before a continued PR merge; Notes, not blockers: the receipt guards `main`; GitHub's ruleset can't stop PR merges by agents (shared account) | Declined at the S1 close to avoid reopening the review | When a guard gap is hit in practice (S2: kept as notes; `gh api` merges now listed as a known limit in WORKFLOW) |
| ADR-010 shortcut: computer players share the simulation's thread | Upgrade when the 2-second End Turn wait or the 100-millisecond order answer (ADR-005) fails | M3–M4 measurements |
| ADR-010 shortcut: during the alpha, a save from another format, game or content version is refused, not migrated | Upgrade when outside players have saves worth keeping | M5 |
| Computer players' randomness and memory (Sprint 2 review, waived 2026-10-15): every derived random source one-way with its own label (computer players, the orders-phase stream, battle maps), a seed too big to guess, the choice of generator, a separate source for map generation; how a computer player's memory between turns enters the game state through an action and comes back in its own view | Details of systems not yet built; each fix in review raised the next | M1 (the random generator), M2 (the first computer player), before those agents start |
| Remove the prototype when production starts: delete the `prototype/` folder, then check every search result for "prototype" outside `prototype/` and `docs/sprints/` and remove only what governs work (the CI step and job name, the rule text in CONVENTIONS, WORKFLOW, AGENTS and the reviewer definition, the architecture row). Keep the record: the M0.5 milestone row is marked done, not deleted, and design notes, playtest notes and lessons stay | The prototype is throwaway (owner, D1) | M1, first sprint |
| Slice 2 playtest watch items: "1 turn left (if it wins)" may read ambiguously; settlers can walk across rival land and onto a rival city's tile (RULES doesn't forbid it); the builder's readings of unclear rules (Sprint 4 log, TASK-403) | Left for the owner's playtest | The owner's playtest of slice 2 |
| A plain-language glossary (HEAD, worktree, hash, staging, CI run states) and a one-page close checklist for the owner (Codex S1 cycle 1, note) | Nice to have | Any docs sprint |

## Parking lot

Loose ideas. Nothing here is committed; the owner decides what gets promoted.

- Districts as a mix of buildings (owner's notes, 2026-10-19): a district on a tile holds several buildings, and
  the best mix depends on sanitation, density, the tile's yields and combinations. Brainstorm paused: six
  engineering challenges, to take one at a time; the first ("where do people live?", lean C: one population pool
  per city, density and sanitation per district) is asked and unanswered. Working notes:
  `.claude/refinements/REFINEMENT-districts.md`.

- Steam Deck and controller support: not a target for now (owner, 2026-10-08); it would mean reworking the
  interface and the performance budgets (ADR-005).
- LLM-voiced leader personalities for diplomacy dialogue (decisions stay rule-based; flavor only).
- A comedic "cheap knockoff" tone that plays on the working name (the owner's call, and the name itself is
  deferred to pre-release).
