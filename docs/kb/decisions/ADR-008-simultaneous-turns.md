# ADR-008: Turn-based, with simultaneous turns on the world map

| Field | Value |
|---|---|
| **Status** | accepted (owner ruling, 2026-10-05); supersedes ADR-007 |
| **Sprint** | S1 |
| **Areas** | simulation, ai-player, presentation, platform, test-qa |

## Decision (plain language)

TemuCiv is **turn-based**. The real-time-with-pause ruling (ADR-007) is reversed.

- **On the world map, everyone plays the same turn at the same time** (simultaneous turns). Every player gives
  orders, and when all have ended their turn, the turn resolves for everyone at once.
- **A turn has two phases:** (1) city management and movement, (2) combat. Hostile armies that are adjacent
  after movement fight.
- **Battles are fought turn by turn on a separate, finer battle map.** There, the general with the highest
  **initiative** acts first. Initiative is a stat of generals, to be defined in the combat spec.

## Why

- **Owner ruling.** Thinking through combat (armies led by generals, supply lines that follow the general,
  battles on a finer map) showed that it needs discrete turns with a separate combat phase (design brainstorm,
  2026-10-05).
- **Simultaneous turns make adjacency combat fair.** Nobody moves knowing where the others moved this turn, so
  "armies that end up adjacent fight" rewards anticipation, not who moves last. It also keeps the sense of
  things happening at the same time, and nobody waits for anybody.
- **Initiative in battle** makes the general matter: a battle is a local contest where the order of action
  counts, and a stat decides it.
- **Determinism (ADR-002) gets simpler.** The game advances one whole turn at a time from collected orders.

## Rules this implies

- **The simulation offers "resolve turn".** It takes every player's orders for the turn and produces the next
  state: phase 1, then phase 2. It never reads a clock. A replay is the starting state plus each turn's orders
  from every player, plus the actions taken in battles.
- **The result never depends on submission order.** Who clicked "end turn" first, or player numbering, must
  not change the outcome. Conflicts between simultaneous orders (two armies entering the same tile, armies
  swapping places) are settled by explicit rules in the design, applied in a fixed, deterministic order.
- **Which orders apply at once and which wait for resolution** is an architecture decision (the game loop). The
  rule: anything that can affect another player waits for resolution. Orders that touch only the player's own
  state may apply at once.
- **Battles** run in phase 2 in a deterministic order. Each battle map is generated from the world tiles
  involved and the game seed, so the same tile always unfolds the same way. Within a battle, generals act in
  initiative order, and the combat spec defines ties.
- **Each player sees the resolution through their own view.** The turn's events ("the enemy army moved here,
  then a battle started") are filtered by fog of war like the state itself (ADR-003).
- **AI players** give orders for the same turn from their own view, with no knowledge of anyone's orders for
  that turn, through the same actions as a human.
- **Performance budgets are per turn:** turn-resolution time and AI planning time on the largest supported map
  (ADR-005), because the player waits on them after ending a turn.

## Alternatives rejected

- **Real time with pause** (ADR-007): reversed, because combat needs discrete turns and a combat phase.
- **One player after another on the world map** (classic Civ): players who move later in a round react to the
  earlier ones, and in multiplayer everyone waits.
- **Sequential movement, then all battles at the end of the round:** the last player to move sees every other
  move and can dodge or pounce.

## Consequences

- ADR-007 is superseded. "Tick" wording is replaced with "turn" across the docs. Game length (ADR-005) is now a
  number of turns, still a setting.
- **Hotseat** (ADR-003) is possible again in a simultaneous form: players give their orders one after another
  behind a hand-over screen, then the turn resolves. Online multiplayer, if it comes, fits naturally: collect
  everyone's orders, resolve once.
- The movement and combat specs must include **collision rules** for simultaneous movement.
- The client needs a clear **turn replay** that shows what happened during resolution.
- The architecture work must cover the game loop: order collection, turn resolution, battles inside the turn,
  and the turn replay. Settled by ADR-010 (2026-10-08).
- Open, in the combat spec: whether the player commands battles by hand, and what initiative is made of.
