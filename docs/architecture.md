# TemuCiv architecture

How the game is built: the parts, what each may depend on, and how a turn flows through them. The reasons live
in the decisions it cites (`docs/kb/INDEX.md`). Only the Orchestrator edits this file; it changes when a decision
does.

## The parts

```
  player ──► client (src/client) ─────── actions ───────►  simulation (src/sim)
             map: PixiJS                                    runs in a background thread;
             panels: React (HTML/CSS)  ◄─ views + events ─  owns the state and every rule
                                                                 ▲          │
  computer players (src/ai) ──────────── actions ────────────────┘          │
  own threads; each sees only its view ◄──────── views ─────────────────────┘

  desktop shell (src/app): the window, save files on disk, later Steam
```

- **The simulation** is the only place rules live (ADR-002). It is a state machine driven by actions: sealed
  orders, then one resolution for everyone, with battles inside the turn (ADR-010).
- **The client** draws each player's view and turns clicks into actions. It never computes a rule and never sees
  another player's hidden information (ADR-003).
- **Computer players** get the same view a human would and send the same actions (ADR-009).
- **The desktop shell** is Electron (ADR-011): it opens the window and reads and writes files, and knows nothing
  about the rules.

## Folders and boundaries

| Folder | What lives there | Written by | May depend on |
|---|---|---|---|
| `src/sim/` | Rules, state, actions, views, turn resolution; one folder per game system, named after the design (for example `map`, `cities`, `progress` for the leader web) | simulation | nothing in `src/` |
| `src/ai/` | Computer players | ai-player | `src/sim` (views, actions) |
| `src/client/` | Map rendering, panels, input, the turn replay | presentation | `src/sim` (views, actions, events) |
| `src/app/` | Electron shell, save files, packaging | platform | nothing in `src/` (files arrive as bytes) |
| `data/` | Content and balance numbers as JSON; schemas in `src/sim/content/` | content | — |
| `tests/` | Rule, determinism, replay, soak, performance and screenshot tests | test-qa | everything |
| `tools/` | CI, soak and replay scripts, governance tooling | platform, Orchestrator | everything |

The compiler enforces the boundaries; no extra tool is needed. Each part of `src/` is its own TypeScript project:
`src/sim` is compiled without browser or Node globals and references no other project, so `document`, `fs` or
an import from the client is a compile error there. A CI search also rejects `Math.random`, `Date.now` and
`new Date(` in `src/sim` (the sprint template's anti-pattern list), since those exist in every environment.

## A turn, end to end

1. The client shows the player's view. Each order is sent as an action; the simulation checks it at once, stores
   it as pending, and applies it at once if it touches only the player's own empire (ADR-010).
2. Computer players do the same from their own threads while the human plans.
3. When every player has ended the turn, the simulation resolves movement, then the battles one at a time, then
   end-of-turn upkeep.
4. Each player receives the new view and the turn's events, filtered by what they could see; the client plays the
   events back as the turn replay.

**Saves** are a snapshot of the state plus a format version, written by the shell. **Replays** and bug reports
are the settings, the seed and the action list; CI replays one and compares a hash of the final state.

## Stack and limits

PixiJS, React, Electron, JSON with Zod schemas, Vite, TypeScript strict, `node:test`, Playwright (ADR-011).
Tested envelope and performance budgets: ADR-005 (maps up to about 10,000 tiles, 12 players, 500 turns, on a
2020 mid-range laptop with mouse and keyboard).
