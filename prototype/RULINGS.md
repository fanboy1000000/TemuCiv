# Prototype: the owner's slice 1 placeholder answers

The record behind `RULES.md`'s P1 to P12 marks: slice 1's placeholders as put to the owner and answered on
2026-10-15 (Sprint 2 log, "Slice 1 placeholders"). Copied word for word on 2026-10-18 from the working notes
`.claude/refinements/REFINEMENT-first-playable.md`, which are gitignored, so that `npm run check-docs` can check
every quote in `RULES.md` against a tracked record (owner, H1, Sprint 5 log). Only the Orchestrator edits this file,
and only to correct a copying error. It goes with the rest of `prototype/` when production starts.

**Slice 1 placeholders (owner's answers, 2026-10-15; throwaway, revisited after playtests):**
- P1 Land use: built sites with workers. A city builds an improvement (farm, quarry) on a tile; each needs some
  of the city's people to run and stores its output on the spot for logistics to haul.
- P2 Hauling: a site's output travels to the city that runs it on its own, losing a little or taking longer
  with distance. Routes the player sets up (one move each, then running on their last orders, K4) only move
  goods between cities.
- P3 Move cost: every order costs one move (a city's build, a site, a settler's destination, founding a city, a
  route); orders keep running on their last orders; looking is free.
- P4 Budget size: easy early, tight later. Example numbers (data): start with 4 moves; a building adds one more at
  a rising price, up to about 8. The pinch starts around the third or fourth city (K3 lean).
- P5 Attention: a move is a move. Any real order in a city also gives it the attention boost (K4); there is no
  separate 'attend' order (engineering had invented one; the owner rejected pointless orders). Placeholder boost:
  the city's sites produce a quarter more for five turns.
- P6 Coin: many sources, since there is one currency: "Population, trade, production, war. All can earn coin, as
  we just have one currency." Narrowed by the owner on 2026-10-15 ("Neither"): production only sets build speed,
  in the prototype and the real game (the 2026-10-04 ruling stands); a city with nothing to build simply waits.
  Slice 1: each person pays a little coin; goods delivered between cities along routes earn coin. War (plunder)
  arrives in slice 2.
- P7 Growth: a city grows by one person when enough food has reached its store; food is the only limit in
  slice 1. Stability and sanitation (the ruled growth limits) wait for a later slice.
- P8 Borders: sites claim land. Building a site on a tile just outside a city's borders claims that tile and the
  tiles around it. Assumed: a new city starts with its own tile and the six around it.
- P9 Distance: in slice 1, goods only take longer the further they go; nothing is lost. Owner's design intent for
  later (not the prototype): with full stability and control, distance costs only time; without them, a share
  is lost on the way. So transit losses hang on stability and control, which are not designed yet.
- P10 Buildings (placeholder names): Hall (+1 move per turn, rising price, up to the cap; K3), Granary (the city
  grows on less food), Market (more coin from people and arriving trade), Workshop (more production).
- P11 Unspent moves: all carry over, with no limit. Flagged: saving up for one huge turn could undo the 'choose
  every turn' point of the budget; the prototype shows whether it does (a moves-saved counter is always on screen).
- P12 Game end: play freely; no end and no summary. The player stops when they have seen enough.
