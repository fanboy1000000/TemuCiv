# ADR-010: The game loop: sealed orders, then one resolution for everyone

| Field | Value |
|---|---|
| **Status** | accepted (owner, 2026-10-08) |
| **Sprint** | S2 |
| **Areas** | simulation, ai-player, presentation, platform, test-qa |

## Decision (plain language)

A turn works like the board game Diplomacy: everyone writes **sealed orders**, then the turn resolves for all at
once (ADR-008). Inside the code, the simulation is a **state machine driven by actions** (ADR-002): it is always
in a known phase and waits for the actions that phase needs.

1. **Orders phase.** Each order is checked against the rules the moment it is given, so the screen can say "you
   can't move there", and is stored as pending, per player, in the game state.
   - Orders that touch only the player's own empire (production, buying ideas in the web) **take effect at
     once**, so the player sees the result.
   - Anything another player could notice (movement, attacks) **waits for resolution**.
   - Anything that reads other players (for example idea prices that fall when neighbors own the idea) uses
     the **start-of-turn picture**, so the order in which players click never changes the outcome.
   - A player ends the turn with `EndTurn`. When every player has, the turn resolves.
2. **Resolution, phase 1:** all movement at once, with the design's conflict rules applied in a fixed order.
3. **Resolution, phase 2:** battles, **one at a time in a fixed order**. Each battle waits for an action from
   the general whose initiative is highest. A human general's action comes from the player; a computer
   general's from the AI (ADR-009). If the combat spec decides battles resolve automatically, the human's
   generals are driven the same way, and nothing else changes.
4. **End of turn:** upkeep (yields, growth, borders, victory checks; defined by each system's spec), then the
   next orders phase.

Each player sees the resolution as a list of **events** filtered by their own view (ADR-003), which the client
plays back as the turn replay.

**A game is its settings, a seed and the list of actions.** A **save** is a snapshot of the state plus a format
version. The action list gives replays and reproduces any bug exactly; CI replays a recorded game and compares a
hash of the final state (ADR-002).

**Where it runs.** The simulation runs in a **background thread** (a Web Worker), and the screen talks to it only
by messages, so the screen never freezes while a turn resolves. Computer players run in their own threads and
think while the human plans. Tests and headless AI-vs-AI games run the same code directly in Node.

**Determinism in practice.** Rule arithmetic uses whole numbers (fractions as fixed-point, for example
hundredths); the random generator is a few lines of our own code whose state lives in the game state; collections
are processed in id order.

## Why

- **Immediate feedback where it is safe.** Checking orders at once and applying own-empire orders at once keeps
  the planning phase responsive, without letting one player's clicks affect another's turn.
- **Order independence is structural.** Waiting for resolution plus the start-of-turn picture makes
  ADR-008's rule ("the result never depends on submission order") hold by construction, not by care.
- **Battles fit naturally.** A state machine can pause for a battle the human plays by hand; a single "resolve
  the turn" function could not.
- **Pending orders in the state** mean a save made mid-turn restores the half-planned turn, and hotseat or
  online play (ADR-003) only changes who sends the actions.
- **A background thread from the start** costs little now; moving the simulation off the screen's thread later
  would touch every call between them.

## Alternatives rejected

| Alternative | Why not |
|---|---|
| Collect every order at End Turn, nothing applies before | Simpler, but planning feels dead: a purchase shows its effect only next turn |
| One "resolve the turn" function | Can't pause for battles the player commands by hand |
| Run the simulation on the screen's thread | Simpler, but the screen freezes during resolution and AI thinking on large maps |
| Floating-point rule arithmetic | Results can differ between machines and builds, which breaks replays and multiplayer |

## Rules this implies

- Every order is an action, validated when given. Pending orders and the start-of-turn picture are part of the
  serializable state (ADR-003).
- An order that another player could observe, or that changes what another player pays or sees, waits for
  resolution. Own-empire orders may apply at once.
- Battles are processed in a deterministic order; the next actor is chosen by initiative, with ties defined by
  the combat spec.
- No floating point in rule results; no `Math.random`, clock or timers in `src/sim` (ADR-002).
- The screen and the AI talk to the simulation only through messages: actions in, views and events out.

## Consequences

- Settles the game-loop question ADR-008 left to the architecture. The client needs a pending-orders display and
  a turn replay built from events.
- Save compatibility across versions: during the alpha, a save from an older format version is refused with a
  clear message, not migrated (a deliberate shortcut, recorded in the code when saves are built).
