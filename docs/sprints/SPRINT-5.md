# Sprint 5: Prototype slice 3, a starting army and a draft of the web

| Field | Value |
|---|---|
| **Sprint** | 5 |
| **Status** | in-progress |
| **Dates** | 2026-10-18 → |
| **Base commit** | `af51d1d` (the Sprint 4 close) |
| **Previous close on GitHub** | run `39016931814`: success |
| **Orchestrator model** | `claude-opus-5-5` (Claude Code 2.1.302) |
| **CI verified** | no |

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
| TASK-505 | Orchestrator | `docs/WORKFLOW.md`, `docs/AGENTS.md`, `ROADMAP.md`, this log | Harness review: each mechanism checked against the last five sprints. Sprint 4's three proposals decided with the owner, and the adopted ones written in → `check-docs`, sprint-end review | no |

Waves: 501, then 502 (the starting army, delivered to the owner first) while 503 is written; 504 after 503. 505
runs alongside. The builder is a generic agent with the model named, as in Sprints 3 and 4: the simulation and
presentation definitions carry standing instructions the prototype exception sets aside.

## Plan review (step 2)

| Field | Value |
|---|---|
| **Trigger** | SKIP. TASK-502 and 504 are prototype work, which WORKFLOW exempts from plan review. TASK-501 and 503 write the owner's rulings into RULES.md, and TASK-505 is docs. The sprint-end review covers them all, RULES.md at the normal bar |

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

## Task log

### TASK-501: the starting army's rule, the phase line, the roadmap row

Status complete · Agent: Orchestrator · Checklist items 1 and 9 pass (self-check) · Review: sprint-end · Files:
`prototype/RULES.md`, `CLAUDE.md`, `ROADMAP.md`, this log, `docs/sprints/INDEX.md`. RULES.md's "The start" gives
the general 3 regiments (eng.) under G1's two quotes. The regiments take no person (eng.), and the baggage is full
with no extra food. The marks paragraph names G1 and was rewrapped. CLAUDE.md's phase line and the ROADMAP's M0.5
row now name slice 3 as the web and the starting army, with the category scores later (W1). `check-docs` PASS.

## Design conformance

| RULES.md section | Implemented in (`prototype/`) | Verified by | Status |
|---|---|---|---|

## Sprint-end review (step 7)

| Lens | Cycles | Findings | Final verdict | Stamp |
|---|---|---|---|---|
| Codex | | | | |
| Reviewer | | | | |

## Test summary

## Retrospective

## Handoff

- **State:** `sprint/5` created from `main` at `af51d1d`. G1 and W1 to W3 recorded.
- **In flight:** TASK-501 (RULES.md, the starting army).
- **Waiting on:** nothing.
- **Next action:** finish TASK-501, then spawn the builder for TASK-502.
