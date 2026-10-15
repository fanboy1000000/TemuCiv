// TemuCiv prototype, slice 1: the game rules (prototype/RULES.md).
//
// No DOM, canvas or clock in this file, so the page (ui.js) and the smoke check (smoke.js) both run it.
// Every balance number comes from NUMBERS (numbers.js). Throwaway code: nothing outside prototype/ uses it
// (docs/WORKFLOW.md, "Prototype phase").
//
// The game is { state, undo }. `state` is plain data. Every order checks itself first (check* returns
// { ok, reason, cost }), then saves a copy of the state for undo, spends its move and applies itself.

var Game = (function () {
  'use strict';

  var N = NUMBERS;
  var GOODS = ['food', 'stone'];
  var STAFF_ORDER = ['farm', 'quarry']; // RULES, Sites: the city fills farms first, then quarries
  var CITY_NAMES = ['Ashford', 'Brightwater', 'Cobblemere', 'Dunholm', 'Elmstead', 'Fairhaven', 'Greystone',
    'Hollowmere', 'Ivydale', 'Juniper', 'Kestrel', 'Larkspur', 'Millbrook', 'Northwick', 'Oakridge',
    'Pebblecombe', 'Quillon', 'Redcliff', 'Stonehaven', 'Thornbury', 'Underhill', 'Valewood', 'Westmarch',
    'Yarrow'];

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

  /** Seeded random numbers (mulberry32): the same seed always gives the same sequence, so the same map. */
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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

  /** The shortest walk from `from` to `to` over land, as a list of tiles (without `from`), or null. */
  function findPath(s, from, to) {
    if (from === to) return [];
    if (!passable(s, to)) return null;
    var prev = {};
    prev[from] = from;
    var queue = [from];
    for (var head = 0; head < queue.length && prev[to] === undefined; head++) {
      neighbors(s, queue[head]).forEach(function (n) {
        if (prev[n] === undefined && passable(s, n)) {
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

  /** Every land tile a settler on `from` can walk to. */
  function reachable(s, from) {
    var seen = {};
    seen[from] = true;
    var queue = [from];
    for (var head = 0; head < queue.length; head++) {
      neighbors(s, queue[head]).forEach(function (n) {
        if (!seen[n] && passable(s, n)) {
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
  function has(city, kind) { return city.buildings.indexOf(kind) >= 0; }

  /** The city building a site on this tile, if any. */
  function siteBuilderAt(s, tile) {
    return s.cities.find(function (c) { return c.build && N.builds[c.build.kind].site && c.build.tile === tile; }) || null;
  }

  function where(s, tile) { return '(' + col(s, tile) + ', ' + row(s, tile) + ')'; }

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

  function eats(city) { return city.size * N.foodPerPerson; }

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

  /** What a working site makes each turn, with the attention bonus. */
  function siteOutput(s, city, site) {
    var spec = N.builds[site.type];
    return spec.amount * (city.attention > 0 ? 1 + N.attentionBonus : 1);
  }

  /** Turns goods take over a distance: 1 per 3 tiles, rounded up, at least 1 (RULES, Sites and Routes). */
  function travelTurns(s, a, b) {
    return Math.max(N.minTravelTurns, Math.ceil(dist(s, a, b) / N.tilesPerTravelTurn));
  }

  /** What a route leaves in the sending city: for food the city's eating for 3 turns, for stone 10. */
  function reserve(city, good) {
    return good === 'food' ? eats(city) * N.foodReserveTurns : N.stoneReserve;
  }

  function marketFactor(city) {
    return has(city, 'market') ? 1 + N.builds.market.coinBonus : 1;
  }

  /** What a route would ship if the turn ended now: its equal share of the sender's surplus. */
  function routeShare(s, route) {
    var from = cityById(s, route.from);
    var mates = s.routes.filter(function (r) { return r.from === route.from && r.good === route.good; });
    var surplus = Math.max(0, from[route.good] - reserve(from, route.good));
    return surplus / mates.length;
  }

  /** A good's flow for a city each turn, from what it has now: the page's "per turn" numbers and "falling". */
  function flow(s, city, good) {
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
    // Shipping out only takes what is above the reserve, so it never makes a store run dry: "net" leaves it out.
    return { tile: tile, sites: made, routesIn: routesIn, routesOut: routesOut, eaten: eaten,
      net: tile + made + routesIn - eaten };
  }

  /** Coin the next end of turn will pay: people (with Markets) and trade landing then. */
  function coinNext(s) {
    var people = 0, trade = 0;
    s.cities.forEach(function (c) { people += c.size * N.coinPerPerson * marketFactor(c); });
    s.transit.forEach(function (g) {
      if (g.trade && g.arrives <= s.turn) trade += g.amount * N.tradeCoinPerUnit * marketFactor(cityById(s, g.to));
    });
    return { people: people, trade: trade, total: people + trade };
  }

  /** What a build costs in this city now. A Hall costs 1.5 times more for each Hall you already have. */
  function buildCost(s, city, kind) {
    var spec = N.builds[kind];
    var factor = kind === 'hall' ? Math.pow(spec.priceGrowth, hallsCounted(s, city)) : 1;
    return { coin: spec.coin * factor, stone: spec.stone * factor, food: spec.food || 0, production: spec.production };
  }

  /** Things waiting for the player (RULES, The screen). */
  function waiting(s) {
    var out = [];
    s.cities.forEach(function (city) {
      if (!city.build) out.push({ kind: 'build', tile: city.tile, text: city.name + ' has nothing to build' });
      staffing(s, city).list.forEach(function (st) {
        if (!st.working) {
          out.push({ kind: 'idle', tile: st.site.tile, text: city.name + ': a ' + N.builds[st.site.type].name.toLowerCase() +
            ' stands idle (needs ' + st.need + (st.need === 1 ? ' person)' : ' people)') });
        }
      });
      var f = flow(s, city, 'food');
      if (f.net < 0) out.push({ kind: 'food', tile: city.tile, text: city.name + ': food store falling (' + fmt(f.net) + ' per turn)' });
    });
    s.settlers.forEach(function (st) {
      if (st.dest === null) out.push({ kind: 'settler', tile: st.tile, text: 'A settler has no orders' });
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
    if (owner && owner !== city.id) return "Inside " + cityById(s, owner).name + "'s borders";
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
    var extra = { cost: cost };
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
    if (s.owner[tile]) return "Inside " + cityById(s, s.owner[tile]).name + "'s borders";
    for (var k = 0; k < s.cities.length; k++) {
      var d = dist(s, tile, s.cities[k].tile);
      if (d < N.minCityDistance) {
        return 'Too close to ' + s.cities[k].name + ' (' + d + ' tiles; needs ' + N.minCityDistance + ')';
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

  function foundCity(s, tile) {
    var n = s.cities.length, names = CITY_NAMES.length;
    var city = {
      id: s.nextId++,
      name: CITY_NAMES[n % names] + (n >= names ? ' ' + (Math.floor(n / names) + 1) : ''),
      tile: tile, size: N.newCitySize, food: 0, stone: 0, build: null, buildings: [], attention: 0,
    };
    s.cities.push(city);
    claim(s, city.id, tile, N.cityRadius);
    return city;
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

  /** Take back the most recent order of this turn: everything returns to how it was before it. */
  function undo(game) {
    if (!game.undo.length) return no('No orders given this turn');
    game.state = JSON.parse(game.undo.pop());
    return { ok: true };
  }

  // ---- The end of a turn (RULES, A turn) ----
  // Each step runs over the cities in founding order (the order of s.cities) before the next step starts.

  function endTurn(game) {
    var s = game.state, turn = s.turn, log = [];
    function note(text, tile) { log.push({ text: text, tile: tile }); }

    // 1. Working sites send their output to their city; it arrives after its travel time.
    s.cities.forEach(function (city) {
      staffing(s, city).list.forEach(function (st) {
        var spec = N.builds[st.site.type];
        if (!st.working) {
          note(city.name + ': a ' + spec.name.toLowerCase() + ' stood idle (needs ' + st.need +
            (st.need === 1 ? ' person)' : ' people)'), st.site.tile);
          return;
        }
        s.transit.push({ good: spec.makes, amount: siteOutput(s, city, st.site), to: city.id,
          from: spec.name + ' ' + where(s, st.site.tile), arrives: turn + travelTurns(s, st.site.tile, city.tile),
          trade: false });
      });
    });

    // 2. Routes ship everything above the reserve; routes from one city with one good share it equally.
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

    // 3. Goods arriving this turn land; goods a route delivers earn trade coin. The city tile's own food lands too.
    var trade = 0;
    s.transit = s.transit.filter(function (g) {
      if (g.arrives > turn) return true;
      var city = cityById(s, g.to);
      city[g.good] += g.amount;
      if (g.trade) trade += g.amount * N.tradeCoinPerUnit * marketFactor(city);
      return false;
    });
    s.coin += trade;
    s.cities.forEach(function (city) { city.food += N.cityTileFood; });

    // 4. People eat, then the city grows or shrinks.
    s.cities.forEach(function (city) {
      var eat = eats(city);
      if (city.food >= eat) {
        city.food -= eat;
        var need = growthNeed(city);
        if (city.food >= need) {
          city.food -= need;
          city.size += N.growBy;
          note(city.name + ' grew to size ' + city.size, city.tile);
        }
      } else {
        city.food = 0;
        var before = city.size;
        city.size = Math.max(N.minCitySize, city.size - N.starveLoss);
        note(city.name + (city.size < before ? ' starved and shrank to size ' + city.size : ' went hungry (store empty)'), city.tile);
      }
    });

    // 5. Production advances the build. A finished settler waits while the city can't spare a person.
    s.cities.forEach(function (city) {
      var b = city.build;
      if (!b) return;
      b.progress = Math.min(b.cost, b.progress + production(s, city).total);
      if (b.progress < b.cost) return;
      var spec = N.builds[b.kind];
      if (b.kind === 'settler' && city.size - spec.people < N.minCitySize) {
        note(city.name + ': the settler is ready but waits until the city grows', city.tile);
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
      } else {
        city.buildings.push(b.kind);
        note(city.name + ' finished a ' + spec.name, city.tile);
      }
    });

    // 6. Coin is paid: every person pays, more with a Market.
    var people = 0;
    s.cities.forEach(function (city) { people += city.size * N.coinPerPerson * marketFactor(city); });
    s.coin += people;
    s.lastIncome = { people: people, trade: trade };

    // 7. Settlers walk towards their tile, around mountains and water.
    s.settlers.forEach(function (st) {
      if (st.dest === null) return;
      var path = findPath(s, st.tile, st.dest);
      if (!path || !path.length) {
        st.dest = null;
        note('A settler could not go on and waits for orders', st.tile);
        return;
      }
      st.tile = path[Math.min(N.settlerSteps, path.length) - 1];
      if (st.tile === st.dest) {
        st.dest = null;
        note('A settler arrived and waits for orders', st.tile);
      }
    });

    // 8. Attention counts down.
    s.cities.forEach(function (city) { if (city.attention > 0) city.attention -= 1; });

    // 9. This turn's moves are added; unused moves carry over with no limit.
    s.movesSaved = s.moves;
    s.moves += movesPerTurn(s);
    s.turn += 1;
    s.log = log;
    game.undo = [];
    return { ok: true, log: log };
  }

  // ---- A new game (RULES, The start) ----

  function newGame(seed) {
    var s = {
      seed: seed, turn: 1, w: N.map.width, h: N.map.height, coin: N.start.coin,
      moves: 0, movesSaved: 0, nextId: 1,
      terrain: [], owner: [], cities: [], sites: [], settlers: [], routes: [], transit: [], log: [],
      lastIncome: { people: 0, trade: 0 },
    };
    makeMap(s, makeRng(seed));
    s.terrain.forEach(function () { s.owner.push(0); });
    var start = foundCity(s, chooseStart(s));
    start.size = N.start.citySize;
    start.food = N.start.food;
    start.stone = N.start.stone;
    var spots = neighbors(s, start.tile).filter(function (n) { return passable(s, n); });
    for (var k = 0; k < N.start.settlers && spots.length; k++) {
      s.settlers.push({ id: s.nextId++, tile: spots[k % spots.length], dest: null });
    }
    s.moves = movesPerTurn(s);
    return { state: s, undo: [] };
  }

  return {
    GOODS: GOODS, newGame: newGame, makeRng: makeRng, fmt: fmt,
    col: col, row: row, neighbor: neighbor, neighbors: neighbors, dist: dist, passable: passable,
    findPath: findPath, reachable: reachable,
    cityById: cityById, cityAt: cityAt, siteAt: siteAt, settlerById: settlerById, settlersAt: settlersAt,
    routeById: routeById, siteBuilderAt: siteBuilderAt, has: has,
    hallsBuilt: hallsBuilt, hallsCounted: hallsCounted, movesPerTurn: movesPerTurn, movesSaved: movesSaved,
    production: production, eats: eats, growthNeed: growthNeed, staffing: staffing, siteOutput: siteOutput,
    travelTurns: travelTurns, reserve: reserve, routeShare: routeShare, flow: flow, coinNext: coinNext,
    buildCost: buildCost, waiting: waiting,
    checkBuild: checkBuild, siteProblem: siteProblem, siteTiles: siteTiles, checkSend: checkSend,
    checkFound: checkFound, foundProblemAt: foundProblemAt, checkRoute: checkRoute, checkCancelRoute: checkCancelRoute,
    orderBuild: orderBuild, orderSend: orderSend, orderFound: orderFound, orderRoute: orderRoute,
    orderChangeRoute: orderChangeRoute, orderCancelRoute: orderCancelRoute, undo: undo, endTurn: endTurn,
  };
})();
