# Sprint 2: Leaner rulebook, then the technical design

| Field | Value |
|---|---|
| **Sprint** | 2 |
| **Status** | in-progress |
| **Dates** | 2026-10-08 → |
| **Base commit** | `845fc35` (the Sprint 1 close) |
| **Previous close on GitHub** | run `37748785202`: success (both jobs) |
| **Orchestrator model** | `claude-opus-5-5` (Claude Code 2.1.293) |
| **CI verified** | pending |

## Playtest input

None (no playable build yet).

## Goal

First make the rulebook leaner and proportionate, using the lessons of Sprint 1: ponytail's "build the minimum"
ladder and testing in proportion to risk in CONVENTIONS, a GitHub rule protecting `main`, and a review of the whole
rulebook. Then analyze the technical design choices (the architecture decision), which the owner asked for.

## Entropy scan

| Check | Result | Detail |
|---|---|---|
| `npm run check-docs` | CLEAN | 60 files |
| Anti-pattern greps (below) | n/a | No code yet |
| Orphaned files (last two sprints) | CLEAN | None untracked |
| Docs still match code | CLEAN | Reviewed at the Sprint 1 close |
| Harness review (every fifth sprint) | moved forward | TASK-204, on the owner's plan |

## Plan

| Task | Agent | May write | Acceptance criteria → verified by | High-risk |
|---|---|---|---|---|
| TASK-201 | Orchestrator | `docs/CONVENTIONS.md` | The ladder and risk-based testing in CONVENTIONS, in wording the owner approved → owner OK, `check-docs` | no |
| TASK-202 | Orchestrator | `docs/AGENTS.md`, `docs/WORKFLOW.md`, `.claude/skills/**`, `.claude/agents/**`, `docs/sprints/TEMPLATE.md` | Reviews ask what didn't need to exist; the checklist and RED evidence follow the testing tiers; shortcut markers are collected → `check-docs`, review | no |
| TASK-203 | Orchestrator | GitHub repository settings; the docs and hook comments that describe them | A ruleset on `main`: no force-push, no deletion (owner OK first; "changes only by push" was dropped under option A, because GitHub can't tell agents from the owner) → `gh api` read-back | no |
| TASK-204 | Orchestrator | `docs/**`, `ROADMAP.md`, `.claude/skills/**` | The rulebook reviewed with the ladder; proposals to the owner; approved changes applied → owner decisions recorded | no |
| TASK-205 | Orchestrator + research | `docs/**` except `docs/design/`, `CLAUDE.md`, `ROADMAP.md`, `.claude/agents/**` | Each open technical choice analyzed with options and a recommendation; owner decisions recorded as ADRs → owner OK | no |
| TASK-206 | Orchestrator | the files the cycle-1 findings named (task log) | Every cycle-1 BLOCKER fixed or ruled by the owner → sprint-end review cycle 2 | no |
| TASK-207 | Orchestrator | the files the cycle-2 findings named (task log) | Every cycle-2 BLOCKER fixed → sprint-end review cycle 3 | no |
| TASK-208 | Orchestrator | the files the cycle-3 findings named (task log) | Every cycle-3 BLOCKER fixed → sprint-end review cycle 4 (owner, past the cap) | no |

Waves: 201 → 202; 203 any time after the owner's OK; 204 after 202; 205 last; 206 to 208 follow the reviews. The "May write" lists were widened
at the sprint-end review to match what each task really touched (all Orchestrator-only files).

## Plan review (step 2)

| Field | Value |
|---|---|
| **Trigger** | SKIP: a docs-only sprint, which WORKFLOW step 2 exempts. It touched invariant 7, whose exact wording the owner approved before it went in; the sprint-end review covers the rest |

## Owner design rulings (brainstorm, 2026-10-13)

Recorded here so they are not left in a conversation, like the Sprint 1 brainstorm rulings; routed into
`docs/design/` with the owner's OK (ROADMAP backlog). Not part of this sprint's tasks: no game rules are built.

**Ruling a large empire (2026-10-13).** Source: the r/civ thread "The bigger my empire gets, the less control I
actually have" (Civ IV upkeep, Old World's orders). The owner made it a big piece of the brainstorm. Decided by
the owner: each turn a player has a limited number of moves (K1), in two pools, army moves and empire moves (K2),
and both can be raised by investing (K3). Proposed by engineering, not yet confirmed: acting costs a move and
anything left alone follows its last orders; seeing is free; one army move commands a whole army; moves never
grow just because the empire has more cities, and investment raises them more slowly than an empire's needs
grow, so the budget is the empire-level snowball brake. Flagged: what runs the parts nobody spends a move on
(last orders, governors, reforms that trade control for a bonus) is the other half of the piece and still
open. Working notes: `.claude/refinements/REFINEMENT-empire-control.md`.

**Challenges, round one (2026-10-13).** The owner asked engineering to challenge the idea; six problems, taken one
at a time. Decided by the owner: the budget is mainly for choices: parts nobody spends a move on run normally on
their last orders, attention earns a bonus (an attended city gets a boost for a while), and neglect earns no
penalty (K4). So engineering's "empire-level snowball brake" proposal is withdrawn: that brake stays with
stability, sanitation and logistics. One pool, not two: army orders and empire decisions draw on the same moves,
so every turn is a choice between guns and butter (K5, replaces K2; K3 now applies to the one pool). Paused by
the owner at problem 3 (whether investing buys more moves or bigger moves; lean: bigger moves); problems 4 to 6
(free defense through stances, what the budget replaces, alerts) follow.

**Challenges, round one, continued (2026-10-13).** Problem 3 is left as an owner lean, not a ruling: investing
buys more moves, slowly (diminishing returns and a cap), because a bigger empire also has more things that need
attention. Engineering's lean (bigger moves: one move reaches a front or a region) is recorded as the
alternative. Open for the system spec: whether moves grow only through investment (engineering's
recommendation, against the snowball) or also with the empire's size. Problem 4, decided by the owner: defending is free; an
attacked army always defends and never needs a move (K6). Engineering's challenge had spoken of "stances"; the
design has no army stances, and none are assumed. Problem 5, decided by the owner: nothing else gets simpler
because of the budget; it earns its place on its own. Flagged: the design grows with nothing trimmed to balance
it. Problem 6, decided by the owner: how the player finds where a move is worth spending (alerts) is left to
the interface design, not decided now. Flagged: the budget's feel depends on it, so it must not come too late.
All six challenges are done; the moves budget stands at K1, K3 to K6 (K2 replaced), with problem 3 as a lean.

**Economy (2026-10-15).** The question carried over from Sprint 1: what pays for units and buildings (artifact
"TemuCiv Currency Options"). Decided by the owner: coin and goods (C2). One empire-wide coin pays for everything
abstract (for example upkeep, buying speed, and topping up web nodes under the web-pricing ruling, Sprint 1 log,
"Web pricing", 2026-10-07, called C1 in the working notes: nodes are bought with branch experience, coin makes
up a shortfall); beside food, a few physical goods
(examples: stone, bronze) are made where the resource is, stored there and hauled by logistics; buildings and
units cost coin plus goods; web nodes need no goods. Production still only sets build speed. The demo starts with
food plus one or two materials. Two things changed since the research and favored it: C1 already prices the web
(so "coin and knowledge" fell away), and K4 meets coin and goods' condition that routes run on their own (parts
nobody spends a move on keep their last orders). Flagged: logistics now carries goods as well as food and must
help brake big empires (K4), so its big shape is the natural next piece; computer opponents must plan flows of
goods (the planning layer, ADR-009). Parked for the economy spec: the list of goods, how coin is earned, a market,
upkeep, spoilage and how distance costs (all still proposals).

**A first playable prototype (2026-10-15).** Instead of the next brainstorm piece, the owner asked for an MVP
route to a rough playable demo: there are many untested ideas, and nobody knows yet how they play together.
Decided by the owner: a prototype phase before production (ROADMAP, M0.5), built in slices of one sprint each, so
playtests rather than more paper design decide which ideas stay. The prototype is throwaway (D1): lighter rules,
its own folder the game never imports, and production starts fresh once the design settles; the exception to
CONVENTIONS' professional-methods rule still needs the owner's OK on exact wording. Slice 1 is a solo sandbox
(D2): the moves budget plus coin and goods with hauling, no rival; slice 2 adds a rival and armies, slice 3 a few
web nodes and the category scores. Flagged: logistics and cities are not designed yet, so the prototype uses crude
stand-ins, each listed for the owner's OK and turned into a design question; the army-or-empire side of the budget
(K5) is felt only from slice 2. Also decided (D3): terrain is shown by colour alone, and buildings are simple
shapes. Working notes: `.claude/refinements/REFINEMENT-first-playable.md`.

**Slice 1 placeholders (2026-10-15).** Asked one at a time at the owner's request; throwaway, revisited after
playtests. Decided by the owner: cities get output from built sites with workers (P1); a site's output reaches
its own city on its own, and routes the player sets up move goods between cities (P2); every order costs one
move, and looking is free (P3); the budget is easy early and tight later (P4); a move is a move: any real order
in a city also gives it the attention boost, with no separate order for it (P5); coin comes from population,
trade and production, and war in slice 2 (P6); food is the only limit on growth for now (P7); sites claim land
(P8); distance costs only time for now (P9); four buildings: Hall (+1 move), Granary, Market, Workshop (P10);
unused moves all carry over (P11); play freely, with no end (P12). P6 in the owner's words, answering where coin
comes from in the prototype: "Population, trade, production, war. All can earn coin, as we just have one
currency." Whether production earning coin also applies beyond the prototype, replacing C2's "production still
only sets build speed", is an open owner question. Owner design intent beyond the prototype, to route into
`docs/design/`: with full stability and control distance costs only time, and without them a share is lost on
the way. Flagged: P11 lets a player save up for one huge turn. Engineering's own proposals for the map, stone, sites, settlers, routes and
screens are in the working notes for the owner to flag.

## Task log

### TASK-201: the ladder and risk-based testing in CONVENTIONS

Status complete · Agent: Orchestrator (small docs task) · Checklist pass (self-check) · Review: sprint-end ·
Commit `34f68d8`. Files: `docs/CONVENTIONS.md`. Criteria: owner OK on the exact wording PASS; `check-docs` PASS.

The owner approved the exact wording on 2026-10-08. CONVENTIONS gains "Build the minimum" (ponytail's ladder,
adapted with credit: does it need to exist, reuse, the standard library or platform, then the minimum; never cut
the invariants, input validation, data-loss handling, security, accessibility or what the owner asked for;
`shortcut:` comments for deliberate corner-cuts), and invariant 7 now matches verification to risk. The file
stays within its 100-line budget (the introduction was tightened to two lines).

### TASK-202: the follow-through

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end · Commit `34f68d8`.
Files: `docs/AGENTS.md`, `docs/WORKFLOW.md`, `.claude/agents/` (reviewer, simulation, ai-player, test-qa),
`.claude/skills/refine-requirements/SKILL.md`, `docs/sprints/TEMPLATE.md`. Criteria: all three PASS; CI PASS.

Reviews ask what didn't need to exist (reviewer definition, AGENTS "Reviewer" and the Codex FOCUS lines) and
treat implausible edge cases as notes. The checklist (items 8 and 10), RED evidence, WORKFLOW step 3 and the
simulation, ai-player and test-qa definitions follow the risk tiers. The requirements skill asks "does this need
to exist?" first. The sprint template collects `shortcut:` comments.

### TASK-203: GitHub protects `main`

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end · Commit `96b9ad2`.
Files: the ruleset; `docs/WORKFLOW.md`, FAIL-001, `ROADMAP.md`, comments in `.claude/hooks/sprint-close-guard.mjs`
and `tools/hooks/pre-push.mjs`. Criterion (as revised): PASS; read-back also shows no bypass actors
(`current_user_can_bypass: never`).

With the owner's OK (option A, 2026-10-08), the repository has a ruleset `protect-main` (id 24708143, active) that
blocks deleting or force-pushing `main`; GitHub's read-back confirms `deletion` and `non_fast_forward` apply to
`main`. These were two real gaps: pre-push skips deletions, and a force-push to an older close would pass it.
Pull-request merges stay with the local guard, because agents use the owner's account and GitHub can't tell them
apart; WORKFLOW, FAIL-001 and the hook comments say so.

### TASK-204: the rulebook review

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end · Commit `2d5ff9d`.
Files: `docs/WORKFLOW.md`, `docs/AGENTS.md`, `.claude/skills/refine-requirements/SKILL.md`,
`docs/sprints/TEMPLATE.md`, the sprint log. Criteria: owner decisions recorded PASS; CI PASS.

Each mechanism was judged by the ladder and by Sprint 1's record. Kept: the git checks and receipts, GitHub CI,
push protection and the ruleset, sprint branches, the docs checker, the knowledge base, the reviewer on Fable.
The owner approved six simplifications with one change (option B, 2026-10-08): both lenses at the sprint end
and on the plan; the reviewer per task only for high-risk tasks; requirement reviews only when a design becomes
a system spec; a 3-cycle cap with a firm recommendation and a structural-change rule; the bar stated in every
review prompt; no checklist agent until code exists (then CI checks); a lighter sprint-log template; a rulebook
review whenever a review passes its cap.
Sprint logs stay inside the review hash up to "## Sprint-end review": reviewers must see the log's claims, and
only what is written after the review is left out. This closes the backlog's first-harness-review item.

### TASK-205: the architecture decision

Status complete · Agent: Orchestrator (analysis, with web research on current library status) · Checklist pass
(self-check) · Review: sprint-end · Commit `dc39e25`. Files: ADR-010 and ADR-011 (new), ADR-002, ADR-005, ADR-008,
`docs/architecture.md` (new), `docs/kb/INDEX.md`, `CLAUDE.md`, `ROADMAP.md`, `docs/WORKFLOW.md`, `docs/AGENTS.md`,
`.claude/agents/simulation.md`, and `docs/design/README.md` (the owner's folder, edited without an OK; reverted at
the review and routed to the design backlog item). Criteria: options and a recommendation per choice PASS; owner
decisions recorded PASS.

Each open technical choice was analyzed with options, trade-offs and a recommendation, and checked against the
ladder. The owner chose the hardware target (option B, 2026-10-08: desktop and laptop with a mouse; no Steam Deck
target for now) and accepted the rest of the set. Recorded as ADR-010 (the game loop: sealed orders, then one
resolution; battles inside the turn; the simulation in a background thread), ADR-011 (PixiJS, React panels,
Electron, JSON with Zod schemas, Vite, `node:test`, Playwright), an ADR-005 amendment (the tested envelope and
budgets, on a 2020 mid-range laptop) and `docs/architecture.md` (parts, folders, boundaries, a turn end to end).
"Research" is renamed "progress" across the docs (`SetResearch` became `AcquireIdea`). ROADMAP: four backlog items
closed, the M1 setup item rewritten to match ADR-011, Steam Deck in the parking lot.

### TASK-206: sprint-end review fixes (cycle 1)

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end cycle 2 · Commits
`e00ea55`, `818d22d` · Files: the ADRs 002 to 011 except 007, `docs/AGENTS.md`, `docs/WORKFLOW.md`, `docs/architecture.md`,
`docs/CONVENTIONS.md`, `ROADMAP.md`, four agent definitions, the refinement skill, `package.json`, this log (and a
`docs/design/README.md` edit, since reverted). Criteria: every cycle-1 BLOCKER fixed PASS (both lenses confirmed
in cycle 2, except ADR-005's performance contract, finished in TASK-207); the invariant-7 finding ruled by the
owner PASS.

Both lenses returned BLOCKED in cycle 1 (Codex 10 blockers, 1 warning; reviewer 2 blockers, 6 warnings, 9 notes);
all were cheap and fixed in one batch. ADR-010 now says own-empire orders apply once and are not pending, that
nothing applied before resolution draws from the shared random stream, that computer players stop on a work
budget (never the clock) and look ahead only on states built from their own view, and that saves, replays and
network play are three different records; upkeep's place relative to battles is left to the cities and combat
specs. ADR-002, 003, 006 and 008 carry amendment lines; ADR-005 names the exact workload and reference machine.
The review bar is now verbatim in the reviewer definition and the refinement prompt; the cycle cap counts the
first review as cycle 1; the old testing and checklist wording is gone from ADR-004, ADR-006, AGENTS, WORKFLOW
and the agent definitions. ADR-011 drops the Steam library choice and the linter (TypeScript's checks instead);
`package.json` requires Node 24. Computer players share the simulation's thread until the End Turn budget fails
(the reviewer's delete-list). The plan table and task lines now record the real files, commits and criteria.
The owner ruled on the one CONVENTIONS finding (option A, 2026-10-08): number changes are data and need no new test
(each value traces to the design and passes the format check); "how game rules compute" is high-risk. Invariant 7,
invariant 5 ("techs" became "ideas") and WORKFLOW's high-risk list were reworded to match.

### TASK-207: sprint-end review fixes (cycle 2)

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end cycle 3 · Files: ADR-005,
ADR-010, ADR-011, `docs/architecture.md`, `docs/AGENTS.md`, `docs/kb/INDEX.md`, `docs/sprints/TEMPLATE.md`, the
reviewer and ai-player definitions, `tools/ci.mjs` (a comment), `CLAUDE.md`, `ROADMAP.md`, this log. Criteria:
every cycle-2 BLOCKER fixed → cycle 3.

Codex returned BLOCKED (6 blockers, 4 warnings), the reviewer APPROVED-WITH-WARNINGS (6 warnings, 7 notes). Fixed:
ADR-005 now says the exact reference setup and CI's threshold are fixed when the performance tests are built, and
adds a 100-millisecond answer for each order; ADR-010 and the architecture no longer place upkeep and call its
place open at once; computer players get their own decision seed and views never carry the game seed; saves
record their game and content versions, and a mismatch is refused during the alpha; computer players think in
slices so orders are answered between them; buying an idea applies at once (others' prices read the
start-of-turn picture); the two shortcuts use the scanned marker and sit in the backlog; ADR-011 no longer says
Electron makes operating systems identical. Records: TASK-206's evidence, the plan rows, the plan-review reason,
C1 defined, P6 in the owner's exact words with its scope as an open question, the stale ROADMAP lines, the KB
index, the template's "Files changed", the reviewer's standard now naming the rulings in sprint logs, one
CLAUDE.md row for ADR-005. Declined: removing the constraint-validator definition (Codex warning): it is never
spawned before game code exists, which is what the owner approved in TASK-204; revisit at M1. Moved to Sprint 3:
a `prototype/` row in the architecture's folder table and an agent scope for it, which wait for the owner's
wording of the prototype exception; slice 1's rules settle taking back an order (reviewer note 7).

### TASK-208: sprint-end review fixes (cycle 3, past the cap)

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end cycle 4 · Files: ADR-005,
ADR-009, ADR-010, `docs/architecture.md`, the ai-player definition, this log. Criteria: every cycle-3 BLOCKER
fixed → cycle 4.

Cycle 3 was the last under the cap. The reviewer returned APPROVED-WITH-WARNINGS (2 warnings, 3 notes), Codex
BLOCKED (3 blockers). Offered closing with a review waiver and the two ADR-010 lines moved to the first
production sprint (recommended) or a fourth round, the owner chose the fourth round (2026-10-15). Fixed: each
computer player's random generator is seeded one way, by a hash that can't be worked back to the game seed;
what a computer player remembers between turns lives in the game state as its private data, so a save restores
it (reviewer warning 1); upkeep is no longer a numbered step after the battles in ADR-010 or the architecture;
the handoff is current (it sits outside the stamp). Small records: C1's source, ADR-007 not touched by TASK-206,
"content versions" in both records, the ADR status lines, ADR-005's performance checks dated M3–M4. Carried to
Sprint 3: the simulation definition's brief names only `docs/design/`, and whether the code checklist applies to
the prototype (both with the prototype exception); the cycle-1 reviewer file was never saved (kept per cycle from
now on).

## Design conformance

Not applicable: no game rules this sprint (rulebook and architecture documents only).

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
- **Knowledge produced:** _new ADR/PAT/FAIL entries_
- **Harness notes:** _did any mechanism catch something? did any cost effort and catch nothing?_

## Handoff

- **State:** TASK-201 to 208 committed on `sprint/2`. Sprint-end review: cycles 1 to 3 done, each fix batch in
  TASK-206 to 208; cycle 4 (past the cap, the owner's choice) runs on TASK-208. Local CI passes before each
  stamp; the close re-runs it. Nothing pushed: `main` is still the Sprint 1 close, `sprint/2` only on this computer.
- **In flight:** the cycle-4 reviews (Codex and the Fable reviewer). No agents build anything; no worktrees.
- **Waiting on:** nothing. The owner answered the P6 question on 2026-10-15 ("Neither": production only sets
  build speed, also in the prototype; a city with nothing to build waits); record it in the Sprint 3 log, not
  this one (frozen by the review stamp).
- **Next action:** if cycle 4 passes, close (WORKFLOW step 8), push `main`, watch GitHub CI. Then Sprint 3, the
  prototype's slice 1 (M0.5): the prototype exception for the owner to approve (CONVENTIONS line, WORKFLOW
  section, a `prototype/` folder row and agent scope, whether the code checklist applies); slice 1's rules from P1
  to P12, the P6 answer and engineering's proposals (drafts: `.claude/refinements/PROTOTYPE-slice1-RULES-draft.md` and `PROTOTYPE-exception-draft.md`), settling
  taking back an order; the Bash allowlist for read-only agents before any building agent runs (ROADMAP).
