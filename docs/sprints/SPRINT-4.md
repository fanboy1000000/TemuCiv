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

The owner can raise armies in the prototype, march them, and keep them fed through supply lines, to feel the
logistics system (owner, 2026-10-16: "I need to be able to move armies to get a feel for the logistic system").
Refinement in progress.

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

Waves: 401 and 402 (Orchestrator), then 403. TASK-403 uses a generic agent with the model named, as in Sprint 3:
the simulation and presentation definitions carry standing instructions the prototype exception sets aside.

## Plan review (step 2)

| Field | Value |
|---|---|
| **Trigger** | SKIP. TASK-403 and 402 are prototype work, which WORKFLOW exempts from plan review; TASK-401 is a docs change whose substance the owner decided (R1), and it only tightens a review bar. The sprint-end review covers all three, RULES.md at the normal bar |

## Owner design rulings

Slice 2's answers, asked one at a time on 2026-10-16 and numbered A1 to A5 so `prototype/RULES.md` can cite them.
Working notes: `.claude/refinements/REFINEMENT-slice2-armies.md`.

**A1, what slice 2 includes.** Decided by the owner (option B of three): armies and supply, plus a passive rival
whose cities defend themselves but never move; battles are settled automatically. Given up: the rival can't
threaten your supply lines yet (the full rival was the truest test but the biggest build).

**A2, supply and generals.** Asked how an army away from your cities gets its food, the owner said: "You set
supply on generals. Armies can only move with a general. They can also bring baggage." Engineering's reading,
shown to the owner before the next question and not corrected: supply is an order given to a general, naming the
city that feeds it, and the line follows that general (S1); regiments without a general can't move; an army
carries baggage as well as being supplied.

**A3, generals.** Built in a city, like a regiment (coin and production), with no limit: the moves budget
already limits command (option 1 of three; a fixed number of generals and a general that takes a person were the
others).

**A4, manpower.** A regiment takes one person from its city (option 1 of three).

**A5, battles.** One battle, decided in one turn, with luck from the game's seeded random numbers (option 2 of
three). Engineering had leaned to a fight over several turns, so that the supply line would matter for winning
as well as for getting there; given up by the owner for a quick, decisive battle.

**R1, the review bar for RULES.md.** Carried from Sprint 3. Decided by the owner: `prototype/RULES.md` gets the
normal review bar, checked against the owner's rulings, because a ruling copied wrong would make the prototype
test the wrong idea (TASK-401).

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

## Design conformance

## Sprint-end review (step 7)

## Test summary

## Retrospective

## Handoff

- **State:** Sprint 4 started on `sprint/4` from `0298bc8`; this log and its INDEX row are uncommitted.
- **In flight:** refinement of slice 2 (`.claude/refinements/REFINEMENT-slice2-armies.md`, gitignored).
- **Waiting on:** the owner's answer to the refinement's first question (what slice 2 includes).
- **Next action:** finish the refinement one question at a time; then the slice 1 playtest notes, the question
  whether `prototype/RULES.md` gets the normal review bar, and RULES.md's attribution fixes (carried from Sprint 3).
