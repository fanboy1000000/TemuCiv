// TemuCiv prototype, slices 1 to 3: the game rules (prototype/RULES.md).
//
// No DOM, canvas or clock in this file, so the page (ui.js) and the smoke check (smoke.js) both run it.
// Every balance number comes from NUMBERS (numbers.js). Throwaway code: nothing outside prototype/ uses it
// (docs/WORKFLOW.md, "Prototype phase").
//
// The game is { state, undo }. `state` is plain data. Every order checks itself first (check* returns
// { ok, reason, cost }), then saves a copy of the state for undo, spends its move and applies itself.
// The battle dice are part of the state (state.dice), so undo and a replay of the same orders stay exact.

var Game = (function () {
  'use strict';

  var N = NUMBERS;
  var GOODS = ['food', 'stone'];
  var STAFF_ORDER = ['farm', 'quarry']; // RULES, Sites: the city fills farms first, then quarries
  var CITY_NAMES = ['Ashford', 'Brightwater', 'Cobblemere', 'Dunholm', 'Elmstead', 'Fairhaven', 'Greystone',
    'Hollowmere', 'Ivydale', 'Juniper', 'Kestrel', 'Larkspur', 'Millbrook', 'Northwick', 'Oakridge',
    'Pebblecombe', 'Quillon', 'Redcliff', 'Stonehaven', 'Thornbury', 'Underhill', 'Valewood', 'Westmarch',
    'Yarrow'];
  var RIVAL_NAMES = ['Vorhast', 'Karnmoor', 'Ostrava', 'Drakwall', 'Zelgrad', 'Morvane'];
  var DICE_SALT = 0x9e3779b9; // mixed into the seed so the battle dice don't repeat the map's random numbers

  // ---- Small helpers ----

  /** A number for people to read: at most one decimal, no trailing ".0". */
  function fmt(n) {
    return String(+Number(n).toFixed(1));
  }

  function no(reason, extra) {
    var r = { ok: false, reason: reason };
    for (var k in extra) r[k] = extra[k];
    return r;
  }

  /** Seeded random numbers (mulberry32): one step turns the counter `a` into a number from 0 up to 1. */
  function mix(a) {
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  var STEP = 0x6d2b79f5;

  /** The same seed always gives the same sequence, so the same map. */
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + STEP) | 0;
      return mix(a);
    };
  }

  /** The battle dice: the next number from the generator kept in the state (RULES, Battles, A5). */
  function rollDice(s) {
    s.dice = (s.dice + STEP) | 0;
    return mix(s.dice);
  }

  // ---- The hex grid ----
  // Tiles sit in rows; every odd row is shifted half a tile to the right ("odd-r" layout). A tile is its index
  // row * width + column. Neighbours come in the order E, SE, SW, W, NW, NE (the page draws borders edge by edge).
  var DIRS_EVEN = [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]];
  var DIRS_ODD = [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]];

  function col(s, i) { return i % s.w; }
  function row(s, i) { return Math.floor(i / s.w); }

  /** The neighbour of tile i in direction d (0..5), or -1 off the map. */
  function neighbor(s, i, d) {
    var c = col(s, i), r = row(s, i);
    var off = (r % 2 ? DIRS_ODD : DIRS_EVEN)[d];
    var nc = c + off[0], nr = r + off[1];
    if (nc < 0 || nr < 0 || nc >= s.w || nr >= s.h) return -1;
    return nr * s.w + nc;
  }

  function neighbors(s, i) {
    var out = [];
    for (var d = 0; d < DIRS_EVEN.length; d++) {
      var n = neighbor(s, i, d);
      if (n >= 0) out.push(n);
    }
    return out;
  }

  /** Distance in hexes between two tiles, ignoring terrain. */
  function dist(s, a, b) {
    var ar = row(s, a), br = row(s, b);
    var aq = col(s, a) - (ar - (ar % 2)) / 2, bq = col(s, b) - (br - (br % 2)) / 2;
    var dq = aq - bq, dr = ar - br;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }

  function tilesWithin(s, centre, radius) {
    var out = [];
    for (var i = 0; i < s.terrain.length; i++) if (dist(s, centre, i) <= radius) out.push(i);
    return out;
  }

  /** Mountains and water can't be entered (RULES, The map). */
  function passable(s, i) {
    return i >= 0 && s.terrain[i] !== 'water' && s.terrain[i] !== 'mountains';
  }

  /** Can a walker step on tile i? `blocked` (optional, { tile: true }) adds tiles it must keep off. */
  function canStep(s, i, blocked) {
    return passable(s, i) && !(blocked && blocked[i]);
  }

  /** The shortest walk from `from` to `to` over land, as a list of tiles (without `from`), or null. */
  function findPath(s, from, to, blocked) {
    if (from === to) return [];
    if (!canStep(s, to, blocked)) return null;
    var prev = {};
    prev[from] = from;
    var queue = [from];
    for (var head = 0; head < queue.length && prev[to] === undefined; head++) {
      neighbors(s, queue[head]).forEach(function (n) {
        if (prev[n] === undefined && canStep(s, n, blocked)) {
          prev[n] = queue[head];
          queue.push(n);
        }
      });
    }
    if (prev[to] === undefined) return null;
    var path = [];
    for (var t = to; t !== from; t = prev[t]) path.unshift(t);
    return path;
  }

  /** Every land tile a walker on `from` can reach (an army passes `blocked`: the rival's city tiles). */
  function reachable(s, from, blocked) {
    var seen = {};
    seen[from] = true;
    var queue = [from];
    for (var head = 0; head < queue.length; head++) {
      neighbors(s, queue[head]).forEach(function (n) {
        if (!seen[n] && canStep(s, n, blocked)) {
          seen[n] = true;
          queue.push(n);
        }
      });
    }
    return queue.slice(1);
  }

  // ---- Making the map (RULES, The map: one landmass surrounded by water, from a seed) ----

  function makeMap(s, rng) {
    var m = N.map, size = s.w * s.h;
    s.terrain = [];
    for (var i = 0; i < size; i++) s.terrain.push('water');
    function inner(t) {
      var c = col(s, t), r = row(s, t);
      return c >= m.waterEdge && r >= m.waterEdge && c < s.w - m.waterEdge && r < s.h - m.waterEdge;
    }
    function pick(list) { return list[Math.floor(rng() * list.length)]; }

    // Grow one island from the centre, a tile at a time, so it is always one connected landmass.
    var centre = Math.floor(s.h / 2) * s.w + Math.floor(s.w / 2);
    var land = [centre];
    s.terrain[centre] = 'grassland';
    var target = Math.round(size * m.landShare);
    for (var tries = 0; land.length < target && tries < target * size; tries++) {
      var n = neighbor(s, pick(land), Math.floor(rng() * DIRS_EVEN.length));
      if (n >= 0 && inner(n) && s.terrain[n] === 'water') {
        s.terrain[n] = 'grassland';
        land.push(n);
      }
    }

    // Patches of forest, hills and mountains on the grassland.
    function patches(kind, count, most) {
      for (var p = 0; p < count; p++) {
        var first = pick(land);
        if (s.terrain[first] !== 'grassland') continue;
        s.terrain[first] = kind;
        var cells = [first];
        for (var t = 0; cells.length < most && t < most * s.w; t++) {
          var nb = neighbor(s, pick(cells), Math.floor(rng() * DIRS_EVEN.length));
          if (nb >= 0 && s.terrain[nb] === 'grassland') {
            s.terrain[nb] = kind;
            cells.push(nb);
          }
        }
      }
    }
    patches('forest', m.forestPatches, m.forestSize);
    patches('hills', m.hillPatches, m.hillSize);
    patches('mountains', m.mountainPatches, m.mountainSize);
  }

  /** The first city's tile: grassland among land, with hills it could put a quarry on, nearest the centre. */
  function chooseStart(s) {
    var centre = Math.floor(s.h / 2) * s.w + Math.floor(s.w / 2);
    var best = -1, bestScore = Infinity;
    for (var i = 0; i < s.terrain.length; i++) {
      if (s.terrain[i] !== 'grassland') continue;
      var nbs = neighbors(s, i);
      var open = nbs.length === DIRS_EVEN.length && nbs.every(function (n) { return passable(s, n); });
      var hills = tilesWithin(s, i, N.cityRadius + 1).some(function (t) { return s.terrain[t] === 'hills'; });
      // Tiles with everything wanted come first; among them, the one nearest the centre.
      var score = dist(s, i, centre) + (open ? 0 : s.terrain.length) + (hills ? 0 : s.terrain.length);
      if (score < bestScore) {
        best = i;
        bestScore = score;
      }
    }
    return best;
  }

  // ---- Lookups ----

  function cityById(s, id) { return s.cities.find(function (c) { return c.id === id; }) || null; }
  function cityAt(s, tile) { return s.cities.find(function (c) { return c.tile === tile; }) || null; }
  function siteAt(s, tile) { return s.sites.find(function (x) { return x.tile === tile; }) || null; }
  function settlerById(s, id) { return s.settlers.find(function (x) { return x.id === id; }) || null; }
  function settlersAt(s, tile) { return s.settlers.filter(function (x) { return x.tile === tile; }); }
  function routeById(s, id) { return s.routes.find(function (r) { return r.id === id; }) || null; }
  function generalById(s, id) { return s.generals.find(function (g) { return g.id === id; }) || null; }
  function generalsAt(s, tile) { return s.generals.filter(function (g) { return g.tile === tile; }); }
  function rivalById(s, id) { return s.rivals.find(function (r) { return r.id === id; }) || null; }
  function rivalAt(s, tile) { return s.rivals.find(function (r) { return r.tile === tile; }) || null; }
  function has(city, kind) { return city.buildings.indexOf(kind) >= 0; }

  /** The name of the city holding a tile, yours or the rival's. */
  function holderName(s, id) {
    var c = cityById(s, id) || rivalById(s, id);
    return c ? c.name : '';
  }

  /** The rival's city tiles, which armies never step onto (RULES, Generals and regiments). */
  function armyBlocked(s) {
    var out = {};
    s.rivals.forEach(function (r) { out[r.tile] = true; });
    return out;
  }

  /** The rival cities next to a tile. */
  function rivalsNext(s, tile) {
    return s.rivals.filter(function (r) { return dist(s, tile, r.tile) === 1; });
  }

  /** The rival city an army on this tile fights: the one next to it with the smaller garrison (RULES, Battles). */
  function foeAt(s, tile) {
    var best = null;
    rivalsNext(s, tile).forEach(function (r) { if (!best || r.garrison < best.garrison) best = r; });
    return best;
  }

  /** The city building a site on this tile, if any. */
  function siteBuilderAt(s, tile) {
    return s.cities.find(function (c) { return c.build && N.builds[c.build.kind].site && c.build.tile === tile; }) || null;
  }

  function where(s, tile) { return '(' + col(s, tile) + ', ' + row(s, tile) + ')'; }

  // ---- The web (RULES, The web) ----
  // Every node, from numbers.js: its id ("branch-tier": "0-1" is the first branch's second node), its branch (its
  // place in N.web.branches), its tier (0 = the inner node) and its entry in numbers.js. You own the centre from the
  // start. The links: the centre to each inner node, each node to the next one out, and each outer node to the outer
  // nodes of the branches next to its own around the centre. The state keeps the nodes bought (s.web.owned) and
  // each branch's experience (s.web.xp, in branch order).
  var CENTRE = 'centre';
  var NODES = [], LINKS = [];
  N.web.branches.forEach(function (branch, i) {
    branch.nodes.forEach(function (spec, k) {
      NODES.push({ id: i + '-' + k, branch: i, tier: k, spec: spec });
      LINKS.push([k ? i + '-' + (k - 1) : CENTRE, i + '-' + k]);
    });
  });
  N.web.branches.forEach(function (branch, i) {
    var next = (i + 1) % N.web.branches.length;
    if (next !== i) LINKS.push([outerNode(i), outerNode(next)]);
  });

  function outerNode(i) { return i + '-' + (N.web.branches[i].nodes.length - 1); }
  function nodeById(id) { return NODES.find(function (n) { return n.id === id; }) || null; }
  function owns(s, id) { return id === CENTRE || s.web.owned.indexOf(id) >= 0; }

  function linksOf(id) {
    var out = [];
    LINKS.forEach(function (l) {
      if (l[0] === id) out.push(l[1]);
      else if (l[1] === id) out.push(l[0]);
    });
    return out;
  }

  /** The node a city needs you to own before it can build this kind, or null when every city can build it (W2). */
  function nodeFor(kind) { return NODES.find(function (n) { return n.spec.building === kind; }) || null; }

  /**
   * The numbers the web's bonuses change, as the nodes you own leave them: each is the usual number from numbers.js
   * unless a node you own sets it. They come from the state alone, never from changing NUMBERS, so undo, the
   * look-ahead and a new game stay exact. `by` names the node behind each changed number.
   */
  function rates(s) {
    var r = { farmMakes: N.builds.farm.amount, quarryMakes: N.builds.quarry.amount, settlerFood: N.builds.settler.food,
      baggageTurns: N.baggageTurns, tilesPerTravelTurn: N.tilesPerTravelTurn, stoneShare: 1, stoneFor: [],
      tradeCoinPerUnit: N.tradeCoinPerUnit, coinPerPerson: N.coinPerPerson,
      regimentProduction: N.builds.regiment.production, awayEating: 1, armySteps: N.armySteps, walls: N.walls, by: {} };
    s.web.owned.forEach(function (id) {
      var spec = nodeById(id).spec;
      for (var k in r) {
        if (spec[k] !== undefined) {
          r[k] = spec[k];
          r.by[k] = spec.name;
        }
      }
    });
    return r;
  }

  /** Experience for an activity, to each branch that earns from it, at that branch's rate. */
  function earn(s, activity, amount) {
    N.web.branches.forEach(function (branch, i) {
      var rate = branch.earns[activity];
      if (rate) s.web.xp[i] += amount * rate;
    });
  }

  /** What buying a node costs now: its price, paid from its branch's experience first, then coin for each point short. */
  function nodePrice(s, node) {
    var price = N.web.prices[node.tier], xp = Math.min(price, s.web.xp[node.branch]);
    return { price: price, xp: xp, coin: (price - xp) * N.web.coinPerPoint };
  }

  // ---- Numbers derived from the rules (the page shows them, with what they are made of) ----

  function hallsBuilt(s) {
    return s.cities.filter(function (c) { return has(c, 'hall'); }).length;
  }

  /** Halls built plus Halls being built in other cities: the "Halls you already have" a new Hall is priced on. */
  function hallsCounted(s, city) {
    return hallsBuilt(s) + s.cities.filter(function (c) {
      return c !== city && c.build && c.build.kind === 'hall';
    }).length;
  }

  /** Moves added each turn: the base plus one per Hall, never above the cap (RULES, Moves). */
  function movesPerTurn(s) {
    return Math.min(N.movesCap, N.movesPerTurn + hallsBuilt(s) * N.builds.hall.moves);
  }

  /** Moves saved from earlier turns that are still available (this turn's moves are spent first). */
  function movesSaved(s) {
    return Math.min(s.movesSaved, s.moves);
  }

  function production(s, city) {
    var base = N.productionBase + N.productionPerPerson * city.size;
    var bonus = has(city, 'workshop') ? base * N.builds.workshop.productionBonus : 0;
    return { base: N.productionBase, people: N.productionPerPerson * city.size, workshop: bonus, total: base + bonus };
  }

  /** What a city eats each turn: its garrison and its people, from one store (RULES, Generals and regiments). */
  function eats(city) { return city.garrison * N.foodPerRegiment + city.size * N.foodPerPerson; }

  // An army's food (RULES, Feeding armies): its regiments eat from the baggage; the general eats nothing. armyEats is
  // its full eating, which the baggage limit and supply count; armyEatsNow is what it eats at the end of a turn
  // standing where it is: less when it is not standing in one of your cities and a node you own says so (Foraging).
  function armyEats(g) { return g.regiments * N.foodPerRegiment; }
  function armyEatsNow(s, g) { return armyEats(g) * (cityAt(s, g.tile) ? 1 : rates(s).awayEating); }
  function baggageCap(s, g) { return armyEats(g) * rates(s).baggageTurns; }

  /** Whole turns the baggage feeds the army where it stands, not counting food on its way. */
  function turnsOfFood(s, g) {
    var eat = armyEatsNow(s, g);
    return eat ? Math.floor(g.baggage / eat) : Infinity;
  }

  /** Supply food already on its way to this general. */
  function foodOnWay(s, generalId) {
    var sum = 0;
    s.transit.forEach(function (g) { if (g.general === generalId) sum += g.amount; });
    return sum;
  }

  /**
   * What the supply lines ship when the turn ends (RULES, Feeding armies: step 2): in the order they were set, each
   * city sends what keeps the baggage at its limit when this food lands: the limit, plus the army's eating for each
   * turn of travel, minus the baggage and the food already on its way, never below 0; out of the city's food above
   * what it eats in one turn. While the general stands in the city that feeds it, the line sends nothing: the baggage
   * fills there at step 4 (`inCity`). The turn uses this list, so what the page shows is what ships.
   */
  function supplyPlan(s) {
    var left = {};
    return s.generals.filter(function (g) { return g.supply !== null; })
      .sort(function (a, b) { return a.supplySince - b.supplySince; })
      .map(function (g) {
        var city = cityById(s, g.supply), onWay = foodOnWay(s, g.id), travel = travelTurns(s, city.tile, g.tile);
        if (left[city.id] === undefined) left[city.id] = Math.max(0, city.food - armyReserve(city));
        var need = Math.max(0, baggageCap(s, g) + armyEats(g) * travel - g.baggage - onWay), spare = left[city.id];
        var inCity = g.tile === city.tile, amount = inCity ? 0 : Math.min(need, spare);
        left[city.id] -= amount;
        return { general: g, city: city, need: need, onWay: onWay, spare: spare, amount: amount, travel: travel,
          inCity: inCity };
      });
  }

  /**
   * The next N.lowFoodTurns ends of turn, played on a copy of the state as if no more orders are given and every
   * battle that can be won is won, for the screen: { hunger, filled }.
   * `hunger`: the armies that go hungry ("Waiting for you"), as { generalId: { at: 0 for this turn's end, 1 for the
   * next, ..., ifWins: true when the army fought a battle in the look-ahead before it went hungry } }.
   * `filled`: the food each city gives the baggage of the armies standing in it at this turn's end, { cityId: food },
   * for the city's food forecast.
   * The copy is made as undo makes it; every battle an army with regiments fights is won without rolling the dice (an
   * army with no regiments loses, as always), so the warning follows the same rules as the turn itself but never
   * reveals how a battle will go. The real state, its dice and the undo list are not touched. It costs a couple of
   * ends of turn: call it once per redraw.
   */
  function lookAhead(s) {
    var copy = { state: JSON.parse(JSON.stringify(s)), undo: [] }, hunger = {}, fought = {}, filled = {};
    for (var k = 0; k < N.lowFoodTurns; k++) {
      var res = endTurn(copy, { winEveryBattle: true });
      if (k === 0) filled = res.filled;
      // The notes come in turn order: an army's hunger (step 8) comes before its battle (step 9) in the same turn.
      res.log.forEach(function (e) {
        if (e.kind === 'battle') fought[e.general] = true;
        if (e.kind === 'hunger' && hunger[e.general] === undefined) hunger[e.general] = { at: k, ifWins: !!fought[e.general] };
      });
    }
    return { hunger: hunger, filled: filled };
  }

  /** Supply food a city sends when the turn ends, before its routes ship. */
  function suppliedFrom(s, cityId) {
    var sum = 0;
    supplyPlan(s).forEach(function (p) { if (p.city.id === cityId) sum += p.amount; });
    return sum;
  }

  /**
   * The chance an army of `a` regiments beats a garrison (RULES, Battles): A^2 / (A^2 + D^2), D = garrison x walls
   * (Siege craft lowers the walls). The battle rolls against this same number.
   */
  function winChance(s, a, garrison) {
    if (a <= 0) return 0;
    var A = Math.pow(a, N.battlePower), D = Math.pow(garrison * rates(s).walls, N.battlePower);
    return A / (A + D);
  }

  /** What the winner of a battle has left: it loses half the loser's regiments, rounded down, keeping at least one. */
  function winnerLeft(winner, loser) {
    return Math.max(Math.min(N.winnerKeeps, winner), winner - Math.floor(loser * N.winnerLoss));
  }

  function growthNeed(city) {
    var need = N.growthBase + N.growthPerSize * city.size;
    return has(city, 'granary') ? need * (1 - N.builds.granary.growthDiscount) : need;
  }

  /** Which of the city's sites are worked: farms first, then quarries, nearest first (RULES, Sites). */
  function staffing(s, city) {
    var mine = s.sites.filter(function (x) { return x.city === city.id; });
    mine.sort(function (a, b) {
      return STAFF_ORDER.indexOf(a.type) - STAFF_ORDER.indexOf(b.type) ||
        dist(s, a.tile, city.tile) - dist(s, b.tile, city.tile) || a.tile - b.tile;
    });
    var free = city.size;
    var list = mine.map(function (site) {
      var need = N.builds[site.type].people;
      var working = free >= need;
      if (working) free -= need;
      return { site: site, working: working, need: need };
    });
    return { list: list, free: free };
  }

  /** What a worked farm or quarry makes each turn before attention (Rich soil and Deep quarries raise it). */
  function siteAmount(s, type) {
    var r = rates(s);
    return type === 'farm' ? r.farmMakes : r.quarryMakes;
  }

  /** What a working site makes each turn, with the attention bonus. */
  function siteOutput(s, city, site) {
    return siteAmount(s, site.type) * (city.attention > 0 ? 1 + N.attentionBonus : 1);
  }

  /** Turns goods take over a distance: 1 per 3 tiles (4 with Roads), rounded up, at least 1 (RULES, Sites and Routes). */
  function travelTurns(s, a, b) {
    return Math.max(N.minTravelTurns, Math.ceil(dist(s, a, b) / rates(s).tilesPerTravelTurn));
  }

  /** What a route leaves in the sending city: for food the city's eating for 3 turns, for stone 10. */
  function reserve(city, good) {
    return good === 'food' ? eats(city) * N.foodReserveTurns : N.stoneReserve;
  }

  /** What supply lines and baggage leave in a city: what it eats in one turn (RULES, Feeding armies). */
  function armyReserve(city) {
    return eats(city) * N.armyReserveTurns;
  }

  function marketFactor(city) {
    return has(city, 'market') ? 1 + N.builds.market.coinBonus : 1;
  }

  /** What a route would ship if the turn ended now: its equal share of what the sender's supply lines leave. */
  function routeShare(s, route) {
    var from = cityById(s, route.from);
    var mates = s.routes.filter(function (r) { return r.from === route.from && r.good === route.good; });
    var supplied = route.good === 'food' ? suppliedFrom(s, from.id) : 0;
    var surplus = Math.max(0, from[route.good] - reserve(from, route.good) - supplied);
    return surplus / mates.length;
  }

  /**
   * A good's flow for a city each turn, from what it has now: the page's "per turn" numbers and "falling". `ahead` is
   * lookAhead(s): for food, the flow counts what the armies standing in the city take for their baggage at this
   * turn's end, as the turn itself will take it.
   */
  function flow(s, city, good, ahead) {
    var made = 0;
    staffing(s, city).list.forEach(function (st) {
      if (st.working && N.builds[st.site.type].makes === good) made += siteOutput(s, city, st.site);
    });
    var routesIn = 0, routesOut = 0;
    s.routes.forEach(function (r) {
      if (r.good !== good) return;
      if (r.to === city.id) routesIn += r.last;
      if (r.from === city.id) routesOut += r.last;
    });
    var tile = good === 'food' ? N.cityTileFood : 0;
    var eaten = good === 'food' ? eats(city) : 0;
    var supplyOut = good === 'food' ? suppliedFrom(s, city.id) : 0;
    var baggage = good === 'food' ? ahead.filled[city.id] || 0 : 0;
    // Shipping out only takes what is above a reserve (routes 3 turns of eating, supply 1), so it never makes the
    // store run dry before the city eats: "net" leaves it out.
    return { tile: tile, sites: made, routesIn: routesIn, routesOut: routesOut, supplyOut: supplyOut, eaten: eaten,
      baggage: baggage, net: tile + made + routesIn - eaten - baggage };
  }

  /** Coin the next end of turn will pay: people (with Markets) and trade landing then. */
  function coinNext(s) {
    var people = 0, trade = 0, r = rates(s);
    s.cities.forEach(function (c) { people += c.size * r.coinPerPerson * marketFactor(c); });
    s.transit.forEach(function (g) {
      if (g.trade && g.arrives <= s.turn) trade += g.amount * r.tradeCoinPerUnit * marketFactor(cityById(s, g.to));
    });
    return { people: people, trade: trade, total: people + trade };
  }

  /**
   * What a build costs in this city now. A Hall costs 1.5 times more for each Hall you already have. Web nodes you own
   * change some costs: Hardy settlers a settler's food, Drill a regiment's production, Master builders the stone of
   * the buildings it names, rounded up, after the Hall's price growth.
   */
  function buildCost(s, city, kind) {
    var spec = N.builds[kind], r = rates(s);
    var factor = kind === 'hall' ? Math.pow(spec.priceGrowth, hallsCounted(s, city)) : 1;
    var stone = spec.stone * factor;
    if (r.stoneFor.indexOf(kind) >= 0) stone = Math.ceil(stone * r.stoneShare);
    return { coin: spec.coin * factor, stone: stone, food: kind === 'settler' ? r.settlerFood : spec.food || 0,
      production: kind === 'regiment' ? r.regimentProduction : spec.production };
  }

  /** Things waiting for the player (RULES, The screen); `ahead` is lookAhead(s), which the page computes once. */
  function waiting(s, ahead) {
    var out = [], hunger = ahead.hunger;
    s.cities.forEach(function (city) {
      if (!city.build) out.push({ kind: 'build', tile: city.tile, text: city.name + ' has nothing to build' });
      staffing(s, city).list.forEach(function (st) {
        if (!st.working) {
          out.push({ kind: 'idle', tile: st.site.tile, text: city.name + ': a ' + N.builds[st.site.type].name.toLowerCase() +
            ' stands idle (needs ' + st.need + (st.need === 1 ? ' person)' : ' people)') });
        }
      });
      var f = flow(s, city, 'food', ahead);
      if (f.net < 0) out.push({ kind: 'food', tile: city.tile, text: city.name + ': food store falling (' + fmt(f.net) + ' per turn)' });
    });
    s.settlers.forEach(function (st) {
      if (st.dest === null) out.push({ kind: 'settler', tile: st.tile, text: 'A settler has no orders' });
    });
    s.generals.forEach(function (g) {
      if (g.dest === null && !cityAt(s, g.tile)) {
        out.push({ kind: 'general', tile: g.tile, text: 'A general at ' + where(s, g.tile) + ' has no orders' });
      }
      var h = hunger[g.id];
      if (h) {
        out.push({ kind: 'army-food', tile: g.tile, text: 'An army at ' + where(s, g.tile) + ' will go hungry ' +
          (h.at ? 'at the end of turn ' + (s.turn + h.at) : 'when this turn ends') + (h.ifWins ? ' if it wins' : '') });
      }
    });
    return out;
  }

  // ---- Checks: can this order be given now, and if not, why ----

  function moveProblem(s) {
    return s.moves < N.orderMoves ? 'No moves left: end the turn for ' + movesPerTurn(s) + ' more' : null;
  }

  /** Why a site of this kind can't go on this tile for this city, or null (RULES, Sites). */
  function siteProblem(s, city, kind, tile) {
    var spec = N.builds[kind];
    if (s.terrain[tile] !== spec.terrain) return spec.name + 's go on ' + spec.terrain + ' only';
    if (cityAt(s, tile)) return 'A city stands there';
    if (siteAt(s, tile)) return 'There is already a site there';
    var builder = siteBuilderAt(s, tile);
    if (builder && builder !== city) return builder.name + ' is building a site there';
    var owner = s.owner[tile];
    if (owner && owner !== city.id) return "Inside " + holderName(s, owner) + "'s borders";
    if (owner !== city.id && !neighbors(s, tile).some(function (n) { return s.owner[n] === city.id; })) {
      return 'Too far: a site goes inside the borders or next to them';
    }
    return null;
  }

  function siteTiles(s, city, kind) {
    var out = [];
    for (var i = 0; i < s.terrain.length; i++) if (!siteProblem(s, city, kind, i)) out.push(i);
    return out;
  }

  /**
   * Can the city be given this build? For a site, `tile` is where; without a tile it asks whether any tile
   * would do (for the button that starts picking one). Changing a build refunds its coin, stone and food, so those
   * count as available.
   */
  function checkBuild(s, cityId, kind, tile) {
    var city = cityById(s, cityId), spec = N.builds[kind];
    if (!city || !spec) return no('Unknown order');
    var cost = buildCost(s, city, kind), b = city.build;
    var extra = { cost: cost }, node = nodeFor(kind);
    if (node && !owns(s, node.id)) {
      return no('Needs the ' + node.spec.name + ' node in the web (' + N.web.branches[node.branch].name + ')', extra);
    }
    if (spec.onePerCity && has(city, kind)) return no('Already built in this city', extra);
    if (b && b.kind === kind && (!spec.site || b.tile === tile)) return no('Already building this', extra);
    if (kind === 'hall' && N.movesPerTurn + (hallsCounted(s, city) + 1) * spec.moves > N.movesCap) {
      return no('Moves per turn would pass the cap of ' + N.movesCap, extra);
    }
    if (spec.site) {
      if (tile === undefined) {
        if (!siteTiles(s, city, kind).length) return no('No free ' + spec.terrain + ' tile in or next to the borders', extra);
      } else {
        var p = siteProblem(s, city, kind, tile);
        if (p) return no(p, extra);
      }
    }
    var mp = moveProblem(s);
    if (mp) return no(mp, extra);
    var refundCoin = b ? b.paidCoin : 0, refundStone = b ? b.paidStone : 0, refundFood = b ? b.paidFood : 0;
    if (cost.coin > s.coin + refundCoin) return no('Needs ' + fmt(cost.coin) + ' coin; you have ' + fmt(s.coin + refundCoin), extra);
    if (cost.stone > city.stone + refundStone) {
      return no('Needs ' + fmt(cost.stone) + ' stone here; the city has ' + fmt(city.stone + refundStone), extra);
    }
    if (cost.food > city.food + refundFood) {
      return no('Needs ' + fmt(cost.food) + ' food here; the store has ' + fmt(city.food + refundFood), extra);
    }
    return { ok: true, cost: cost, refundCoin: refundCoin, refundStone: refundStone, refundFood: refundFood };
  }

  /** Can this settler be sent to this tile? Without a tile: can it be sent anywhere now? */
  function checkSend(s, settlerId, tile) {
    var st = settlerById(s, settlerId);
    if (!st) return no('Unknown settler');
    if (tile !== undefined) {
      if (!passable(s, tile)) return no('Settlers can\'t enter ' + s.terrain[tile]);
      if (tile === st.tile) return no('The settler is already there');
      if (tile === st.dest) return no('Already heading there');
      if (!findPath(s, st.tile, tile)) return no('No way there over land');
    }
    var mp = moveProblem(s);
    return mp ? no(mp) : { ok: true };
  }

  /** Why a city can't be founded on this tile, or null (RULES, Settlers). */
  function foundProblemAt(s, tile) {
    if (!passable(s, tile)) return 'Cities go on land';
    if (s.owner[tile]) return "Inside " + holderName(s, s.owner[tile]) + "'s borders";
    var all = s.cities.concat(s.rivals); // every other city, yours or the rival's
    for (var k = 0; k < all.length; k++) {
      var d = dist(s, tile, all[k].tile);
      if (d < N.minCityDistance) {
        return 'Too close to ' + all[k].name + ' (' + d + ' tiles; needs ' + N.minCityDistance + ')';
      }
    }
    var builder = siteBuilderAt(s, tile);
    if (builder) return builder.name + ' is building a site here';
    return null;
  }

  function checkFound(s, settlerId) {
    var st = settlerById(s, settlerId);
    if (!st) return no('Unknown settler');
    var p = foundProblemAt(s, st.tile);
    if (p) return no(p);
    var mp = moveProblem(s);
    return mp ? no(mp) : { ok: true };
  }

  /**
   * Can a route carry `good` from one city to another? With `routeId` it asks about changing that route to
   * this destination and good. Without `toId` it asks whether a route can be started at all (for the button).
   */
  function checkRoute(s, fromId, toId, good, routeId) {
    var from = cityById(s, fromId);
    if (!from) return no('Unknown city');
    if (GOODS.indexOf(good) < 0) return no('A route carries food or stone');
    if (s.cities.length < 2) return no('You need a second city first');
    if (routeId !== undefined && !routeById(s, routeId)) return no('Unknown route');
    if (toId !== undefined) {
      var to = cityById(s, toId);
      if (!to) return no('Pick one of your cities');
      if (toId === fromId) return no('A route goes to another city');
      var same = s.routes.some(function (r) {
        return r.id !== routeId && r.from === fromId && r.to === toId && r.good === good;
      });
      if (same) return no('That route already exists');
      var r = routeById(s, routeId);
      if (r && r.to === toId && r.good === good) return no('That is what the route does now');
    }
    var mp = moveProblem(s);
    return mp ? no(mp) : { ok: true };
  }

  function checkCancelRoute(s, routeId) {
    if (!routeById(s, routeId)) return no('Unknown route');
    var mp = moveProblem(s);
    return mp ? no(mp) : { ok: true };
  }

  /** Can this general be sent to this tile with its army? Without a tile: can it be sent anywhere now? */
  function checkMarch(s, generalId, tile) {
    var g = generalById(s, generalId);
    if (!g) return no('Unknown general');
    if (tile !== undefined) {
      if (!passable(s, tile)) return no('Armies can\'t enter ' + s.terrain[tile]);
      if (rivalAt(s, tile)) return no('Armies never step onto a rival city: stand next to it to fight it');
      if (tile === g.tile) return no('The army is already there');
      if (tile === g.dest) return no('Already heading there');
      if (!findPath(s, g.tile, tile, armyBlocked(s))) return no('No way there over land');
    }
    var mp = moveProblem(s);
    return mp ? no(mp) : { ok: true };
  }

  /** Is `n` a whole number of regiments from 1 to `most`? */
  function badCount(n, most) {
    return !(n >= 1 && n <= most && n === Math.floor(n));
  }

  /** Can the general take `n` regiments standing in the city it is in? Without `n`: can it take any now? */
  function checkTake(s, generalId, n) {
    var g = generalById(s, generalId);
    if (!g) return no('Unknown general');
    var city = cityAt(s, g.tile);
    if (!city) return no('A general takes regiments only in one of your cities');
    if (!city.garrison) return no('No regiments stand in ' + city.name);
    if (n !== undefined && badCount(n, city.garrison)) return no('Choose from 1 to ' + city.garrison + ' regiments');
    var mp = moveProblem(s);
    return mp ? no(mp) : { ok: true };
  }

  /** Can the general leave `n` of its regiments in the city it stands in? Without `n`: can it leave any now? */
  function checkLeave(s, generalId, n) {
    var g = generalById(s, generalId);
    if (!g) return no('Unknown general');
    if (!g.regiments) return no('The general has no regiments');
    if (!cityAt(s, g.tile)) return no('Regiments are only left in one of your cities');
    if (n !== undefined && badCount(n, g.regiments)) return no('Choose from 1 to ' + g.regiments + ' regiments');
    var mp = moveProblem(s);
    return mp ? no(mp) : { ok: true };
  }

  /** Can this city be set to supply the general (or the supply changed to it)? Without a city: can it be set now? */
  function checkSupply(s, generalId, cityId) {
    var g = generalById(s, generalId);
    if (!g) return no('Unknown general');
    if (cityId !== undefined) {
      var city = cityById(s, cityId);
      if (!city) return no('Pick one of your cities');
      if (g.supply === cityId) return no(city.name + ' already supplies this general');
    }
    var mp = moveProblem(s);
    return mp ? no(mp) : { ok: true };
  }

  function checkCancelSupply(s, generalId) {
    var g = generalById(s, generalId);
    if (!g) return no('Unknown general');
    if (g.supply === null) return no('The general has no supply to cancel');
    var mp = moveProblem(s);
    return mp ? no(mp) : { ok: true };
  }

  /**
   * Can this node of the web be bought now? It must be linked to a node you own (RULES, The web). A refusal says
   * `why`: 'owned', 'unlinked', 'moves' or 'coin'.
   */
  function checkBuy(s, id) {
    var node = nodeById(id);
    if (!node) return no('Unknown node');
    var cost = nodePrice(s, node);
    if (owns(s, id)) return no('Already yours', { cost: cost, why: 'owned' });
    if (!linksOf(id).some(function (l) { return owns(s, l); })) {
      return no('Not linked to a node you own', { cost: cost, why: 'unlinked' });
    }
    var mp = moveProblem(s);
    if (mp) return no(mp, { cost: cost, why: 'moves' });
    if (cost.coin > s.coin) {
      return no('Needs ' + fmt(cost.coin) + ' coin for the experience it is short; you have ' + fmt(s.coin),
        { cost: cost, why: 'coin' });
    }
    return { ok: true, cost: cost };
  }

  // ---- Orders: each costs one move and can be undone this turn ----

  /** Save the state for undo and spend the order's move. */
  function begin(game) {
    game.undo.push(JSON.stringify(game.state));
    game.state.moves -= N.orderMoves;
    return game.state;
  }

  /** An order given in a city gives it attention: its sites make more for a few turns (RULES, Moves, P5). */
  function attend(city) {
    city.attention = N.attentionTurns;
  }

  function orderBuild(game, cityId, kind, tile) {
    var check = checkBuild(game.state, cityId, kind, tile);
    if (!check.ok) return check;
    var s = begin(game), city = cityById(s, cityId), cost = check.cost;
    // Changing the build refunds its coin, stone and food; its progress is lost (RULES, Production and building).
    var coin = s.coin + check.refundCoin, stone = city.stone + check.refundStone;
    s.coin = coin - cost.coin;
    city.stone = stone - cost.stone;
    city.food = city.food + check.refundFood - cost.food;
    city.build = { kind: kind, tile: N.builds[kind].site ? tile : null, progress: 0, cost: cost.production,
      paidCoin: cost.coin, paidStone: cost.stone, paidFood: cost.food };
    attend(city);
    return { ok: true };
  }

  function orderSend(game, settlerId, tile) {
    var check = checkSend(game.state, settlerId, tile);
    if (!check.ok || tile === undefined) return check.ok ? no('Pick a tile') : check;
    var s = begin(game);
    settlerById(s, settlerId).dest = tile;
    return { ok: true };
  }

  /** A name from the list, numbered once the list runs out. */
  function nameFrom(list, n) {
    return list[n % list.length] + (n >= list.length ? ' ' + (Math.floor(n / list.length) + 1) : '');
  }

  /** One of your cities, with empty stores and nothing built. */
  function makeCity(id, name, tile, size) {
    return { id: id, name: name, tile: tile, size: size, food: 0, stone: 0, garrison: 0, build: null, buildings: [],
      attention: 0 };
  }

  function foundCity(s, tile) {
    var city = makeCity(s.nextId++, nameFrom(CITY_NAMES, s.cities.length), tile, N.newCitySize);
    s.cities.push(city);
    claim(s, city.id, tile, N.cityRadius);
    return city;
  }

  /** A general standing on a tile, with no regiments, no baggage and no orders. */
  function makeGeneral(s, tile) {
    return { id: s.nextId++, tile: tile, dest: null, regiments: 0, baggage: 0, supply: null, supplySince: null };
  }

  /** Tiles around `centre` join the city's borders, except tiles another city already holds (RULES, P8). */
  function claim(s, cityId, centre, radius) {
    tilesWithin(s, centre, radius).forEach(function (t) {
      if (!s.owner[t]) s.owner[t] = cityId;
    });
  }

  function orderFound(game, settlerId) {
    var check = checkFound(game.state, settlerId);
    if (!check.ok) return check;
    var s = begin(game), st = settlerById(s, settlerId);
    s.settlers.splice(s.settlers.indexOf(st), 1);
    attend(foundCity(s, st.tile));
    return { ok: true };
  }

  function orderRoute(game, fromId, toId, good) {
    if (toId === undefined) return no('Pick a city');
    var check = checkRoute(game.state, fromId, toId, good);
    if (!check.ok) return check;
    var s = begin(game);
    s.routes.push({ id: s.nextId++, from: fromId, to: toId, good: good, last: 0 });
    attend(cityById(s, fromId));
    return { ok: true };
  }

  function orderChangeRoute(game, routeId, toId, good) {
    var r0 = routeById(game.state, routeId);
    if (!r0) return no('Unknown route');
    if (toId === undefined) return no('Pick a city');
    var check = checkRoute(game.state, r0.from, toId, good, routeId);
    if (!check.ok) return check;
    var s = begin(game), r = routeById(s, routeId);
    r.to = toId;
    r.good = good;
    r.last = 0;
    attend(cityById(s, r.from));
    return { ok: true };
  }

  function orderCancelRoute(game, routeId) {
    var check = checkCancelRoute(game.state, routeId);
    if (!check.ok) return check;
    var s = begin(game), r = routeById(s, routeId);
    s.routes.splice(s.routes.indexOf(r), 1);
    attend(cityById(s, r.from));
    return { ok: true };
  }

  // Army orders (RULES, Moves): sending a general is an order to a unit and gives no attention; taking or leaving
  // regiments gives the city the general stands in attention; a supply order gives the city that feeds (or fed) it.

  /** Send a general and all its regiments to a tile: one move for the whole army. */
  function orderMarch(game, generalId, tile) {
    var check = checkMarch(game.state, generalId, tile);
    if (!check.ok || tile === undefined) return check.ok ? no('Pick a tile') : check;
    var s = begin(game);
    generalById(s, generalId).dest = tile;
    return { ok: true };
  }

  function orderTake(game, generalId, n) {
    if (n === undefined) return no('Choose how many regiments');
    var check = checkTake(game.state, generalId, n);
    if (!check.ok) return check;
    var s = begin(game), g = generalById(s, generalId), city = cityAt(s, g.tile);
    city.garrison -= n;
    g.regiments += n;
    attend(city);
    return { ok: true };
  }

  /**
   * Leave regiments in the city the general stands in. The food above the smaller army's baggage limit goes into the
   * city's store (RULES, Feeding armies); nothing carried is thrown away.
   */
  function orderLeave(game, generalId, n) {
    if (n === undefined) return no('Choose how many regiments');
    var check = checkLeave(game.state, generalId, n);
    if (!check.ok) return check;
    var s = begin(game), g = generalById(s, generalId), city = cityAt(s, g.tile);
    g.regiments -= n;
    city.garrison += n;
    var extra = Math.max(0, g.baggage - baggageCap(s, g));
    g.baggage -= extra;
    city.food += extra;
    attend(city);
    return { ok: true };
  }

  /** Set or change the city that feeds a general. A changed line counts as newly set: it is served last. */
  function orderSupply(game, generalId, cityId) {
    if (cityId === undefined) return no('Pick a city');
    var check = checkSupply(game.state, generalId, cityId);
    if (!check.ok) return check;
    var s = begin(game), g = generalById(s, generalId);
    g.supply = cityId;
    g.supplySince = s.nextId++;
    attend(cityById(s, cityId));
    return { ok: true };
  }

  function orderCancelSupply(game, generalId) {
    var check = checkCancelSupply(game.state, generalId);
    if (!check.ok) return check;
    var s = begin(game), g = generalById(s, generalId);
    attend(cityById(s, g.supply));
    g.supply = null;
    g.supplySince = null;
    return { ok: true };
  }

  /**
   * Buy a node of the web: its branch's experience pays first, then coin for each point short. An order to no city:
   * it gives no attention (RULES, Moves). Its bonus works at once, because every rule reads the nodes you own.
   */
  function orderBuy(game, id) {
    var check = checkBuy(game.state, id);
    if (!check.ok) return check;
    var s = begin(game), node = nodeById(id);
    s.web.xp[node.branch] -= check.cost.xp;
    s.coin -= check.cost.coin;
    s.web.owned.push(id);
    return { ok: true };
  }

  /** Take back the most recent order of this turn: everything returns to how it was before it. */
  function undo(game) {
    if (!game.undo.length) return no('No orders given this turn');
    game.state = JSON.parse(game.undo.pop());
    return { ok: true };
  }

  // ---- The end of a turn (RULES, A turn) ----
  // Each step runs over the cities in founding order (the order of s.cities) and the armies oldest first (the
  // order of s.generals) before the next step starts.

  /**
   * Ends the turn. `opts.winEveryBattle` (only the look-ahead passes it) settles battles without dice: a battle with
   * a win chance above 0 is won, and an army with no regiments (chance 0) loses, as always. Experience is earned at
   * the step where its activity happens (RULES, A turn). Returns the turn's notes and `filled`, the food each city
   * gave the baggage of the armies standing in it ({ cityId: food }).
   */
  function endTurn(game, opts) {
    var s = game.state, turn = s.turn, log = [], winAll = !!(opts && opts.winEveryBattle), nums = rates(s), filled = {};
    function note(text, tile, kind, general) {
      var e = { text: text, tile: tile };
      if (kind) e.kind = kind;
      if (general) e.general = general;
      log.push(e);
    }
    function regs(n) { return n + (n === 1 ? ' regiment' : ' regiments'); }

    // 1. Working sites send their output to their city; it arrives after its travel time. Farms and quarries earn
    // experience on what they send, attention included.
    s.cities.forEach(function (city) {
      staffing(s, city).list.forEach(function (st) {
        var spec = N.builds[st.site.type];
        if (!st.working) {
          note(city.name + ': a ' + spec.name.toLowerCase() + ' stood idle (needs ' + st.need +
            (st.need === 1 ? ' person)' : ' people)'), st.site.tile);
          return;
        }
        var amount = siteOutput(s, city, st.site);
        earn(s, st.site.type, amount);
        s.transit.push({ good: spec.makes, amount: amount, to: city.id,
          from: spec.name + ' ' + where(s, st.site.tile), arrives: turn + travelTurns(s, st.site.tile, city.tile),
          trade: false });
      });
    });

    // 2. Supply lines ship first, in the order they were set, towards where each general stands now; then routes
    // ship everything still above the reserve, routes from one city with one good sharing it equally.
    supplyPlan(s).forEach(function (p) {
      if (!p.amount) return;
      p.city.food -= p.amount;
      s.transit.push({ good: 'food', amount: p.amount, general: p.general.id, from: p.city.name,
        arrives: turn + p.travel, trade: false });
    });
    s.cities.forEach(function (city) {
      GOODS.forEach(function (good) {
        var rs = s.routes.filter(function (r) { return r.from === city.id && r.good === good; });
        rs.forEach(function (r) { r.last = 0; });
        var keep = reserve(city, good), total = city[good] - keep;
        if (!rs.length || total <= 0) return;
        city[good] = keep;
        var sent = 0;
        rs.forEach(function (r, k) {
          var amount = k === rs.length - 1 ? total - sent : total / rs.length;
          sent += amount;
          r.last = amount;
          s.transit.push({ good: good, amount: amount, to: r.to, from: city.name, route: r.id,
            arrives: turn + travelTurns(s, city.tile, cityById(s, r.to).tile), trade: true });
        });
      });
    });

    // 3. Goods arriving this turn land: in a city (route deliveries earn trade coin) or, for supply, in the
    // baggage wherever the general is now. Supply for a general who is gone is lost. The city tile's food lands too.
    // Trade coin earns experience as it lands.
    var trade = 0;
    s.transit = s.transit.filter(function (g) {
      if (g.arrives > turn) return true;
      if (g.general) {
        var gen = generalById(s, g.general);
        if (gen) gen.baggage += g.amount;
        return false;
      }
      var city = cityById(s, g.to);
      city[g.good] += g.amount;
      if (g.trade) trade += g.amount * nums.tradeCoinPerUnit * marketFactor(city);
      return false;
    });
    s.coin += trade;
    earn(s, 'coin', trade);
    s.cities.forEach(function (city) { city.food += N.cityTileFood; });

    // 4. In each city: the garrison eats; armies standing there fill their baggage up to its limit, oldest first, from
    // the food above what the city eats in one turn; the people eat; the city grows or shrinks. If the store can't feed
    // garrison and people, the city loses a person; a city already at its smallest loses a garrison regiment instead.
    // (A store that short has nothing above the one-turn reserve, so no army fills from it.)
    s.cities.forEach(function (city) {
      if (city.food >= eats(city)) {
        city.food -= city.garrison * N.foodPerRegiment;
        generalsAt(s, city.tile).forEach(function (g) {
          var take = Math.min(Math.max(0, baggageCap(s, g) - g.baggage), Math.max(0, city.food - armyReserve(city)));
          city.food -= take;
          g.baggage += take;
          filled[city.id] = (filled[city.id] || 0) + take;
        });
        city.food -= city.size * N.foodPerPerson;
        var need = growthNeed(city);
        if (city.food >= need) {
          city.food -= need;
          city.size += N.growBy;
          note(city.name + ' grew to size ' + city.size, city.tile);
        }
      } else {
        city.food = 0;
        if (city.size > N.minCitySize) {
          city.size = Math.max(N.minCitySize, city.size - N.starveLoss);
          note(city.name + ' starved and shrank to size ' + city.size + (city.garrison ? '; its garrison is unharmed' : ''), city.tile);
        } else if (city.garrison) {
          city.garrison = Math.max(0, city.garrison - N.starveLoss);
          note(city.name + ' starved: at size ' + city.size + ' its garrison lost a regiment (' + regs(city.garrison) + ' left)', city.tile);
        } else {
          note(city.name + ' went hungry (store empty)', city.tile);
        }
      }
    });

    // 5. Production advances the build. A finished settler or regiment waits while the city can't spare a person.
    // A finished regiment earns experience.
    s.cities.forEach(function (city) {
      var b = city.build;
      if (!b) return;
      b.progress = Math.min(b.cost, b.progress + production(s, city).total);
      if (b.progress < b.cost) return;
      var spec = N.builds[b.kind];
      if (!spec.site && spec.people && city.size - spec.people < N.minCitySize) {
        note(city.name + ': the ' + spec.name.toLowerCase() + ' is ready but waits until the city grows', city.tile);
        return;
      }
      city.build = null;
      if (spec.site) {
        s.sites.push({ tile: b.tile, type: b.kind, city: city.id });
        claim(s, city.id, b.tile, N.siteClaimRadius);
        note(city.name + ' finished a ' + spec.name.toLowerCase() + '; its borders grew', b.tile);
      } else if (b.kind === 'settler') {
        city.size -= spec.people;
        s.settlers.push({ id: s.nextId++, tile: city.tile, dest: null });
        note(city.name + ' finished a settler (the city is now size ' + city.size + ')', city.tile);
      } else if (b.kind === 'regiment') {
        city.size -= spec.people;
        city.garrison += 1;
        earn(s, 'regiment', 1);
        note(city.name + ' finished a regiment (garrison ' + city.garrison + '; the city is now size ' + city.size + ')', city.tile);
      } else if (b.kind === 'general') {
        s.generals.push(makeGeneral(s, city.tile));
        note(city.name + ' finished a general, who stands in the city', city.tile);
      } else {
        city.buildings.push(b.kind);
        note(city.name + ' finished a ' + spec.name, city.tile);
      }
    });

    // 6. Coin is paid: every person pays, more with a Market; it earns experience.
    var people = 0;
    s.cities.forEach(function (city) { people += city.size * nums.coinPerPerson * marketFactor(city); });
    s.coin += people;
    earn(s, 'coin', people);
    s.lastIncome = { people: people, trade: trade, plunder: 0 };

    // 7. Settlers walk and armies march towards their tile, around mountains and water (armies around rival cities).
    function walk(unit, steps, blocked, who) {
      if (unit.dest === null) return;
      var path = findPath(s, unit.tile, unit.dest, blocked);
      if (!path || !path.length) {
        unit.dest = null;
        note(who + ' could not go on and waits for orders', unit.tile);
        return;
      }
      unit.tile = path[Math.min(steps, path.length) - 1];
      if (unit.tile === unit.dest) {
        unit.dest = null;
        note(who + ' arrived and waits for orders', unit.tile);
      }
    }
    s.settlers.forEach(function (st) { walk(st, N.settlerSteps, null, 'A settler'); });
    var blocked = armyBlocked(s);
    s.generals.forEach(function (g) { walk(g, nums.armySteps, blocked, 'An army'); });

    // 8. Armies eat from their baggage, where they stand after marching. An army that can't eat fully eats what there
    // is and loses a regiment.
    s.generals.forEach(function (g) {
      var eat = armyEatsNow(s, g);
      if (g.baggage >= eat) {
        g.baggage -= eat;
        return;
      }
      g.baggage = 0;
      g.regiments = Math.max(0, g.regiments - N.hungerLoss);
      note('An army at ' + where(s, g.tile) + ' went hungry and lost a regiment (' + regs(g.regiments) + ' left)', g.tile, 'hunger',
        g.id);
    });

    // 9. Battles: each army next to a rival city fights it, oldest first; next to two, the smaller garrison. Every
    // battle earns experience, won or lost, and so does the plunder.
    s.generals.slice().forEach(function (g) {
      var foe = foeAt(s, g.tile);
      if (!foe) return;
      var a = g.regiments, d = foe.garrison, chance = winChance(s, a, d);
      earn(s, 'battle', 1);
      var head = 'Battle at ' + foe.name + ': your ' + regs(a) + ' against ' + d + ' (win chance ' +
        fmt(chance * 100) + '%): ';
      if (winAll ? chance > 0 : rollDice(s) < chance) {
        g.regiments = winnerLeft(a, d);
        s.rivals.splice(s.rivals.indexOf(foe), 1);
        s.cities.push(makeCity(foe.id, foe.name, foe.tile, foe.size));
        var plunder = foe.size * N.plunderPerPerson;
        s.coin += plunder;
        earn(s, 'coin', plunder);
        s.lastIncome.plunder += plunder;
        g.tile = foe.tile;
        g.dest = null;
        note(head + 'won. All ' + d + ' defenders are gone; you lost ' + (a - g.regiments) + ', ' + regs(g.regiments) +
          ' left', foe.tile, 'battle', g.id);
        note(foe.name + ' is yours: size ' + foe.size + ', empty stores; your army stands in it. Plunder: ' + fmt(plunder) +
          ' coin', foe.tile, 'capture');
      } else {
        foe.garrison = winnerLeft(d, a);
        s.generals.splice(s.generals.indexOf(g), 1);
        note(head + 'lost. The general and every regiment are gone; ' + foe.name + ' lost ' + (d - foe.garrison) +
          ' and has ' + foe.garrison + ' left', foe.tile, 'battle', g.id);
      }
    });

    // 10. Rival garrisons grow every few turns, up to their most.
    if (turn % N.rival.garrisonEvery === 0) {
      s.rivals.forEach(function (r) {
        if (r.garrison < N.rival.garrisonMax) r.garrison = Math.min(N.rival.garrisonMax, r.garrison + N.rival.garrisonGrowth);
      });
    }

    // 11. Attention counts down; this turn's moves are added; unused moves carry over with no limit.
    s.cities.forEach(function (city) { if (city.attention > 0) city.attention -= 1; });
    s.movesSaved = s.moves;
    s.moves += movesPerTurn(s);
    s.turn += 1;
    s.log = log;
    game.undo = [];
    return { ok: true, log: log, filled: filled };
  }

  // ---- A new game (RULES, The start) ----

  /** The rival's cities: on the land farthest from your first city, apart from each other (RULES, The rival). */
  function placeRivals(s, home) {
    // Land your armies can walk to from your first city, farthest first (ties by tile, so a seed gives one layout).
    var land = reachable(s, home.tile);
    land.sort(function (a, b) { return dist(s, home.tile, b) - dist(s, home.tile, a) || a - b; });
    for (var k = 0; k < land.length && s.rivals.length < N.rival.cities; k++) {
      var t = land[k];
      if (s.owner[t]) continue;
      if (s.rivals.some(function (r) { return dist(s, t, r.tile) < N.rival.spacing; })) continue;
      var r = { id: s.nextId++, name: nameFrom(RIVAL_NAMES, s.rivals.length), tile: t, size: N.rival.citySize,
        garrison: N.rival.garrison };
      s.rivals.push(r);
      claim(s, r.id, t, N.cityRadius);
    }
  }

  function newGame(seed) {
    var s = {
      seed: seed, turn: 1, w: N.map.width, h: N.map.height, coin: N.start.coin,
      moves: 0, movesSaved: 0, nextId: 1, dice: (seed ^ DICE_SALT) | 0,
      terrain: [], owner: [], cities: [], sites: [], settlers: [], routes: [], transit: [], log: [],
      generals: [], rivals: [], web: { owned: [], xp: N.web.branches.map(function () { return 0; }) },
      lastIncome: { people: 0, trade: 0, plunder: 0 },
    };
    makeMap(s, makeRng(seed));
    s.terrain.forEach(function () { s.owner.push(0); });
    var start = foundCity(s, chooseStart(s));
    start.size = N.start.citySize;
    start.food = N.start.food;
    start.stone = N.start.stone;
    placeRivals(s, start);
    var spots = neighbors(s, start.tile).filter(function (n) { return passable(s, n); });
    for (var k = 0; k < N.start.settlers && spots.length; k++) {
      s.settlers.push({ id: s.nextId++, tile: spots[k % spots.length], dest: null });
    }
    for (var j = 0; j < N.start.generals; j++) s.generals.push(makeGeneral(s, start.tile));
    // The first general leads the starting army, its baggage full; its regiments take no person (RULES, The start).
    var first = s.generals[0];
    if (first) {
      first.regiments = N.start.regiments;
      first.baggage = baggageCap(s, first);
    }
    s.moves = movesPerTurn(s);
    return { state: s, undo: [] };
  }

  return {
    GOODS: GOODS, newGame: newGame, makeRng: makeRng, fmt: fmt,
    col: col, row: row, neighbor: neighbor, dist: dist, passable: passable,
    findPath: findPath, reachable: reachable, armyBlocked: armyBlocked,
    cityById: cityById, cityAt: cityAt, siteAt: siteAt, settlerById: settlerById, settlersAt: settlersAt,
    routeById: routeById, siteBuilderAt: siteBuilderAt, has: has, holderName: holderName,
    generalById: generalById, generalsAt: generalsAt, rivalAt: rivalAt,
    rivalsNext: rivalsNext, foeAt: foeAt,
    hallsBuilt: hallsBuilt, hallsCounted: hallsCounted, movesPerTurn: movesPerTurn, movesSaved: movesSaved,
    production: production, eats: eats, growthNeed: growthNeed, staffing: staffing, siteOutput: siteOutput,
    travelTurns: travelTurns, reserve: reserve, armyReserve: armyReserve, routeShare: routeShare, flow: flow,
    coinNext: coinNext,
    waiting: waiting,
    armyEats: armyEats, armyEatsNow: armyEatsNow, baggageCap: baggageCap, turnsOfFood: turnsOfFood, foodOnWay: foodOnWay,
    lookAhead: lookAhead, supplyPlan: supplyPlan, winChance: winChance, siteAmount: siteAmount, rates: rates,
    WEB: { centre: CENTRE, nodes: NODES, links: LINKS }, nodeById: nodeById, owns: owns, linksOf: linksOf,
    checkBuy: checkBuy, orderBuy: orderBuy,
    checkBuild: checkBuild, siteTiles: siteTiles, checkSend: checkSend,
    checkFound: checkFound, foundProblemAt: foundProblemAt, checkRoute: checkRoute, checkCancelRoute: checkCancelRoute,
    checkMarch: checkMarch, checkTake: checkTake, checkLeave: checkLeave, checkSupply: checkSupply,
    checkCancelSupply: checkCancelSupply,
    orderBuild: orderBuild, orderSend: orderSend, orderFound: orderFound, orderRoute: orderRoute,
    orderChangeRoute: orderChangeRoute, orderCancelRoute: orderCancelRoute,
    orderMarch: orderMarch, orderTake: orderTake, orderLeave: orderLeave, orderSupply: orderSupply,
    orderCancelSupply: orderCancelSupply, undo: undo, endTurn: endTurn,
  };
})();
