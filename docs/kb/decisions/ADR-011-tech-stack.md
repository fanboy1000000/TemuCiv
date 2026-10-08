# ADR-011: The tech stack: PixiJS, React panels, Electron, JSON data, Node's test runner

| Field | Value |
|---|---|
| **Status** | accepted (owner, 2026-10-08) |
| **Sprint** | S2 |
| **Areas** | presentation, platform, content, simulation, ai-player, test-qa |

## Decision (plain language)

| Need | Choice |
|---|---|
| Drawing the map | **PixiJS** (v8): a 2D renderer that uses the graphics card |
| Menus, screens, tooltips | **HTML/CSS panels over the map, built with React** |
| Desktop app | **Electron** |
| Content and balance data | **JSON files**, checked against schemas written with **Zod** (v4) |
| Build | **Vite** and **TypeScript** in strict mode, on **Node 24** |
| Code checks | TypeScript's own checks, including unused code; **no separate linter** |
| Tests | **Node's built-in test runner** (`node:test`); **Playwright** to launch the game and take screenshots |

Every choice went through the ladder (CONVENTIONS, "Build the minimum"): the platform first, then one
well-known library per need, nothing speculative. Packaging and the Steam connection are chosen when they are
needed (M5 and pre-release); the only rule now is that Steam code lives in the desktop shell.

## Why

- **PixiJS** draws thousands of hex tiles and units smoothly while panning and zooming, and is only a renderer:
  our simulation stays the single owner of the rules. It is widely used and actively released (v8.20, 2026).
- **HTML panels** give layout, text, scaling and accessibility (keyboard, screen readers; a never-cut item in
  CONVENTIONS) from the platform. Civilization VII builds its interface the same way (HTML/CSS/JS through
  Coherent Gameface). **React** is the UI library AI writes most reliably.
- **Electron** ships its own browser engine, so every player runs exactly what the AI tested, on every
  operating system. Playwright can launch it and screenshot it, which is how the AI checks its own visuals
  (ADR-001); that support is marked experimental, and the browser build (ADR-001) is the fallback for
  screenshots. The cost, roughly 100 MB of download and more memory, is negligible for a game.
- **JSON** is read by the platform with no extra library. **Zod** gives the code's types and a JSON Schema
  (editor checks, later mod tools) from one definition, so data and code can't drift apart (ADR-004).
- **TypeScript's checks** (strict mode, unused locals and parameters) cover what a linter would mostly catch
  here; the few rules they can't express are CI searches. A linter is added only when a needed rule fits neither.
- **Node's test runner** is built in and already runs the governance tests; Node 24 runs TypeScript directly, so
  rule tests and headless AI-vs-AI games need no build step.

## Alternatives rejected

| Alternative | Why not |
|---|---|
| Phaser | A full game engine whose own loop and objects duplicate the simulation |
| Plain Canvas 2D | No library, but too slow for ~10,000 tiles while panning and zooming |
| three.js | Built for 3D; more than a 2D map needs |
| Menus drawn inside the map canvas | Rebuilds layout, text and accessibility by hand |
| Svelte, Solid, or no UI library | Fine technically; less reliable AI output, or messy beyond a few screens |
| Tauri | About 3 MB, but uses each system's own browser engine. On Linux and Steam Deck (WebKitGTK), Tauri's docs warn of blank windows and WebGL silently falling back to slow software rendering |
| NW.js | Similar to Electron, with a smaller community |
| YAML or TOML | Allow comments, but add a dependency and known parsing traps |
| Content as TypeScript modules | Type-checked, but content becomes code and mods would need a compiler |
| ESLint | Overlaps with TypeScript's checks; revisit when a rule is needed that neither TypeScript nor a CI search covers |
| Vitest | Nicer tooling, but a second test runner for what the platform already does; revisit if a need appears |

## Rules this implies

- TypeScript uses only syntax Node can run directly (`erasableSyntaxOnly`: no enums or namespaces), imports
  name their `.ts` files, and `noUnusedLocals` and `noUnusedParameters` are on.
- Data files are validated against their schemas in CI (ADR-004).
- The interface shows information through focus and click as well as hover, and text scales (accessibility).

## Consequences

- The module layout and data flow are in `docs/architecture.md`.
- M1 sets up Vite, TypeScript, the test runner and Playwright, and adds their CI steps (ROADMAP backlog).
