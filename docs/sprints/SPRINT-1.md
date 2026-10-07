# Sprint 1: Governance foundation

| Field | Value |
|---|---|
| **Sprint** | 1 |
| **Status** | in-progress |
| **Dates** | 2026-09-30 → |
| **Base commit** | the empty tree (`4b825dc`): first sprint, so the sprint-end review covers every file |
| **Previous close on GitHub** | n/a (first sprint; `main` never pushed) |
| **Orchestrator model** | `claude-opus-5-5` (Claude Code 2.1.286, later 2.1.292) |
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
3), no per-task commits (step 6). The Orchestrator wrote everything directly, and TASK-101 to 107 were committed
together as one local commit (`e2a1e51`, 2026-10-07) before the sprint-end review. **Compensation:** the full
result goes through the dual-lens sprint-end review (step 7) with the normal cycle cap, reviewing every file
against the empty tree, and the close gates apply to this sprint's own close.

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
- ~~**One currency buys everything** (buildings, units, web nodes).~~ Replaced 2026-10-07 (see "Web pricing"):
  web nodes are paid with branch experience; what pays for units and buildings is open again. Still standing:
  each city's production only sets build speed.
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
Proposed by engineering, not yet confirmed: ~~the game ends at the close of antiquity if nobody has won, highest
score wins~~ (single-score proposal, superseded by "Victory, revised"); conquest as a sudden ending; ~~every path
feeds the score~~ (superseded: each category has its own score). Ruled the same day: the score is current
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
units, buildings and improvements sit on its nodes and are bought (~~with the one currency~~; pricing replaced
2026-10-07, see "Web pricing": branch experience, coin tops up). Each era of antiquity is
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

**Follow-up task (2026-10-07).** TASK-108 fixes the six BLOCKERs and four of the WARNINGs from the first Codex
review of this sprint (`.claude/reviews/SPRINT-1-codex-c1.md`, 2026-09-30), before the review is re-run.

| Task | Agent | May write | Acceptance criteria → verified by | High-risk |
|---|---|---|---|---|
| TASK-108 | Orchestrator | `.githooks/**`, `tools/**`, `.claude/hooks/**`, `.github/**`, `package.json`, `docs/**`, `CLAUDE.md` | Each Codex cycle-1 BLOCKER fixed, with a test that fails when the fix is removed → governance tests + mutation runs | no |
| TASK-109 | Orchestrator | same as TASK-108, plus `.claude/agents/platform.md`, `docs/kb/**` | Each cycle-2 BLOCKER (Codex and reviewer) fixed, with a test that fails when the fix is removed → governance tests + mutation runs | no |
| TASK-110 | Orchestrator | same as TASK-109 | Each cycle-3 BLOCKER (Codex c3, reviewer c2) fixed, with a test that fails when the fix is removed → governance tests + mutation runs | no |

**Sprint branch (2026-10-07).** Codex cycle 2 found that committing tasks to local `main` before the review breaks
CONVENTIONS invariant 7 ("reviewed before it is committed to `main`"). The workflow now keeps each sprint on
`sprint/N` and fast-forwards `main` only at the reviewed close. This sprint's commits were moved to `sprint/1`
(the local `main` was renamed, so `main` holds nothing until the close).

## Plan review (step 2)

| Field | Value |
|---|---|
| **Trigger** | SKIP: bootstrap exception (see Plan) |

## Task log

### TASK-101 to TASK-107: governance foundation (bootstrap)

Written directly by the Orchestrator (see Plan). Committed together as `e2a1e51`. Verified by the sprint-end
review below.

### TASK-108: close-gate fixes after Codex cycle 1

| Field | Value |
|---|---|
| **Status** | complete |
| **Agent** | Orchestrator (bootstrap exception: `.claude/**` and the gate tooling are Orchestrator-only) |
| **Constraint validator** | n/a: no game code; self-checked (no secrets, scope as declared) |
| **Review** | per-task review inside the sprint-end review, cycle 2: both lenses were given TASK-108's claims to verify against the code. The reviewer confirmed the six cycle-1 fixes; both found new BLOCKERs, which became TASK-109 |

The close gates were enforced only by reading the text of the command, which several ordinary commit forms
slipped past. They now live in one shared module and are enforced where git sees the real message:

| Codex cycle-1 BLOCKER | Fix | Test |
|---|---|---|
| Close detection parsed command text; `git.exe`, `--no-pager`, `-F` and variables slipped past; "S1 close" matched anywhere | Versioned git `commit-msg` hook (`.githooks/`, `npm run setup`) checks the gates on the real message; exact subject `S<N> close: <title>`; look-alike subjects refused. The Claude guard blocks commits while the hooks aren't installed and blocks `--no-verify`, `-n`, `core.hooksPath` overrides | `git-hooks.test.mjs`; guard tests for every command form |
| Step 7 assumed committed tasks and a base; staged and untracked files were hashed but not reviewed | Base for a first sprint is the empty tree; `review-stamp` refuses while anything outside the close paperwork is uncommitted; this sprint's tasks committed (`e2a1e51`) | stamp-refusal test |
| Gate named `staging` in code, `untracked` in the docs | Renamed to `untracked` in code; docs say it also covers unstaged changes | documented-waiver-name test |
| GitHub gate passed anything but a literal `failure`, ignored newer runs, failed open | Fails closed: the newest CI run for pushes to `main` must be finished, successful and for the last pushed commit; passes only if `main` was never pushed | six mocked states (red, cancelled, unfinished, missing, stale, error) |
| Secrets were only caught after a push | Pre-commit secret scan of staged files and a scan step in `npm run ci`; GitHub push protection confirmed on | secret-pattern and pre-commit tests |
| The template asked for the close's own GitHub run id, which can't exist yet | Template and Step 0 record the previous close's run at the next sprint's start | n/a (docs) |

WARNINGs fixed: the CI-hash wording (project-file content, not "every file on disk"); the routing guard now
accepts full Fable model ids and the docs say only the reviewer's model is enforced; the `package.json` ownership
rule made consistent; GitHub Actions pinned to commit SHAs and the gitleaks download checksum-verified. WARNINGs
declined or deferred, with reasons: sprint logs stay outside the review hash (the close paperwork must be editable
after review; plans are reviewed in step 2); read-only agents keep Bash (they need it for tests and git history;
an enforced allowlist goes to the backlog); the worktree sequence is settled in the first sprint that runs
parallel agents; ADR-005's supported envelopes go to Sprint 2's technical design.

RED evidence (one-line mutations in a throwaway worktree, each run against the 38 tests at `985ca88`): commit-msg
ignores every message → 17 tests fail; GitHub gate accepts any conclusion → 1; GitHub gate fails open on errors
→ 1; untracked gate checks nothing → 4; guard allows `--no-verify` → 1; guard skips the hooks-installed check → 1;
review-stamp never refuses → 1; secret scan without the GitHub-token pattern → 2.

### TASK-109: cycle-2 fixes (Codex and reviewer)

| Field | Value |
|---|---|
| **Status** | complete |
| **Agent** | Orchestrator (bootstrap exception, as TASK-108) |
| **Constraint validator** | n/a: no game code; self-checked |
| **Review** | per-task review in the sprint-end review, cycle 3 |

Cycle 2 (`.claude/reviews/SPRINT-1-codex-c2.raw.md`, BLOCKED; reviewer, BLOCKED) found real holes in TASK-108:

| Cycle-2 finding | Fix | Test |
|---|---|---|
| Codex: a completed task's Status row made an unfinished sprint look complete; the INDEX row wasn't checked | Only the log's header table counts; the INDEX row must say complete | completed-task-in-log test |
| Codex: a quoted `"--no-verify"` slipped past the guard; reviewer: `--no-veri` and `git config core.hooksPath ... && git commit` too | The guard splits the command into words like a shell; blocks any `--no-verify` abbreviation, `-n` in a flag cluster, any `core.hooksPath` in a committing command; heredoc bodies are message text | ten bypass forms; message-text false positives |
| Codex: committing to local `main` before review breaks invariant 7 | Sprint branches (see Plan); TASK-108's per-task review recorded | n/a (workflow) |
| Both: "one currency buys everything" still read as a standing ruling | Struck through with pointers; superseded single-score proposals marked | n/a (record) |
| Reviewer: a commit could mark a sprint complete under any other subject | commit-msg refuses an ordinary commit that sets a sprint log's header to complete | marks-complete test |
| Both: sprint logs and the template were outside the review hash | A sprint log is hashed up to "## Sprint-end review" minus close-time header rows; the template and everything else in `docs/sprints/` is hashed; only INDEX.md and ROADMAP.md stay out | reviewed-part and template tests |
| Reviewer: no test showed check-docs or the CI runner failing | Planted-problem tests for each of check-docs' five checks and for a failing CI step | `docs-and-ci.test.mjs` |
| Codex: the reviewer's model wasn't required at spawn | A reviewer spawn must name Fable; the self-reported model line is documented as a known limit | routing test |
| Reviewer and Codex: governance tooling and `package.json` ownership inconsistent | Governance tooling listed as Orchestrator-only in AGENTS.md, CLAUDE.md and platform.md; `package.json` reserved by default everywhere | n/a (docs) |
| Codex: worktree hand-off unspecified | Agents leave changes uncommitted; the Orchestrator verifies, commits in the worktree, merges into the sprint branch | n/a (docs) |
| Reviewer notes | gitleaks sha256 pinned in the workflow; GitHub-gate wording; "fixed" model wording; close-time edits belong before the stamp; FAIL-001 recorded | n/a |

RED evidence (one-line mutations in a throwaway worktree, each run against the 44 tests at `1bed53c`): sprint
status read from the whole log → 2 tests fail; INDEX status not checked → 1; only the exact `--no-verify` caught
→ 1; quotes kept in words → 18; `core.hooksPath` checked nowhere → 1; marking a sprint complete never detected →
1; the whole sprint log outside the reviewed part → 1; all of `docs/sprints` outside the review hash → 2; a
reviewer spawn allowed without naming Fable → 1.

Declined, with reasons (TASK-109): `ROADMAP.md` stays outside the review hash (routing follow-ups is a required close step
after the review); "Research" as a system name is renamed when `docs/architecture.md` lands (backlog).

### TASK-110: cycle-3 fixes (Codex c3, reviewer c2)

| Field | Value |
|---|---|
| **Status** | complete |
| **Agent** | Orchestrator (bootstrap exception, as TASK-108) |
| **Constraint validator** | n/a: no game code; self-checked |
| **Review** | per-task review in the sprint-end review, cycle 4 (Codex) and 3 (reviewer) |

Both lenses returned BLOCKED again, on narrower holes:

| Finding | Fix | Test |
|---|---|---|
| Codex: the close-time row filter dropped every Status row above the review heading, so a task could go from blocked to complete after review | Only the header table (before the first `##`) loses its close-time rows | task-status and header-status tests |
| Codex and reviewer: nothing stopped a task commit on `main` or a premature push of `main` | commit-msg refuses any commit on `main`; a new pre-push hook refuses pushing `main` unless its tip is a close; the guard also protects `git push` | main-commit and pre-push tests |
| Codex: PowerShell backtick escapes and continuations slipped past | Words are split with PowerShell's rules for the PowerShell tool | PowerShell forms |
| Reviewer: a heredoc piped into `git commit` and a subshell hid the command (regression) | Only the heredoc body is set aside; `(` and `)` separate commands; `$'...'` and backslash-newline read as bash does | four more bypass forms |
| Reviewer: false positives (`-uno`, a message mentioning `core.hooksPath`) and a missed `-am` close | Optional attached values understood; only `git -c`/`git config` count; `-am` message read | allowed-forms tests |
| Reviewer: a check-docs test passed for the wrong reason | The gap and the unlisted log are asserted separately | docs-and-ci tests |
| Reviewer: step 8 asked for a table that the review freezes; TASK-108's record overstated the reviews | Step 7 now requires the task log and design conformance before the stamp; record reworded | n/a (docs) |
| Codex: the gate table didn't say the INDEX row must be complete | Gate table and module header updated | n/a (docs) |

RED evidence (one-line mutations in a throwaway worktree against the 50 tests at `1257ea3`): close-time filter
over the whole reviewed part, commits on main allowed, pre-push accepting any tip, PowerShell split with bash
rules, the heredoc opening line dropped, parentheses not separators, push not guarded, `-u` read as a flag
cluster: each made at least one named test fail (1 or 2 each).

## Design conformance

Not applicable: no game design implemented this sprint.

## Sprint-end review (step 7)

_Pending._

## Test summary

_Pending the final CI run._

## Retrospective

_Pending._

## Handoff

- **State:** TASK-101 to 110 committed on `sprint/1` (no `main` yet; it is created at the close). Nothing pushed.
- **In flight:** the sprint-end review, Codex cycle 4 and reviewer cycle 3, on TASK-110's fixes.
- **Waiting on:** nothing from the owner. The owner asked on 2026-10-07 to close and push this sprint, and for
  Sprint 2 to analyze the technical design choices (ROADMAP backlog, "Architecture decision").
- **Next action:** if both lenses pass, finish this log (review summary, tests, retrospective), run `npm run ci`,
  commit `S1 close: Governance foundation` on `sprint/1`, create `main` there, push, watch GitHub CI.
- **Design brainstorm, where it stands:** rulings are under "Owner design rulings" (later rulings supersede
  earlier ones, struck through). Mapped: turns and combat, AI, expansion, victory (per-category dominance), scope
  (antiquity is the demo slice), progression (the web in rings), map and borders, web pricing (branch
  experience). Open, carried to the backlog: what pays for units and buildings (lean: coin and goods), the big
  shape of logistics and of cities. Out of the demo: diplomacy, civ switching. The hook is left to grow on its
  own (owner). Stay at the big-picture level; details wait for each system's spec.
