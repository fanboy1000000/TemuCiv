# Prototype slices 1 and 2: the rules

The rules the throwaway prototype follows (WORKFLOW, "Prototype phase"). Written by the Orchestrator from the
owner's rulings: the slice 1 placeholders P1 to P12 and the earlier rulings (Sprint 1 to 3 logs), and the slice 2
answers A1 to A5 (Sprint 4 log), all under "Owner design rulings". The builder may not change this file, and
reports any rule that can't work as written. Each rule ends with its source; "(eng.)" marks engineering's own
proposal, which the owner may flag, and a rule with two parts may carry two marks. The owner's marks: K1 to K6 (the
moves budget), C2 (the economy), D1 to D3 and P1 to P12 (the first playable and slice 1's placeholders), all in the
Sprint 2 log; A1 to A5 and R1 in the Sprint 4 log; "S1" with an entry name points to the Sprint 1 log's rulings:
"S1 logistics" (logistics is a major feature), "S1 combat" (the owner's combat concept, still to be matured) and
"S1 map" (map and borders). A number is the owner's when its rule's mark says so, for example one move per order
(P3) or one person per regiment (A4); four more were shown to the owner as examples and kept: 4 moves per turn and
a cap of about 8 (P4), a Hall's one move (P10), and attention's quarter more for five turns (P5). Every other
number is a starting value engineering proposed, kept in `numbers.js` where the owner can change it and reload.

## The map
- A hex grid, 24 × 18 tiles, one landmass surrounded by water, made from a seed number: the same seed always
  gives the same map (eng.). The seed shows on screen; a new game can be started with any seed (eng.).
- Five terrains, shown by colour alone (D3): grassland (light green), forest (dark green), hills (tan),
  mountains (grey), water (blue). Mountains and water can't be entered (eng.).
- The whole map is visible (eng.).

## The start
- You start with one city of size 2 on grassland, 30 coin, 10 food and 10 stone in its store, one settler next
  to it, and one general in the city (eng.).
- The rival starts with its cities placed as "The rival" says (A1; the placing is eng.).

## Moves
- You get 4 moves each turn (P4). Unused moves carry over with no limit (P11). The top bar shows the moves
  available, the moves per turn and how many of them were saved from earlier turns (eng.).
- Every order costs one move (P3). Army orders and empire orders draw on the same moves (K5). The orders: give a
  city something to build (a building, a site on a chosen tile, a settler, a general or a regiment); send a
  settler to a tile; found a city with a settler; set up, change or cancel a route; send a general to a tile; a
  general takes or leaves regiments; set, change or cancel a general's supply. Looking at anything is free (P3).
  An order you can't afford is shown disabled, with the reason (eng.).
- Undo takes back the most recent order given this turn, and can be repeated back to the start of the turn: the
  order's move, coin, stone and food come back, so correcting a misclick costs nothing (eng.). Changing an order
  from an earlier turn is a new order, one move (P3).
- Anything you leave alone keeps following its last orders (K4).
- Attention: any order given in a city gives that city attention for 5 turns: its sites produce a quarter more
  (P5). Orders given in a city are: a build; founding it; setting up, changing or cancelling a route that starts
  there; setting, changing or cancelling a supply line that it feeds (for a change, the city named; for a cancel,
  the city that was feeding); a general taking or leaving regiments there (the list is eng.). A new order
  restarts the 5 turns (eng.). Sending a settler or a general is an order to a unit, not to a city, and gives no
  attention (eng.).
- The Hall adds one move per turn (P10). Each further Hall costs half as much again as the one before, counting
  Halls finished or being built, so ordering several at once doesn't get the first price; one per city (eng.).
  Moves per turn never exceed 8: P4 asks for a slow rise to a cap of about 8; the price growth is eng.

## Cities, food and growth
- A city's own tile makes 2 food per turn with nobody working it (eng.).
- Each person eats 2 food per turn from the city's store (eng.).
- A city grows by one person when its food store reaches 10 + 5 × its size; that much food is used up (eng.).
  Food is the only limit on growth (P7). The Granary lowers the amount by a quarter (P10 names it; the effect is
  eng.).
- If the store can't feed everyone, the city loses one person (never below 1) and the store drops to 0 (eng.).

## Production and building
- A city's production is 2 + 1 per person (eng.). The Workshop raises it by half (P10 names it; the effect is
  eng.). Production only sets build speed (owner, 2026-10-15).
- A city builds one thing at a time (eng.). Giving it something to build costs one move (P3); the coin (from your
  purse) and stone (from that city's store) are paid when you order it (eng.). Changing the order refunds the
  coin, stone and food paid and loses the progress (eng.).
- When a build finishes and you haven't ordered another, the city waits: its production is unused (P6, owner
  2026-10-15) and it is listed under "Waiting for you" (eng.).

| What | Coin | Stone | Production | Other | Effect |
|---|---|---|---|---|---|
| Farm (site) | 10 | 0 | 15 | grassland only; needs 1 person | 4 food per turn |
| Quarry (site) | 10 | 0 | 20 | hills only; needs 2 people | 2 stone per turn |
| Settler | 0 | 0 | 20 | 15 food when ordered; 1 person when finished (the build waits while the city is size 1) | founds a city |
| General | 30 | 0 | 20 | no person; no limit (A3) | leads regiments; only a general moves them (A2) |
| Regiment | 15 | 5 | 20 | 1 person when finished (A4); the build waits while the city is size 1 | a soldier who eats like a person |
| Hall | 40 | 20 | 40 | one per city; coin and stone × 1.5 for each Hall finished or being built | +1 move per turn (P10) |
| Granary | 20 | 10 | 25 | one per city | growth needs a quarter less food |
| Market | 25 | 10 | 30 | one per city | coin from people and arriving trade +50% |
| Workshop | 20 | 15 | 30 | one per city | production +50% |

Every cost in the table and the Hall's price growth are eng. The four buildings are named by P10; farms and
quarries are sites (P1); settlers appear in the map and borders ruling (Sprint 1 log), and their rules are eng.;
the general and the regiment are A2 to A4, as marked; everything else in the table not marked is eng.

## Sites
- A site is ordered on a tile inside the city's borders or next to them, of the right terrain, with no site or
  city on it, and not inside another city's borders, yours or the rival's (P8; the exact tiles are eng.).
- When a site is finished, its tile and the tiles around it join the city's borders, except tiles another city
  already holds (P8). Sites are the only way borders grow (eng.).
- A site is worked by the city's people (P1). The city fills its sites on its own: farms first, then quarries,
  nearest first (eng.). A site without enough people stands idle and is listed under "Waiting for you" (eng.).
- A working site's output travels to its city on its own (P2): it arrives after 1 turn per 3 tiles of distance
  (counted in hexes from the site to the city), rounded up, at least 1 turn (eng.). Nothing is lost on the way
  (P9).
- People not working at a site still eat, pay coin and add to production (eng.).

## Borders
- A new city holds its own tile and the six around it, except tiles another city already holds (P8, assumed in
  the placeholder question).

## Coin
- One purse for the whole empire (C2). Each turn every person pays 1 coin (P6; the amount is eng.). The Market (P10
  names it; the effect is eng.) adds half to that city's people coin and to the trade coin of goods arriving there.
- Trade: every unit of goods a route delivers earns 0.5 coin on arrival (P6; the amount is eng.).
- War earns coin (P6): taking a rival city plunders 10 coin per person in it (eng.).

## Routes
- A route carries one good (food or stone) from one of your cities to another (P2); setting it up, changing it or
  cancelling it costs one move (P3). It runs every turn until you change it (K4).
- Each turn it ships everything the sending city holds above a reserve: for food, what the city eats in 3 turns;
  for stone, 10 (eng.). Routes from the same city carrying the same good share the surplus equally (eng.).
- Goods take 1 turn per 3 tiles of distance between the cities (counted in hexes, ignoring terrain), rounded up
  (P9; the rate is eng.). The route is drawn as a line with the amount on it (eng.).

## Settlers
- A city builds a settler (see the table). Sending it to a tile costs one move (P3); it walks 2 tiles per turn
  around mountains and water (eng.), keeping its orders until it arrives (K4).
- Founding a city costs one move (P3), on land at least 3 tiles from every other city, yours or the rival's, and
  outside other cities' borders (eng.). The new city starts at size 1 with empty stores (eng.).

## Generals and regiments
- A finished general or regiment stands in the city that built it (eng.). A regiment takes one person from the
  city when it is finished (A4).
- Regiments without a general can't move (A2): they stay in a city as its garrison (eng.). A garrison eats with
  its city, 2 food per regiment from the city's store, before the people; if the store can't feed everyone, the
  city loses a person as above, or, when the city is already size 1, the garrison loses a regiment instead (eng.).
- A general and the regiments with it are an army, one marker on one tile (eng.; S1 combat puts units on the
  general's tile or the tiles around it, which waits for the battle map).
- A general takes regiments standing in the city it is in, as many as you choose: one move (P3; the order is
  eng.).
- A general leaves regiments, as many as you choose, in one of your cities it stands in: one move (P3; the order
  is eng.). Regiments are never left outside a city (eng.).
- Sending a general to a tile moves it with all its regiments (A2): one move for the whole army (P3; one order
  for the whole army is eng.). It marches 2 tiles per turn around mountains and water, and never onto a rival
  city's tile (eng.); it keeps its orders until it arrives (K4).
- A general eats nothing (eng.).

## Feeding armies: baggage and supply
- Armies need food and supply lines (S1 logistics). Each regiment with a general eats 2 food per turn from the
  army's baggage (eng.). An army never feeds off the land (eng.).
- An army brings baggage (A2). Its limit is 3 turns of the army's eating (eng.). An army standing in one of your
  cities fills its baggage up to the limit at the end of the turn, before it marches, from the city's store,
  taking only what is above what the city eats in one turn, at no move (eng.). Regiments left in a city leave the
  food above the smaller army's limit in that city's store (eng.). Otherwise food already in the baggage is kept
  until eaten, even above the limit, for example after a battle loss or when supply lands after the army shrank:
  nothing carried is thrown away (eng.).
- Supply is set on a general (A2): an order, one move (P3), naming one of your cities to feed it (eng.). Each turn,
  when routes ship, that city sends what keeps the baggage at its limit when this food lands: the limit, plus what
  the army eats while this food travels (1 turn's eating per turn of travel), minus the baggage and the food
  already on its way, never less than nothing; it comes out of the city's store above what the city eats in one
  turn (eng.). So a supply line of any length keeps a fed army fed, and distance costs only time (P9): a longer
  line only means more food on the way and a longer wait for the first delivery. An army is fed before its city
  grows: the routes' 3-turn reserve would leave nothing to send once a city reaches size 6 or so, because the city
  grows and spends its store first (eng., found while building slice 2). Supply lines are served before routes,
  in the order they were set up; routes share what is left (eng.).
- Supply food takes 1 turn per 3 tiles of the distance from the city to where the general stands when it is sent
  (P9; the rate is eng.), and lands in the baggage wherever the general is then: the supply line follows the
  general (S1 combat). Nothing is lost on the way (P9). Food on its way to a general who is gone is lost (eng.).
- Supply runs every turn until you change or cancel it (K4); each is one move (P3). It earns no trade coin (eng.).
- An army whose baggage can't feed it this turn eats what there is and loses one regiment, a person lost (eng.).

## The rival
- One rival with a few cities far away (A1), always at war with you (S1 map: every player is at war with every
  other from the moment they meet). It has 3 cities, placed on the land farthest from your first city, at least 3
  tiles from each other, each of size 3 with a new city's borders (eng.).
- The rival's cities defend themselves but never move (A1). They never build or grow (eng.).
- Each rival city has a garrison of 3 regiments, which gains one every 5 turns, up to 8 (eng.).

## Battles
- At the end of a turn, each of your armies standing next to a rival city fights it (S1 combat: hostile armies
  that are adjacent fight); battles are settled automatically (A1); defending costs the rival nothing (K6). Armies fight one at a time, the oldest first; an army
  next to two rival cities fights the one with the smaller garrison (eng.).
- One battle decides it, in that turn, with luck from the game's seeded random numbers (A5).
- The chance you win is A² ÷ (A² + D²), where A is the army's regiments and D is the garrison × 1.5 for the
  city's walls (eng.). An army with no regiments always loses (eng.).
- The loser loses every regiment; your army that loses is gone, general too (eng.). The winner loses half the
  loser's regiments, rounded down, and always keeps at least one (eng.).
- When you win, the city becomes yours (A1: marching far wins a captured city and coin from war; P6: war earns
  coin) with its people and borders and empty stores, your army stands in it, and you plunder 10 coin per person
  (eng.). A captured city is a city like any other: it can build, feed
  supply lines and fill baggage (eng.).
- The screen shows the win chance before you march: inspecting a general shows the chance against each rival city
  next to its destination or its tile (eng.).

## A turn
When you end the turn, in this order (eng.), city by city in founding order and army by army, oldest first:
1. Working sites send their output.
2. Supply lines ship, then routes ship.
3. Goods arriving this turn land, in a city (earning trade coin for route deliveries) or in a general's baggage.
4. Garrisons and people eat, then each city grows or shrinks.
5. Production advances each build.
6. Coin is paid.
7. Armies in your cities fill their baggage; then settlers walk and armies march.
8. Armies eat; a hungry army loses a regiment.
9. Battles; captured cities change hands.
10. Rival garrisons grow.
11. Attention counts down; this turn's moves are added.

## The screen
- The map: drag to scroll, wheel to zoom, click a tile, city or army to inspect it, free (P3). Cities, sites and
  buildings are simple shapes (D3); borders are a coloured outline; routes are lines with their amounts (eng.).
- An army is a marker with its regiment count; a city shows its garrison; rival cities and borders have their own
  colour and show their garrison. A supply line is a dashed line from its city to the general, with the amount
  on it (eng.).
- A top bar: turn, coin, moves (available / per turn / saved), End Turn (eng.).
- A city panel: size, garrison, food (store, eaten, needed to grow), stone, goods on the way, production and the
  current build with its progress, buildings, sites (working or idle), routes, supply lines it feeds, the
  attention left. Orders are buttons that show their cost (eng.).
- A general's panel: regiments, baggage (food and turns left), its supply city and the food on its way,
  destination, and the win chance next to a rival city. Orders are buttons that show their cost (eng.).
- "Waiting for you": cities with nothing to build, idle sites, settlers without orders, cities whose food store
  is falling, generals without orders outside your cities, and armies that will go hungry within the next 2 turns,
  counting only the food that lands in time (eng.).
- A turn log: what happened this turn (a city grew, a build finished, a site stood idle, a city starved, a battle
  and its result, a city taken, an army went hungry) (eng.).
- Hover over an underlined number to see what it is made of (eng.).
- Playing freely: there is no end and no score (P12).

## Left out
Left out of the prototype so far: a rival that moves or attacks (A1); a rival that builds or grows (eng.); the
battle map and initiative (A1: battles are settled automatically); the web and the category scores, which wait for
slice 3 (D2); hidden parts of the map, ships and sea, stability and sanitation, saving, sound and art (eng.).
