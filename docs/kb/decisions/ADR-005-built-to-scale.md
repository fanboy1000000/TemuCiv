# ADR-005: Built to scale: game size and length are settings

| Field | Value |
|---|---|
| **Status** | accepted (2026-09-30); tick wording from ADR-007 reverted to turns (ADR-008, 2026-10-05) |
| **Sprint** | S1 |
| **Areas** | simulation, ai-player, presentation, test-qa |

## Decision (plain language)

Game length is the owner's design decision. Engineering's job is to make **any length possible**: map size,
player count and game length are settings, and pacing values live in data so a game-speed setting can scale them.

## Why

The owner judges the game by its first 90 minutes, and a compact complete game may be the first target. If later
playtests show the game wants to be longer, scaling up must not need a rewrite. The **technical** side of
scaling is cheap if it's planned from the start. The **design** side (whether a long game stays fun, e.g.
late-game micromanagement) is the owner's, and engineering flags where a design would scale badly.

## Rules this implies

- No hard-coded limits on map size, player count or game length.
- Costs, growth rates and other pacing values live in data (ADR-004), so game speed can multiply them.
- **Performance budgets are tested at large scale** (large maps, many players), not only with the default setup.
  Examples: turn-resolution time, AI planning time per turn, rendering frame time.
- System designs are sanity-checked with the question: "How does this behave with 20 cities late in a long
  game?"

## Consequences

- CI gets performance-budget checks on large generated maps once the simulation exists.
- Headless simulations regularly run at the largest supported settings.
