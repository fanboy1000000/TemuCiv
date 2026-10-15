# Sprint N: [Title]

| Field | Value |
|---|---|
| **Sprint** | N |
| **Status** | planned \| in-progress \| complete |
| **Dates** | YYYY-MM-DD → YYYY-MM-DD |
| **Base commit** | `<sha>` (HEAD at sprint start; the empty tree for a repository's first sprint) |
| **Previous close on GitHub** | run `<id>`: success \| failure (the push of the previous sprint's close) |
| **Orchestrator model** | `<model id>` (Claude Code `<version>`) |
| **CI verified** | no \| local `npm run ci` PASS on the close state (the GitHub run is recorded by the next sprint) |

## Playtest input

_The owner's notes from playing the previous sprint's build, verbatim or summarized with their approval.
"None (no playable build yet)" until one exists._

## Goal

_One or two sentences, in plain language: what the owner can see or do after this sprint that they couldn't before._

## Entropy scan

| Check | Result | Detail |
|---|---|---|
| `npm run check-docs` | CLEAN \| DRIFT | |
| Anti-pattern greps (below) | CLEAN \| DRIFT \| DEBT | |
| Orphaned files (last two sprints) | CLEAN \| DEBT | |
| Docs still match code | CLEAN \| DRIFT | |
| Harness review (every fifth sprint) | n/a \| done — see Retrospective | |

Anti-pattern greps (extend with every FAIL entry):
- `src/sim/**`: `Math.random`, `Date.now`, `new Date(`, imports from `src/client`, `src/ai`, `src/app`
- `src/ai/**`: access to full game state instead of a player view
- everything: secrets, tokens, hard-coded absolute paths
- everything: `shortcut:` comments (CONVENTIONS, "Build the minimum"); each one becomes a ROADMAP backlog line

## Plan

| Task | Agent | May write | Acceptance criteria → verified by | High-risk |
|---|---|---|---|---|
| TASK-N01 | | | | no \| category |

Waves: _which tasks run in parallel, which wait for which._

## Plan review (step 2)

| Field | Value |
|---|---|
| **Trigger** | MANDATORY (reason) \| SKIP (one-line reason) |
| **Codex** | cycles, findings NB/NW/NN |
| **Reviewer** | cycles, findings NB/NW/NN |

Findings and resolution: _each BLOCKER and how the plan changed; declined WARNINGs with a reason._

## Task log

### TASK-N01: [title]

Status complete \| partial \| blocked · Agent · Checklist pass \| violations · Review (high-risk only): verdict · Commit `<sha>` · Files changed

_What was done and why, in two to four sentences. Acceptance criteria with pass/fail. Brief contradictions and
how they were settled._

## Design conformance

_Once game rules exist; until then, "Not applicable"._

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
