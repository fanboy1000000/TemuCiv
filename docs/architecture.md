# TemuCiv architecture

How the game is built: the parts, what each may depend on, and how a turn flows through them. The reasons live
in the decisions it cites (`docs/kb/INDEX.md`). Only the Orchestrator edits this file; it changes when a decision
does.

## The parts

```
  player ──► client (src/client) ─── actions ───►  background thread
             map: PixiJS                            ├─ simulation (src/sim): the state and every rule
             panels: React (HTML/CSS) ◄─ views ───  └─ computer players (src/ai): see only their views
                                         + events

  desktop shell (src/app): the window, save files on disk, later Steam
```

- **The simulation** is the only place rules live (ADR-002). It is a state machine driven by actions: sealed
  orders, then one resolution for everyone, with battles inside the turn (ADR-010).
- **The client** draws each player's view and turns clicks into actions. It never computes a rule and never sees
  another player's hidden information or pending orders (ADR-003).
- **Computer players** get the same view a human would and send the same actions (ADR-009). They run in the
  simulation's background thread for now (ADR-010).
- **The desktop shell** is Electron (ADR-011): it opens the window and reads and writes files, and knows nothing
  about the rules.

## Folders and boundaries

| Folder | What lives there | Written by | May depend on |
|---|---|---|---|
| `src/sim/` | Rules, state, actions, views, events, turn resolution, content schemas (`content/`); one folder per game system, named after the design (for example `map`, `cities`, `progress` for the leader web) | simulation | nothing in `src/` |
| `src/ai/` | Computer players | ai-player | `src/sim`: views, actions, and pure rule functions run on states built from its own view (look-ahead, ADR-010) |
| `src/client/` | Map rendering, panels, input, the turn replay; `worker/` is the background thread's entry, which starts the simulation and the computer players and relays messages | presentation | `src/sim` (views, actions, events); `worker/` also `src/ai` |
| `src/app/` | Electron shell, save files, packaging | platform | nothing in `src/` (files arrive as bytes) |
| `data/` | Content and balance numbers as JSON | content | — |
| `tests/` | Rule, determinism, replay, soak, performance and screenshot tests | test-qa | everything |
| `tools/` | CI, soak and replay scripts, governance tooling | platform, Orchestrator | everything |

**How content reaches the rules.** `src/sim` never reads files. It receives the content as a value when a game
starts and checks it against its schemas. The client bundles `data/*.json` at build time; tests and tools read
the files from disk.

**Enforcement.** Each part of `src/` is its own TypeScript project. `src/sim` is compiled without browser or Node
globals and references no other project, so `document`, `fs` or an import from the client is a compile error
there. Planned for M1: a CI search rejecting `Math.random`, `Date.now` and `new Date(` in `src/sim`, which exist
in every environment. The compiler can't stop AI code from reading more than its view if it were handed the real
state; that stays a checklist item (AGENTS.md, item 3).

## A turn, end to end

1. The client shows the player's view. Each order is sent as an action; the simulation checks it at once and
   either applies it (own empire only) or stores it as pending (ADR-010).
2. Computer players do the same while the human plans.
3. When every player has ended the turn, the simulation resolves movement and then the battles one at a time;
   upkeep runs once, before or after the battles, as the cities and combat specs choose (ADR-010).
4. Each player receives the new view and the turn's events, filtered by what they could see; the client plays the
   events back as the turn replay.

Saves, replays and network play are three different records (ADR-010). The stack is ADR-011; the tested envelope
and performance budgets are ADR-005.
