---
name: refine-requirements
description: Refine a request or an owner design into buildable, testable requirements before planning or coding in TemuCiv. Trigger whenever the user asks to build, create, implement, fix, add, change or develop anything, or hands over a design doc (CLAUDE.md pre-implementation gate). Interprets intent instead of transcribing it, proposes the best answer within the architecture, asks only genuine design questions (one at a time), and produces assumptions, acceptance criteria, risks and a READY verdict. Skip only for mechanical tasks with an obvious fix.
---

# Refine requirements

The goal isn't to ask the owner what they want. It's to work out what the game actually needs, propose the best
engineering answer, and surface the design decisions that only the owner can make, before any work begins.

## Step 1: Understand the real need

- What problem does this solve for the player or for the project? Why now?
- What would the owner wish they had asked for three months from now?
- Cross-reference: the owner's design (`docs/design/`), `docs/architecture.md`, `docs/kb/INDEX.md` (ADRs and
  patterns that constrain this), `docs/CONVENTIONS.md` (does anything here press on an invariant?), `ROADMAP.md`.

## Step 2: Separate what you can propose from what you must ask

- **Propose** when the architecture, an ADR or engineering practice gives a clear best answer. The owner says
  yes or corrects it; they don't have to design the solution. Example: "Combat results are computed in the
  simulation and shown by the client (ADR-002)."
- **Ask** when the answer depends on design intent, game feel, scope preference, or a genuine fork with real
  trade-offs. Present the options with their consequences for the player, and your lean. Example: "When a unit
  loses a fight, should it die or retreat damaged? Retreat keeps armies alive longer and slows conquest."
- **The test:** could a thoughtful game designer disagree with your proposal? If yes, ask. If no, propose.
- **Gaps and contradictions in a design are questions, never silent fixes.** If two rules conflict, or a number
  is missing, say so.

## Step 3: Write the refinement

Write it to `.claude/refinements/REFINEMENT-<short-topic>.md` (gitignored) and present it:

---
**What you asked for:** one sentence, the literal request.

**What the game actually needs:** one to three sentences, including what's necessary but unsaid.

**Proposed approach:** 3–5 bullets, specific (modules, data files, ADRs). This is a hypothesis, not a question.

**Rules as I will implement them:** for a design, the exact rules in testable form (numbers included), each
traced to the design line it comes from. This is what test-qa derives tests from.

**Open questions (the owner's decisions):** numbered genuine forks, each with options, trade-offs and a lean.
Asked **one at a time**, starting with the one that most changes the implementation. If there are none: "None —
the design and the architecture answer everything."

**Assumptions (correct me if wrong):** statements, not questions, so the owner can scan and flag them.

**Acceptance criteria:** a checklist of verifiable "done" statements, each with how it will be verified.

**Risks and conflicts:** what could go wrong, clash with an ADR or invariant, or have non-obvious consequences
(performance, determinism, save compatibility, scale).

**Readiness:** READY (every ambiguity has a proposed resolution) or NEEDS CLARIFICATION (the 1–2 blocking
unknowns).
---

## Step 4: Review the refinement (substantive tasks)

A refinement that bakes in a wrong assumption poisons everything downstream, and fixing it here is cheapest.
Run both lenses in parallel on the refinement file:
- **Codex:** `codex exec -s read-only -o .claude/reviews/REFINEMENT-<topic>-codex.md "<prompt>" < /dev/null`
- **Reviewer agent:** spawn `reviewer` with the refinement file as its scope.

Prompt (both lenses): *"Review the refinement at <path> for TemuCiv. Check: scope tightness (anything that should
be deferred, anything deferred that is load-bearing); open questions (any genuine design fork not surfaced; is
each lean defensible); assumptions (wrong against the design, the ADRs or docs/CONVENTIONS.md); rules (do they
match the design exactly, can each be tested); acceptance criteria (do they verify done); risks (determinism,
performance, scale, save compatibility). BLOCKER / WARNING / NOTE with citations; end with `verdict:`."*

Fix BLOCKERs in the refinement and re-run the lens that raised them (cycle cap 5, WORKFLOW.md). Show WARNINGs and
NOTEs to the owner with a recommendation. **Skip Step 4** only for the "simple fix" tier below, a mechanical task,
or when the owner says to skip it; record a one-line reason. If Codex is unavailable, stop and tell the owner.

## Step 5: Suggest the next question

End with one question that targets the weakest part of the requirement, a dimension the owner hasn't explored.
Not "does this look right?". Example: *"What should happen to a city's production queue when the city is
captured?"*

## Step 6: Iterate or proceed

Update the refinement after each answer, re-review changed sections, and continue until READY. When the owner says
proceed, plan the sprint (WORKFLOW.md step 1).

## Calibration

- **Simple fix or typo:** a 2–3 line refinement, no review, READY.
- **One feature or one system design:** the full block plus Step 4.
- **A new system or a multi-sprint feature:** the full block, Step 4, and several question rounds.

Don't over-refine the obvious. The skill is for ambiguous or complex requests.
