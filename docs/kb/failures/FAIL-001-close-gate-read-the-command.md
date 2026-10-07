# FAIL-001: The close gate read the command, not the commit

| Field | Value |
|---|---|
| **Found** | S1, by Codex in the sprint-end review (cycle 1, 2026-09-30) |
| **Fixed** | S1, TASK-108 and the cycle-2 follow-up (2026-10-07) |
| **Areas** | governance tooling (Orchestrator) |

## What went wrong (plain language)

The machine that stops a sprint from closing without reviews, CI and a finished log looked at the *text of the
command* Claude was about to run, not at the commit git would actually make. Ordinary ways of committing slipped
past it: `git.exe`, `git --no-pager`, a message read from a file (`-F`), a message held in a variable. A close
could also be recognised anywhere in the text instead of only in the subject line. Separately, the GitHub gate
let everything through unless it saw the literal word "failure", so a cancelled, unfinished or unreadable CI
run counted as green.

Nothing was damaged: the gaps were found before the first close. But a gate with holes is worse than no gate,
because everyone believes it holds.

## Why it happened

- The check sat where it was easy to hook in (Claude's PreToolUse event), not where the truth is (git's own
  commit-msg event, which receives the real message).
- The GitHub gate was written to block known-bad states (fail open) instead of requiring a known-good state
  (fail closed).
- Tests covered the forms the author thought of, not the forms an ordinary user would use.

## The guard

- **Enforce where the truth is.** The gates live in `tools/lib/close-gates.mjs` and run in the git
  `commit-msg` hook (`.githooks/`, `npm run setup`), on the real message, whatever the command looked like.
  The Claude guard now only protects that hook: it blocks commits while the hooks aren't installed and blocks
  `--no-verify`, `-n` and `core.hooksPath` overrides.
- **Fail closed.** The GitHub gate requires a finished, successful run for the last pushed commit; any error
  blocks. A commit that marks a sprint complete is treated as a close, whatever its subject.
- **Prove each guard can fail.** Every fix has a test, and one-line mutations in a throwaway worktree showed each
  test failing when its fix is removed.

## Guidance for future agents

Put an enforcement point where the fact it checks is visible (the commit, the file, the run), not where it is
convenient to hook. Default every gate to "blocked unless proven good". Test the forms a normal user would type,
not only the ones the gate was written for.
