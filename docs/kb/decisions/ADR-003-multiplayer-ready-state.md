# ADR-003: Single-player first, with a multiplayer-ready state model

| Field | Value |
|---|---|
| **Status** | accepted (owner ruling, 2026-09-30); hotseat ruled out by ADR-007 (2026-10-04), possible again under ADR-008 (2026-10-05); network format amended by ADR-010 (2026-10-08) |
| **Sprint** | S1 |
| **Areas** | simulation, ai-player, presentation, platform |

## Decision (plain language)

The game ships **single-player**, but nothing in the code may block **multiplayer later**. "Hotseat" (several
players taking turns on one computer) is a cheap option once the core works. Online multiplayer is not planned
for the first release.

*Amended (2026-10-05):* ADR-007 (real time) had ruled hotseat out. Under ADR-008 (simultaneous turns) it is
possible again: players give their orders one after another behind a hand-over screen, then the turn resolves.

## Why

Retrofitting multiplayer onto a game that wasn't designed for it usually means a rewrite. Keeping the door open
costs little now, because ADR-002 already requires most of it. Online multiplayer at launch would add servers,
lobbies, reconnection, sync bugs and anti-cheat work, which is too much for the first release.

## Rules this implies

- **All game state is serializable:** plain data that can be saved to a file or sent over a network. No hidden
  global state, and no functions or engine objects inside the state.
- **Each player gets their own view.** The simulation produces a per-player view containing only what that
  player may know. **Fog of war is enforced in the simulation**, not just hidden by the renderer. This is what
  makes cheating impossible later, and it's also what the AI players receive.
- **The UI never computes rules** and never reads another player's hidden information.
- **The human player has no special code path** compared with AI players or remote players.

## Alternatives rejected

| Alternative | Why not |
|---|---|
| Single-player only, no constraints | Locks out multiplayer without a rewrite |
| Online multiplayer at launch | A large extra workload that would delay the first release |

## Consequences

- *Amended by ADR-010:* the network never carries the full state, only actions in and each player's views and
  events out; saves are full snapshots.
- Tests must check that a player's view never contains hidden information.
