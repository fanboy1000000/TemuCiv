# FAIL-002: Review rounds kept finding slips in records, not in the game

| Field | Value |
|---|---|
| **Found** | S4, in the sprint-end review (cycles 3 to 6, 2026-10-16 → 2026-10-17); named by the S5 harness review |
| **Fixed** | S5, TASK-505 (2026-10-18), on the owner's ruling H1; the quote check tightened by TASK-507 after the review |
| **Areas** | governance (Orchestrator), `prototype/RULES.md`, sprint logs |

## What went wrong (plain language)

Sprint 4 needed six review rounds, and closed only with the owner's waiver. The first two rounds found real gaps
in the rules: an army on a long supply line went hungry, and so did one on turn 1. From round 3 on, almost every
finding was about records:
- a rule's "the owner said so" label claimed more than the owner's recorded words;
- a log line written from memory;
- a fix the log described that hadn't been made (in a gitignored file nobody else could see).

Each full re-review read the freshly rewritten text and found the next slip. Sprint 2 (four rounds, waived) and
Sprint 3 (attribution in the rules "took three passes") showed the same tail. The cost was days of rounds and two
waivers. A few findings in those rounds did touch the game (the hunger look-ahead in cycles 3 and 4, two screen
hints in cycle 5), but most were about records.

## Why it happened

- Checking that a quote is the owner's exact words was left to two reviewers reading by eye. Ten of the rules
  file's quotes pointed to working notes that are gitignored, so no fresh clone, CI run or reviewer in another
  checkout could check them at all.
- Every verification round re-read the whole sprint, so each fix to a record exposed the rest of the record to a
  fresh search.
- Fix tasks retyped each finding's status from memory instead of copying it from the review file.

## The guard

- **A machine checks the quotes.** `tools/check-docs.mjs` (step 6, in `npm run ci`) checks every quote in
  `prototype/RULES.md`, where double quotes hold only the owner's words, each inside a mark such as (A4: "words").
  Each quote must appear word for word in the ruling its mark names: the paragraphs check-docs lists for that mark,
  not the whole log. A quote outside a mark, an unknown mark, or a ruling whose opening words are missing fails,
  and struck-out text doesn't count. Slice 1's placeholder answers were copied from the working notes into
  `prototype/RULINGS.md`, so every ruling is tracked. Tests in `.claude/hooks/tests/docs-and-ci.test.mjs` cover 15
  failures; the bypasses the Sprint 5 review found pass the checker as it was before TASK-507.
- **Verification rounds cover the fixes.** After a lens's first round, the next ones review the diff since that
  lens last looked, plus whatever the fixes change (WORKFLOW, "Review cycles").
- **Fix records are copied, not retyped.** A fix task copies each finding's status from the review file and quotes
  any change to a gitignored file (WORKFLOW, "Review cycles").

## Guidance for future agents

When a review keeps finding the same kind of slip in text, move that check to a machine, or narrow what the next
round reads. Don't write the text more carefully and hope. Quote the owner's words only inside a mark, and only
from a tracked record.
