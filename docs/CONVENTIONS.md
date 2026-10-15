# TemuCiv Conventions

This file applies to **every** contributor, the Orchestrator and every agent, and is included word for word in
every agent prompt (`docs/AGENTS.md`). It is read on every task, so it stays short: 100 lines (`check-docs`).

## Project status and intent

TemuCiv is a 4X strategy game in the Civilization genre, played in simultaneous turns (ADR-008), and **built
entirely by AI**. The goal is a **commercial release on Steam (desktop PC, 2D)**. Current builds are a **private
alpha**:
- **Deferred until a pre-release phase:** final name (both "Temu" and "Civ" are trademarks), asset licensing,
  AI-content disclosure and store setup. Don't spend effort on these, but don't paint us into a corner either.
- **Not deferred:** how we build. Methods, code quality, testing and review meet a professional-studio standard
  from day one. "Alpha" means features are incomplete, not that the work is sloppy. Professional also means
  proportionate (see "Build the minimum"). The one exception is the throwaway prototype in `prototype/`, which
  follows lighter rules (WORKFLOW, "Prototype phase").
- The repository is **public**. Never commit secrets, keys, tokens or personal data.

## Roles

- **Owner (human): game design and product.** Vision, mechanics, rules, content, balance direction, tone, scope.
  The owner is also the playtester and the only judge of whether the game is fun. The owner does not review code.
- **AI: engineering.** Architecture, code, tests, tooling, technical docs, and turning the owner's designs into
  data files. The Orchestrator coordinates; agents implement; the reviewer and Codex check.
- **Design decisions are never made silently.** If a design is ambiguous, incomplete or self-contradictory, ask.
  If a design would be costly, slow or hard to scale in code, say so with the trade-off; the owner decides.
  Engineering may support design with data (e.g. simulation statistics) but never overrules it.

## The invariant model

Work is governed by two kinds of rules: **invariants**, never traded away, and **trade-offs**, which are balanced.

**Invariants: co-equal, not ranked.** A solution that breaks ANY invariant is not a valid path. Find another
one. If two invariants genuinely cannot both hold, escalate to the owner; an agent never trades one away.

1. **Design conformance.** The game does what the owner's design says. Expected behavior comes from the design
   docs and the owner's rulings, never from what the code happens to do today.
2. **Headless, deterministic simulation.** All game rules live in a simulation layer with no rendering, UI,
   DOM, clock or network access. The same seed and the same actions always produce the same game. Randomness
   comes only from the seeded game RNG. (ADR-002)
3. **Every state change is an action.** Human players, AI players, replays and tests all change the game through
   the same validated actions. The human player has no special code path. (ADR-002)
4. **Multiplayer-ready state.** All game state is serializable. There is no hidden global state. Each player
   receives only their own view: fog of war is enforced in the simulation, not just hidden by the renderer.
   (ADR-003)
5. **Content is data.** Units, buildings, ideas, terrain and balance numbers live in data files, not in code.
   (ADR-004)
6. **Built to scale.** No hard-coded limits on map size, player count or game length. Pacing values live in
   data. Performance is tested at large scale, not just with the default setup. (ADR-005)
7. **Nothing unverified ships.** Verification matches the risk, and every change is reviewed before it reaches
   `main`. High-risk changes (how game rules compute, determinism, actions and what each player may see, saves,
   AI decisions, performance-critical code) get tests derived from the design, seen failing first. Other logic
   gets at least one check that can fail. Trivial edits and data changes need no new test: each value traces to
   the design and is checked against its format. Visuals get a screenshot and the owner's playtest. "Done" means
   verified, not assumed.

**Trade-offs, ranked: balanced against effort, never above an invariant.**
1. **Player experience in the build:** responsiveness, clarity and stability of what the owner plays.
2. **Shipping cadence:** delivering playable increments sustainably.

**Enforcement is not a priority, it is the machinery.** CI, the hooks and the close gates are how the
invariants stay true from build to build. They protect the invariants; they are not goals being weighed.

## Build the minimum

Adapted from ponytail (github.com/DietrichGebert/ponytail, MIT). Understand the problem first: read the task and
the code it touches, and trace the real flow. Then stop at the first step that holds:
1. **Does it need to exist?** A speculative need is skipped, and the report says so in one line.
2. **Is it already in the codebase?** Reuse it.
3. **Does the standard library, the platform or an installed dependency do it?** Use that. A new dependency
   only when a few lines can't do the job.
4. **Only then, the minimum that works.** No abstraction, file, setting or scaffolding the task didn't ask for.
   Delete before adding; boring before clever.

Never cut to save code: the invariants, validation of outside input, handling that prevents data loss, security,
accessibility, anything the owner asked for. A deliberate shortcut with a known limit gets a comment,
`shortcut: <the limit>; upgrade when <condition>`, which the sprint-start scan collects into the backlog.

## Audience and explanation standard

The owner is a product manager and game designer, not the author of the code. Explanations must let them
understand the decision **and learn from it**.
- **Lead with the why and the plain-language what,** then the mechanism. File and line details come last,
  for the record.
- **Define or avoid jargon.** Technical terms and internal IDs (ADR-003, TASK-204, "worktree") get a one-line
  explanation on first use, or a pointer to where they're defined.
- **Make trade-offs legible.** When a choice is made, say what was given up and why.
- **Ask one question at a time,** each with options, trade-offs and a recommendation.
- **Governance artifacts serve this too.** Sprint logs and KB entries carry a readable summary, not only
  citations.

## Honesty in reporting

- Report outcomes as they are. Failing tests are reported with their output. A skipped step is reported as skipped.
- Never estimate or carry forward numbers (test counts, timings) from memory. Run the command and report what
  it printed.
- Never read an exit status through a pipe (`cmd | tail` reports the pipe's status, not the command's).
- A claim about code carries a file:line that was actually opened. A number from someone else's report is a
  claim, not a fact, until checked.
