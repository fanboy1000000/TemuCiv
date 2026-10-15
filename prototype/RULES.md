# Prototype slice 1: the rules

The rules the throwaway prototype follows (WORKFLOW, "Prototype phase"). Written by the Orchestrator from the
owner's rulings and the slice 1 placeholders P1 to P12 (Sprint 2 and 3 logs, "Owner design rulings"); the builder
may not change it, and reports any rule that can't work as written. Every number here is a starting value that lives in `numbers.js`, where the owner can change it and
reload. "(P3)" and similar point to the placeholder or ruling a rule comes from; "(eng.)" marks engineering's own
proposal, which the owner may flag. Every number is engineering's starting value, even in a rule a ruling names.

## The map
- A hex grid, 24 × 18 tiles, one landmass surrounded by water, made from a seed number: the same seed always
  gives the same map (eng.). The seed shows on screen; a new game can be started with any seed.
- Five terrains, shown by colour alone (D3): grassland (light green), forest (dark green), hills (tan),
  mountains (grey), water (blue). Mountains and water can't be entered (eng.).
- The whole map is visible (eng.).

## The start
- You start with one city of size 2 on grassland, 30 coin, 10 food and 10 stone in its store, and one settler
  next to it (eng.).

## Moves (K1, K3, K4, P3, P4, P5, P11)
- You get 4 moves each turn. Unused moves carry over with no limit (P11). The top bar shows the moves available,
  the moves per turn and how many of them were saved from earlier turns.
- Every order costs one move (P3). The orders: give a city something to build (a building, a site on a chosen
  tile or a settler); send a settler to a tile; found a city with a settler; set up a route; change or cancel a
  route. Looking at anything is free. An order you can't afford is shown disabled, with the reason.
- Undo takes back the most recent order given this turn, and can be repeated back to the start of the turn: the
  order's move, coin, stone and food come back (eng.). Correcting a misclick costs nothing. Changing an order from
  an earlier turn is a new order (one move).
- Anything you leave alone keeps following its last orders (K4).
- Attention (P5): an order given in a city (a build, a route that starts there, founding it) gives that city
  attention for 5 turns: its sites produce a quarter more. A new order restarts the 5 turns. Orders to a settler
  give no attention.
- The Hall (P10) adds one move per turn. Each further Hall costs half as much again as the one before, counting
  Halls finished or being built, so ordering several at once doesn't get the first price; one per city; moves per
  turn never exceed 8 (P4 asks for a slow rise with a cap; the price growth and the 8 are eng.).

## Cities, food and growth (P7)
- A city's own tile makes 2 food per turn with nobody working it (eng.).
- Each person eats 2 food per turn from the city's store (eng.).
- A city grows by one person when its food store reaches 10 + 5 × its size; that much food is used up. Food is
  the only limit on growth (P7). The Granary lowers the amount by a quarter (P10 names it; the effect is eng.).
- If the store can't feed everyone, the city loses one person (never below 1) and the store drops to 0 (eng.).

## Production and building
- A city's production is 2 + 1 per person (eng.). The Workshop raises it by half (P10 names it; the effect is eng.).
- A city builds one thing at a time (eng.). Giving it something to build costs one move; the coin (from your purse) and
  stone (from that city's store) are paid when you order it. Changing the order refunds the coin, stone and food
  paid and loses the progress (eng.).
- When a build finishes and you haven't ordered another, the city waits: its production is unused (P6, owner
  2026-10-15) and it is listed under "Waiting for you".

| What | Coin | Stone | Production | Other | Effect |
|---|---|---|---|---|---|
| Farm (site) | 10 | 0 | 15 | grassland only; needs 1 person | 4 food per turn |
| Quarry (site) | 10 | 0 | 20 | hills only; needs 2 people | 2 stone per turn |
| Settler | 0 | 0 | 20 | 15 food when ordered; 1 person when finished (the build waits while the city is size 1) (eng.) | founds a city (settlers are in the map ruling) |
| Hall | 40 | 20 | 40 | one per city; coin and stone × 1.5 for each Hall finished or being built | +1 move per turn |
| Granary | 20 | 10 | 25 | one per city | growth needs a quarter less food |
| Market | 25 | 10 | 30 | one per city | coin from people and arriving trade +50% |
| Workshop | 20 | 15 | 30 | one per city | production +50% |

## Sites (P1, P2, P8)
- A site is ordered on a tile inside the city's borders or next to them, of the right terrain, with no site or
  city on it, and not inside another city's borders (P8).
- When a site is finished, its tile and the tiles around it join the city's borders, except tiles another of
  your cities already holds (P8). Sites are the only way borders grow.
- The city fills its sites with its people on its own: farms first, then quarries, nearest first (eng.). A site
  without enough people stands idle and is listed under "Waiting for you".
- A working site's output travels to its city on its own (P2): it arrives after 1 turn per 3 tiles of distance
  (counted in hexes from the site to the city), rounded up, at least 1 turn. Nothing is lost on the way (P9).
- People not working at a site still eat, pay coin and add to production.

## Borders
- A new city holds its own tile and the six around it, except tiles another city already holds (P8).

## Coin (P6)
- One purse for the whole empire. Each turn every person pays 1 coin. The Market (P10 names it; the effect is eng.)
  adds half to that city's people coin and to the trade coin of goods arriving there.
- Trade: every unit of goods a route delivers earns 0.5 coin on arrival (eng.).
- War earns coin from slice 2.

## Routes (P2)
- A route carries one good (food or stone) from one of your cities to another; setting it up, changing it or
  cancelling it costs one move (P3). It runs every turn until you change it (K4).
- Each turn it ships everything the sending city holds above a reserve: for food, what the city eats in 3 turns;
  for stone, 10 (eng.). Routes from the same city carrying the same good share the surplus equally.
- Goods take 1 turn per 3 tiles of distance between the cities (counted in hexes, ignoring terrain), rounded up
  (P9). The route is drawn as a line with the amount on it.

## Settlers
- A city builds a settler (see the table). Sending it to a tile costs one move; it
  walks 2 tiles per turn around mountains and water, keeping its orders until it arrives (K4).
- Founding a city costs one move, on land at least 3 tiles from every other city, outside other cities'
  borders (eng.). The new city starts at size 1 with empty stores.

## A turn
When you end the turn, in this order, city by city in founding order: working sites send their output; routes
ship; goods arriving this turn land (and earn trade coin); people eat, then the city grows or shrinks; production
advances the build; coin is paid; settlers walk; attention counts down; this turn's moves are added.

## The screen
- The map: drag to scroll, wheel to zoom, click a tile or city to inspect it (free). Cities, sites and buildings
  are simple shapes (D3); borders are a coloured outline; routes are lines with their amounts.
- A top bar: turn, coin, moves (available / per turn / saved), End Turn.
- A city panel: size, food (store, eaten, needed to grow), stone, goods on the way, production and the current
  build with its progress, buildings, sites (working or idle), routes, the attention left. Orders are buttons
  that show their cost.
- "Waiting for you": cities with nothing to build, idle sites, settlers without orders,
  cities whose food store is falling.
- A turn log: what happened this turn (a city grew, a build finished, a site stood idle, a city starved).
- Hover over any number to see what it is made of.
- Playing freely: there is no end and no score (P12).

## Left out of slice 1
The rival, armies and battles, hidden parts of the map, ships and sea, the web, the category scores, stability
and sanitation, saving, sound and art.
