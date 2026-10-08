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

Waves: 201 → 202; 203 any time after the owner's OK; 204 after 202; 205 last. The "May write" lists were widened
at the sprint-end review to match what each task really touched (all Orchestrator-only files).

## Plan review (step 2)

| Field | Value |
|---|---|
| **Trigger** | SKIP: no code. The sprint touched invariant 7, so WORKFLOW requires a plan review; the owner's approval of the exact wording before it went in stands in for it, and the sprint-end review covers the rest |

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

Status complete · Agent: Orchestrator · Checklist pass (self-check) · Review: sprint-end cycle 2.

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

- **State:** TASK-201 to 206 committed on `sprint/2` (last: the TASK-206 follow-up with the owner's invariant 7
  ruling). Sprint-end review cycle 1: both lenses BLOCKED; every finding fixed (TASK-206). Local CI PASS. Nothing
  pushed: `main` is still the Sprint 1 close, and `sprint/2` exists only on this computer.
- **In flight:** nothing. No agents, no worktrees.
- **Waiting on:** nothing from the owner.
- **Next action:** sprint-end review cycle 2 (cap 3): `node tools/review-stamp.mjs`, then Codex (prompt in the
  scratchpad is gone; rebuild it from AGENTS.md's template with the sprint goal above and FOCUS on whether the
  cycle-1 findings are fixed) and the reviewer (`model: "fable"`) in parallel, saved as
  `.claude/reviews/SPRINT-2-codex.md` and `SPRINT-2-reviewer.md` with the stamp lines on top. Then close (WORKFLOW
  step 8). After the close: the owner's design work (vision and scope, the carried-over economy question), then M1.
