# ADR-010: The game loop: sealed orders, then one resolution for everyone

| Field | Value |
|---|---|
| **Status** | accepted (owner, 2026-10-08); amends ADR-002, ADR-003 and ADR-008 where noted |
| **Sprint** | S2 |
| **Areas** | simulation, ai-player, presentation, platform, test-qa |

## Decision (plain language)

A turn works like the board game Diplomacy: everyone writes **sealed orders**, then the turn resolves for all at
once (ADR-008). Inside the code, the simulation is a **state machine driven by actions** (ADR-002): it is always
in a known phase and waits for the actions that phase needs. This replaces ADR-008's single "resolve turn"
step, which could not pause for a battle the player fights by hand.

1. **Orders phase.** Each order is checked against the rules the moment it is given, so the screen can say "you
   can't move there".
   - Orders that touch only the player's own empire (production, buying ideas in the web) **take effect once,
     when given**, so the player sees the result. They are recorded in the action list, not kept as pending.
     Changing one's mind is a new order under that system's own rules (for example, switching production).
   - Anything another player could notice (movement, attacks) is **stored as pending** in the game state and
     waits for resolution.
   - Anything that reads other players (for example idea prices that fall when neighbors own the idea) uses
     the **start-of-turn picture**. A player's view during this phase shows others as they were at the start
     of the turn, their own empire as it is now, and never anyone else's pending orders.
   - A player ends the turn with `EndTurn`. When every player has, the turn resolves.
2. **Resolution, phase 1:** all movement at once, with the design's conflict rules applied in a fixed order.
3. **Resolution, phase 2:** battles, **one at a time in a fixed order**. Each battle waits for an action from
   the general whose initiative is highest. A human general's action comes from the player; a computer
   general's from the AI (ADR-009). If the combat spec decides battles resolve automatically, the human's
   generals are driven the same way, and nothing else changes.
4. **Upkeep, then the next turn:** upkeep (yields, growth, borders, victory checks) runs once per resolution, at
   the point the cities and combat specs choose, before or after the battles (does a city attacked this turn
   still grow?); the state machine supports either. Then the next orders phase begins.

Each player sees the resolution as a list of **events** filtered by their own view (ADR-003), which the client
plays back as the turn replay.

**Three different records.** A **save** is a snapshot of the state plus its format version and the game and
content versions it was made with: fast to load. A
**replay or bug report** is the settings, the seed, the action list, and the game and data versions: it
reproduces the game exactly; CI replays one and compares a hash of the final state (ADR-002). **Network play**,
if it comes, carries actions in and each player's own views and events out, never the full state (ADR-003).

**Where it runs.** The simulation runs in a **background thread** (a Web Worker), and the screen talks to it only
by messages, so the screen never freezes while a turn resolves. Computer players run in the same background
thread and think while the human plans, in small slices of their work budget, so an order the human gives is
answered between slices; they receive only their views. Tests and headless AI-vs-AI games run the
same code directly in Node.

**Determinism in practice.** Rule arithmetic uses whole numbers (fractions as fixed-point, for example
hundredths); the random generator is a few lines of our own code whose state lives in the game state; collections
are processed in id order.

## Why

- **Immediate feedback where it is safe.** Checking orders at once and applying own-empire orders at once keeps
  the planning phase responsive, without letting one player's clicks affect another's turn.
- **Order independence is structural.** Waiting for resolution, the start-of-turn picture and the randomness rule
  below make ADR-008's rule ("the result never depends on submission order") hold by construction, not by care.
- **Battles fit naturally.** A state machine can pause for a battle the human plays by hand.
- **Pending orders in the state** mean a save made mid-turn restores the half-planned turn, and hotseat or
  online play (ADR-003) only changes who sends the actions.
- **A background thread from the start** costs little now; moving the simulation off the screen's thread later
  would touch every call between them. Separate threads for computer players have no measured need yet.

## Alternatives rejected

| Alternative | Why not |
|---|---|
| Collect every order at End Turn, nothing applies before | Simpler, but planning feels dead: a purchase shows its effect only next turn |
| One "resolve the turn" function (ADR-008's wording) | Can't pause for battles the player commands by hand |
| Run the simulation on the screen's thread | Simpler, but the screen freezes during resolution and AI thinking on large maps |
| Floating-point rule arithmetic | Results can differ between machines and builds, which breaks replays and multiplayer |

## Rules this implies

- Every order is an action, validated when given. Pending orders and the start-of-turn picture are part of the
  serializable state (ADR-003).
- An order that another player could observe, or that changes what another player pays or sees this turn, waits
  for resolution. Own-empire orders apply once, when given (others' prices read the start-of-turn picture).
- Nothing applied during the orders phase draws from the shared random stream. Randomness waits for resolution,
  or comes from a stream derived from the seed, the turn and the player.
- A computer player's choices depend only on its view, its own decision seed (derived from the game seed and the
  player) and a **work budget** (for example a number of search steps), never on the clock or on when other
  actions arrived. Its thinking time is measured against the budgets (ADR-005), not used to stop it.
- Views never carry the game seed or the random generator's state, so no player can rebuild what fog of war
  hides (ADR-003).
- For look-ahead (ADR-009), the AI may run the simulation's pure rule functions on hypothetical states it builds
  from its own view. It never receives the real state.
- Battles are processed in a deterministic order; the next actor is chosen by initiative, with ties defined by
  the combat spec.
- No floating point in rule results; no `Math.random`, clock or timers in `src/sim` (ADR-002).
- The screen talks to the simulation only through messages: actions in, views and events out.

## Consequences

- Amends ADR-008 (resolution is a state machine, not one function), ADR-002 (saves are snapshots; replays are
  the action list) and ADR-003 (the network never carries the full state). The client needs a pending-orders
  display and a turn replay built from events.
- shortcut: computer players share the simulation's thread; upgrade to their own threads when the 2-second wait
  after End Turn or the 100-millisecond order answer (ADR-005) fails.
- shortcut: during the alpha, a save from another format, game or content version is refused with a clear
  message and left untouched on disk, not migrated; upgrade when outside players have saves worth keeping (M5).
