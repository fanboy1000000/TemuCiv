# TemuCiv Workflow

> Owned by the Orchestrator. Only the Orchestrator edits this file; changes are reviewed like code. Every step is
> mandatory unless marked otherwise. Size budget: 450 lines. Agent definitions, prompt templates and the review
> prompts are in [AGENTS.md](AGENTS.md); the rules everyone follows are in [CONVENTIONS.md](CONVENTIONS.md).

## The shape of the work

Work happens in **sprints**. Each sprint delivers one coherent increment (once the game exists, one **playable**
increment) and ends with a reviewed, committed and pushed state. A sprint is deliberately small: large batches are
what make review cycles pile up.

State lives in files, not in the conversation. Any new or resumed session starts from the latest sprint log's
**handoff block**, `ROADMAP.md` and `docs/kb/INDEX.md`. That's enough to continue without the old conversation.

```
 owner design ──► refine ──► plan ──► plan review ──► build (agents) ──► verify ──► per-task review
                                                                                          │
   next sprint ◄── playtest ◄── close (log, CI, commit, push) ◄── sprint-end review ◄─────┘
```

## Pre-implementation gate: refinement

Before planning or coding anything a user asks to build, add, change or fix, run the `refine-requirements` skill
(`.claude/skills/refine-requirements/SKILL.md`). It turns the request or the owner's design into proposed rules,
open questions (asked one at a time), assumptions, acceptance criteria, risks and a READY verdict.
**Skip only** for mechanical tasks with an obvious fix (a typo, a clear error with a clear cause, "rename X to Y").

## Sprint steps

### Step 0: Start
1. Read the latest sprint log's handoff block, `ROADMAP.md` and `docs/kb/INDEX.md`.
2. Copy `docs/sprints/TEMPLATE.md` to `docs/sprints/SPRINT-N.md` (N = last sprint + 1, never skipped) and add
   the row to `docs/sprints/INDEX.md`. Record the **base commit** (HEAD at sprint start) in the header; for the
   first sprint of a repository it is the empty tree, so the sprint-end review covers every file. Record the
   previous close's GitHub CI run (id and result) in the header too: it only exists after that close was pushed.
   Run `npm run setup` once per clone; it installs the git hooks the close gates depend on. Create the sprint
   branch from `main`: `git switch -c sprint/N main`. All of the sprint's commits go there; `main` receives them
   only at the close, after the sprint-end review (CONVENTIONS invariant 7).
3. **Entropy scan** (first sprint of each session, at minimum): run `npm run check-docs`, then the anti-pattern
   greps listed in the sprint template (the list grows with every FAIL entry), look for orphaned files from the
   last two sprints, and check that the docs still describe what the code does. Record findings as DRIFT (fix
   before starting), DEBT (record, fix later) or CLEAN.
4. Every fifth sprint, also do the **harness review** (see "Harness evolution").

### Step 1: Plan
Write the plan into the sprint log: goal, tasks, and for each task the agent, the exact files it may touch, the
acceptance criteria, **the test that verifies each criterion**, and whether it is **high-risk** (list below).
Order tasks in **waves** when outputs depend on each other. Keep it short: a plan is a contract, not an essay.

### Step 2: Plan review (dual lens)
**Mandatory** when the sprint touches any invariant or any high-risk category; **skip** only for docs-only or
pure-cleanup sprints (record a one-line reason). Run both lenses in parallel:
- **Codex** with the plan-review prompt (AGENTS.md, "Codex") via `codex exec`.
- **Reviewer agent** with the same prompt.

BLOCKERs are fixed in the plan before any task starts. Every plan edit gets a verification review (see "Review
cycles"). Record findings and their resolution in the sprint log.

### Step 3: Build
- One agent per task, spawned by role name (`subagent_type`), with the prompt template from AGENTS.md: role,
  file scope, CONVENTIONS.md verbatim, relevant design and KB excerpts, acceptance criteria, brief challenge.
- Run independent tasks in parallel. Agents that write files in parallel use `isolation: "worktree"`.
- Tests come first where possible: test-qa writes the tests from the design, and they must fail before the
  implementation exists (AGENTS.md, "RED evidence").
- **Small tasks exception:** a trivial change (one file, under about 10 lines, one area) may be made directly by
  the Orchestrator. It still goes through verification and the sprint-end review, and never replaces delegation
  for substantive work.

### Step 4: Verify
For each finished task:
1. Read the agent's report, including **Brief contradictions** and **Declared deviations**, before accepting.
   Settle factual brief errors yourself; take anything that needs a design or invariant decision to the owner.
2. Run `npm run ci` (all checks, from the repo root). If it fails, re-dispatch the responsible agent with the
   exact failure output. Never accept on a partial or assumed pass.
3. When the change is visual, run the game and look at a screenshot. Don't assume it looks right.
4. Run the **constraint-validator** agent on the changed files (skip for docs-only changes; for small tasks the
   Orchestrator self-checks against the same checklist).

### Step 5: Per-task review
- The **reviewer** agent reviews every task that touches an invariant, spans several agents, or introduces a new
  pattern or abstraction. SKIP for small tasks, docs-only changes and trivial data edits with no logic change.
- **High-risk tasks also get Codex**, in addition to the reviewer (per-task scope: correctness of the change,
  edge cases, design conformance). High-risk categories:
  - simulation rules and their numbers (combat, yields, growth, research, victory)
  - determinism: the RNG, turn-resolution order, iteration order, anything that could make two runs diverge
  - the action pipeline and per-player views (validation, visibility, fog of war)
  - serialization and the save format
  - AI players' decision logic
  - performance-critical paths (pathfinding, turn processing, rendering hot loops)
- BLOCKERs are fixed before the task is accepted. Findings are recorded under the task in the sprint log.

### Step 6: Accept and record
1. Review any **PROPOSED KNOWLEDGE ENTRY** from agents. Approve valid ones as KB files and add them to
   `docs/kb/INDEX.md` (only the Orchestrator writes the KB).
2. Record the task in the sprint log: status, agent, acceptance criteria with pass/fail, files changed, reviews.
3. Commit the task on the sprint branch (`TASK-N0x: <summary>`). A worktree agent leaves its changes
   uncommitted; the Orchestrator verifies them in that worktree, commits them there on the worktree's branch,
   merges that branch into `sprint/N`, re-runs `npm run ci` on the sprint branch, and removes the worktree.
   Nothing is pushed until the sprint closes.
4. Write or refresh the **handoff block** in the sprint log at every wave boundary: tasks in flight and their
   worktrees, merged commits, pending reviews, open questions, the next action.

### Step 7: Sprint-end review (dual lens)
After every task is accepted and committed, and the sprint log's task log and design conformance table are
complete and committed (the review covers them):
1. Stamp the state to be reviewed: `node tools/review-stamp.mjs` prints `reviewed-against-commit:` and
   `reviewed-scope-hash:`. Keep this output. If the reviewed files change, the stamp no longer matches. It refuses
   to stamp while anything outside the close paperwork is uncommitted or untracked, so the committed diff the
   lenses read is exactly what the stamp covers.
2. Run **Codex** on the whole sprint (`git diff <base>..HEAD`, AGENTS.md prompt) and the **reviewer** agent on
   the same scope, in parallel.
3. Save each result as `.claude/reviews/SPRINT-N-codex.md` and `.claude/reviews/SPRINT-N-reviewer.md`, with the
   stamp lines at the top and the lens's `verdict:` line (`APPROVED`, `APPROVED-WITH-WARNINGS` or `BLOCKED`). The
   reviewer file also keeps the reviewer's `reviewed-by-model:` first line.
4. BLOCKERs are fixed as follow-up tasks in the same sprint, then both lenses run again on a fresh stamp.
5. Any code change after a passing review needs a new review; the close gate enforces this through the scope
   hash.

### Step 8: Close
1. Complete the sprint log: status `complete`, review summary, test summary (from real runs), retrospective and
   handoff block. Update the row in `docs/sprints/INDEX.md`. Everything above the log's "Sprint-end review"
   heading was filled in before the stamp.
2. Route every open follow-up that's not scheduled for the next sprint into the `ROADMAP.md` backlog.
3. Run `npm run ci` **last**, after all edits. It records a pass for the exact project files on disk.
4. Commit on the sprint branch with a subject in exactly the form `S<N> close: <title>`. The commit-msg hook
   reads the real message, whatever form the command takes, and blocks the commit if any gate fails (see
   "Mechanical gates"). Edits at close outside the close paperwork (a CLAUDE.md review, a new KB entry) belong
   before the step-7 stamp, or they force a re-review.
5. Bring `main` up to the close: `git switch main && git merge --ff-only sprint/N` (for a repository's first
   sprint, `main` doesn't exist yet: `git branch main sprint/N && git switch main`). Delete the sprint branch.
6. `git push origin main`, then watch GitHub CI with **one** background command (`gh run watch`), never by
   polling. A red GitHub CI blocks the next sprint's close.

### Step 9: Playtest (once a playable build exists)
The owner plays the sprint's build. Their notes are recorded at the top of the next sprint log under
**Playtest input** and feed its refinement. The owner's experience is the only test of "fun" we have.

## Review cycles and the cycle cap

- Findings use three severities. **BLOCKER:** an invariant at risk, a design mismatch, or a claim the code
  doesn't support; it must be fixed or escalated. **WARNING:** a quality or simplicity concern; fixed at the
  Orchestrator's discretion, and a declined WARNING gets a one-line reason in the log. **NOTE:** a suggestion.
- **Every fix gets a verification review.** Cycles are counted per lens and per scope (plan, task or sprint).
- **Cap: 5 cycles.** If the fifth verification still finds new BLOCKERs, stop and ask the owner: (a) keep
  iterating, (b) accept the remaining findings, or (c) move them into a new task. Reaching cycle 4 or 5 is a
  signal the batch was too big; say so in the retrospective.
- If Codex is unavailable, stop and tell the owner. Never skip a lens silently.
- A lens that could not read the code (e.g. a sandbox refusal) has produced an **environment failure, not a
  verdict**. Re-run it with inlined source (AGENTS.md, "Codex").

## Mechanical gates

Rules that matter are enforced by machines. Memory and good intentions are not enforcement.

**`npm run ci`** (`tools/ci.mjs`) runs every check the project has: currently the docs check, a secret scan and
the governance tests (hooks and tools). Type checks, lint, unit tests, the determinism check, headless games and
performance budgets are added as the code arrives. Each step's own exit code is checked. On success it records
the HEAD commit and a hash of the content of every project file (tracked, plus untracked files that aren't
ignored) in `.claude/ci/last-run.json`. Ignored files and file modes are outside the hash, so checks must not
depend on them.

**GitHub Actions** (`.github/workflows/ci.yml`) runs the same checks on every push, plus a gitleaks scan of the
full history. Jobs are independent: one red job must never hide another. Actions are pinned to commit SHAs.
GitHub push protection is on for the repository, so a known secret format is refused at push time.

**Git hooks** (`.githooks/`, installed by `npm run setup`): **pre-commit** runs the secret scan on the staged
files, so a secret is refused before it is ever committed. **commit-msg** is the authoritative close check: it
reads the real commit message, so it works whatever form the command takes (`-m`, `-F`, a heredoc, an editor);
it refuses a subject that looks like a close but isn't exactly `S<N> close: <title>`, any other commit that marks
a sprint complete, and any commit on `main`. **pre-push** refuses to push `main` unless its tip is a close
commit, so a task commit can't be pushed to the shared branch by mistake (CONVENTIONS invariant 7). Known limits:
git doesn't run commit-msg for cherry-pick, revert or rebase, and both hooks run only on this computer; a GitHub
branch rule for `main` is in the backlog.

**The sprint-close guard** (`.claude/hooks/sprint-close-guard.mjs`, run before every Bash/PowerShell command)
protects the git hooks. For any command that mentions git commit or push, it requires the hooks to be installed,
and it fails safe: it blocks the command when its text names `--no-verify` (or an abbreviation) or
`core.hooksPath`, or when it can't be read to the end, however the command is wrapped. A commit message that
names those words goes through `-F` instead. It also parses the command the way Bash or PowerShell would, to
catch escaped skip flags and `-n` in a commit's flags, and to run the gates up front when it sees a close message. Both enforcement
points share the gates in `tools/lib/close-gates.mjs`. A close is blocked
unless:

| Gate | Requires | Waiver file (`.claude/reviews/`) |
|---|---|---|
| sprint-log | `SPRINT-N.md` exists, its header status is `complete`, and the sprint INDEX lists it as `complete` | `SPRINT-N-sprint-log-WAIVED.md` |
| reviews | Both review files exist; neither verdict is BLOCKED; both were stamped at the current HEAD with the current scope hash; the reviewer ran on Fable | `SPRINT-N-reviews-WAIVED.md` |
| local-ci | `npm run ci` passed on exactly the project files on disk now | `SPRINT-N-local-ci-WAIVED.md` |
| untracked | No untracked, non-ignored files and no unstaged changes (local green on files that aren't committed proves nothing) | `SPRINT-N-untracked-WAIVED.md` |
| github-ci | The latest CI run for pushes to `main` has finished and succeeded, for the last pushed commit. Fails closed: an unfinished, missing or unreadable run blocks. Passes only when this clone has no `origin/main` ref (`main` never pushed) | `SPRINT-N-github-ci-WAIVED.md` |

The **review scope hash** covers every tracked or untracked non-ignored file except `docs/sprints/INDEX.md` and
`ROADMAP.md`. A sprint log counts only up to its "## Sprint-end review" heading, minus the header rows filled in at
close (Status, Dates, CI verified): the plan, the owner's rulings and the task evidence
are frozen by the review, while the review summary, test summary, retrospective and handoff are written after it.
Any other change forces a new review. The CI hash covers every project file. A waiver is written only on the owner's say-so, states the reason, and is mentioned
in the sprint log. The governance tests (`.claude/hooks/tests/`) run in CI; run them after any hook or tool change.

**The model-routing guard** (`.claude/hooks/model-routing-guard.mjs`, run before every agent spawn) blocks a
`reviewer` spawn that doesn't name Fable, and a generic spawn (`general-purpose`/`claude`) that names no model.

## Model routing

Judgment runs on the strongest reviewer model; implementation runs on strong but cheaper models. Each role's model
is set in its definition's frontmatter (`.claude/agents/<name>.md`), so spawning by role name picks the right one.
Only the reviewer's model is enforced by a guard: a reviewer spawn must name Fable explicitly. For other roles a
spawn-time override is possible and must be recorded in the sprint log. Known limit: the close gate reads the
reviewer's self-reported `reviewed-by-model:` line; Claude Code exposes no record of the model actually used.

| Role | Model |
|---|---|
| reviewer | Fable (the spawn must name it; the close gate checks the `reviewed-by-model:` line) |
| simulation, ai-player, presentation, platform, test-qa | Opus |
| content, trace, constraint-validator | Sonnet |
| sweep | Haiku |
| Orchestrator (the main session) | whatever the owner starts the session on |

**Keep the client current.** Model aliases resolve to the newest model *the installed Claude Code knows*, so an old
client silently runs an older model. Run `claude update` at session start. If a role reports an unexpected model
id, record it in the sprint log.

## Knowledge base

`docs/kb/` holds what the project has learned, so no agent has to relearn it. Only the Orchestrator writes it;
agents propose entries.

| Prefix | Folder | Holds |
|---|---|---|
| ADR | `decisions/` | Why we chose X over Y. Superseded ADRs stay, marked as superseded |
| PAT | `patterns/` | How we do X, validated in practice |
| FAIL | `failures/` | What went wrong, why, and the guard we added so it can't recur |

Every entry is listed in `docs/kb/INDEX.md` (CI-checked). Binding commitments name milestones or events ("before
the first public build"), never sprint numbers, because sprint numbers shift when plans change.

**Earned governance:** a new rule, gate or checklist item is added in response to a real failure, recorded as a
FAIL entry that names the new guard. That's how the rules stay tied to reality.

## Sprint log and roadmap

- **Sprint log** (`docs/sprints/SPRINT-N.md`): the plan, what was done, how it was verified, review results,
  design conformance, the retrospective and the handoff block. Git records *what* changed; the sprint log records
  *why* and *how we know it works*. Size budget: 400 lines. It records evidence, not a narrative of every step.
- **ROADMAP.md**: milestones, the backlog of deferred work, and a parking lot for loose ideas. At every close,
  unscheduled follow-ups go to the backlog. Findings are written down the moment they're found, never left only in
  a conversation.
- Sprint numbers are sequential and never reused or renumbered.

## Harness evolution

This governance is a harness around AI agents. It should be the **minimum that works**, not the maximum possible.
- **Every fifth sprint**, review each mechanism: did it catch anything in the last five sprints? If a rule caught
  nothing and costs effort, propose relaxing or removing it (an owner decision for anything in CONVENTIONS.md).
- **On a model upgrade**, reconsider rules that compensated for older model weaknesses.
- **Size budgets are enforced** by `tools/check-docs.mjs`. When a doc hits its budget, shorten or split it; don't
  raise the budget without saying why in the sprint log.

## Inherited lessons (from the owner's StatsTid project)

These cost StatsTid real time. We start with them instead of relearning them.
- **Local green is not committed green.** Build tools read every file on disk, tracked or not. Hence the untracked
  gate, and a commit's contents (`git show --stat`) are checked before calling anything CI-verified.
- **A red CI nobody reads is not enforcement.** Hence the github-ci gate and one background `gh run watch` per push.
- **A tool whose failures are warnings reports success.** Every failure path reaches a non-zero exit code, and
  results are checked against an independent source of truth, not the tool's own log.
- **A test that can't fail proves nothing.** Tests derive expected values from the design and must be seen failing.
- **Agents' briefs are often wrong about the code.** Every agent verifies claims and reports contradictions
  (AGENTS.md, "Brief challenge"); every contradiction is read before output is accepted.
- **Worktrees start from the remote branch,** which lags the local sprint branch for the whole sprint. Every
  worktree agent first checks itself against the local sprint branch (AGENTS.md).
- **`git stash` is repository-wide.** Never use it while any agent is running.
- **Gitignored files don't exist in a worktree.** Inline them in the prompt or track them.
- **Codex needs stdin closed** (`< /dev/null`) or it can hang indefinitely.
