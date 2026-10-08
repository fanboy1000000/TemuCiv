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
| TASK-203 | Orchestrator | GitHub repository settings | A rule on `main`: no force-push, no deletion, changes only by push (owner OK first) → `gh api` read-back | no |
| TASK-204 | Orchestrator | `docs/**`, `ROADMAP.md` | The rulebook reviewed with the ladder; proposals to the owner; approved changes applied → owner decisions recorded | no |
| TASK-205 | Orchestrator + research | `docs/architecture.md`, `docs/kb/**` | Each open technical choice analyzed with options and a recommendation; owner decisions recorded as ADRs → owner OK | no |

Waves: 201 → 202; 203 any time after the owner's OK; 204 after 202; 205 last.

## Plan review (step 2)

| Field | Value |
|---|---|
| **Trigger** | SKIP: a docs-and-settings sprint, no code; the sprint-end review covers the result |

## Task log

### TASK-201: the ladder and risk-based testing in CONVENTIONS

Status complete · Agent: Orchestrator (small docs task) · Review: sprint-end.

The owner approved the exact wording on 2026-10-08. CONVENTIONS gains "Build the minimum" (ponytail's ladder,
adapted with credit: does it need to exist, reuse, the standard library or platform, then the minimum; never cut
the invariants, input validation, data-loss handling, security, accessibility or what the owner asked for;
`shortcut:` comments for deliberate corner-cuts), and invariant 7 now matches verification to risk. The file
stays within its 100-line budget (the introduction was tightened to two lines).

### TASK-202: the follow-through

Status complete · Agent: Orchestrator · Review: sprint-end.

Reviews ask what didn't need to exist (reviewer definition, AGENTS "Reviewer" and the Codex FOCUS lines) and
treat implausible edge cases as notes. The checklist (items 8 and 10), RED evidence, WORKFLOW step 3 and the
simulation, ai-player and test-qa definitions follow the risk tiers. The requirements skill asks "does this need
to exist?" first. The sprint template collects `shortcut:` comments.

### TASK-203: GitHub protects `main`

Status complete · Agent: Orchestrator · Review: sprint-end.

With the owner's OK (option A, 2026-10-08), the repository has a ruleset `protect-main` (id 24708143, active) that
blocks deleting or force-pushing `main`; GitHub's read-back confirms `deletion` and `non_fast_forward` apply to
`main`. These were two real gaps: pre-push skips deletions, and a force-push to an older close would pass it.
Pull-request merges stay with the local guard, because agents use the owner's account and GitHub can't tell them
apart; WORKFLOW, FAIL-001 and the hook comments say so.

### TASK-204: the rulebook review

Status complete · Agent: Orchestrator · Review: sprint-end.

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

Status complete · Agent: Orchestrator (analysis, with web research on current library status) · Review: sprint-end.

Each open technical choice was analyzed with options, trade-offs and a recommendation, and checked against the
ladder. The owner chose the hardware target (option B, 2026-10-08: desktop and laptop with a mouse; no Steam Deck
target for now) and accepted the rest of the set. Recorded as ADR-010 (the game loop: sealed orders, then one
resolution; battles inside the turn; the simulation in a background thread), ADR-011 (PixiJS, React panels,
Electron, JSON with Zod schemas, Vite, `node:test`, Playwright), an ADR-005 amendment (the tested envelope and
budgets, on a 2020 mid-range laptop) and `docs/architecture.md` (parts, folders, boundaries, a turn end to end).
"Research" is renamed "progress" across the docs (`SetResearch` became `AcquireIdea`). ROADMAP: four backlog items
closed, the M1 setup item rewritten to match ADR-011, Steam Deck in the parking lot.

## Design conformance

| Design rule (source) | Implemented in | Verified by | Status |
|---|---|---|---|

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

_Kept current at every wave boundary. A new session must be able to continue from this block alone._
- **State:** _what's done, merged and committed_
- **In flight:** _tasks, agents, worktrees_
- **Waiting on:** _owner questions, reviews_
- **Next action:** _the one next step_
