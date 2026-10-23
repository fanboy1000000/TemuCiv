# Sprint 5: Prototype slice 3, a starting army and a draft of the web

| Field | Value |
|---|---|
| **Sprint** | 5 |
| **Status** | complete |
| **Dates** | 2026-10-18 → 2026-10-23 |
| **Base commit** | `af51d1d` (the Sprint 4 close) |
| **Previous close on GitHub** | run `39016931814`: success |
| **Orchestrator model** | `claude-opus-5-5` (Claude Code 2.1.302) |
| **CI verified** | local `npm run ci` PASS on the close state (the GitHub run is recorded by Sprint 6) |

## Playtest input

_Pending: the owner hasn't played slices 1 and 2 yet. The starting army (G1) is delivered first, so slice 2 can
be played with it._

## Goal

The general starts with a small army (owner, 2026-10-18: "I want the general to start with a small army"). The
prototype gets a draft of the leader web, which is also the tech tree. Its branches earn experience from what you
do, and its nodes hold the Hall, Granary, Market and Workshop, plus leader bonuses (owner, 2026-10-18: "I also want
the demo to have the web in a draft version"). It tests slice 3's question: does the leader grow out of what you
do? This is also the fifth sprint, so it carries the harness review.

## Entropy scan

| Check | Result | Detail |
|---|---|---|
| `npm run check-docs` | CLEAN | 73 files, exit 0 |
| Anti-pattern greps (template list) | CLEAN | No `src/` code yet. No secrets or absolute paths in `prototype/`, `tools/`, `.github/`. The two `shortcut:` lines (ADR-010) are in the ROADMAP backlog |
| Orphaned files (last two sprints) | CLEAN | Nothing untracked. Every file added or changed since the S2 close exists |
| Docs still match code | DRIFT | CLAUDE.md's phase line still says "Sprint 4 builds slice 2" (TASK-501) |
| Harness review (every fifth sprint) | done (see Retrospective) | TASK-505 |

## Plan

| Task | Agent | May write | Acceptance criteria → verified by | High-risk |
|---|---|---|---|---|
| TASK-501 | Orchestrator | `prototype/RULES.md`, `CLAUDE.md`, `ROADMAP.md`, this log | The starting army's rule from G1, with every mark resting on the recorded words. The phase line and the M0.5 row are current → sprint-end review (RULES.md at the normal bar, R1) | no |
| TASK-502 | general-purpose agent (Opus, named at spawn) | `prototype/**` except `RULES.md` | A new game's general leads `start.regiments` (3) with full baggage, and the city stays size 2. With 0, the start is today's. README updated → scratch check, `node prototype/smoke.js`, `npm run ci`, screenshot | no (prototype) |
| TASK-503 | Orchestrator | `prototype/RULES.md`, this log | The web's rules from W1 to W3 and the Sprint 1 web rulings. Every mark rests on the recorded words → sprint-end review at the normal bar | no |
| TASK-504 | the TASK-502 agent, resumed | `prototype/**` except `RULES.md` | Plays as RULES.md's web section says. Every web number and node in `numbers.js`. The smoke check buys nodes and undoes them, and checks that experience is never negative and that undo restores it exactly. A web-locked building can't be ordered → the builder's scratch checks (expected values from RULES.md), smoke, `npm run ci`, screenshots, the owner's playtest | no (prototype) |
| TASK-505 | Orchestrator | `docs/WORKFLOW.md`, `docs/AGENTS.md`, `ROADMAP.md`, this log; widened during the task, as its entry declares: `tools/check-docs.mjs` and its test, FAIL-002 and the KB index, `prototype/RULES.md`, `prototype/RULINGS.md` (new) | Harness review: each mechanism checked against the last five sprints. Sprint 4's three proposals decided with the owner, and the adopted ones written in → `check-docs`, sprint-end review | no |
| TASK-506 | Orchestrator | `docs/WORKFLOW.md`, `docs/kb/decisions/ADR-006-ai-studio-governance.md`, this log | H2: the harness review weighs each mechanism's cost against the failure it guards against, over the whole project. Silence alone never removes one; removal needs a positive reason and the owner → `check-docs`, sprint-end review | no |
| TASK-507 | Orchestrator | `tools/check-docs.mjs`, `.claude/hooks/tests/docs-and-ci.test.mjs`, `prototype/RULES.md`, `prototype/README.md` (one line, small tasks exception), `docs/WORKFLOW.md`, `docs/AGENTS.md`, FAIL-002, `ROADMAP.md`, this log | Each sprint-end cycle 1 finding fixed, or declined with a reason. The quote check fails every bypass the lenses named → a test case per bypass, each seen failing against the old checker; `check-docs`, `npm run ci`; cycle 2 on the fixes | no |
| TASK-508 | Orchestrator | `tools/check-docs.mjs`, `.claude/hooks/tests/docs-and-ci.test.mjs`, `.claude/agents/reviewer.md`, `prototype/RULES.md`, `docs/WORKFLOW.md`, `docs/AGENTS.md`, ADR-006, FAIL-002, `docs/design/notes.md` (a marker), `ROADMAP.md`, this log | Each sprint-end cycle 2 finding fixed, or declined with a reason. The docs claim only what a text match proves. A mark opens its part of the parentheses → a test case per carry-over bypass, each seen passing the checker at `68dc333`; `check-docs`, `npm run ci`; cycle 3 on the fixes | no |

Waves: 501, then 502 (the starting army, delivered to the owner first) while 503 is written; 504 after 503. 505
runs alongside. 506 was added on 2026-10-20, after 504, from the owner's H2, and 507 on 2026-10-23 for the
sprint-end review's cycle 1 findings. The builder is a generic agent with the model named, as in Sprints 3 and 4:
the simulation and presentation definitions carry standing instructions the prototype exception sets aside.

## Plan review (step 2)

| Field | Value |
|---|---|
| **Trigger** | SKIP. TASK-502 and 504 are prototype work, which WORKFLOW exempts from plan review. TASK-501 and 503 write the owner's rulings into RULES.md, and TASK-505 and 506 are docs. The sprint-end review covers them all, RULES.md at the normal bar |

## Owner design rulings

Asked one at a time on 2026-10-18 and numbered so `prototype/RULES.md` can cite them. Each records the text the
owner saw and chose, word for word. Working notes: `.claude/refinements/REFINEMENT-starting-army.md` and
`REFINEMENT-draft-web.md`.

**G1, the starting army.** The request: "I want the general to start with a small army". Engineering showed by
simulation (seed 2026) that the starting capital can't feed a 3-regiment army. Kept at home, the army starves the
capital to size 1 on turn 3. Sent straight at the nearest rival city, a 5-turn march, it runs out of food and
arrives with 1 regiment. Asked "How should the starting army be fed?", the owner turned down extra carried food
(engineering's lean) and 40 more food at home, and chose "Normal food only": "The army has the usual 3 turns of
food and nothing else. It goes hungry on the march and arrives with about 1 regiment. The lesson is that armies are
expensive until you build farms. You won't get much of a march to feel." Shown to the owner and not corrected:
the army has 3 regiments, a number in `numbers.js`, and the regiments are "a free head start", so they "wouldn't
come out of your capital's 2 people".

**W1, what slice 3 includes.** "The demo" read as the prototype, shown to the owner and not corrected ("I'm
reading 'the demo' as the prototype you play now; say so if you meant something else"). Asked "Slice 3 was
planned as the web plus the category scores (economy, science, expansion, culture, military) with the win ratio on
screen. Should the draft include both?", the owner chose "Web alone (Recommended)": "Build only the web now. A
smaller slice that you can play sooner. The scores wait until the rival does something: today's rival never builds
or grows, so its scores would never change, and the category race would be hollow."

Shown with W1's question and not corrected: "four branches that the prototype already has activities for
(Military, Engineering, Agriculture, Economy), and one ring. Buying a node costs one move and can be undone, like
any other order."

**W2, what the nodes hold.** Asked "What should the draft web's nodes hold?", the owner chose "Buildings and
bonuses (Recommended)": "Matches both of your rulings. The Hall, Granary, Market and Workshop move onto nodes, while
farms, quarries, settlers, generals and regiments stay available to everyone. The other nodes give leader bonuses,
such as farms making more or armies marching farther. Cost: the opening changes, because you have to earn the four
buildings."

**W3, the node list.** Shown to the owner, word for word:

> **Shape:** you start owning a centre. Four branches run out from it, with four nodes each. You can buy any node
> linked to one you already own. The outer nodes of neighbouring branches are linked, so you can cross between
> branches. Nodes cost 10, 20, 30 and 40 experience, from the inner node out, and each missing point of experience
> costs 2 coin.
>
> | Branch | You earn experience by | Nodes, inner to outer |
> |---|---|---|
> | **Agriculture** | 1 per 4 food your farms grow | Granary · Rich soil (farms make 5 food, not 4) · Hardy settlers (10 food, not 15) · Field kitchens (armies carry 4 turns of food, not 3) |
> | **Engineering** | 1 per stone your quarries cut | Workshop · Deep quarries (3 stone, not 2) · Roads (goods and supply travel faster) · Master builders (buildings cost a quarter less stone) |
> | **Economy** | 1 per 4 coin you collect | Hall · Market · Tolls (more coin from trade) · Tax rolls (each person pays 1.5 coin, not 1) |
> | **Military** | 3 per regiment raised, 10 per battle | Drill (regiments build faster) · Foraging (armies away from home eat a quarter less) · Forced march (3 tiles a turn, not 2) · Siege craft (weaker rival walls) |
>
> I put the Hall first in Economy because it's your only way to get more moves per turn, and burying it deeper
> would slow the whole game down.

Asked "Go with this draft node list as placeholders?", the owner chose "Use it as placeholders (Recommended)":
"Build the list as shown. Every name, price and effect sits in numbers.js, so you can retune it after playing.
Your playtest notes decide what changes." The exact amounts behind "faster", "more" and "weaker" are engineering's
(RULES.md marks them eng.).

**H1, the review fixes (process, from the harness review).** Asked "Which of Sprint 4's three process fixes
should we adopt? They aim to stop the review rounds that drag on over small record slips.", the owner chose "All
three (Recommended)": "(1) After each reviewer's first full round, later rounds check only the fixes. (2) The log
copies each finding's status straight from the review file instead of retyping it. (3) A script checks that every
quote of your words in the rules appears word for word in a saved record, so reviewers stop doing it by hand. Cost:
a small script and its tests this sprint." (TASK-505.)

**H2, how the harness review judges a mechanism (2026-10-20).** Raised by the owner: "The five sprints limit seems
arbitrary. A rule that is important every now and then will get deleted". Engineering agreed: five quiet sprints
prove little for a rare failure, a working guard looks idle, and Sprint 5 kept the quiet guards by judgment, not by
the written rule. Shown to the owner, word for word:

> Keep a regular check; any fixed interval works, and five is just how often we look. Change the question it asks:
> - Each mechanism names the failure it guards against and how bad that failure would be.
> - Its cost is weighed against that risk, using the whole project's history, not the last five sprints.
> - **Silence alone is never a reason to remove a rule.** Removal needs a positive reason: the risk is gone (the
>   architecture changed, or a newer model no longer makes that mistake), or a cheaper guard now covers it.
> - A rule that guards against a severe failure can be made cheaper, but it can't be removed for being quiet.
> - Removing any mechanism goes to you for a decision, not just rules in CONVENTIONS.md.

Asked "Should I go with A?", where A was "Fix it now (recommended)", the owner said "Yes, go with A". (TASK-506.)

**H3, what a fix-only round reports (2026-10-23).** Raised by the reviewer's cycle 2 (W3): the reason WORKFLOW gave
for H1 said Sprint 4's fix-only rounds found nothing more in the game, which was false; Sprint 4's fix-only cycle 5
noticed two in-game hints contradicting the rules, outside the fixes. Asked "Should a fix-only round still report a
contradiction it happens to notice outside the fixes?", with that fact, the owner chose "Report what they notice
(Recommended)": "Later rounds still look only at the fixes and don't go hunting. If a reviewer happens to see a
contradiction elsewhere, it reports it, marked 'outside the fixes'. If it's about the game or the rules, I fix it,
with a narrow check of that fix. If it's only a record slip, it waits for the next sprint. Cost: now and then one
small extra fix. Sprint 4's wrong hint was caught this way." Turned down: "Keep H1 exactly". (TASK-508.)

**Districts brainstorm (2026-10-19, paused; nothing ruled).** The owner's note, districts as a mix of buildings, was
written into `docs/design/notes.md` at the owner's request and parked in the ROADMAP (commit `383b013`, not a task).
Engineering's six challenges, to take one at a time: (1) an "optimal mix" gets solved and the choice dies; (2) where
people live; (3) fixed slots or soft crowding as a district's limit; (4) a district against a site (P1); (5)
combinations as a table or as local quantities (a new concept); (6) the moves budget, as every building is an order.
Asked first, "Where do people live?": A, one population per city; B, residents per district; C, recommended, one
city pool with density and sanitation per district. The owner stopped before answering. Working notes:
`.claude/refinements/REFINEMENT-districts.md`.

**Owner's notes, the economy (2026-10-23, not a ruling).** Written into `docs/design/notes.md` at the owner's
request, in the owner's words (production, population, tax, stability, trade); routed to the ROADMAP's economy item.

## Task log

### TASK-501: the starting army's rule, the phase line, the roadmap row

Status complete · Agent: Orchestrator · Checklist items 1 and 9 pass (self-check) · Review: sprint-end · Files:
`prototype/RULES.md`, `CLAUDE.md`, `ROADMAP.md`, this log, `docs/sprints/INDEX.md`. RULES.md's "The start" gives
the general 3 regiments (eng.) under G1's two quotes. The regiments take no person (eng.), and the baggage is full
with no extra food. The marks paragraph names G1 and was rewrapped. CLAUDE.md's phase line and the ROADMAP's M0.5
row now name slice 3 as the web and the starting army, with the category scores later (W1). `check-docs` PASS.

### TASK-502: the starting army

Status complete · Agent: general-purpose (Opus, named at spawn) · Checklist items 1 and 9 pass · Review:
sprint-end · Files: `prototype/numbers.js`, `game.js`, `README.md`. A new number `start.regiments` (3). `newGame`
gives the first general those regiments and full baggage. The README's "Armies" opens with the starting army and
what it can do with the starting numbers. Criteria: a new game on five seeds has 3 regiments, baggage 18, and a
size-2 capital with 10 food and 10 stone PASS. With 0, the new-game state is identical to the committed code on
200 seeds, and a control with 3 fails as it should PASS. Smoke PASS, `npm run ci` PASS (Orchestrator's run).
Screenshots checked by the Orchestrator: the army marker "3" in the capital, the general's panel showing 18
food, 3 turns left. Brief contradiction, settled: "build food first" doesn't save the capital (a farm ordered on
turn 1 finishes on turn 5, after the capital starves on turn 3), so the README says to decide on turn 1. Raised
by the builder and taken into TASK-504: the city's food forecast leaves out the baggage refill ("−2 per turn"
while the store drops from 8 to 0), and the smoke check now gives few take and leave orders (3 and 4). The
proposed PAT (prove a "0 means as before" number against the committed code) was declined as prototype-only.

### TASK-503: the web's rules

Status complete · Agent: Orchestrator · Checklist items 1 and 9 pass (self-check) · Review: sprint-end, normal
bar · Files: `prototype/RULES.md`, this log. RULES.md gains "The web". The shape, branches, rates, prices and the
node table come from W3's list. The four buildings on nodes and the bonus nodes come from W2. The one ring and undo
come from W1's shown text, and the tech tree, leader and experience from the Sprint 1 rulings ("S1 web", "S1
progression", "S1 web pricing", now named in the marks paragraph). Every amount the list gave only as a direction
is marked eng. Also updated: the orders list and attention (buying a node, no attention), the building table
(needs its node), the top bar and the web screen, the turn's experience steps, and "Left out". Every quoted mark
was checked word for word against this log and the Sprint 1 log.

### TASK-504: the draft web

Status complete · Agent: the TASK-502 builder, resumed · Checklist items 1 and 9 pass · Review: sprint-end ·
Files: `prototype/numbers.js`, `game.js`, `ui.js`, `index.html`, `smoke.js`, `README.md`, `ROADMAP.md`.

What was built:
- `numbers.js`: a `web` section with prices, coin per point, and the four branches in ring order with their rates
  and nodes. A building node names its building; a bonus node sets one named number.
- `game.js`: the nodes and links; `rates(s)`, every bonus-changed number derived from the nodes owned (`NUMBERS`
  never changes); experience at steps 1, 3, 5, 6 and 9; the buy order; the building locks; and a `lookAhead`
  that also gives the food forecast the baggage refill.
- `ui.js`: experience and a Web button in the top bar, and the web overlay (hover, click to buy, Esc).
- `smoke.js`: buys, refused buys, and a minimum of 10 per order kind.

Criteria:
- The builder's scratch checks, with expected values from RULES.md PASS: 59 on experience, buying, links and locks;
  53 on the 12 bonuses and the forecast. Among them: Siege craft 3 against 3 = 39.0%, and Master builders' Granary
  8, Hall 15 and second Hall 23.
- Smoke PASS (seed 1): 17 order kinds, the fewest "found 32" (rerun 2026-10-23); 16 of 16 nodes owned.
- `npm run ci` PASS (Orchestrator's run); 40 seeds of smoke copies PASS.
- Screenshots checked by the Orchestrator PASS: the opening's experience block and the locked Hall and Granary
  reasons; the web with owned, buyable and unlinked nodes and the ring.
- The Orchestrator read `rates`, `earn` and its six call sites (at five steps), `nodePrice`, `checkBuy`, `buildCost`,
  `armyEatsNow` and `winChance` against RULES.md: no mismatch.

Brief contradictions, settled: found was also under 10 on many seeds, so smoke now favours the least-given kind
half the time. Declared deviations, accepted (eng.): that order choice; no smoke buys refused for lack of moves
(the scratch checks cover them); a "to baggage" readout; a two-decimal rate formatter.

Kept as notes, not put to the owner (neither changes a rule):
- With 14.5 experience the screen shows 14, while the coin for a 20 node is 11. That's RULES' "fractions kept,
  shown rounded down", and the hover states the exact amounts.
- Below about 1440 px the top bar wraps once saved moves add pips.

Proposed entries declined:
- The PAT (measure smoke coverage across many seeds) is prototype-only for now. Its lesson is added to the
  ROADMAP's soak-games item.
- The FAIL (backslashes lost in scripts written through tool input) names no guard to add.

### TASK-505: the harness review and the review fixes

Status complete · Agent: Orchestrator · Checklist item 1: scope widened past the plan row (declared below); item 9
pass (self-check) · Review: sprint-end, normal bar · Files: `tools/check-docs.mjs`,
`.claude/hooks/tests/docs-and-ci.test.mjs`, `docs/WORKFLOW.md`, `docs/AGENTS.md`,
`docs/kb/failures/FAIL-002-review-tails-on-records.md`, `docs/kb/INDEX.md`, `ROADMAP.md`, `prototype/RULES.md`,
`prototype/RULINGS.md` (new), this log. Scope widened from the plan row: `tools/check-docs.mjs` and the tests
(H1's script), FAIL-002 and the KB index, `prototype/RULES.md` and the new `prototype/RULINGS.md`.

The harness review, in H2's form since TASK-508: each mechanism, the failure it guards against, how bad that would
be, what it caught in Sprints 1 to 5, and its cost.

| Mechanism | Guards against | How bad | Caught | Cost | Verdict |
|---|---|---|---|---|---|
| Refinement gate | building from a misread request | a sprint's work | S2's six moves-budget challenges; S5's starving starting army | one skill run per request | keep |
| Sprint-end review, first two cycles | rule gaps and design mismatches reaching `main` | high | real rule gaps every sprint (S3 a screen hint against the rules; S4 hunger on long supply lines and on turn 1) | two lenses per cycle | keep |
| Sprint-end review, cycle 3 on | the same, in the fixes | high | mostly slips in fresh records (S2 decision-record detail, S4 owner marks and log lines); 14, 4, 3 and 6 cycles; two waivers | days per sprint | changed by H1 (fix-only cycles) |
| Owner marks checked by eye | a ruling copied wrong, so the prototype tests the wrong idea (R1) | high | S3 attribution took three passes; S4 cycles 3 to 6 | review cycles | the words checked by H1's script; attribution stays with review |
| Plan and per-task review | a flawed plan, or a high-risk change accepted unchecked | high once game code exists | S1 and S2; skipped since under the prototype rules | none since S2 | keep for production |
| Close gates | a sprint closing unreviewed or red | severe: unreviewed work on `main` | two waivers on the owner's say-so (S2, S4); no false block | seconds | keep |
| Review stamp | closing a state other than the one reviewed | severe: unreviewed work on `main` | none recorded | seconds | keep |
| Git hooks, sprint-close guard, model-routing guard, secret scan, GitHub CI | a leaked secret; unreviewed work on `main`; a review on a cheaper model | severe | no recorded block since S1 | automatic | keep: severe, so never removed for being quiet (H2) |
| `check-docs`: size budgets, indexes, roster, links | docs that drift, bloat or point nowhere, which agents then act on | medium | none recorded; every entropy scan CLEAN | seconds, in CI | keep |
| Constraint checklist | work outside its scope; secrets or leftovers in a change | medium in the prototype (items 1 and 9) | none recorded; in S5 its self-check passed TASK-505's widened scope, which Codex caught | a line per task | keep; the constraint-validator takes it over once game code exists |
| Entropy scan | docs that no longer describe the code | medium | stale phase lines (S5) | minutes | keep |
| Brief challenge | agents acting on wrong claims in their brief | medium | wrong brief claims settled each prototype sprint (S4 `smoke.js`; S5 "build food first") | a report section | keep |

No mechanism has a positive reason for removal: no risk is gone, and no cheaper guard covers one, so nothing is
removed. H1's changes are in WORKFLOW ("Review cycles", step 7.4, "Prototype phase"), AGENTS' Codex FOCUS (a
`[fixes]` line) and `check-docs` step 6. Also:
- Slice 1's placeholder answers were copied into `prototype/RULINGS.md`, identical to the working notes by diff.
- RULES.md now keeps every owner quote inside its mark: A1's "a few rival cities far away", and the web table
  paragraph's W3 quotes.
- FAIL-002 records the failure, and the ROADMAP's rulebook item is done.

Criteria:
- `check-docs` PASS on the real RULES.md, and fails on a planted misquote and an unknown mark PASS.
- The new governance test passes PASS.
- Each of four named mutations made it fail for the right reason PASS: struck text counted; a mark not carried
  to its second quote; the record never read; quotes not opaque to parentheses.

### TASK-506: how the harness review judges a mechanism

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end, normal bar · Files:
`docs/WORKFLOW.md`, `docs/kb/decisions/ADR-006-ai-studio-governance.md`, this log. WORKFLOW's "Harness evolution"
replaces "did it catch anything in the last five sprints?" with H2's test: a table row per mechanism (the failure
it guards against, how bad it would be, what it caught over the whole project, its cost); silence alone never
removes one; removal needs a positive reason; a guard against a severe failure can be made cheaper but is never
removed for being quiet; removing any mechanism, or relaxing a CONVENTIONS rule, is the owner's decision. ADR-006's
status, earned-governance line and consequence follow. TASK-505's verdicts stand under the new test: nothing was
removed, and the quiet hooks, guards and secret scan were kept for the risk they cover, as H2 now requires.
Criteria: the WORKFLOW bullet states all five rules (read) PASS; ADR-006 consistent with it (read) PASS;
`check-docs` and `npm run ci` PASS.

### TASK-507: the sprint-end review's cycle 1 findings

Status complete · Agent: Orchestrator (the README line under the small tasks exception) · Checklist items 1 and 9
pass (self-check) · Review: sprint-end cycle 2, on the fixes · Files: `tools/check-docs.mjs`,
`.claude/hooks/tests/docs-and-ci.test.mjs`, `prototype/RULES.md`, `prototype/README.md`, `docs/WORKFLOW.md`,
`docs/AGENTS.md`, `docs/kb/failures/FAIL-002-review-tails-on-records.md`, `ROADMAP.md`, this log. Refinement
skipped: review fixes, each specified by its finding. Cycle 1 ran on 2026-10-18 at `15ead79`, and both lenses
BLOCKED (`.claude/reviews/SPRINT-5-codex-c1.md` and `SPRINT-5-reviewer-c1.md`, gitignored). The fixes waited until
2026-10-23: the sessions between took H2 and the districts notes, and the handoff left out the open review.

In plain words: the quote checker now checks each quote against the paragraphs it lists for the quote's mark, not
the whole log (what that can't prove: TASK-508). It fails a quote outside a mark, an unknown mark, and a ruling
whose opening words have moved. RULES.md keeps double quotes for the owner's words only; names of screens and
records are in italics.

Codex, cycle 1, each finding's status:
- B1 (the checker approves wrongly attributed words): fixed. Each known mark lists its ruling's paragraphs; a quote
  outside a mark, or in parentheses with no mark, fails; nine new test cases.
- B2 (WORKFLOW adds to H1): fixed. The full-cycle exception is gone from WORKFLOW and FAIL-002; quoting a
  gitignored-file change is credited to FAIL-002, not H1.
- B3 (RULINGS.md under the light bar): fixed in WORKFLOW's "Prototype phase" and both places in AGENTS.
- B4 (TASK-505's scope): fixed. Its plan row names the widened scope, and its entry says item 1 was widened.
- B5 (false smoke evidence): fixed. TASK-504 quotes the run: the fewest is "found 32".
- B6 (stale handoff): fixed; the handoff is refreshed here.
- Note (the README's "no other food for it anywhere"): fixed: "no extra food was added for it".

Reviewer, cycle 1, each finding's status:
- B1 (the full-cycle exception): fixed, as Codex B2.
- W1 (Sprint 4 misstated): fixed in WORKFLOW and FAIL-002. Its proposed rule (a fix-only round still reports what
  it sees outside the fixes) declined: H1 limits later rounds to the fixes, and widening that is the owner's call.
- W2 (quotes outside a mark skipped) and W3 (the whole log read): fixed, as Codex B1.
- W4 (RULINGS.md's bar): fixed, as Codex B3.
- N1 (H1 credited with engineering's convention): fixed in RULES.md and WORKFLOW; H1 joins RULES.md's marks list.
- N2 (no pointer from the base numbers to the web) and N3 (undo leaves out experience): fixed in RULES.md.
- N4 (log bookkeeping): fixed: six call sites at five steps; where (1) to (3) went; TASK-504's files gain
  `ROADMAP.md`; TASK-505's widened scope gains FAIL-002 and the KB index.
- N5 (smoke never checks a locked building): declined: the criterion named the builder's scratch checks, which do.
- N6 (the harness table leaves out three mechanisms): declined: the next harness review builds H2's full table.
- N7 (the Economy branch against Sprint 1's proposal): routed to the ROADMAP backlog as a slice 3 watch item.
- Delete-list: "S1 web pricing" now names its own ruling, so it stays; the full-cycle exception is deleted.

Criteria:
- `check-docs` on the real RULES.md PASS. Before the italics it failed on exactly the 20 names in quotes, and on no
  quote of the owner's words PASS.
- The docs tests PASS (4 of 4); the quote test now has 15 failure cases.
- Each new case can fail PASS: against the checker before TASK-507 (a throwaway checkout of `04d3e41`), 7 passed
  outright (the bypasses) and 2 failed for the wrong reason.
- `npm run ci` PASS.

### TASK-508: the sprint-end review's cycle 2 findings

Status complete · Agent: Orchestrator · Checklist items 1 and 9 pass (self-check) · Review: cycle 3 · Files: as its
plan row. Cycle 2 at `68dc333`: both lenses BLOCKED. The checker's bypasses were the second round of the same kind,
so the docs now claim only what a text match proves; whether a quote is the owner's decision stays with review.

Codex, cycle 2: B1 (a mark carried past other words) fixed: a mark opens its part of the parentheses, and only a
bare quote continues it. B2 (the harness table not in H2's form) fixed: TASK-505's table gains what each mechanism
guards against, how bad that would be, and three rows. B3 (ADR-006's removal rule) fixed. B4 (where H1's changes
went) fixed by naming the places, not item by item. B5 and B6 (the districts commit, its challenges) fixed:
"Districts brainstorm" under the owner rulings, and the ROADMAP entry points there. N1 (the unused H2 entry) deleted.

Reviewer, cycle 2: B1 (what a text match proves) fixed in check-docs' comment, WORKFLOW, FAIL-002, RULES.md and
TASK-507's entry, and the test case renamed; checking P quotes against RULINGS.md alone declined, as it would
re-quote two rules for precision the review already gives. W1 fixed in `reviewer.md`; W2 in WORKFLOW and AGENTS; W3
put to the owner: H3, written into both. N1 fixed: the handoff names the paused districts question, and TASK-507's
B6 line no longer credits TASK-506's commit. N2 fixed (ADR-006; the severe-failure examples marked engineering's).
N3: the carry-over fixed with Codex B1; curly quotes declined, as RULES.md is written with straight ones. N4 fixed:
the notes marker names where the idea went, and the ROADMAP entry carries no live status. Delete-list: done.

Criteria: `check-docs` on the real RULES.md PASS; the docs tests PASS (4 of 4), and against the checker at
`68dc333` the three new carry-over cases passed outright PASS; `npm run ci` PASS.

## Design conformance

For the prototype, conforming means matching `prototype/RULES.md` (WORKFLOW, "Prototype phase"). The sprint-end
review (RULES.md at the normal bar) and the owner's playtest come after this table.

| RULES.md section | Implemented in (`prototype/`) | Verified by | Status |
|---|---|---|---|
| The start (G1) | `game.js` `newGame` | TASK-502 scratch checks (5 seeds; 0 identical to before on 200 seeds); screenshot | PASS |
| The web: shape, links, branches | `game.js` `NODES`, `LINKS`, `linksOf`, `owns` | scratch checks (20 links, cross-links); web screenshot | PASS |
| The web: experience, its steps | `earn` at steps 1, 3, 5, 6, 9 | scratch checks (farm with and without attention, quarry, coin, trade, plunder, regiment, battle won and lost) | PASS |
| The web: buying, undo, no attention | `nodePrice`, `checkBuy`, `orderBuy` | scratch checks (experience then coin, refusals, undo exact); smoke | PASS |
| The web: locked buildings (W2) | `checkBuild`, `nodeFor` | scratch checks (reason texts); screenshot | PASS |
| The web: the 12 bonuses | `rates`, `buildCost`, `armyEatsNow`, `winChance`, `travelTurns` | scratch checks, one or more per bonus | PASS |
| Moves, production table, a turn | `game.js` as above | scratch checks; Orchestrator's read | PASS |
| The screen: top bar, the web overlay, food forecast | `ui.js`, `index.html` | screenshots; owner's playtest | pending playtest |

## Sprint-end review (step 7)

| Lens | Cycles | Findings | Final verdict | Stamp |
|---|---|---|---|---|
| Codex | 3 | BLOCKERs every cycle; in cycle 3 on records only | BLOCKED, waived by the owner (`SPRINT-5-reviews-WAIVED.md`) | `23f9a42` |
| Reviewer | 3 | a BLOCKER in cycles 1 and 2; none in cycle 3 | APPROVED-WITH-WARNINGS | `23f9a42` |

## Test summary

Local `npm run ci` on the close state: 4/4 PASS (docs check, secret scan, 54 governance tests, prototype smoke game).

## Retrospective

- **Went well:** the army and the web were checked against RULES.md; H1 made quote checks a test; H2 and H3 came up.
- **To improve:** cycle 1's findings sat five days because the handoff dropped the open review, and the checker took
  two rounds of fixes before the docs said what a text match can prove. Codex blocked every cycle.
- **Rulebook review (cap reached):** fix-only rounds were shorter, but each fix entry is fresh text that drew the next
  finding. Sprint 6 takes a FAIL entry for the dropped review, with a guard, and shorter fix entries (ROADMAP).

## Handoff

- **State:** closed by `S5 close` on `sprint/5`, reviews gate waived by the owner; `main` fast-forwarded and pushed.
- **Waiting on:** the GitHub CI run for the push (Sprint 6 records it); the owner's playtest of slices 1 to 3.
- **Open questions:** the districts brainstorm, paused at "Where do people live?"; the economy note of 2026-10-23.
- **Next action:** Sprint 6: first Sprint 5's open review points and CLAUDE.md's phase line (ROADMAP), then slice 4.
