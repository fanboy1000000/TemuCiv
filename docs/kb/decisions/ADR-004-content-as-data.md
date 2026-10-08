# ADR-004: Game content and balance numbers live in data files

| Field | Value |
|---|---|
| **Status** | accepted (2026-09-30) |
| **Sprint** | S1 |
| **Areas** | content, simulation |

## Decision (plain language)

Units, buildings, ideas in the progress web, terrain, and every balance number (costs, yields, strengths, growth rates)
are defined in **data files** under `data/`, not written into the code. The code defines *how* rules work, and
the data defines *what* exists and *how much*.

## Why

- **Balancing means editing numbers, not logic.** The owner's balance changes are safe, fast and easy to review.
- **The owner's design maps directly to data.** The content agent transcribes a design into data files, with
  every value traceable to the design.
- **AI-generated content is safer as data.** Data is validated against a schema, so a typo can't break game logic.
- It enables game-speed settings and future modding without code changes.

## Rules this implies

- No balance numbers or content definitions hard-coded in logic (the constraint checklist, WORKFLOW step 4).
- Data files are validated against a schema in CI once they exist.
- Every value in a data file traces back to a design doc line or an owner ruling.

## Consequences

- The data format and schema are chosen in `docs/architecture.md`.
- Tests take expected values from the design; they may read the data only to prove the data matches the design.
