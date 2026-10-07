# TemuCiv Knowledge Base

> Only the Orchestrator writes entries. Agents propose them in their reports (a "PROPOSED KNOWLEDGE ENTRY"
> section). Every file under `decisions/`, `patterns/` and `failures/` must be listed here; `tools/check-docs.mjs`
> fails CI otherwise. Size budget per entry: 150 lines.

## Decisions (ADR): why we chose X over Y

| ID | Title | Status | Areas |
|---|---|---|---|
| [ADR-001](decisions/ADR-001-desktop-2d-web-technology.md) | Desktop PC (Steam) in 2D, built with web technology | accepted | platform, presentation |
| [ADR-002](decisions/ADR-002-headless-deterministic-simulation.md) | A headless, deterministic simulation driven by actions | accepted | simulation, ai-player, presentation, test-qa |
| [ADR-003](decisions/ADR-003-multiplayer-ready-state.md) | Single-player first, with a multiplayer-ready state model | accepted | simulation, ai-player, presentation, platform |
| [ADR-004](decisions/ADR-004-content-as-data.md) | Game content and balance numbers live in data files | accepted | content, simulation |
| [ADR-005](decisions/ADR-005-built-to-scale.md) | Built to scale: game size and length are settings | accepted | simulation, ai-player, presentation, test-qa |
| [ADR-006](decisions/ADR-006-ai-studio-governance.md) | An AI-only studio workflow, adapted from StatsTid | accepted | all |
| [ADR-007](decisions/ADR-007-real-time-with-pause.md) | Real time with pause, on a fixed-step simulation clock | superseded by ADR-008 | simulation, ai-player, presentation, platform, test-qa |
| [ADR-008](decisions/ADR-008-simultaneous-turns.md) | Turn-based, with simultaneous turns on the world map | accepted | simulation, ai-player, presentation, platform, test-qa |
| [ADR-009](decisions/ADR-009-layered-ai-opponents.md) | Layered AI opponents, built alongside each system | accepted | ai-player, simulation, content, test-qa |

## Patterns (PAT): how we do X

None yet. Patterns are recorded once they've been validated in practice.

## Failures (FAIL): what went wrong and the guard we added

None yet. Lessons inherited from StatsTid are listed in `docs/WORKFLOW.md`, "Inherited lessons".
