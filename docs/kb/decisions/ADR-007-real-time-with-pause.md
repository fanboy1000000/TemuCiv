# ADR-007: Real time with pause, on a fixed-step simulation clock

| Field | Value |
|---|---|
| **Status** | superseded by ADR-008 (owner ruling, 2026-10-05): the game is turn-based again. Kept as the record of the reversal |
| **Sprint** | S1 |
| **Areas** | simulation, ai-player, presentation, platform, test-qa |

## Decision (plain language)

TemuCiv is **not turn-based**. Time runs continuously, and the player can **pause at any moment** and **choose the
game speed**, as in Paradox's grand-strategy games (Europa Universalis, Hearts of Iron).

Underneath, the simulation still advances in small, fixed steps called **ticks** (for example, one in-game day).
The client decides how many ticks run per real second (the speed setting) and runs none while the game is paused.
The simulation itself never reads a clock.

## Why

- **Owner ruling.** Continuous time with pause was chosen over real-time without pause and over simultaneous
  planning phases (design brainstorm, 2026-10-04).
- **It suits logistics**, which the owner has made a major feature: food, goods and armies move and run short
  over time, instead of in jumps between turns.
- **Fixed ticks keep ADR-002 intact.** Time advances in counted steps that the client drives, so the simulation
  stays headless and deterministic: the same seed plus the same actions, each stamped with the tick at which it
  applies, always produce the same game. Tests can run thousands of ticks without a screen or a clock.

## Rules this implies

- The simulation offers "advance one tick". It never reads wall-clock time, timers or the frame rate. Real time,
  speed and pause live in the client.
- **Every action is stamped with the tick it applies at.** Actions given while paused apply at the current tick,
  in a deterministic order. A replay is the starting state plus the stamped action list.
- Tick length and every rate (production, movement, growth, consumption) are pacing values in data (ADR-004,
  ADR-005), expressed per tick, never per frame.
- The renderer may animate smoothly between ticks, but it never computes a game result.
- **Performance budgets are per tick:** the simulation and the AI players must keep up with the fastest speed
  setting on the largest supported map (ADR-005).
- AI players act through the same actions on the same ticks as a human. They get no extra time and see only
  their own view.

## Alternatives rejected

- **Turn-based** (the original premise): the owner wants continuous time.
- **Real-time without pause:** rewards reflexes over decisions, and rushes the strategy and logistics layers.
- **Simultaneous phases** (everyone gives orders, then time runs for a fixed span): keeps planning points, but
  breaks up the continuous flow the owner wants.
- **A time step tied to the frame rate:** gives different results on different machines; ruled out by ADR-002.

## Consequences

- "Turn-based" is replaced across the docs. "Turn count" becomes "game length"; "turn processing" becomes "tick
  processing".
- **Hotseat** multiplayer (ADR-003: players taking turns on one computer) no longer applies and leaves the roadmap.
  Online multiplayer, if it comes, fits a lockstep model: every machine runs the same ticks with the same stamped
  actions.
- The architecture work must cover the game loop: tick length, the client's speed control, and smooth rendering
  between ticks.
- Determinism gains one more risk to review: nothing that runs per tick may depend on frame timing.
