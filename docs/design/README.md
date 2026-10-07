# Game design (owned by the product owner)

This folder is the **owner's**. It holds what the game is and how it plays. It is the specification the code must
conform to (CONVENTIONS.md, invariant 1: design conformance). Engineering reads it, asks about it and builds from
it, but never changes a design decision on its own.

## What goes where

| File | Holds |
|---|---|
| `vision.md` | What the game is, who it's for, its pillars, and the hook that makes it more than a small Civ clone |
| `scope.md` | What's in the first version, and the explicit list of what's left out |
| `systems/<system>.md` | One file per game system (map, cities, units, combat, research, AI personalities…), written from [TEMPLATE-system.md](TEMPLATE-system.md) |

## How a design becomes code

1. The owner writes or updates a design doc. Rough is fine; completeness comes through the questions.
2. Engineering runs the `refine-requirements` skill on it: the rules as they will be implemented, with every
   number traced to the design, plus gaps and contradictions asked as questions, **one at a time**.
3. When the refinement is READY, it goes into a sprint plan. Tests take their expected values from the design.
4. The owner plays the result, and the playtest notes feed the next revision of the design.

## What makes a design easy to build

- **Exact rules and numbers** ("a city grows when its food store reaches 15 + 6 × size"), or an explicit "you
  choose" for engineering to propose.
- **Edge cases**: what happens at zero, at the maximum, on ties, when two rules collide.
- **Interactions** with other systems.
- **One or two worked examples**, which become tests directly.
- **Why**: the intent behind a rule lets engineering flag where the rule and the intent disagree.
