# TemuCiv Agents

> Owned by the Orchestrator. Size budget: 450 lines. The workflow these agents serve is in
> [WORKFLOW.md](WORKFLOW.md); the rules every agent follows are in [CONVENTIONS.md](CONVENTIONS.md).

## How agents work here

The **Orchestrator** (the main Claude Code session) is the only one who plans, splits work, spawns agents,
accepts output, writes docs and commits. Agents are specialists: they receive a task and a file scope, do that
task only, and report back. They never assign themselves work, never spawn other agents, and never edit outside
their scope. A need outside their scope is **declared** in the report, not acted on.

Each role has a definition in `.claude/agents/<name>.md` that fixes its model and standing instructions. Spawn
by role name (`subagent_type: "<name>"`). The roster below is the record, and `tools/check-docs.mjs` fails CI if a
definition exists that isn't listed here, or the listed model differs from the definition's.

## Roster

The file scopes follow the planned module layout; the architecture decision (`docs/architecture.md`, next
sprint) confirms or adjusts them, and this table changes with it.

<!-- roster:start -->
| Role | Model | May write | Purpose |
|---|---|---|---|
| `simulation` | opus | `src/sim/**` | Game rules: map, units, cities, combat, research, turns, victory. Pure and deterministic |
| `ai-player` | opus | `src/ai/**` | Computer opponents: read a player's view, choose actions. Never reads hidden state |
| `presentation` | opus | `src/client/**` | Rendering, input, UI screens. Reads state and sends actions; never computes rules |
| `platform` | opus | `src/app/**`, `tools/**`, `.github/**`, build config | App shell, desktop packaging, save-file I/O, build and CI tooling |
| `content` | sonnet | `data/**` | Turns the owner's designs into data files (units, techs, terrain, numbers) |
| `test-qa` | opus | `tests/**` | Tests derived from the design; RED-first; determinism, soak and performance tests |
| `reviewer` | fable | none (read-only) | Internal review lens: plans, tasks, sprint-end |
| `constraint-validator` | sonnet | none (read-only) | Mechanical checklist against changed files |
| `trace` | sonnet | none (read-only) | Diagnoses a specific failure by tracing code; proposes, never applies, a fix |
| `sweep` | haiku | files listed in the task | One precisely specified, pattern-shaped edit across many files |
<!-- roster:end -->

**Orchestrator-only files:** `CLAUDE.md`, `ROADMAP.md`, `docs/**`, `.claude/**` (agents, hooks, skills, settings),
`package.json` and the lockfile (`platform` may change them only when the task's scope says so), and every
file the architecture doc marks as shared.

**A new role** is added only when an area is big enough that a specialist pays for itself. It gets a definition,
a roster row and a line in the sprint log. Until then, the task's explicit file list in the sprint plan decides
what an agent may touch, not the agent's label.

## Agent prompt template

Every spawn uses this structure. Parts in [brackets] are filled in by the Orchestrator.

```
You are the [role] agent for TemuCiv, a turn-based 4X strategy game.

★ FIRST, BEFORE ANY WORK (worktree agents only): check your worktree against the main checkout's LOCAL main
branch, not origin/main (which lags by design, since we push only at sprint close). Compare
`git log --oneline -1` in both. Fast-forward if you are behind, and say in your report what you found.

TASK: [what to do, in plain language, with the design excerpt it implements]
SCOPE: You may create or modify ONLY: [explicit file list or globs]. Declare anything else you need.
ACCEPTANCE CRITERIA:
- [criterion] (verified by: [test name or command])
CONTEXT: [interfaces, existing code excerpts, relevant ADR/PAT/FAIL entries, inlined gitignored files]

CONVENTIONS (verbatim from docs/CONVENTIONS.md):
[full text]

BRIEF CHALLENGE: [the block below, verbatim]

KNOWLEDGE: If you discover a pattern, decision or failure worth keeping, add a section
"PROPOSED KNOWLEDGE ENTRY" (category ADR|PAT|FAIL, title, context, content, guidance for future agents).
Never write under docs/ yourself.

REPORT: what you changed (files), how you verified it (commands run and their real output), "Brief
contradictions", "Declared deviations", "Needs a decision", and any proposed knowledge entry.
```

## Brief challenge

Standing instruction in every non-reviewer definition and every prompt. Verbatim:

> Contradicting this brief is valuable, and a contradiction is a report, never a permission.
> (a) Claims about the EXISTING code (file paths, line numbers, counts, what a function does, "copy this
> sibling" pointers) are claims, not facts. Verify each against the code. Where the code disagrees, go by the
> code and report it under "Brief contradictions" (claim · what the code shows · file:line).
> (b) Claims about REQUIRED behavior (expected values, acceptance criteria, what the game should do) come from
> the owner's design and rulings, not from what the code does today. If you believe one is wrong, do not
> substitute the code's behavior: report it with your reasoning and stop on that item.
> Never bend a test, fixture or metric to make a claim come true. A contradiction never licenses a departure
> from the design, an invariant or your scope; any departure goes under "Declared deviations".

The Orchestrator settles *factual* brief errors itself (a wrong path, count or pointer). A contradiction that
needs a design decision, an invariant exception or a requirement change goes to the owner.

## RED evidence: proving a test can fail

A test that has never failed proves nothing.
- **A test that compiles against today's code** is run before the implementation exists, and must fail for the
  right reason (an assertion, not a crash or a missing file).
- **A test that names something the task creates** can't compile before the implementation, and after the merge
  there's no "before" to go back to. A compile error is **not** RED evidence. Instead use a **mutation** at the
  wave boundary: in an isolated checkout (`git worktree add`, never the shared tree, never `git stash`), apply
  ONE named change that keeps the code compiling but breaks the behavior the test guards. Run the test, capture
  the assertion failure, then remove the worktree. The plan lists the mutation next to the test.
- Expected values come from the **design**, never from running the code and copying its output.

## Worktree rules

- Agents that write in parallel get `isolation: "worktree"`. Each worktree agent first checks itself against
  local `main` (the ★ line in the template).
- **Never `git stash`** while any agent is running: the stash is shared by every worktree of the repository.
- **Gitignored files don't reach a worktree.** If an agent needs one, inline it in the prompt or track it.
- The Orchestrator merges worktree branches, re-runs `npm run ci` after each merge, and removes finished
  worktrees before the sprint closes.

## Reviewer

- **Read-only.** Never creates, modifies or deletes files. Only the Orchestrator spawns it.
- **Runs on Fable.** Its first output line is `reviewed-by-model: <model id>`. If the id isn't a Fable model it
  refuses (`verdict: REFUSED`). The routing guard blocks a cheaper override, and the close gate checks the line.
- **Scope is given, never self-chosen:** the plan, the task diff or the sprint diff, the design excerpts, the
  relevant KB entries and what to focus on.
- **Output:** findings as BLOCKER / WARNING / NOTE with file:line, written for a product manager (what the
  problem means first, then the mechanism). It ends with `verdict: APPROVED | APPROVED-WITH-WARNINGS | BLOCKED`.
- **Discipline:** verify, don't trust. Open the code behind every "fixed" or "tested" claim. Check that tests can
  fail (vacuous assertions, expectations copied from output). Doc-versus-code drift is a finding.

When to run it: WORKFLOW.md steps 2, 5 and 7.

## Constraint validator checklist

The constraint-validator checks every changed file against this list and reports PASS/FAIL with file:line. The
list grows: every FAIL entry and every new PAT entry may add an item.

1. Files changed are within the task's declared scope.
2. `src/sim/**` imports nothing from `src/client/**`, `src/ai/**`, `src/app/**`, browser/DOM APIs, timers, the
   network or the file system. It never calls `Math.random()`, `Date.now()` or `new Date()`.
3. `src/ai/**` reads only a player's view, never the full game state, and changes the game only through actions.
4. `src/client/**` never computes rules. It reads state or views and sends actions.
5. No balance numbers or content definitions are hard-coded in logic; they come from `data/**`.
6. No hard-coded limits on map size, player count or game length.
7. New game state is serializable (plain data; no class instances with hidden fields, functions or cycles).
8. Every behavior change has a test, and the report shows it failing before it passed.
9. No secrets, tokens or personal data; no leftover debug output, dead code or unused imports.

## Codex (external lens)

Codex (OpenAI's `codex` CLI) is the second, independent reviewer. Only the Orchestrator invokes it. Its findings
are advisory; the Orchestrator decides, and Codex output is never itself a KB entry.

**Operating rules** (each one learned the hard way in StatsTid):
- **Always close stdin:** end every call with `< /dev/null`, or Codex may wait forever for more input.
- **Capture only the verdict:** `-o <file>` (`--output-last-message`) writes the final message to a file, so a
  huge transcript never enters the Orchestrator's context. Never search the log for the answer.
- **Read-only sandbox:** `codex exec -s read-only ...`. Codex reviews; it never edits.
- **If its sandbox blocks reading files**, the result is an environment failure, not a verdict. Build one bundle
  file (CONVENTIONS.md, the diff, and numbered excerpts of every file the prompt cites), pipe it as stdin
  (`codex exec -s read-only -o out.md "<prompt>" < bundle.txt`), and say in the prompt that all source is
  inlined. Record the result as "performed on inlined source": it's a verdict on the bundle, not the repository.
- **Read the exit status from the unpiped command.** Redirect output to a file first.

**Invocation**
- Plan review: `codex exec -s read-only -o .claude/reviews/SPRINT-N-plan-codex-cK.md "<plan prompt>" < /dev/null`
- Per-task review: `codex exec -s read-only -o <file> "<task prompt naming the diff: git diff HEAD, or the
  task commit>" < /dev/null`
- Sprint-end review: `codex exec -s read-only -o <file> "<sprint prompt naming git diff <base>..HEAD>" < /dev/null`

(`codex review` can't combine a custom prompt with a diff target, so we use `codex exec` and name the diff in the
prompt.)

**Prompt template** (plan, per-task and sprint-end share it; the FOCUS line differs):

```
You are reviewing [a sprint plan at docs/sprints/SPRINT-N.md | the diff of TASK-N0x | the whole sprint:
git diff <base>..HEAD] for TemuCiv, a turn-based 4X strategy game built entirely by AI.
Read docs/CONVENTIONS.md first: its invariants are the standard. The owner's design is in docs/design/.
GOAL: [sprint goal or task acceptance criteria]
FOCUS:
 [plan] scope tightness; does each criterion test the real behavior; the right agent and file scope;
        dependencies; high-risk tasks flagged; anything that encodes an invariant violation as a feature.
 [task] correctness against the design; edge cases; determinism; tests that can't fail.
 [sprint] cross-task consistency; drift from the architecture and the design; gaps between goal and result.
OUTPUT: findings labelled BLOCKER / WARNING / NOTE, each with file:line, what is wrong, and the fix.
Write for a product manager: what the problem means before the mechanism.
End with exactly one line: verdict: APPROVED | APPROVED-WITH-WARNINGS | BLOCKED
```

The Orchestrator saves the result with the review stamp at the top (WORKFLOW.md step 7).
