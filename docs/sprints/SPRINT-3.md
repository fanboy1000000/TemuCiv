# Sprint 3: Prototype slice 1, the solo sandbox

| Field | Value |
|---|---|
| **Sprint** | 3 |
| **Status** | complete |
| **Dates** | 2026-10-15 → 2026-10-16 |
| **Base commit** | `ed7e65d` (the Sprint 2 close) |
| **Previous close on GitHub** | run `38799350275`: success (both jobs) |
| **Orchestrator model** | `claude-opus-5-5` (Claude Code 2.1.301) |
| **CI verified** | local `npm run ci` PASS on the close state (the GitHub run is recorded by Sprint 4) |

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
| TASK-305 | Orchestrator | `prototype/ui.js`, `prototype/README.md`, `prototype/RULES.md`, `docs/WORKFLOW.md`, `docs/AGENTS.md`, `docs/architecture.md`, `.claude/agents/reviewer.md`, `.github/workflows/ci.yml`, `CLAUDE.md`, `ROADMAP.md`, this log | Every sprint-end cycle-1 BLOCKER fixed → sprint-end review cycle 2 | no |
| TASK-306 | Orchestrator | `prototype/RULES.md`, `ROADMAP.md`, this log | Every sprint-end cycle-2 BLOCKER fixed → sprint-end review cycle 3 | no |
| TASK-304 | Orchestrator | `tools/ci.mjs` | CI runs the prototype's smoke check, and a broken prototype fails CI → `npm run ci`, one deliberate break seen failing | no |

Waves: 301 (owner OK first) → 302 → 303 → 304; 305 and 306 follow the reviews. TASK-303 uses a generic agent with the model named: the
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
plan review on this approval. The text shown to the owner included the CONVENTIONS sentence exactly as committed,
the checklist clause (only "stay inside your files" and "no secrets or leftover debug code" remain) and the
decision-record rule. Two edits since, both within that approval: TASK-305 clarified the WORKFLOW "Where" line to
say CI runs the smoke check, which the same approved text required, and restated checklist item 9 in full (dead
code and unused imports too), which only tightens it.

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
Follow-up during TASK-303's verification (Orchestrator, recorded here because TASK-303's scope excludes this file):
changing a build now refunds the food paid as well (a settler's 15); the screen text followed in TASK-305.

### TASK-303: build slice 1

Status complete · Agent: general-purpose (Opus, model named at spawn) · Checklist items 1 and 9 pass · Review:
sprint-end (light bar) · Files: `prototype/index.html`, `numbers.js`, `game.js`, `ui.js`, `smoke.js`, `README.md`
(the agent's); `game.js` also by the Orchestrator (the food refund, below). Criteria: opens by double-click PASS
(headless Edge screenshot, checked by the Orchestrator); plays as `RULES.md` says PASS on the agent's
section-by-section table (Design conformance below) and 34 scratch checks, the owner's playtest still pending;
every number in `numbers.js` PASS (only structural constants remain in `game.js`: the random generator's, the map
generator's loop limits, the start search radius); smoke 300 turns PASS, and fails on a deliberate break (negative
food; undo returning only the move) PASS.

The rules (`game.js`) are kept apart from the screen (`ui.js`), so Node can play them; undo saves a copy of the
game before each order. The agent's readings of unclear rules, all left as engineering's choices for the owner's
playtest: changing or cancelling a route also gives attention; Halls being built count toward the next Hall's
price and the cap; fractions are kept and shown to one decimal; goods sent at the end of a turn land at the end of
the next; a city grows at most one person per turn; this turn's moves are spent before saved ones. One oversight
in my rules fixed: changing a build now refunds the food paid (a settler's 15), checked by a scratch script (food
20 → 5 → 20). It touched two files and missed the screen text, which both review lenses caught (TASK-305). Observed by the agent for the playtest: the start city loses 2
food a turn until its first farm. Declined knowledge entry (undo by saving a copy before each order): prototype
only; production gets undo from the action pipeline (ADR-002).

### TASK-304: CI plays the prototype

Status complete · Agent: Orchestrator (small task) · Checklist pass (self-check) · Review: sprint-end · Files:
`tools/ci.mjs`. Criteria: CI runs the smoke game PASS (`npm run ci`: 4/4); a broken prototype fails CI PASS (food
made negative on purpose: "smoke: FAIL at turn 1 · after a build order: Ashford has negative food (-990)", CI
3/4, exit 1; restored, `cmp` identical, smoke exit 0). The step is marked for removal with the folder at M1.

### TASK-305: sprint-end review fixes (cycle 1)

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end cycle 2 · Files: as in the
plan row. Criteria: every cycle-1 BLOCKER fixed → cycle 2.

Codex BLOCKED (6 blockers, 1 note), the reviewer BLOCKED (1 blocker, 6 warnings, 4 notes). Fixed: the screen now says
a changed build refunds coin, stone and food (both lenses' blocker); RULES.md says Halls being built count toward
the next Hall's price, and marks engineering's own rules "(eng.)" (the Granary, Market and Workshop effects, what a
person eats, one build at a time, the settler's costs, the Hall's price growth and cap); the reviewer definition and
the Codex template name the prototype's lighter bar; WORKFLOW says CI runs the prototype's smoke check (its "Where"
line, the CI list, checklist item 9 in full) and how playtest notes in the owner's `notes.md` reach the log; AGENTS
says prototype prompts include the WORKFLOW section word for word; the architecture row, the GitHub job name and
CLAUDE.md's phase are current; the log records the approved wording, TASK-302's follow-up, a section-to-code table
and a fresh handoff; the README no longer promises click-outside; an unused field is gone. ROADMAP: the M1
clean-up of everything the prototype added, and Sprint 3's production ruling in the routing item. Left as notes
(light bar, none contradicts RULES): founding beside a site under construction, a cancelled Hall keeping another's
price, a site order without a tile (the screen never sends one).

### TASK-306: sprint-end review fixes (cycle 2)

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end cycle 3 · Files:
`prototype/RULES.md`, `ROADMAP.md`, this log. Criteria: every cycle-2 BLOCKER fixed → cycle 3.

Codex BLOCKED on one claim: the conformance section said the reviewer had rechecked the rules in cycle 2 before
that review existed. It did recheck them (reviewer cycle 2, APPROVED-WITH-WARNINGS), and the section now cites that
file. Also from the reviewer: the M1 clean-up row now says to remove every mention of the prototype found outside
`prototype/` and the sprint logs; the approval record names both edits made since the owner's OK; RULES.md marks
three more engineering rules and says which two numbers were put to the owner. Carried to Sprint 4: the reviewer's
question for the owner, whether `prototype/RULES.md` itself should be reviewed at the normal bar (a mistaken copy of
a ruling would now rate only a NOTE).

## Design conformance

For the prototype, conforming means matching `prototype/RULES.md` (WORKFLOW, "Prototype phase"). Checked by the
builder's table and scratch checks, the reviewer's section-by-section comparison in cycle 1, its recheck after
TASK-305 in cycle 2 (`.claude/reviews/SPRINT-3-reviewer-c2.md`: the refund, Hall pricing, every function cited
below), and the owner's playtest (pending). No game rules in `src/` yet.

| RULES.md section | Implemented in (`prototype/`) | Verified by | Status |
|---|---|---|---|
| The map, the start | `game.js` `makeMap`, `passable`, `newGame`, `chooseStart` | screenshot; reviewer | PASS |
| Moves, undo, last orders, attention, the Hall | `game.js` `movesPerTurn`, `movesSaved`, `begin`, `undo`, `attend`, `hallsCounted`, `buildCost` | smoke (undo exact); scratch checks; reviewer | PASS |
| Cities, food and growth; production and building | `game.js` `eats`, `growthNeed`, `production`, `checkBuild`, `orderBuild`, `endTurn` | smoke; scratch checks (growth at 20, 15 with a Granary); refund script | PASS |
| Sites, borders | `game.js` `siteProblem`, `claim`, `staffing`, `travelTurns`, `foundCity` | scratch checks; reviewer | PASS |
| Coin, routes, settlers | `game.js` `coinNext`, `marketFactor`, `checkRoute`, `orderRoute`, `reserve`, `findPath`, `orderFound` | smoke; scratch checks | PASS |
| A turn | `game.js` `endTurn`, steps 1 to 9 in the order RULES gives | reviewer | PASS |
| The screen | `ui.js` `draw`, `renderTop`, `cityPanel`, `renderWaiting`, `renderLog`, `tileTip` | screenshot; owner's playtest | pending playtest |

## Sprint-end review (step 7)

| Lens | Cycles | Findings (per cycle, B/W/N) | Final verdict | Stamp |
|---|---|---|---|---|
| Codex | 3, plus a one-line check | 6/0/1, 1/0/0, 1/0/1; the check 0/0/0 | APPROVED | `2088cf0` / `f2a3b45f` |
| Reviewer (`claude-fable-5-1`) | 3 | 1/6/4, 0/1/4, 0/0/2 | APPROVED | same |

Fixes are in TASK-305 and 306. Codex's cycle-3 blocker was the ROADMAP row for removing the prototype at M1 (too
broad: it could have erased the milestone and playtest notes). ROADMAP is close paperwork outside the stamp; the
row was rewritten and, on the owner's decision past the cap, Codex checked that one row and approved it
(`.claude/reviews/SPRINT-3-codex-c4-line-check.md`). Carried to Sprint 4: who-decided-what marks in RULES.md (both
lenses' cycle-3 notes: "looking is free" is P3, "war earns coin" is P6, P4's 4 moves and cap of 8 were put to the
owner, the "Left out" list is D2) and the reviewer's question whether RULES.md itself gets the normal bar.

## Test summary

Final `npm run ci` on the close state: docs consistency PASS (72 files), secret scan PASS, governance tests 53/53
PASS (no change), prototype smoke game PASS (new step: 300 turns, every undo restored exactly, CI 4/4).

## Retrospective

- **Went well:** from the owner's "I want a playable demo" to a build they can double-click took one sprint; the
  placeholders, asked one at a time, gave the builder a complete spec; the smoke game and the deliberate breaks
  made "it works" checkable; the review loop converged in three cycles, as the decision-record rule intended.
- **To improve:** my mid-sprint rule fix missed the screen text, which both lenses caught; the log claimed a
  review before it ran; attribution in RULES.md (who decided what) took three passes and is still not exact. Mark
  each rule's source one at a time from the start.
- **Knowledge produced:** none; the builder's proposed pattern (undo by saving a copy) was declined as prototype-only.
- **Harness notes:** the lighter prototype bar worked: most prototype findings were notes, and the blockers were
  real (a screen contradicting the rules). Agent definitions load at session start, so an edit to one reaches agents
  only in the next session.

## Handoff

- **State:** Sprint 3 closed (`S3 close`), `main` fast-forwarded and pushed; `sprint/3` deleted. The prototype is
  playable: double-click `prototype/index.html`.
- **In flight:** the GitHub CI run for the push (Sprint 4 records it).
- **Waiting on:** the owner's playtest of slice 1.
- **Next action:** Sprint 4 (slice 2: a rival and armies). Start with the owner's playtest notes ("Playtest
  input"), the question whether `prototype/RULES.md` gets the normal review bar, and RULES.md's attribution fixes;
  then refine slice 2 one question at a time (refine-requirements).
