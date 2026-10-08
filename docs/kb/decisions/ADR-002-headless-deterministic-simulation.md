# ADR-002: A headless, deterministic simulation driven by actions

| Field | Value |
|---|---|
| **Status** | accepted (2026-09-30) |
| **Sprint** | S1 |
| **Areas** | simulation, ai-player, presentation, test-qa |

## Decision (plain language)

All game rules live in one **simulation** layer that runs **without graphics** (headless). The screen only
displays the simulation's state and sends the player's choices back as **actions** (e.g. `MoveUnit`,
`FoundCity`, `AcquireIdea`). The simulation checks every action against the rules before applying it.

The simulation is **deterministic**: the same starting seed plus the same list of actions always produces
exactly the same game. The only source of randomness is a seeded random-number generator that is part of the
game state.

## Why

This is the single most important engineering decision, because nearly everything else depends on it:
- **Automated testing of every rule.** Tests can run thousands of rules checks without a screen.
- **The AI can verify its own work.** Headless AI-vs-AI games can run overnight to find crashes and produce
  balance statistics.
- **Every bug can be reproduced.** A seed and an action list replay the exact game that failed.
- **Save/load, replays and multiplayer come almost for free:** each is "the starting state plus the actions".
- **Computer players are ordinary players.** They use the same actions as a human, so they can't cheat and
  don't need their own rule code.

## Rules this implies

- `src/sim/**` imports nothing from rendering, UI, AI or app code, and uses no DOM, timers, clock, network or file
  system. It never calls `Math.random()`, `Date.now()` or `new Date()`.
- Every state change goes through a validated action. The human player has no special code path.
- Iteration order must be deterministic: no reliance on the order of unordered collections, and care with
  floating point in rules (integer or fixed-point where results must match exactly across machines).
- A **determinism check** runs in CI once code exists: replay a recorded game and compare a hash of the final
  state.

## Alternatives rejected

- **Game logic inside the UI or engine objects** (common in engine-based games): fast to start, but rules
  can't be tested without a screen, bugs are hard to reproduce, and multiplayer requires a rewrite.

## Consequences

- The constraint-validator checklist (docs/AGENTS.md) enforces the import and randomness rules on every change.
- UI features that seem to need a rule result must get it from the simulation, never re-implement it.
