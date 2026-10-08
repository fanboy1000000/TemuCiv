# ADR-005: Built to scale: game size and length are settings

| Field | Value |
|---|---|
| **Status** | accepted (2026-09-30); tick wording from ADR-007 reverted to turns (ADR-008, 2026-10-05); tested envelope added (S2, 2026-10-08) |
| **Sprint** | S1 |
| **Areas** | simulation, ai-player, presentation, test-qa |

## Decision (plain language)

Game length is the owner's design decision. Engineering's job is to make **any length possible**: map size,
player count and game length are settings, and pacing values live in data so a game-speed setting can scale them.

*Amended (2026-10-08): the tested envelope.* "Any size" needs numbers to be testable. These are test targets, not
design limits or hard caps: larger settings still work, they just aren't measured.

| Setting | Tested up to |
|---|---|
| Map | about 10,000 tiles (Civilization VI's largest map is about 7,000) |
| Players | 12 |
| Game length | 500 turns |

At the largest settings, late in a game, on the reference machine: a turn resolves (rules only) in under
1 second; the player waits at most 2 seconds after End Turn, computer players included; the map pans and zooms at
60 frames per second at 1080p. The **reference machine** is a mid-range laptop from about 2020 (4 cores, 8 GB of
memory, integrated graphics, a 1080p screen), played with mouse and keyboard. Steam Deck and controllers are not a
target for now (owner, 2026-10-08); supporting them later means reworking the interface and these budgets.

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
