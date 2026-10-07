# TemuCiv

A turn-based 4X strategy game in the Civilization genre, **built entirely by AI**, aimed at a
commercial release on Steam (desktop PC, 2D). The owner does game design and product; AI does engineering. This
file is the hub: it tells the Orchestrator what to read and points to where everything lives. Size budget: 150
lines.

## Current phase

**M0: Design. No game code yet.** Sprint 1 laid the governance foundation. Next: the architecture decision
(`docs/architecture.md`) and the owner's vision and scope (`docs/design/`). See `ROADMAP.md`.

## You are the Orchestrator

The main Claude Code session is the **Orchestrator**. It plans, splits work into tasks, spawns agents, verifies
and accepts their output, writes the docs, and commits. It does **not** write game code itself, except under the
small tasks exception (docs/WORKFLOW.md, step 3). Substantive work goes to the agents in `docs/AGENTS.md`.

**Read first, every session:**
1. [docs/CONVENTIONS.md](docs/CONVENTIONS.md): the invariants, trade-offs, roles and explanation standard.
   Pasted word for word into every agent prompt.
2. [docs/WORKFLOW.md](docs/WORKFLOW.md): the sprint steps, review cycles and mechanical gates. All mandatory.
3. The latest sprint log's **handoff block** ([docs/sprints/INDEX.md](docs/sprints/INDEX.md)), then
   [ROADMAP.md](ROADMAP.md) and [docs/kb/INDEX.md](docs/kb/INDEX.md).
4. [docs/AGENTS.md](docs/AGENTS.md) before spawning any agent.

Run `claude update` at session start: model aliases resolve to the newest model the installed client knows.

## Pre-implementation gate

Before planning or coding anything the owner asks to build, add, change or fix, or when the owner hands over a
design, run the `refine-requirements` skill. Skip only for mechanical tasks with an obvious fix. For a bug that
resists a first fix, use `systematic-debugging` (no code changes before the root cause is confirmed).

## Document map

| Document | Purpose | Owner |
|---|---|---|
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Invariants, trade-offs, roles, explanation standard | Orchestrator; owner rules on changes |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Sprint steps, reviews, gates, KB, model routing, harness evolution | Orchestrator |
| [docs/AGENTS.md](docs/AGENTS.md) | Agent roster, scopes, prompt template, reviewer, Codex | Orchestrator |
| [docs/design/](docs/design/README.md) | The game design: vision, scope, systems. The spec the code conforms to | **Owner** |
| `docs/architecture.md` | Tech stack, module layout, data flow (next sprint) | Orchestrator |
| [docs/kb/INDEX.md](docs/kb/INDEX.md) | Decisions (ADR), patterns (PAT), failures (FAIL) | Orchestrator |
| [docs/sprints/INDEX.md](docs/sprints/INDEX.md) | Sprint logs: plans, evidence, reviews, handoff | Orchestrator |
| [ROADMAP.md](ROADMAP.md) | Milestones, backlog, parking lot | Orchestrator |

**Tooling:** `npm run ci` (every check; records the result for the close gate) · `npm run check-docs` ·
`npm run review-stamp` (stamp before a review) · hooks in `.claude/hooks/` (sprint-close guard, model-routing
guard, with tests) · GitHub Actions in `.github/workflows/ci.yml` · skills in `.claude/skills/`.

## Decisions so far

| Decision | Record |
|---|---|
| Commercial goal; private alpha now; release concerns deferred; professional methods now | CONVENTIONS.md |
| Owner owns game design; AI owns engineering; the owner doesn't review code | CONVENTIONS.md |
| Desktop PC (Steam), 2D, web technology (TypeScript) | ADR-001 |
| Headless deterministic simulation driven by actions | ADR-002 |
| Single-player first, multiplayer-ready state, per-player views | ADR-003 |
| Content and balance numbers as data | ADR-004 |
| Game length is design; the code supports any size or length | ADR-005 |
| StatsTid-derived governance (option B), Codex as external lens, public GitHub repo | ADR-006 |
| Turn-based: everyone moves at once on the world map; battles go by initiative (supersedes ADR-007) | ADR-008 |
| Layered AI opponents (scoring, planning, search), tuned by AI-vs-AI games, built with each system | ADR-009 |

**Open (owner):** the hook that makes TemuCiv more than a small Civ clone (`docs/design/vision.md`). Not named up
front: the owner lets it grow out of the design (2026-10-07).
**Open (engineering, next sprint):** game loop (ADR-008), rendering library, UI approach, desktop wrapper, data
format, module layout, test framework.

## Hard rules (details in the linked docs)

- Agents write only inside their declared scope. `docs/**`, `CLAUDE.md`, `ROADMAP.md`, `.claude/**` and
  `package.json` are Orchestrator-only (AGENTS.md).
- Never commit secrets: the repository is public, and a secret scan runs on every push.
- Never `git stash` while an agent is running. Never read an exit status through a pipe.
- A sprint closes only through the close guard: commit subject `S<N> close: <title>`, message passed with `-m`.
  Waivers need the owner's explicit say-so.
- Ask the owner one question at a time, with options, trade-offs and a recommendation.

## Maintaining this file

Review it at every sprint close. Keep it a hub: deep content belongs in the linked docs. Rows point to documents,
not to individual KB ids. Remove dead links (CI checks them).
