# Sprint 3: Prototype slice 1, the solo sandbox

| Field | Value |
|---|---|
| **Sprint** | 3 |
| **Status** | in-progress |
| **Dates** | 2026-10-15 → |
| **Base commit** | `ed7e65d` (the Sprint 2 close) |
| **Previous close on GitHub** | run `38799350275`: success (both jobs) |
| **Orchestrator model** | `claude-opus-5-5` (Claude Code 2.1.301) |
| **CI verified** | no |

## Playtest input

None (no playable build yet).

## Goal

The owner can play slice 1 of the throwaway prototype (M0.5) in a browser, with nothing to install: found cities,
order sites and buildings, haul food and stone between cities, and feel the moves budget.

## Entropy scan

| Check | Result | Detail |
|---|---|---|
| `npm run check-docs` | CLEAN | 64 files |
| Anti-pattern greps (below) | CLEAN | No code yet; the two `shortcut:` lines (ADR-010) are in the ROADMAP backlog |
| Orphaned files (last two sprints) | CLEAN | None untracked |
| Docs still match code | CLEAN | Reviewed at the Sprint 2 close |
| Harness review (every fifth sprint) | n/a | The Sprint 2 retrospective's rulebook proposal is TASK-301 |

## Plan

| Task | Agent | May write | Acceptance criteria → verified by | High-risk |
|---|---|---|---|---|
| TASK-301 | Orchestrator | `docs/CONVENTIONS.md`, `docs/WORKFLOW.md`, `docs/AGENTS.md`, `docs/architecture.md`, `.claude/agents/simulation.md`, ADR-002, ADR-009, `ROADMAP.md` | The prototype exception in wording the owner approved; the rule on decision records for unbuilt systems; a `prototype/` folder row and who writes it; the two one-word ADR fixes → owner OK, `check-docs` | no |
| TASK-302 | Orchestrator | `prototype/RULES.md` | Slice 1's rules: every rule traces to an owner ruling, a placeholder (P1 to P12) or is marked as engineering's proposal → owner may flag; review | no |
| TASK-303 | general-purpose agent (Opus) | `prototype/**` except `RULES.md` | Opens by double-click in Edge or Chrome with nothing installed; plays as `RULES.md` says; every number in `numbers.js`; a smoke run plays 300 turns of random valid orders with no error, no NaN and no negative store → `node prototype/smoke.js`, a screenshot, the owner's playtest | no (prototype) |
| TASK-304 | Orchestrator | `tools/ci.mjs` | CI runs the prototype's smoke check, and a broken prototype fails CI → `npm run ci`, one deliberate break seen failing | no |

Waves: 301 (owner OK first) → 302 → 303 → 304. TASK-303 uses a generic agent with the model named: the
simulation and presentation definitions carry standing instructions (determinism; never computing rules) that the
prototype exception sets aside. The ROADMAP item "Bash allowlist for read-only agents before the first agent-built
sprint" moves to the first sprint that builds in parallel worktrees (M1): one agent builds the prototype in the
shared tree, and the read-only agents' risk is the same as in Sprints 1 and 2.

## Plan review (step 2)

| Field | Value |
|---|---|
| **Trigger** | pending: depends on the owner's approval of the prototype exception (TASK-301) |

## Owner design rulings

**Production and coin (2026-10-15).** Answering the question the Sprint 2 review raised (does P6's "production
earns coin" apply beyond the prototype?): "Neither". Production only sets build speed, in the prototype and the
game; the 2026-10-04 ruling stands. A city with nothing to build simply waits. Coin in slice 1 comes from people
and from trade along routes; war adds coin in slice 2.

## Task log

## Design conformance

Not applicable: the prototype conforms to `prototype/RULES.md` (WORKFLOW, "Prototype phase"), checked by the
owner's playtest; no game rules in `src/` yet.

## Sprint-end review (step 7)

| Lens | Cycles | Findings | Final verdict | Stamp |
|---|---|---|---|---|
| Codex | | NB/NW/NN | | `<commit>` / `<hash prefix>` |
| Reviewer (`<model id>`) | | NB/NW/NN | | |

Findings and resolution: _one line each._

## Test summary

_Exact output of the real runs, never numbers from memory._

| Suite | Previous | Now | Change |
|---|---|---|---|

## Retrospective

- **Went well:**
- **To improve:**
- **Knowledge produced:**
- **Harness notes:**

## Handoff

- **State:** Sprint 3 opened on `sprint/3` from the Sprint 2 close (`ed7e65d`). Nothing built yet.
- **In flight:** nothing.
- **Waiting on:** the owner's approval of the prototype exception's wording (TASK-301; draft in
  `.claude/refinements/PROTOTYPE-exception-draft.md`).
- **Next action:** after the OK, apply TASK-301, write `prototype/RULES.md` from
  `.claude/refinements/PROTOTYPE-slice1-RULES-draft.md` (TASK-302), then spawn the prototype builder (TASK-303).
