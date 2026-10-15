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
| **Trigger** | SKIP. TASK-301 is the only invariant change, and the owner approved its exact wording (2026-10-15); TASK-302 to 304 are prototype work, which that rule exempts from plan review. The sprint-end review covers TASK-301 and TASK-304 at the normal bar |

## Owner design rulings

**Production and coin (2026-10-15).** Answering the question the Sprint 2 review raised (does P6's "production
earns coin" apply beyond the prototype?): "Neither". Production only sets build speed, in the prototype and the
game; the 2026-10-04 ruling stands. A city with nothing to build simply waits. Coin in slice 1 comes from people
and from trade along routes; war adds coin in slice 2.

**The prototype exception (2026-10-15).** Approved as written: the CONVENTIONS sentence ("The one exception is the
throwaway prototype in `prototype/`, which follows lighter rules (WORKFLOW, "Prototype phase")."), the workflow
section it points to, and the rule that a decision record for a system not yet built records only the decision,
its details being settled by the sprint that builds it (a missing detail is a NOTE until then). Sprint 3 skips its
plan review on this approval.

## Task log

### TASK-301: the prototype exception and the decision-record rule

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end · Files:
`docs/CONVENTIONS.md`, `docs/WORKFLOW.md`, `docs/AGENTS.md`, `docs/architecture.md`, `.claude/agents/simulation.md`,
ADR-002, ADR-009, `ROADMAP.md`. Criteria: owner OK on the wording PASS; `check-docs` PASS.

CONVENTIONS gains the approved sentence (one other line rewrapped, no words changed, to stay within 100 lines).
WORKFLOW gains "Prototype phase (M0.5)" and the decision-record rule under "Review cycles". AGENTS says who writes
`prototype/` and that only checklist items 1 and 9 apply there; the architecture's folder table has the row. Carried
from the Sprint 2 review: the simulation definition names the rulings in sprint logs; ADR-002 says "content
versions"; ADR-009's status line lists its Sprint 2 amendments. The ROADMAP Bash-allowlist item moves to M1.

### TASK-302: slice 1's rules

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end · Files: `prototype/RULES.md`.
Criteria: every rule traces to an owner ruling, a placeholder or is marked "(eng.)" PASS; the owner may flag any.

Written from P1 to P12, the P6 answer (a city with nothing to build waits) and engineering's proposals. Settled
here (all "(eng.)"): undo takes back this turn's orders one at a time and returns their move and costs (the
Sprint 2 reviewer's note on misclicks); distances are counted in hexes; a settler takes its person when finished;
people not at a site still eat, pay coin and add production. Starting numbers live in `numbers.js` for the owner.

### TASK-303: build slice 1

Status complete · Agent: general-purpose (Opus, model named at spawn) · Checklist items 1 and 9 pass · Review:
sprint-end (light bar) · Files: `prototype/index.html`, `numbers.js`, `game.js`, `ui.js`, `smoke.js`, `README.md`;
`prototype/RULES.md` and `game.js` touched by the Orchestrator (food refund, below). Criteria: opens by double-click
PASS (headless Edge screenshot, checked by the Orchestrator); plays as `RULES.md` says PASS on the agent's
section-by-section table and 34 scratch checks, owner playtest pending; every number in `numbers.js` PASS (only the
random generator's constants remain in `game.js`); smoke 300 turns PASS, and fails on a deliberate break (negative
food; undo returning only the move) PASS.

The rules (`game.js`) are kept apart from the screen (`ui.js`), so Node can play them; undo saves a copy of the
game before each order. The agent's readings of unclear rules, all left as engineering's choices for the owner's
playtest: changing or cancelling a route also gives attention; Halls being built count toward the next Hall's
price and the cap; fractions are kept and shown to one decimal; goods sent at the end of a turn land at the end of
the next; a city grows at most one person per turn; this turn's moves are spent before saved ones. One oversight
in my rules fixed under the small-tasks exception: changing a build now refunds the food paid (a settler's 15),
checked by a scratch script (food 20 → 5 → 20). Observed by the agent for the playtest: the start city loses 2
food a turn until its first farm. Declined knowledge entry (undo by saving a copy before each order): prototype
only; production gets undo from the action pipeline (ADR-002).

### TASK-304: CI plays the prototype

Status complete · Agent: Orchestrator (small task) · Checklist pass (self-check) · Review: sprint-end · Files:
`tools/ci.mjs`. Criteria: CI runs the smoke game PASS (`npm run ci`: 4/4); a broken prototype fails CI PASS (food
made negative on purpose: "smoke: FAIL at turn 1 · after a build order: Ashford has negative food (-990)", CI
3/4, exit 1; restored, `cmp` identical, smoke exit 0). The step is marked for removal with the folder at M1.

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
