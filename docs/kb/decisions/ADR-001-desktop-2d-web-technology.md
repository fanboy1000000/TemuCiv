# ADR-001: Desktop PC (Steam) in 2D, built with web technology

| Field | Value |
|---|---|
| **Status** | accepted (owner ruling, 2026-09-30) |
| **Sprint** | S1 |
| **Areas** | platform, presentation |

## Decision (plain language)

TemuCiv is a **2D** game for **desktop PCs, sold on Steam**. It is built with **web technology (TypeScript)** and
packaged as a desktop application. Browser builds may be used to share alpha versions with testers. A mobile
version is a possible later port, not a target.

## Why

- Steam on PC is the main market for 4X strategy games.
- The game is built entirely by AI, so the technology must be one the AI can **write, run and verify on its own**:
  - TypeScript is among the languages AI models write most reliably.
  - Everything is plain text files. There is no visual editor the AI can't operate.
  - The game can be launched and screenshotted automatically, so the AI can check what it built.
- 2D keeps the two things AI is weakest at, art and visual verification, manageable. A well-styled 2D game can
  look fully commercial.

## Alternatives rejected

| Alternative | Why not |
|---|---|
| Godot | A good engine, but workflows are editor-centric and AI output for its current versions is less reliable |
| Unity / Unreal | Built around a visual editor and binary assets that the AI can't drive |
| 3D | Multiplies art and verification work, exactly where AI is weakest |
| Mobile first | Touch UI is a separate design problem; kept as a possible port |

## Consequences

- The rendering library, UI approach and desktop wrapper (e.g. Electron vs Tauri) are chosen in
  `docs/architecture.md`, within this decision.
- Desktop packaging and Steam integration are platform work, needed before any public build.
- Performance must be verified on modest PC hardware, not only on the development machine.
