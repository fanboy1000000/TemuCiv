# Sprint 1: Governance foundation

| Field | Value |
|---|---|
| **Sprint** | 1 |
| **Status** | in-progress |
| **Dates** | 2026-09-30 → |
| **Base commit** | `(none)`: first sprint, empty repository |
| **Orchestrator model** | `claude-opus-5-5` (Claude Code 2.1.286) |
| **CI verified** | pending |

## Playtest input

None (no playable build yet).

## Goal

Set up the way TemuCiv is built before any game code exists: the rules every agent follows, the sprint workflow,
the agent roster, the review process with Codex, and the machines that enforce it. It's adapted from the owner's
StatsTid project (ADR-006, option B).

## Entropy scan

| Check | Result | Detail |
|---|---|---|
| `npm run check-docs` | CLEAN | Introduced this sprint; passes on the sprint's state |
| Anti-pattern greps | n/a | No code yet |
| Orphaned files | n/a | First sprint |
| Docs still match code | n/a | First sprint |
| Harness review | n/a | Due at sprint 5 |

## Plan

**Bootstrap exception (declared deviation).** The workflow, the agent definitions and the review tooling are what
this sprint creates, so its own steps couldn't run before it: no plan review (step 2), no agent delegation (step
3). The Orchestrator wrote everything directly. **Compensation:** the full result goes through the dual-lens
sprint-end review (step 7) with the normal cycle cap, and the close guard applies to this sprint's own close.

| Task | Agent | May write | Acceptance criteria → verified by | High-risk |
|---|---|---|---|---|
| TASK-101 | Orchestrator | `docs/CONVENTIONS.md`, `docs/WORKFLOW.md`, `docs/AGENTS.md`, `CLAUDE.md` | Owner decisions so far recorded; StatsTid essentials adopted with game-specific changes → review | no |
| TASK-102 | Orchestrator | `.claude/agents/**` | 10 roles, each listed in the roster with a matching model → `check-docs` | no |
| TASK-103 | Orchestrator | `.claude/skills/**` | `refine-requirements` and `systematic-debugging` adapted to TemuCiv → review | no |
| TASK-104 | Orchestrator | `.claude/hooks/**`, `.claude/settings.json` | Close guard enforces 5 gates; routing guard enforces 2 rules; tests fail when a gate is disabled → hook tests + mutation | no |
| TASK-105 | Orchestrator | `tools/**`, `.github/**`, `package.json`, repo config | `npm run ci` runs every check and records the result; GitHub CI runs checks and secret scan → CI run | no |
| TASK-106 | Orchestrator | `docs/kb/**` | ADR-001–007 recorded; KB index complete → `check-docs` | no |
| TASK-107 | Orchestrator | `docs/sprints/**`, `docs/design/**`, `ROADMAP.md`, `README.md` | Sprint template, design templates, roadmap → review | no |

**Scope addition (2026-10-04).** The owner ruled that the game is real time with pause, not turn-based. Recorded
as ADR-007 (TASK-106), with "turn-based", "turn count" and "turn processing" replaced across the docs, agent
definitions, skills, `package.json` and the roadmap (TASK-101, 102, 103, 105, 107). Hotseat is dropped.

**Scope addition (2026-10-05).** The owner reversed that ruling: the game is turn-based, with simultaneous
turns on the world map and initiative order in battles. Recorded as ADR-008, which supersedes ADR-007 (TASK-106).
The real-time wording is reverted in CLAUDE.md, CONVENTIONS, AGENTS, WORKFLOW, README, `package.json`, the
roadmap, ADR-003 (hotseat possible again), ADR-005, the simulation and ai-player agents and the debugging skill
(TASK-101, 102, 103, 105, 107).

**Scope addition (2026-10-05, AI).** The owner agreed to the layered AI approach. Recorded as ADR-009 (TASK-106),
with a "How the AI plays this" section in the system template, the AI moved forward to grow from M2 in the
roadmap, and the ai-player agent pointed at ADR-009 (TASK-102, 107).

## Owner design rulings (brainstorm, 2026-10-04)

Recorded here so they are not left in a conversation; routed into `docs/design/` with the owner's OK (ROADMAP
backlog). Decided by the owner:
- **Progression is a Path of Exile-style web** that also builds the leader (owner's notes, "Build your leader").
  Branch set open: Military, Engineering, Education, Agriculture, Health (owner); Economy, Culture, Governance,
  Exploration proposed, arranged in a ring so neighbors form mixed zones.
- ~~**Eras arrive for everyone on a schedule.** No research race; the web decides how much each player gets out of
  the shared content.~~ Replaced 2026-10-07 by the web in rings (see "Progression, revised").
- **One currency buys everything** (buildings, units, web nodes). Each city's production only sets build speed.
- ~~**Web prices fall with activity in a branch** (option A): fighting makes Military nodes cheaper, and so on. Any
  node can still be bought at full price.~~ Replaced 2026-10-07 by branch experience (see "Web pricing").
- **Logistics is a major feature.** Food is physical and moved between cities; armies need food and supply lines;
  new cities and later urban centers depend on shipped food.
- ~~**Real time with pause and speed controls** (ADR-007).~~ Reversed 2026-10-05: turn-based (see below).

**Update (2026-10-05): back to turn-based.** The owner reversed the real-time ruling after thinking through
combat: the big pieces must be mapped before any one of them is locked. Recorded as ADR-008 (supersedes
ADR-007). Working notes: `.claude/refinements/REFINEMENT-turns-and-combat.md`.
- **On the world map, everyone moves at once** (simultaneous turns). **In battle, the general with the highest
  initiative acts first.** Initiative is a general's stat, defined later.

The owner's combat concept, still to be matured:
- Each turn has two phases: city management and unit movement, then combat.
- Armies follow a general, and the supply line follows the general. Units stand on the general's tile or the
  tiles around it.
- Hostile armies that are adjacent fight, on a finer battle map where each world tile unfolds into several
  hexes whose terrain comes from that tile.

Proposed by engineering, not yet confirmed: node prices rising with each node bought; Education as "adopting each
new era" (cheaper upgrades, a short head start); Economy as trade, efficiency and rushing, never income
multipliers; size-scaled brakes on the snowball; logistics automated through routes the player designs. Deferred
by the owner: a target for how often a halfway leader should win.

**AI opponents (research presented 2026-10-05).** Agreed by the owner the same day, recorded as ADR-009: a layered AI
(scoring with personality weights in data for strategy and operations, influence maps, planning for war and
logistics, look-ahead search for battles, weights tuned by headless AI-vs-AI games); no self-play machine
learning as the main AI; LLMs at most an optional layer later. Every system spec answers "how does the AI play
this?"; the AI grows with each system from M2 instead of arriving in M4. Deferred by the owner: whether rivals
play to win, play a role, or play to win in character.

**Expansion (2026-10-05).** Decided by the owner: no hard limit on how far a city reaches (unlike Civ 7's three
tiles). What stops a city from growing further is stability and sanitation; the reason to found a new city is
wanting resources somewhere else. Proposed by engineering, not yet confirmed: distance from the city center costs
something, through logistics (a far tile's output must be hauled) and possibly stability, since otherwise one city
reaches every resource and the reason to found a new one disappears; the Health and Governance branches raise the
sanitation and stability ceilings; the same brakes serve as the size-scaled snowball brakes. Working notes:
`.claude/refinements/REFINEMENT-expansion.md`.

**Scope: antiquity first (2026-10-05).** Decided by the owner: the first version covers one age, a timeline like
Civ 7's Antiquity; later ages come after it ("let's get the basics right"). Flagged, not yet re-ruled: the
scheduled eras (sub-eras inside antiquity, or none), civ switching (the owner's equalizer has no age transition to
hang on), the endgame (the end of antiquity is the end of the game), a science victory path (no space race), and
building renovation (less obsolescence inside one age). Proposed by engineering, not yet confirmed: ages are data,
not code (ADR-004, ADR-005), and no age-transition machinery is built for the first version. Working notes:
`.claude/refinements/REFINEMENT-scope-antiquity.md`.

**Scope clarified (2026-10-07).** The owner clarified that antiquity only is the scope of a small playable demo
to test the basic ideas before full development, not the scope of the game. Systems are designed for the full
game across several ages; the demo is a slice of it. The tensions flagged above dissolve for the full game:
civ switching can hang on age transitions again, the end of antiquity ends only the demo, and buildings can age
across ages. Engineering's proposal stands with a sharper reason: ages are data, not code, and no
age-transition machinery is built for the demo, but nothing may assume a single age.

**Demo scope (2026-10-07).** Decided by the owner: civ switching and diplomacy are left out of the first demo
(not out of the game). Knock-ons, flagged: war and peace need some minimal rule without diplomacy (taken up with
the map and borders); blocking a victory leader works through each player's own play and AI behavior, not
treaties; ideas spread through shared borders and contact rather than trade agreements.

**Map and borders (2026-10-07).** Decided by the owner: borders grow tile by tile from each city, as in
Civilization, rather than regions drawn by the map (Humankind) or territory defined by supply reach. It matches
the expansion rulings, which think in tiles, and lets distance cost something tile by tile. Also decided: there are several map types, each a generator with its
own character that makes a somewhat different map every game; the demo has one type, similar to Civ 7's
Continents and Islands (two large continents plus islands). Demo only (the owner's words: "just a demo
decision"): ships carry armies, settlers and food, and sea routes are part of logistics, with no battles at sea;
naval warfare in the full game stays open. Demo only: the map holds only the players, with no tribes or
independent peoples (engineering had leaned to hostile tribes); flagged: starting positions must put players
within reach of each other, or armies have nothing to do early. Demo only: every player is at war with every
other from the moment they meet, with no declarations and no peace (engineering had leaned to peace until a
declaration); flagged: builders get no breathing room, and blocking a leader becomes a choice of target. The
big-picture map and borders questions are answered; the rest is parked for the map spec.

**Victory (2026-10-05).** Decided by the owner after the research (artifact "TemuCiv Victory Options"): you win
by a dominant lead, announced to everyone and held through a countdown; ~~there is one score, not one per path~~ (reversed 2026-10-07, see below).
Proposed by engineering, not yet confirmed: the game ends at the close of antiquity if nobody has won, highest
score wins; conquest as a sudden ending; every path feeds the score. Ruled the same day: the score is current
(what you have now, which rivals can take), with no banked part; owner and engineering agree the war winner is the
main balance risk. Working notes: `.claude/refinements/REFINEMENT-victory.md`.

**Victory, revised (2026-10-07).** The owner reversed "one score" for a more interesting endgame: there is one
score per category: economy, science, expansion, culture and military (military confirmed the same day; how
it is measured is designed later, in the victory spec). You win a
category by reaching a set multiple of the runner-up's score in it, so rivals block a win by keeping their own
score in that category high enough. Every player then has two jobs: push their own category and keep up in the
others. The dominant lead, the announcement and the countdown still apply, now per category; the score stays
current (assumed to carry over). Proposed by engineering, not yet confirmed: conquest as the sudden ending; at the close of
the last age with no winner (the end of antiquity in the demo), the best ratio in any category wins; a floor so tiny early scores can't win a
category. Deferred by the owner to the victory spec: the win condition details, including how military is
measured and how a game ends when nobody wins.

**Progression, revised (2026-10-07).** The owner reconsidered the scheduled eras after the research (artifact
"TemuCiv Progress Options") and chose system D, the web in rings: the leader web is also the tech tree, so new
units, buildings and improvements sit on its nodes and are bought with the one currency. Each era of antiquity is
a ring of the web. A ring opens for a player when the calendar has reached it and that player holds enough of the
ring inside it (a double gate, as in Crusader Kings III). A small set of basics arrives with each era for
everyone; ideas that neighbors and trading partners already own are cheaper; science lowers web prices and makes
a player ready sooner, which is what the science category measures. Given up: a fully open race (the calendar
caps the leader) and the simplicity of a short tech list; it is also the most work to build of the options. In the
demo, the rings are antiquity's eras; in the full game, later ages add rings further out (whether a ring is an
age or an era inside one is for the progress spec). Details (ring and node
counts, what is basic, how much counts as ready, the discount for known ideas, price growth) wait for the
progress spec. Working notes: `.claude/refinements/REFINEMENT-progression.md`.

**Web pricing (2026-10-07).** The owner challenged the one currency; research presented as an artifact ("TemuCiv
Currency Options"). Asked by the owner and decided: each branch of the web has its own experience, earned by
activity in that branch (fighting earns Military experience, and so on); a node is bought with its branch's
experience, and coin makes up any shortfall at a premium, so any node can still be bought. This replaces the
rule that prices fall with activity. Still open, carried over: what pays for units and buildings (engineering's
lean: one coin for the abstract plus a few physical goods hauled by logistics). Working notes:
`.claude/refinements/REFINEMENT-economy.md`.

## Plan review (step 2)

| Field | Value |
|---|---|
| **Trigger** | SKIP: bootstrap exception (see Plan) |

## Task log

_Recorded after verification._

## Design conformance

Not applicable: no game design implemented this sprint.

## Sprint-end review (step 7)

_Pending._

## Test summary

_Pending the final CI run._

## Retrospective

_Pending._

## Handoff

- **State:** all Sprint 1 files written; nothing committed yet (empty repository, remote `origin` set to the
  public GitHub repo).
- **In flight:** verification, then the sprint-end review.
- **Waiting on:** nothing from the owner yet; the first push needs the owner's go-ahead.
- **Next action:** RED evidence for the hook tests, then run Codex and the reviewer on the whole sprint. A Codex
  cycle-1 result already exists (`.claude/reviews/SPRINT-1-codex-c1.md`, verdict BLOCKED): check which findings
  are fixed before the next cycle. The ADR-007 doc changes (2026-10-04) and the ADR-008/ADR-009 changes
  (2026-10-05) are part of the scope to review.
- **Design brainstorm in progress** with the owner: rulings so far are under "Owner design rulings".
- **Turn-based reversal (2026-10-05):** ADR-008 written and the real-time wording reverted (see the second
  scope addition). Both join the sprint-end review scope. Whether the player commands battles by hand is parked
  for the combat spec (owner: not a core feature). The AI approach is agreed (ADR-009); the
  rivals' personality question is deferred by the owner.
- **Brainstorm piece in progress (owner's pick, 2026-10-05): expansion and the map** (settling, growth, borders).
  The expansion ruling is recorded (see "Owner design rulings"); the map and borders are not yet discussed.
  Scope ruling (same day): the first version is antiquity only; its flagged tensions are listed with the rulings.
- **Victory and the endgame (owner's pick, 2026-10-05):** research presented as an artifact ("TemuCiv Victory
  Options", https://claude.ai/artifact/P1TRrL1zgE9aYz6y7C2j4h). Lean: one total fed by every path, a fixed end at
  the close of antiquity, an early win by a dominant lead held through an announced countdown, conquest as the
  sudden ending; goals drawn from the leader web as a possible later layer. Owner ruled the same day: dominant
  lead, announced and held, one score, current not banked (see "Owner design rulings"). Still proposed, not
  ruled: the end at the close of antiquity and conquest as a sudden ending. Remaining big pieces: diplomacy, the
  map and borders, the hook, and re-ruling the antiquity tensions (eras inside antiquity, civ switching).
  Stay at the big-picture level; details wait for each system's spec.
- **Victory revised (2026-10-07):** the owner replaced the one score with a score per category, each won by a
  multiple of the runner-up's score. Five categories, the fifth is military (see "Owner design rulings").
  The rest of the win condition waits for the victory spec (owner). Next: the remaining big pieces, or closing
  Sprint 1 first (engineering's recommendation, since nothing is committed yet).
- **Progression revised (2026-10-07):** research presented as an artifact ("TemuCiv Progress Options",
  https://claude.ai/artifact/6FvBqENjSBudNM7WoknvjU); the owner chose the web in rings (see "Owner design
  rulings"). Remaining big pieces: diplomacy, the map and borders, the hook, civ switching.
- **Scope clarified (2026-10-07):** antiquity only is the demo's scope, not the game's (see "Owner design
  rulings"). Design for the full game; the demo is a slice. What the demo must prove is for `scope.md`.
- **The hook (2026-10-07):** the owner does not want to name it now; it should grow organically while the idea
  develops. Not a brainstorm piece; don't push for it.
- **Demo scope (2026-10-07):** diplomacy and civ switching are out of the demo. Brainstorm piece in progress:
  **map and borders** (owner's pick), big picture done the same day: borders tile by tile, map types as
  generators (demo: one type like Civ 7's Continents and Islands); demo only: transport ships without sea
  battles, no one else on the map, always at war. Working notes: `.claude/refinements/REFINEMENT-map-borders.md`.
- **The economy under review (2026-10-07):** the owner is challenging "one currency buys everything". Research
  presented as an artifact ("TemuCiv Currency Options", https://claude.ai/artifact/QMyAffdj5RQVLTARNoXFHX).
  The owner added a currency per web branch and chose the mixed pricing (branch experience, coin tops up).
  Open, carried over: which economy pays for units and buildings (lean: coin and goods). Working notes:
  `.claude/refinements/REFINEMENT-economy.md`.
- **Owner, 2026-10-07:** close and push Sprint 1; Sprint 2 analyzes the technical design choices.
