---
name: systematic-debugging
description: Structured diagnosis for hard, stuck or recurring bugs in TemuCiv. Trigger when a second fix attempt on the same bug is about to happen, a fix did not hold or the bug moved, the cause is not obvious, the user is frustrated ("going in circles", "makes no sense"), a game desyncs or a replay diverges, or "it worked yesterday". Rule 1 is no code changes until the root cause is confirmed. Skip for simple bugs with a clear cause.
---

# Systematic debugging

**Rule 1: no code changes until the root cause is confirmed.** Random fix attempts mask symptoms and waste time.

## Step 0: Notice you're stuck

Signals: you're about to try a fix you aren't confident in, an earlier fix didn't hold, the owner is frustrated,
or there's no clear chain from code to symptom. Then say: *"Switching to systematic debugging: diagnosing before
fixing."*

## Step 1: Capture the bug

1. **Observed:** the exact error, wrong value or behavior. Quote the literal output; describe what it *says*.
2. **Expected:** what the design says should happen (cite it).
3. **Reproduction:** exact steps. For the simulation: the seed, the map settings and the action list. A
   deterministic game makes almost every bug replayable, so use that.
4. **Already tried:** every earlier attempt, so none is repeated.
5. **Recent changes:** `git log` since it last worked.

## Step 2: Minimal reproduction

- Shrink it: the smallest map, the fewest players and actions that still show the bug, ideally as a failing test.
- "It worked yesterday": `git bisect` through recent commits before theorizing.
- A replay that diverges means determinism has broken. Compare state hashes turn by turn to find the first
  divergent turn, then the first divergent action.

## Step 3: Narrow the scope

Halve the search space with each question: simulation or client? This action or all actions? This turn or every
turn? This seed or every seed? This machine or everywhere (CI vs local)?

## Step 4: Hypotheses

List every plausible cause, including unlikely ones, and rank them:

| # | Hypothesis | Likelihood | Confirmed if… | Ruled out if… |
|---|---|---|---|---|

For the top one, ask: *what evidence would disprove it?* If you can't say, it's too vague.

## Step 5: Eliminate one at a time

For each hypothesis: the smallest probe (a log line, an assertion, an isolated test), run it, and mark it
CONFIRMED, RULED OUT or INCONCLUSIVE. Timebox each probe. Change one thing at a time. Keep an evidence log:

```
[H1] <hypothesis>  Probe: <what you did>  Result: <what happened>  → RULED OUT
```

## Step 6: Confirm the root cause

All three must be yes: (1) you can explain the full causal chain; (2) you can make the bug appear and disappear by
toggling the cause; (3) the fix addresses the cause, not the symptom. Then state:
*"Root cause confirmed: …"*

## Step 7: Fix and verify

Make the minimal fix. Turn the reproduction into a regression test and show it failed before the fix. Run
`npm run ci`.

## Step 8: Regression note

*"Regression note: [what broke] because [root cause]. Guard: [the test or check that now catches it]. Related
areas that could have the same issue: […]."* If the failure taught something general, propose a FAIL entry for
the knowledge base.
