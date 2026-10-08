# ADR-009: Layered AI opponents, built alongside each system

| Field | Value |
|---|---|
| **Status** | accepted (engineering proposal, agreed by the owner 2026-10-05) |
| **Sprint** | S1 |
| **Areas** | ai-player, simulation, content, test-qa |

## Decision (plain language)

The computer opponents are built as **layers**, each using the method that suits its job:

| Layer | Job | Method |
|---|---|---|
| Strategy | What am I aiming for this era? | Goals chosen by **scoring**, with **personality** as a set of weights |
| Operations | Cities, spending, progression nodes, food routes, armies to fronts | **Scoring** plus **influence maps** (heat maps of danger, value and supply reach over the hex grid) |
| War | Campaigns: gather an army, secure supply, march, engage | **Planning**: a goal broken into steps, re-planned when the world changes |
| Battles | Fighting on the battle map | **Look-ahead search** (e.g. Monte Carlo Tree Search), when that system exists |

Weights are **tuned automatically** from headless AI-vs-AI games. The AI is **built alongside each game system**,
from M2, not added at the end.

## Why

- **Each method is strong where the others are weak.** Scoring copes with hundreds of options but is
  short-sighted; planning gives coherent multi-turn behavior (wars, supply lines); search finds strong moves in
  small, contained problems. Shipped 4X AIs are mixtures for this reason (Civilization's scored "flavors",
  Total War: Rome II's goal-and-resource planner using tree search).
- **It stays readable, testable and cheap to run.** Scores and plans can be printed and explained; decisions are
  deterministic with the seeded RNG; nothing needs a server or a GPU.
- **It survives design changes.** The design will change often; weights live in data (ADR-004) and the methods
  read the real rules, so a change means re-tuning, not retraining.
- **Our architecture makes it cheap.** The headless simulation (ADR-002) lets search play "what if" games with
  the real rules and lets thousands of AI-vs-AI games tune the weights.
- **Simultaneous turns (ADR-008)** let the AI think while the human plans, since it can't see the human's orders.

## Rules this implies

- The AI follows ADR-002 and ADR-003: it sees only its own player view and acts only through validated actions.
- Personalities, weights and difficulty settings are data (`data/**`), never constants in code.
- **Every system spec answers "How the AI plays this"** before code is written (section in
  `docs/design/TEMPLATE-system.md`). A feature the AI can't play makes the game easy, however good the feature is
  (the genre's lesson: Civ V's one-unit-per-tile rule, which its lead designer later criticized partly because
  the AI could not maneuver armies under it).
- **A system is not done until the AI plays it** at a basic level, from M2 on (ROADMAP).
- AI decision time per turn is measured against the performance budgets (ADR-005, ADR-008). The AI stops on a
  work budget, never on the clock, so its choices stay reproducible (ADR-010).

## Alternatives rejected

| Alternative | Why not |
|---|---|
| Hand-written rules only | Brittle and exploitable; every new feature adds rules that start to contradict each other. Kept only as glue for small, obvious decisions |
| Machine learning by self-play as the main AI | Research-lab training costs; retraining after every design change; a black box that is hard to give personalities, difficulty levels or tuning. Possible later as a balance tool that hunts for exploits |
| A large language model as the decision-maker | Cost and delay per AI per turn; not reproducible from a seed; weak at spatial and tactical play. Possible later as an optional strategy or diplomacy layer (ROADMAP parking lot), as in the Vox Deorum research on Civ V |

## Consequences

- Open (owner, deferred): whether rivals play to win, play a role, or play to win in character. The layered
  design supports all three; the answer sets the goals and the weights, not the architecture.
- The roadmap gives M2 a first AI player and M3 an AI that learns each new system.
- Headless AI-vs-AI games become part of the normal test loop from M2.
