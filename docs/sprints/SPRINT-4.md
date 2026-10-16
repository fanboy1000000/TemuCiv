# Sprint 4: Prototype slice 2, armies and supply

| Field | Value |
|---|---|
| **Sprint** | 4 |
| **Status** | in-progress |
| **Dates** | 2026-10-16 → |
| **Base commit** | `0298bc8` (the Sprint 3 close) |
| **Previous close on GitHub** | run `38854972671`: success |
| **Orchestrator model** | `claude-opus-5-5` (Claude Code 2.1.301) |
| **CI verified** | no |

## Playtest input

_Pending: the owner's notes from playing slice 1._

## Goal

The owner can raise armies in the prototype, march them, and keep them fed through baggage and supply set on
generals, against a passive rival with one battle decided by luck, to feel the logistics system (owner,
2026-10-16: "I need to be able to move armies to get a feel for the logistic system").

## Entropy scan

| Check | Result | Detail |
|---|---|---|
| `npm run check-docs` | CLEAN | 72 files, exit 0 |
| Anti-pattern greps (template list) | CLEAN | No `src/` code yet; no secrets or absolute paths in `prototype/`, `tools/`, `.github/`; the two `shortcut:` lines (ADR-010) are in the ROADMAP backlog |
| Orphaned files (last two sprints) | CLEAN | Nothing untracked; no file from the last two sprints' commits is missing |
| Docs still match code | CLEAN | Reviewed at the Sprint 3 close |
| Harness review (every fifth sprint) | n/a | Due at Sprint 5 |

## Plan

| Task | Agent | May write | Acceptance criteria → verified by | High-risk |
|---|---|---|---|---|
| TASK-401 | Orchestrator | `docs/WORKFLOW.md`, `docs/AGENTS.md`, `.claude/agents/reviewer.md`, `CLAUDE.md` | RULES.md reviewed at the normal bar, in the canonical review instructions (R1); CLAUDE.md's phase line current → `check-docs`; sprint-end review | no |
| TASK-402 | Orchestrator | `prototype/RULES.md` | Slice 2's rules from A1 to A5 and the refinement; Sprint 3's carried attribution fixes; every rule carries its source → sprint-end review at the normal bar (R1) | no |
| TASK-403 | general-purpose agent (Opus, named at spawn) | `prototype/**` except `RULES.md` | Plays as RULES.md says, section by section (the builder's table and scratch checks whose expected values come from RULES.md); every number in `numbers.js`; 300 smoke turns of random valid orders including every army order, with no error, no NaN, no negative store or baggage; a deliberate break fails the smoke; opens by double-click → `node prototype/smoke.js`, `npm run ci`, a screenshot, the owner's playtest | no (prototype) |
| TASK-404 | Orchestrator | `prototype/RULES.md`, this log | Every sprint-end cycle-1 BLOCKER on the rules and the log fixed → sprint-end review cycle 2 | no |
| TASK-405 | the TASK-403 agent, resumed | `prototype/**` except `RULES.md` | The code follows TASK-404's rules; scratch checks for each change, including a long supply line held for many turns; smoke; CI → `node prototype/smoke.js`, `npm run ci`, cycle 2 | no (prototype) |
| TASK-406 | Orchestrator | `prototype/RULES.md`, this log | Every sprint-end cycle-2 BLOCKER on the rules and the log fixed, with the structural changes → cycle 3 | no |
| TASK-407 | the TASK-403 agent, resumed | `prototype/**` except `RULES.md` | The code follows TASK-406's rules; the hunger warning plays the real end of turn on a copy; checks for an army raised in a city with ordinary stores; smoke; CI → cycle 3 | no (prototype) |

Waves: 401 and 402 (Orchestrator), then 403; 404 and 405 follow the cycle-1 review, 406 and 407 the cycle-2 review. TASK-403 uses a generic agent with the model named, as in Sprint 3:
the simulation and presentation definitions carry standing instructions the prototype exception sets aside.

## Plan review (step 2)

| Field | Value |
|---|---|
| **Trigger** | SKIP. TASK-403 and 402 are prototype work, which WORKFLOW exempts from plan review; TASK-401 is a docs change whose substance the owner decided (R1), and it only tightens a review bar. The sprint-end review covers all three, RULES.md at the normal bar |

## Owner design rulings

Slice 2's answers, asked one at a time on 2026-10-16 and numbered A1 to A5 so `prototype/RULES.md` can cite them.
Each records the option text the owner chose, word for word, so a mark in RULES.md can be checked against the
owner's words (TASK-406). Working notes: `.claude/refinements/REFINEMENT-slice2-armies.md`.

**A1, what slice 2 includes.** Decided by the owner (option B of three): armies and supply, plus a passive rival
whose cities defend themselves but never move; battles are settled automatically. Given up: the rival can't
threaten your supply lines yet (the full rival was the truest test but the biggest build). The option as chosen,
"Plus a passive rival (Recommended)": "Armies and supply, plus a few rival cities far away that defend themselves
but never move. Marching far then wins something (a captured city, coin from war). Battles are settled
automatically. Adds 2–3 short questions on battles and capture. One sprint."

**A2, supply and generals.** Asked how an army away from your cities gets its food, the owner said: "You set
supply on generals. Armies can only move with a general. They can also bring baggage." Engineering's reading,
shown to the owner before the next question and not corrected: supply is an order given to a general, naming the
city that feeds it, and the line follows that general (Sprint 1 log, the owner's combat concept); regiments
without a general can't move; an army carries baggage as well as being supplied.

**A3, generals.** Built in a city, like a regiment (coin and production), with no limit: the moves budget
already limits command (option 1 of three; a fixed number of generals and a general that takes a person were the
others). As chosen, "Built in a city (Recommended)": "A city builds a general the way it builds a regiment (coin
and production), with no limit. The moves budget already limits how many armies you can command each turn, since
every army order costs a move, so there's no need for a second limit."

**A4, manpower.** A regiment takes one person from its city (option 1 of three). As chosen, "Yes, one person
(Recommended)": "Like a settler, each regiment takes one person from the city. War then costs the economy directly:
fewer workers, less food and coin. A regiment that starves on a bad supply line is a real person lost. This makes
guns or butter as sharp as it gets."

**A5, battles.** One battle, decided in one turn, with luck from the game's seeded random numbers (option 2 of
three). Engineering had leaned to a fight over several turns, so that the supply line would matter for winning
as well as for getting there; given up by the owner for a quick, decisive battle. As chosen, "One battle, with
luck": "Decided in one turn. The bigger army usually wins, with luck from the game's seeded dice. Quick and
exciting, but supply only matters for getting there, not for winning."

**R1, the review bar for RULES.md.** Carried from Sprint 3. Decided by the owner: `prototype/RULES.md` gets the
normal review bar, checked against the owner's rulings, because a ruling copied wrong would make the prototype
test the wrong idea (TASK-401). As chosen, "Full standard for RULES.md (Recommended)": "RULES.md is where your
rulings become the prototype's spec. If I copy one wrong, the prototype tests the wrong idea and the playtest
lessons mislead the design. Under the full standard, a wrong copy blocks the sprint until it's fixed. Cost: maybe
one more review round on a short file."

Engineering's own rules for the slice (numbers, baggage, the rival's layout, the win chance, plunder, the start
general, the turn order) are in RULES.md marked "(eng.)", and were summarized to the owner before R1.

## Task log

### TASK-401: RULES.md at the normal review bar

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end · Files:
`docs/WORKFLOW.md`, `docs/AGENTS.md`, `.claude/agents/reviewer.md`, `CLAUDE.md`. Criteria: R1 in WORKFLOW's
"Prototype phase", AGENTS (the prototype paragraph and the Codex template) and the reviewer definition PASS;
CLAUDE.md's phase names Sprint 4 PASS; `check-docs` PASS (73 files). The reviewer definition's edit reaches
reviewers from the next session (agent definitions load at session start), so this sprint's review prompts state
the bar themselves.

### TASK-402: slice 2's rules

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end, normal bar (R1) · Files:
`prototype/RULES.md`. Criteria: every rule carries its source PASS (self-check, rule by rule); the review checks it.

Every bullet now ends with its own source, instead of a mark on the heading, as Sprint 3's retrospective asked.
Sprint 3's carried attribution fixes: "looking is free" is P3; war earns coin is P6; 4 moves and the cap of about
8 were P4's examples, kept by the owner; the "Left out" list is D2 (now with A1); the unmarked rule on people not
at a site is marked (eng.). New sections from A1 to A5: generals and regiments, baggage and supply, the rival,
battles, a longer turn order and the screen. Engineering's additions, all marked (eng.): a general at the start
(so armies can be tried from turn 1), garrisons eating before the people, supply served before routes, the win
chance A² ÷ (A² + D²) with walls × 1.5, losses, plunder and the rival's layout and garrisons.
Follow-up during TASK-403's verification (Orchestrator, recorded here because TASK-403's scope excludes this file):
the builder found that supply and baggage, which took only food above the routes' 3-turn reserve, delivered
almost nothing from a city of size 6 or more, because a city grows and spends its store before it gets above that
reserve; confirmed in `game.js` (`reserve` and `supplyPlan`). Supply and baggage now keep back only one turn of the
city's eating, so an army is fed before its city grows; routes keep the 3-turn reserve. "Waiting for you" now
lists an army short of food counting the food on its way, not merely one without a supply line.

### TASK-403: build slice 2

Status complete · Agent: general-purpose (Opus, model named at spawn), one follow-up by message · Checklist items 1
and 9 pass (only `prototype/` files other than RULES.md; no debug output) · Review: sprint-end (light bar) ·
Files: `prototype/game.js`, `ui.js`, `numbers.js`, `smoke.js`, `index.html`, `README.md`.

Criteria: plays as RULES.md says PASS on the builder's section-to-code table and 92 scratch checks with expected
values worked by hand from RULES.md (the previous expectations run against the new code fail exactly the 8 changed
cases, so the checks tell the two reserve rules apart); every number in `numbers.js` PASS (only structural
constants remain); smoke PASS (300 random turns with every order kind, 19 battles, plus a labelled 100-turn "war
game" started next to a rival city so captures are reached; undo exact); a deliberate break fails the smoke PASS
(baggage allowed negative: "general 73 has negative baggage (-2)", exit 1; restored, identical); opens by
double-click PASS (headless Edge screenshots, checked by the Orchestrator: the opening, a march with its supply
line and win chance, a lost battle, a capture whose numbers match RULES); `npm run ci` 4/4 PASS. The Orchestrator's
own spot check (start general, three rival cities of size 3 with garrison 3, win chances, both reserves) PASS.

The builder's top finding led to the RULES follow-up recorded under TASK-402 (supply delivered nothing from mid-
sized cities); the code followed. Its readings of unclear rules, left as engineering's choices for the playtest:
the reserve counts the garrison's eating; a changed supply line goes to the back of the queue; baggage above
capacity is kept; a capturing army's march order is cleared; rival cities go only on land reachable from your
first city; garrisons grow at the end of turns 5, 10, 15; "next to two rival cities" can't happen at the default
spacing of 3. Brief contradictions, settled: `smoke.js` was already a modern module (kept); settlers may walk
across rival land and onto a rival city tile, which RULES doesn't forbid (a NOTE for the playtest). Declared
deviations, accepted: the smoke's labelled war game; your cities are blue now that red is the rival's. Declined
knowledge entry (a labelled test start for states random play can't reach): prototype only; production tests set
up their states directly.

### TASK-404: sprint-end review fixes, cycle 1 (rules and log)

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end cycle 2 · Files:
`prototype/RULES.md`, this log. Criteria: every cycle-1 BLOCKER on the rules and the log fixed → cycle 2.

Both lenses BLOCKED in cycle 1 (Codex 4 blockers, 1 note; the reviewer 1 blocker, 3 warnings, 5 notes). Rules
fixed: a supply line now sends what keeps the baggage at its limit when the food lands, adding what the army eats
while the food travels, so a line of any length keeps a fed army fed (the reviewer's blocker: from 7 tiles the
army starved between deliveries, against P9); "Waiting for you" warns of an army that will go hungry within 2
turns, counting only food that lands in time; baggage fills before the army marches (an army that took regiments
and marched in one turn left empty); baggage is a limit on loading, regiments left in a city leave their extra
food there, and nothing carried is thrown away (Codex: the code kept more than "holds up to 3 turns"); a size-1
city that can't feed its garrison loses a regiment (a free garrison otherwise); any order given in a city gives
it attention, now including supply and taking or leaving regiments (P5, which the earlier rule narrowed); hover
explanations are promised for underlined numbers, as the screen does. Source marks: a legend for every family of
marks, "S1" now names its Sprint 1 entry, the numbers sentence says a number is the owner's when its rule's mark
says so, the rival's start, its "few cities far away" and the captured city now cite A1, and the "Left out"
list marks each item with its own source. In this log: the goal, a stale code line reference, the conformance
paragraph's tense; the handoff (stale again by the next commit; TASK-406).

### TASK-405: sprint-end review fixes, cycle 1 (code)

Status complete · Agent: the TASK-403 agent, resumed · Checklist items 1 and 9 pass · Review: sprint-end cycle 2
(light bar) · Files: `prototype/game.js`, `ui.js`, `numbers.js`, `smoke.js`, `README.md`. Criteria: the code
follows TASK-404's rules PASS; checks PASS; smoke PASS; `npm run ci` 4/4 PASS (rerun by the Orchestrator, with
the 112 checks and its own spot check).

The supply amount adds the trip's eating; a forecast (`hungryIn`) drives the waiting list and the general panel;
baggage fills before the march; leaving regiments puts their extra food in the city; a size-1 city loses garrison
regiments when it can't feed them; take, leave and supply orders give attention; the delete-list is done (an
unused transit field, three unused exports, a smoke check that couldn't fail). New checks with hand-worked
expectations, all PASS: an army of 3 at 10 tiles goes hungry exactly once before the first delivery and never in
the next 30 turns; at 7, 8 and 9 tiles never; a marching army supplied before leaving never, from a well-stocked
city (with an ordinary store it could still go hungry on turn 1: cycle 2, TASK-406); take and march in one turn
leaves with full baggage, from a city holding enough food; leaving 2 of 3 regiments puts 12 food in the city; the size-1 garrison; each
attention case; the forecast. Run against the cycle-1 code, the changed cases fail ("7 tiles: never hungry over 30
turns: expected [], got [4,9,15]"). Earlier checks whose expectations changed with the rules were updated, each
with its reason in the builder's report. Watch in play: a new supply line sends the baggage limit plus the trip's
eating at once (24 for an army of 3 at 10 tiles), then about a turn's eating per turn; army orders now give
attention.

### TASK-406: sprint-end review fixes, cycle 2 (rules and log)

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end cycle 3 · Files:
`prototype/RULES.md`, this log. Criteria: every cycle-2 BLOCKER on the rules and the log fixed → cycle 3.

Both lenses BLOCKED in cycle 2 (Codex 4 blockers, 1 note; the reviewer 4 blockers, 1 warning, 5 notes). The
reviewer saw three kinds of finding recur from cycle 1 and proposed structural changes, taken here instead of
another patch. Army food across the turn: an army in one of your cities now fills its baggage inside step 4,
after the garrison eats and before the people eat and the city grows, and a supply line sends nothing while its
general stands in the city that feeds it (an army raised in a city could go hungry on turn 1: the line emptied
the city before the fill, and growth came first); supply's travel time is stated as rounded up, at least 1 turn;
"a supply line of any length" now says "once its first delivery lands, as long as the city has the food". The
hunger warning is defined as playing the next two ends of turn on a copy of the game, so it can't drift from the
rules (TASK-407). Provenance: an owner's mark is used only where its record contains the words the rule rests on,
quoted where not obvious; this log now records A1 to A5 and R1 with the option text the owner chose, word for
word; "a few rival cities far away" and the captured city quote A1's chosen text; the legend covers "(owner,
2026-10-15)" and says where the placeholder texts are; A3's "no person" quotes its option; stability and
sanitation are P7, the battle map and initiative eng. Handoff: from now on it is rewritten in the same commit as
the work it describes. Declined (the reviewer's note, twice): keeping the scratch checks in the repository, since
they hard-code today's numbers and would fail CI whenever the owner tunes `numbers.js`.

### TASK-407: sprint-end review fixes, cycle 2 (code)

Status complete · Agent: the TASK-403 agent, resumed · Checklist items 1 and 9 pass · Review: sprint-end cycle 3
(light bar) · Files: `prototype/game.js`, `ui.js`, `README.md`. Criteria: the code follows TASK-406's rules PASS;
checks PASS (128, rerun by the Orchestrator with its own spot check); smoke PASS; `npm run ci` 4/4 PASS.

Step 4 now fills armies' baggage in each city after the garrison eats and before the people eat and the city
grows; a supply line sends nothing while its general stands in its feeding city; the hand-built forecast is
replaced by `hungerAhead`, which plays the next two ends of turn on a copy of the state with the real `endTurn`
(about 4 ms on a grown game), read once per redraw by the waiting list, the general panel and the baggage tip;
the tooltips and README describe the size-1 garrison rule, the fill before growth and the look-ahead. Checks with
hand-worked expectations: the reviewer's scenario (a size-2 city, an army of 3 raised, supplied from the same city
and marched) is never hungry at the end of turn 1 for stores 10 to 50, where the cycle-2 code went hungry at 10,
20, 25, 30 and 50; supply sends 0 in the feeding city and 12 three tiles out; Codex's two armies in a size-1 city
are forecast exactly (only the newer one, at turn 2); over 10 seeds × 150 random turns the forecast made before
each End Turn matched all 32 real hungers with no false alarms, and the forecast from the turn before matched all
12 when no orders came between; the look-ahead leaves the state, dice and undo untouched. The builder's open
reading, kept as engineering's: the fill's one-turn reserve still counts the garrison's eating although the
garrison has eaten (RULES says "what the city eats in one turn").

## Design conformance

For the prototype, conforming means matching `prototype/RULES.md` (WORKFLOW, "Prototype phase"). Checked by the
builder's table and scratch checks and the Orchestrator's screenshots and spot check; the sprint-end review
(RULES.md itself at the normal bar, R1) and the owner's playtest come after this table.

| RULES.md section | Implemented in (`prototype/`) | Verified by | Status |
|---|---|---|---|
| The start; the rival | `game.js` `newGame`, `placeRivals`, end-of-turn step 10 | spot check; scratch checks (garrison 3/4/4/5/8/8) | PASS |
| Moves (army orders, undo) | `game.js` check and order functions for general, regiment, march, take, leave, supply; `undo` | scratch checks (one move each, undo exact); smoke | PASS |
| Cities, food; generals and regiments | `eats` (garrison first), `makeGeneral`, `armyBlocked`, steps 4, 5, 7 | scratch checks (regiment takes a person, waits at size 1; garrison eating) | PASS |
| Feeding armies: baggage and supply | `armyReserve`, `baggageCap`, `supplyPlan`, `foodOnWay`, `hungerAhead`, steps 2, 3, 4, 8 | scratch checks (fill, arrival turn, lands where the general is, supply before routes, size-8 city ships, hunger; TASK-405: lines of 7 to 10 tiles held 30 turns, take and march, leaving regiments; TASK-407: an army raised and supplied in one city, two armies in a size-1 city, the look-ahead against 1,500 random turns) | PASS |
| Battles, coin (plunder) | `winChance`, `winnerLeft`, `foeAt`, `rollDice`, step 9 | scratch checks under a fixed seed; capture screenshot (64%, 6 left, 30 plunder) | PASS |
| Sites, settlers (rival borders) | `siteProblem`, `foundProblemAt` | scratch checks; smoke | PASS |
| A turn | `endTurn`, one block per step, in RULES order | builder's table; review | PASS |
| The screen | `ui.js` `generalPanel`, `rivalPanel`, supply lines, garrison marks, tips, waiting list | screenshots; owner's playtest | pending playtest |

## Sprint-end review (step 7)

## Test summary

## Retrospective

## Handoff

- **State:** on `sprint/4`: TASK-401 to 407 committed (TASK-407 and this handoff are this commit). Sprint-end
  review: cycles 1 and 2 BLOCKED by both lenses; every cycle-2 blocker is fixed in TASK-406 (rules, log) and
  TASK-407 (code); local `npm run ci` 4/4.
- **In flight:** nothing yet; cycle 3 starts on a fresh stamp after this commit.
- **Waiting on:** cycle 3's verdicts; the owner's slice 1 playtest notes (invited, not blocking).
- **Next action:** stamp, run cycle 3 with both lenses. It is the last under the cap: if it finds new BLOCKERs,
  stop and ask the owner with a recommendation (WORKFLOW, "Review cycles"); if it passes, close Sprint 4.
