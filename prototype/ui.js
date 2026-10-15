// TemuCiv prototype, slice 1: the screen. It draws the map and the panels from the game state and sends the
// player's orders to game.js; it never works out a rule itself. Throwaway code (docs/WORKFLOW.md, "Prototype
// phase").

(function () {
  'use strict';

  var N = NUMBERS, G = Game, fmt = G.fmt;
  var TERRAIN = {
    grassland: { name: 'Grassland', color: '#a8d672' },
    forest: { name: 'Forest', color: '#2e7537' },
    hills: { name: 'Hills', color: '#d6b583' },
    mountains: { name: 'Mountains', color: '#8f9398' },
    water: { name: 'Water', color: '#3b6eae' },
  };
  var CITY_COLORS = ['#e53935', '#8e24aa', '#1e88e5', '#ff6f00', '#00acc1', '#d81b60', '#3949ab', '#fdd835',
    '#f5f5f5', '#6d4c41'];
  var GOOD_COLORS = { food: '#ffb300', stone: '#e8edf2' };
  var HEX = 26, SQ3 = Math.sqrt(3), DRAG_PX = 5, LOG_TURNS = 6, MAX_PIPS = 12;

  var game = null, history = [];
  var ui = { sel: -1, shownSel: null, pick: null, msg: null, hover: -1, cam: { x: 0, y: 0, zoom: 1 }, down: null,
    labels: [], fitted: false };
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('map'), ctx = canvas.getContext('2d'), tip = $('tip');

  function S() { return game.state; }

  // ---- Text helpers ----

  function attr(t) { return String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  /** A number with hover text saying what it is made of. */
  function num(value, text) { return '<span class="num" data-tip="' + attr(text) + '">' + value + '</span>'; }
  function count(n, one, many) { return fmt(n) + ' ' + (n === 1 ? one : many); }
  function signed(n) { return (n > 0 ? '+' : '') + fmt(n); }
  function where(t) { return '(' + G.col(S(), t) + ', ' + G.row(S(), t) + ')'; }
  function cityColor(city) { return CITY_COLORS[S().cities.indexOf(city) % CITY_COLORS.length]; }
  function lower(name) { return name.toLowerCase(); }
  function lands(arrives) {
    var k = arrives - S().turn + 1;
    return k <= 1 ? 'lands when this turn ends' : 'lands in ' + k + ' turns';
  }
  function moveCost() { return count(N.orderMoves, 'move', 'moves'); }

  // ---- Explanations shared by panels and map ----

  function productionTip(city) {
    var p = G.production(S(), city);
    return 'Production per turn: ' + fmt(p.total) + '\n' + N.productionBase + ' base + ' + N.productionPerPerson +
      ' × ' + count(city.size, 'person', 'people') + ' = ' + fmt(p.base + p.people) +
      (p.workshop ? '\nWorkshop +' + fmt(N.builds.workshop.productionBonus * 100) + '% = ' + fmt(p.total) : '') +
      '\nProduction only sets how fast the city builds.';
  }

  function foodTip(city) {
    var s = S(), f = G.flow(s, city, 'food'), need = G.growthNeed(city);
    return 'Food store: ' + fmt(city.food) + '\n\nEach end of turn:\n+' + fmt(f.tile) + ' from the city tile\n+' +
      fmt(f.sites) + ' from working farms' + (city.attention > 0 ? ' (with attention +' + fmt(N.attentionBonus * 100) + '%)' : '') +
      '\n+' + fmt(f.routesIn) + ' by routes (last delivery)\n−' + fmt(f.eaten) + ' eaten (' +
      count(city.size, 'person', 'people') + ' × ' + N.foodPerPerson + ')\n= ' + signed(f.net) + ' per turn' +
      (f.routesOut ? '\n\nRoutes shipped out ' + fmt(f.routesOut) + ' last turn (only food above a reserve of ' +
        fmt(G.reserve(city, 'food')) + ', ' + N.foodReserveTurns + ' turns of eating).' : '') +
      '\n\nFarm food takes its travel time to arrive.\nGrows at ' + fmt(need) + ' food (' + N.growthBase + ' + ' +
      N.growthPerSize + ' × size ' + city.size + (G.has(city, 'granary') ? ', Granary −' +
        fmt(N.builds.granary.growthDiscount * 100) + '%' : '') + '); growing uses that food up.' +
      '\nIf the store can\'t feed everyone, the city loses a person and the store drops to 0.';
  }

  function stoneTip(city) {
    var f = G.flow(S(), city, 'stone');
    return 'Stone store: ' + fmt(city.stone) + '\n\nEach end of turn:\n+' + fmt(f.sites) + ' from working quarries' +
      '\n+' + fmt(f.routesIn) + ' by routes (last delivery)\n= ' + signed(f.net) + ' per turn' +
      (f.routesOut ? '\nRoutes shipped out ' + fmt(f.routesOut) + ' last turn (only stone above ' + N.stoneReserve + ').' : '') +
      '\n\nStone pays for buildings; it is taken from this city\'s store.';
  }

  function routeTip(r) {
    var s = S(), from = G.cityById(s, r.from), to = G.cityById(s, r.to);
    var mates = s.routes.filter(function (x) { return x.from === r.from && x.good === r.good; }).length;
    var market = G.has(to, 'market') ? ' (' + to.name + "'s Market: +" + fmt(N.builds.market.coinBonus * 100) + '%)' : '';
    return from.name + ' → ' + to.name + ': ' + r.good + '\nShips at the end of this turn: ' + fmt(G.routeShare(s, r)) +
      '\n(' + from.name + "'s " + r.good + ' ' + fmt(from[r.good]) + ' − reserve ' + fmt(G.reserve(from, r.good)) +
      (mates > 1 ? ', shared by ' + mates + ' routes' : '') + ')\nLast turn it shipped ' + fmt(r.last) +
      '.\nTakes ' + count(G.travelTurns(s, from.tile, to.tile), 'turn', 'turns') + ' (' + G.dist(s, from.tile, to.tile) +
      ' tiles).\nEach unit delivered earns ' + N.tradeCoinPerUnit + ' coin' + market + '.';
  }

  function buildEffect(kind) {
    var b = N.builds[kind];
    if (b.site) return '+' + fmt(b.amount) + ' ' + b.makes + '/turn · ' + b.terrain + ' · ' + count(b.people, 'person', 'people');
    if (kind === 'settler') return 'founds a city · takes ' + count(b.people, 'person', 'people');
    if (kind === 'hall') return '+' + count(b.moves, 'move', 'moves') + ' per turn';
    if (kind === 'granary') return 'growing needs ' + fmt(b.growthDiscount * 100) + '% less food';
    if (kind === 'market') return '+' + fmt(b.coinBonus * 100) + '% coin from people and trade';
    if (kind === 'workshop') return '+' + fmt(b.productionBonus * 100) + '% production';
    return '';
  }

  function costText(cost) {
    var parts = [moveCost()];
    if (cost.coin) parts.push(fmt(cost.coin) + ' coin');
    if (cost.stone) parts.push(fmt(cost.stone) + ' stone');
    if (cost.food) parts.push(fmt(cost.food) + ' food');
    parts.push(fmt(cost.production) + ' production');
    return parts.join(' · ');
  }

  // ---- Top bar ----

  function renderTop() {
    var s = S(), per = G.movesPerTurn(s), saved = G.movesSaved(s), next = G.coinNext(s);
    var spent = Math.max(0, s.movesSaved + per - s.moves);
    var halls = G.hallsBuilt(s);
    var pips = '';
    var total = Math.min(MAX_PIPS, s.moves + spent);
    for (var k = 0; k < total; k++) pips += '<span class="pip' + (k < saved ? ' saved' : k < s.moves ? ' on' : '') + '"></span>';
    if (s.moves + spent > MAX_PIPS) pips += '<span class="muted">…</span>';
    var peopleLines = s.cities.map(function (c) {
      return c.name + ': ' + count(c.size, 'person', 'people') + ' × ' + N.coinPerPerson +
        (G.has(c, 'market') ? ' + Market ' + fmt(N.builds.market.coinBonus * 100) + '%' : '');
    }).join('\n');
    var coinTip = 'Your purse: ' + fmt(s.coin) + ' coin, one for the whole empire.\n\nNext end of turn: +' +
      fmt(next.people) + ' from people, +' + fmt(next.trade) + ' trade landing\n' + peopleLines +
      '\n\nLast turn: +' + fmt(s.lastIncome.people) + ' from people, +' + fmt(s.lastIncome.trade) + ' trade.' +
      '\nTrade: each unit a route delivers earns ' + N.tradeCoinPerUnit + ' coin.';
    var movesTip = 'Moves you can spend now: ' + s.moves + '\nEvery order costs ' + moveCost() + '; looking is free.' +
      '\n\nEach turn adds ' + per + ' (' + N.movesPerTurn + ' base + ' + halls * N.builds.hall.moves +
      ' from Halls; never above ' + N.movesCap + ').\n' + saved + ' of your moves were saved from earlier turns:' +
      ' unused moves carry over with no limit.\nSpent this turn: ' + spent + '. Undo gives a move back.' +
      '\n\nPips: gold = saved, blue = this turn\'s, hollow = spent.';
    $('stats').innerHTML =
      '<span class="stat"><span class="label">Turn</span><span class="big">' +
        num(s.turn, 'Turn ' + s.turn + '. There is no end and no score: play as long as you like.') + '</span></span>' +
      '<span class="stat"><span class="label">Coin</span><span class="big">' + num(fmt(s.coin), coinTip) +
        '</span><span class="muted">' + num(signed(next.total), coinTip) + ' next turn</span></span>' +
      '<span class="stat"><span class="label">Moves</span><span class="big">' + num(s.moves, movesTip) + '</span>' +
        '<span class="pips">' + pips + '</span><span class="muted">' +
        num(per + ' per turn', movesTip) + ' · ' + num(saved + ' saved', movesTip) + '</span></span>';
    var undo = $('undo');
    undo.disabled = !game.undo.length;
    undo.textContent = 'Undo' + (game.undo.length ? ' (' + game.undo.length + ')' : '');
    undo.parentNode.dataset.tip = game.undo.length
      ? 'Take back your last order this turn (' + game.undo.length + ' can be taken back). Its move, coin, stone and food come back. Ctrl+Z.'
      : 'Nothing to undo: no orders given this turn. Orders from earlier turns can only be changed by a new order.';
  }

  // ---- Side panel ----

  function renderSide() {
    var s = S(), t = ui.sel, html = '';
    if (t < 0) html = overview();
    else {
      var city = G.cityAt(s, t);
      if (city) html += cityPanel(city);
      G.settlersAt(s, t).forEach(function (st) { html += settlerPanel(st); });
      html += tilePanel(t, city);
    }
    var side = $('side'), top = side.scrollTop;
    side.innerHTML = html;
    side.scrollTop = ui.shownSel === t ? top : 0;
    ui.shownSel = t;
  }

  function overview() {
    var s = S();
    var html = '<h2>Your empire</h2><p class="muted">Click a tile or a city on the map to look at it. Looking is free; ' +
      'every order costs ' + moveCost() + '.</p><h3>Cities</h3>';
    s.cities.forEach(function (c) {
      var f = G.flow(s, c, 'food');
      html += '<div class="item link" data-act="goto" data-tile="' + c.tile + '"><b>' + c.name + '</b> · size ' + c.size +
        ' · food ' + num(signed(f.net) + '/turn', foodTip(c)) + ' · ' + (c.build ? 'building ' + lower(N.builds[c.build.kind].name) : '<span class="gold">nothing to build</span>') + '</div>';
    });
    if (s.settlers.length) {
      html += '<h3>Settlers</h3>';
      s.settlers.forEach(function (st) {
        html += '<div class="item link" data-act="goto" data-tile="' + st.tile + '">Settler at ' + where(st.tile) + ' · ' +
          (st.dest === null ? '<span class="gold">no orders</span>' : 'walking to ' + where(st.dest)) + '</div>';
      });
    }
    return html;
  }

  function cityPanel(city) {
    var s = S(), prod = G.production(s, city), food = G.flow(s, city, 'food'), stone = G.flow(s, city, 'stone');
    var staff = G.staffing(s, city), need = G.growthNeed(city), eat = G.eats(city);
    var atSites = city.size - staff.free;
    var html = '<h2><span class="swatch" style="background:' + cityColor(city) + '"></span>' + city.name +
      ' <span class="sub">size ' + num(city.size, 'People: ' + city.size + '. Each one eats ' + N.foodPerPerson +
        ' food, pays ' + N.coinPerPerson + ' coin and adds ' + N.productionPerPerson + ' production each turn, at a site or not.') + '</span></h2>';
    html += '<div>' + (city.attention > 0
      ? '<span class="gold">Attention: ' + num(count(city.attention, 'turn', 'turns') + ' left', 'An order given here (a build, a route starting here, founding it) gave the city attention: its sites make ' +
          fmt(N.attentionBonus * 100) + '% more for ' + N.attentionTurns + ' turns. A new order here restarts the count.') + '</span> · sites +' + fmt(N.attentionBonus * 100) + '%'
      : '<span class="muted">No attention: an order given here makes its sites produce ' + fmt(N.attentionBonus * 100) + '% more for ' + N.attentionTurns + ' turns.</span>') + '</div>';

    html += '<table class="stats">' +
      '<tr><th>People</th><td>' + num(city.size, 'The city puts its people on its sites by itself: farms first, then quarries, nearest first.\nAt sites: ' +
        atSites + '. Free: ' + staff.free + '.\nEveryone eats, pays coin and adds production, working or not.') + ' · ' + atSites + ' at sites, ' + staff.free + ' free</td></tr>' +
      '<tr><th>Food</th><td>store ' + num(fmt(city.food), foodTip(city)) + ' · eats ' +
        num(fmt(eat), count(city.size, 'person', 'people') + ' × ' + N.foodPerPerson + ' food each turn') + ' · grows at ' +
        num(fmt(need), 'Food needed to grow: ' + N.growthBase + ' + ' + N.growthPerSize + ' × size ' + city.size + ' = ' +
          fmt(N.growthBase + N.growthPerSize * city.size) + (G.has(city, 'granary') ? '\nGranary −' + fmt(N.builds.granary.growthDiscount * 100) + '% = ' + fmt(need) : '') +
          '\nWhen the store reaches it, the city gains a person and that food is used up.') +
        ' · <span class="' + (food.net < 0 ? 'bad' : 'good') + '">' + num(signed(food.net) + '/turn', foodTip(city)) + '</span></td></tr>' +
      '<tr><th>Stone</th><td>' + num(fmt(city.stone), stoneTip(city)) + ' · ' + num(signed(stone.net) + '/turn', stoneTip(city)) + '</td></tr>' +
      '<tr><th>Production</th><td>' + num(fmt(prod.total), productionTip(city)) + ' per turn</td></tr>' +
      '</table>';

    // The current build.
    html += '<h3>Building</h3>';
    var b = city.build;
    if (b) {
      var spec = N.builds[b.kind], left = Math.ceil((b.cost - b.progress) / prod.total);
      var waits = b.kind === 'settler' && b.progress >= b.cost;
      html += '<div class="item"><b>' + spec.name + '</b>' + (spec.site ? ' on ' + where(b.tile) : '') + ' · ' +
        num(fmt(b.progress) + ' / ' + fmt(b.cost), 'Production done / needed. This city makes ' + fmt(prod.total) + ' per turn.') +
        (waits ? ' · <span class="gold">ready, waits until the city has a person to spare</span>' : ' · done in ' + count(left, 'turn', 'turns')) +
        '<div class="bar"><div style="width:' + Math.min(100, b.progress / b.cost * 100) + '%"></div></div>' +
        '<div class="muted" style="font-size:13px;margin-top:3px">Paid ' + fmt(b.paidCoin) + ' coin and ' + fmt(b.paidStone) + ' stone' +
        (b.paidFood ? ' and ' + fmt(b.paidFood) + ' food' : '') + '. Ordering something else refunds the coin and stone' +
        (b.paidFood ? ' (not the food)' : '') + '; the progress is lost.</div></div>';
    } else {
      html += '<div class="item gold">Nothing. The city waits and its production goes unused.</div>';
    }

    // Build orders.
    html += '<h3>Orders <span class="sub">each costs ' + moveCost() + '</span></h3><div class="orders">';
    Object.keys(N.builds).forEach(function (kind) {
      var spec = N.builds[kind], c = G.checkBuild(s, city.id, kind), cost = c.cost;
      var turns = Math.ceil(cost.production / prod.total);
      var why = c.ok ? '' : c.reason;
      var text = spec.name + ': ' + costText(cost) + '.\n' + buildEffect(kind) + '.' +
        (spec.site ? '\nClick, then pick a ' + spec.terrain + ' tile inside the borders or next to them.' : '') +
        (kind === 'hall' ? '\nEach further Hall costs ' + spec.priceGrowth + ' times the one before (Halls built or being built: ' +
          G.hallsCounted(s, city) + '). One per city.' : '') +
        (spec.onePerCity && kind !== 'hall' ? '\nOne per city.' : '') +
        (kind === 'settler' ? '\nThe food is paid when ordered; the person when it is finished (it waits while the city is size ' + N.minCitySize + ').' : '') +
        (city.build ? '\nThis replaces the current build: its coin and stone come back, its progress is lost.' : '') +
        '\nAbout ' + count(turns, 'turn', 'turns') + ' at ' + fmt(prod.total) + ' production per turn.' +
        (why ? '\n\nCan\'t now: ' + why : '');
      html += '<div class="ow" data-tip="' + attr(text) + '"><button class="order" data-act="build" data-city="' + city.id +
        '" data-kind="' + kind + '"' + (c.ok ? '' : ' disabled') + '><span class="oname">' + spec.name +
        (spec.site ? ' …' : '') + '</span><span class="ocost">' + costText(cost).replace(moveCost() + ' · ', '') + '</span><span class="oeffect">' +
        buildEffect(kind) + ' · about ' + count(turns, 'turn', 'turns') + '</span>' + (why ? '<span class="why">' + why + '</span>' : '') + '</button></div>';
    });
    html += '</div>';

    html += '<h3>Buildings</h3><div>' + (city.buildings.length
      ? city.buildings.map(function (k) { return N.builds[k].name; }).join(', ')
      : '<span class="muted">none yet</span>') + '</div>';

    // Sites.
    html += '<h3>Sites</h3>';
    if (!staff.list.length) html += '<div class="muted">None yet. Sites are the only way the borders grow.</div>';
    staff.list.forEach(function (st) {
      var spec = N.builds[st.site.type], out = G.siteOutput(s, city, st.site);
      var travel = G.travelTurns(s, st.site.tile, city.tile);
      html += '<div class="item link" data-act="goto" data-tile="' + st.site.tile + '"><b>' + spec.name + '</b> ' + where(st.site.tile) + ' · ' +
        (st.working
          ? '<span class="good">working</span> · ' + num(fmt(out) + ' ' + spec.makes + '/turn', spec.amount + ' ' + spec.makes +
              (city.attention > 0 ? ' + attention ' + fmt(N.attentionBonus * 100) + '% = ' + fmt(out) : '') + ' each turn') +
            ' · ' + num(count(travel, 'turn', 'turns') + ' to the city', 'Output travels to the city by itself: 1 turn per ' +
              N.tilesPerTravelTurn + ' tiles, rounded up, at least ' + N.minTravelTurns + ' (' + G.dist(s, st.site.tile, city.tile) + ' tiles).')
          : '<span class="bad">idle</span>: needs ' + count(st.need, 'person', 'people') + ', ' + staff.free + ' free') + '</div>';
    });

    // Routes.
    html += '<h3>Routes <span class="sub">each change costs ' + moveCost() + '</span></h3>';
    s.routes.forEach(function (r) {
      if (r.from !== city.id) return;
      var to = G.cityById(s, r.to), other = r.good === 'food' ? 'stone' : 'food';
      var cg = G.checkRoute(s, r.from, r.to, other, r.id), cd = G.checkRoute(s, r.from, undefined, r.good, r.id);
      var cc = G.checkCancelRoute(s, r.id);
      html += '<div class="item">→ <b>' + to.name + '</b> · ' + r.good + ' · ' +
        num('ships ' + fmt(G.routeShare(s, r)), routeTip(r)) + ' · ' + count(G.travelTurns(s, city.tile, to.tile), 'turn', 'turns') +
        '<div class="acts">' +
        actBtn('route-good', 'data-route="' + r.id + '"', 'Carry ' + other + ' instead', cg) +
        actBtn('route-dest', 'data-route="' + r.id + '"', 'Change destination', cd) +
        actBtn('route-cancel', 'data-route="' + r.id + '"', 'Cancel route', cc) + '</div></div>';
    });
    s.routes.forEach(function (r) {
      if (r.to !== city.id) return;
      html += '<div class="item">← from <b>' + G.cityById(s, r.from).name + '</b> · ' + r.good + ' · ' +
        num('last delivery ' + fmt(r.last), routeTip(r)) + '</div>';
    });
    html += '<div class="row-actions">';
    G.GOODS.forEach(function (good) {
      html += actBtn('route-new', 'data-city="' + city.id + '" data-good="' + good + '"', 'New ' + good + ' route',
        G.checkRoute(s, city.id, undefined, good));
    });
    html += '</div>';

    // Goods on the way.
    html += '<h3>Goods on the way</h3>';
    var coming = s.transit.filter(function (g) { return g.to === city.id; });
    if (!coming.length) html += '<div class="muted">Nothing on the way.</div>';
    coming.forEach(function (g) {
      var what = g.trade
        ? ' shipped by the route from ' + g.from + ': everything above its reserve, shared among its routes with this good.\nEarns ' +
          N.tradeCoinPerUnit + ' coin per unit when it lands.'
        : ' made by the ' + g.from + ', with the attention bonus if the city had attention when it was sent.';
      html += '<div>' + num(fmt(g.amount) + ' ' + g.good, fmt(g.amount) + ' ' + g.good + what +
        '\nIt lands in the store at the end of turn ' + g.arrives + '.') + ' from ' + g.from + (g.trade ? ' (route)' : '') + ' · ' +
        lands(g.arrives) + '</div>';
    });
    return html;
  }

  /** A small order button, disabled with its reason when the check fails. */
  function actBtn(act, data, label, check) {
    return '<span class="ow" data-tip="' + attr(label + ': ' + moveCost() + '.' + (check.ok ? '' : '\nCan\'t now: ' + check.reason)) + '">' +
      '<button data-act="' + act + '" ' + data + (check.ok ? '' : ' disabled') + '>' + label + ' · ' + moveCost() + '</button>' +
      (check.ok ? '' : ' <span class="bad" style="font-size:13px">' + check.reason + '</span>') + '</span>';
  }

  function settlerPanel(st) {
    var s = S(), send = G.checkSend(s, st.id), found = G.checkFound(s, st.id), html = '<h2>Settler</h2>';
    if (st.dest === null) html += '<div class="gold">No orders. It waits here.</div>';
    else {
      var path = G.findPath(s, st.tile, st.dest);
      var steps = path ? path.length : 0;
      html += '<div>Walking to ' + where(st.dest) + ', about ' + num(count(Math.ceil(steps / N.settlerSteps), 'turn', 'turns'),
        steps + ' tiles to walk around mountains and water, ' + N.settlerSteps + ' per turn.') + ' left.</div>';
    }
    html += '<div class="row-actions" style="margin-top:8px">' +
      actBtn('send', 'data-settler="' + st.id + '"', st.dest === null ? 'Send to a tile' : 'Send elsewhere', send) +
      actBtn('found', 'data-settler="' + st.id + '"', 'Found a city here', found) + '</div>' +
      '<p class="muted" style="font-size:13px">A city goes on land at least ' + N.minCityDistance + ' tiles from every other city, ' +
      'outside other cities\' borders. It starts at size ' + N.newCitySize + ' with empty stores.</p>';
    return html;
  }

  function tilePanel(t, city) {
    var s = S(), site = G.siteAt(s, t), builder = G.siteBuilderAt(s, t), owner = s.owner[t];
    var html = '<h3>Tile ' + where(t) + '</h3><div>' + TERRAIN[s.terrain[t]].name +
      (G.passable(s, t) ? '' : ' (can\'t be entered)') + ' · ' +
      (owner ? 'held by ' + G.cityById(s, owner).name : 'held by nobody') + '</div>';
    if (city) html += '<div class="muted">The city tile makes ' + N.cityTileFood + ' food per turn with nobody working it.</div>';
    if (site) {
      var c = G.cityById(s, site.city), spec = N.builds[site.type];
      var st = G.staffing(s, c).list.find(function (x) { return x.site === site; });
      html += '<div class="item"><b>' + spec.name + '</b> of ' + c.name + ' · ' + (st.working ? '<span class="good">working</span>' :
        '<span class="bad">idle</span> (needs ' + count(spec.people, 'person', 'people') + ')') + '<br>Makes ' +
        num(fmt(G.siteOutput(s, c, site)) + ' ' + spec.makes, spec.amount + ' ' + spec.makes + ' per turn' + (c.attention > 0
          ? ' + attention ' + fmt(N.attentionBonus * 100) + '%' : '') + ', only while it has its people.') +
        ' per turn when worked; it reaches ' + c.name + ' after ' + num(count(G.travelTurns(s, t, c.tile), 'turn', 'turns'),
          G.dist(s, t, c.tile) + ' tiles: 1 turn per ' + N.tilesPerTravelTurn + ' tiles, rounded up, at least ' + N.minTravelTurns + '.') +
        '.<div class="acts"><button data-act="goto" data-tile="' + c.tile + '">Open ' + c.name + '</button></div></div>';
    }
    if (builder) {
      html += '<div class="item">' + builder.name + ' is building a ' + lower(N.builds[builder.build.kind].name) + ' here: ' +
        fmt(builder.build.progress) + ' / ' + fmt(builder.build.cost) + '</div>';
    }
    return html;
  }

  // ---- Waiting for you, and the turn log ----

  function renderWaiting() {
    var items = G.waiting(S());
    var html = '<h3>Waiting for you <span class="sub">(' + items.length + ')</span></h3>';
    if (!items.length) html += '<div class="muted">Nothing. Everything follows its last orders.</div>';
    items.forEach(function (it) {
      html += '<div class="item link" data-act="goto" data-tile="' + it.tile + '">' + it.text + '</div>';
    });
    $('waiting').innerHTML = html;
  }

  function renderLog() {
    var html = '<h3>Turn log</h3>';
    if (!history.length) html += '<div class="muted">What happens at the end of each turn shows here.</div>';
    history.forEach(function (h, k) {
      html += '<div class="' + (k ? 'old' : '') + '"><div class="logturn">End of turn ' + h.turn + '</div>';
      if (!h.entries.length) html += '<div class="muted">Nothing new.</div>';
      h.entries.forEach(function (e) {
        html += '<div class="link" data-act="goto" data-tile="' + e.tile + '">' + e.text + '</div>';
      });
      html += '</div>';
    });
    $('log').innerHTML = html;
  }

  function renderBanner() {
    var b = $('banner'), html = '';
    if (ui.msg) html = '<span class="bad">' + ui.msg + '</span>';
    if (ui.pick) html += '<span>' + pickText() + '</span><button data-act="cancel-pick">Cancel (Esc)</button>';
    else if (ui.msg) html += '<button data-act="dismiss">OK</button>';
    b.innerHTML = html;
    b.className = html ? 'show' + (ui.msg ? ' error' : '') : '';
  }

  function render() {
    renderTop();
    renderSide();
    renderWaiting();
    renderLog();
    renderBanner();
    draw();
  }

  // ---- Picking a tile for an order ----

  function pickText() {
    var p = ui.pick, s = S();
    if (p.kind === 'site') {
      var spec = N.builds[p.build];
      return 'Pick a ' + spec.terrain + ' tile for ' + G.cityById(s, p.city).name + '\'s ' + lower(spec.name) + ' (highlighted).';
    }
    if (p.kind === 'send') return 'Pick a tile for the settler. Diamonds mark tiles where a city could be founded.';
    return 'Pick the city the ' + p.good + ' goes to.';
  }

  /** The tiles the current pick accepts, as { tile: true }, or null when not picking. */
  function pickTargets() {
    var p = ui.pick, s = S(), out = {};
    if (!p) return null;
    if (p.kind === 'site') {
      G.siteTiles(s, G.cityById(s, p.city), p.build).forEach(function (t) { out[t] = true; });
    } else if (p.kind === 'send') {
      var st = G.settlerById(s, p.settler);
      G.reachable(s, st.tile).forEach(function (t) { if (t !== st.dest) out[t] = true; });
    } else {
      s.cities.forEach(function (c) { if (G.checkRoute(s, p.from, c.id, p.good, p.route).ok) out[c.tile] = true; });
    }
    return out;
  }

  /** Why the current pick would refuse this tile, or null. */
  function pickProblem(t) {
    var p = ui.pick, s = S();
    if (p.kind === 'site') return G.checkBuild(s, p.city, p.build, t).reason || null;
    if (p.kind === 'send') return G.checkSend(s, p.settler, t).reason || null;
    var c = G.cityAt(s, t);
    return c ? G.checkRoute(s, p.from, c.id, p.good, p.route).reason || null : 'Pick one of your cities';
  }

  function pickTry(t) {
    var p = ui.pick, s = S();
    if (p.kind === 'site') return G.orderBuild(game, p.city, p.build, t);
    if (p.kind === 'send') return G.orderSend(game, p.settler, t);
    var c = G.cityAt(s, t);
    if (!c) return { ok: false, reason: 'Pick one of your cities' };
    return p.route !== undefined ? G.orderChangeRoute(game, p.route, c.id, p.good) : G.orderRoute(game, p.from, c.id, p.good);
  }

  function startPick(p) {
    ui.pick = p;
    ui.msg = null;
    render();
  }

  function cancelPick() {
    ui.pick = null;
    ui.msg = null;
    render();
  }

  // ---- The map ----

  function centre(i) {
    var s = S(), c = G.col(s, i), r = G.row(s, i);
    return { x: HEX * SQ3 * (c + (r % 2) / 2), y: HEX * 1.5 * r };
  }

  function screenOf(p) { return { x: ui.cam.x + p.x * ui.cam.zoom, y: ui.cam.y + p.y * ui.cam.zoom }; }

  function hexPath(p, rad) {
    ctx.beginPath();
    for (var k = 0; k < 6; k++) {
      var a = Math.PI / 3 * k - Math.PI / 6;
      ctx[k ? 'lineTo' : 'moveTo'](p.x + rad * Math.cos(a), p.y + rad * Math.sin(a));
    }
    ctx.closePath();
  }

  function tileAt(sx, sy) {
    var s = S(), wx = (sx - ui.cam.x) / ui.cam.zoom, wy = (sy - ui.cam.y) / ui.cam.zoom;
    var q = (SQ3 / 3 * wx - wy / 3) / HEX, r = (2 / 3 * wy) / HEX;
    var x = q, z = r, y = -x - z, rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    var dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
    var row = rz, col = rx + (rz - (rz & 1)) / 2;
    if (col < 0 || row < 0 || col >= s.w || row >= s.h) return -1;
    return row * s.w + col;
  }

  function fit() {
    var s = S(), w = canvas.clientWidth, h = canvas.clientHeight;
    var minX = -HEX * SQ3 / 2, maxX = HEX * SQ3 * s.w, minY = -HEX, maxY = HEX * 1.5 * (s.h - 1) + HEX;
    var z = Math.min(w / (maxX - minX), h / (maxY - minY)) * 0.97;
    ui.cam.zoom = z;
    ui.cam.x = (w - (maxX - minX) * z) / 2 - minX * z;
    ui.cam.y = (h - (maxY - minY) * z) / 2 - minY * z;
  }

  function sitePath(type, p) {
    var r = HEX * 0.42;
    ctx.beginPath();
    if (type === 'quarry') {
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x + r, p.y + r * 0.8);
      ctx.lineTo(p.x - r, p.y + r * 0.8);
      ctx.closePath();
    } else {
      ctx.rect(p.x - r * 0.85, p.y - r * 0.85, r * 1.7, r * 1.7);
    }
  }

  var SITE_FILL = { farm: '#f4d35e', quarry: '#5a3d2b' };

  function draw() {
    if (!game) return;
    var s = S(), dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight, z = ui.cam.zoom;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0d1a28';
    ctx.fillRect(0, 0, w, h);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ui.cam.x, dpr * ui.cam.y);
    ctx.lineJoin = 'round';
    var targets = pickTargets(), i, p;

    // Terrain, by colour alone (D3).
    for (i = 0; i < s.terrain.length; i++) {
      hexPath(centre(i), HEX);
      ctx.fillStyle = TERRAIN[s.terrain[i]].color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 1 / z;
      ctx.stroke();
    }

    // While picking, dim the tiles the order can't use.
    if (targets) {
      for (i = 0; i < s.terrain.length; i++) {
        if (targets[i]) continue;
        hexPath(centre(i), HEX);
        ctx.fillStyle = 'rgba(0,0,0,0.42)';
        ctx.fill();
      }
    }

    // Borders: an outline in the city's colour along every edge where the holder changes.
    var edges = [];
    for (i = 0; i < s.terrain.length; i++) {
      var o = s.owner[i];
      if (!o) continue;
      p = centre(i);
      for (var d = 0; d < 6; d++) {
        var nb = G.neighbor(s, i, d);
        if (nb >= 0 && s.owner[nb] === o) continue;
        var a1 = Math.PI / 3 * d - Math.PI / 6, a2 = a1 + Math.PI / 3, rr = HEX - 2.5;
        edges.push({ x1: p.x + rr * Math.cos(a1), y1: p.y + rr * Math.sin(a1), x2: p.x + rr * Math.cos(a2), y2: p.y + rr * Math.sin(a2),
          color: cityColor(G.cityById(s, o)) });
      }
    }
    [['rgba(0,0,0,0.75)', 6], [null, 3]].forEach(function (pass) {
      edges.forEach(function (e) {
        ctx.beginPath();
        ctx.moveTo(e.x1, e.y1);
        ctx.lineTo(e.x2, e.y2);
        ctx.strokeStyle = pass[0] || e.color;
        ctx.lineWidth = pass[1];
        ctx.lineCap = 'round';
        ctx.stroke();
      });
    });

    // Sites (solid; faded with a red mark when idle) and sites being built (dashed).
    var idle = [];
    s.cities.forEach(function (c) {
      G.staffing(s, c).list.forEach(function (st) {
        var sp = centre(st.site.tile);
        ctx.globalAlpha = st.working ? 1 : 0.5;
        sitePath(st.site.type, sp);
        ctx.fillStyle = SITE_FILL[st.site.type];
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (!st.working) idle.push(sp);
      });
      if (c.build && N.builds[c.build.kind].site) {
        var bp = centre(c.build.tile);
        sitePath(c.build.kind, bp);
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Routes: a line with an arrow from the sending city; the amount is drawn later as a label.
    var routeLabels = [];
    s.routes.forEach(function (r) {
      var a = centre(G.cityById(s, r.from).tile), b = centre(G.cityById(s, r.to).tile);
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len;
      // Routes between the same two cities sit side by side: one side per direction, then further out.
      var same = s.routes.filter(function (x) { return x.from === r.from && x.to === r.to; });
      var off = 6 + same.indexOf(r) * 8, ox = -uy * off, oy = ux * off, cut = HEX * 0.75;
      var x1 = a.x + ox + ux * cut, y1 = a.y + oy + uy * cut, x2 = b.x + ox - ux * cut, y2 = b.y + oy - uy * cut;
      [['rgba(0,0,0,0.8)', 6], [GOOD_COLORS[r.good], 3]].forEach(function (pass) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.moveTo(x2 - ux * 10 - uy * 6, y2 - uy * 10 + ux * 6);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2 - ux * 10 + uy * 6, y2 - uy * 10 - ux * 6);
        ctx.strokeStyle = pass[0];
        ctx.lineWidth = pass[1];
        ctx.stroke();
      });
      routeLabels.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, route: r });
    });

    // Cities: a circle in the city's colour; a gold ring while it has attention.
    s.cities.forEach(function (c) {
      var cp = centre(c.tile);
      if (c.attention > 0) {
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, HEX * 0.82, 0, Math.PI * 2);
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = '#ffc94d';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, HEX * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = cityColor(c);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });

    // Settlers: a small white circle (offset when sharing a tile); a dashed line to where they are going.
    var settlerSpots = [];
    s.settlers.forEach(function (st, k) {
      var sp = centre(st.tile), shared = G.cityAt(s, st.tile) || s.settlers.some(function (o, j) { return j < k && o.tile === st.tile; });
      if (shared) sp = { x: sp.x + HEX * 0.5, y: sp.y + HEX * 0.4 };
      if (st.dest !== null) {
        var dp = centre(st.dest);
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(dp.x, dp.y);
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(dp.x - 6, dp.y - 6); ctx.lineTo(dp.x + 6, dp.y + 6);
        ctx.moveTo(dp.x + 6, dp.y - 6); ctx.lineTo(dp.x - 6, dp.y + 6);
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, HEX * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.stroke();
      settlerSpots.push(sp);
    });

    // Outlines on top: the tiles a pick accepts, the selected tile and the tile under the mouse.
    if (targets) {
      Object.keys(targets).forEach(function (t) {
        hexPath(centre(+t), HEX - 3);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        if (ui.pick.kind === 'send' && !G.foundProblemAt(s, +t)) {
          var fp = centre(+t);
          ctx.beginPath();
          ctx.moveTo(fp.x, fp.y - 5); ctx.lineTo(fp.x + 5, fp.y); ctx.lineTo(fp.x, fp.y + 5); ctx.lineTo(fp.x - 5, fp.y);
          ctx.closePath();
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }
    if (ui.sel >= 0) {
      hexPath(centre(ui.sel), HEX - 1);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    if (ui.hover >= 0 && ui.hover !== ui.sel) {
      hexPath(centre(ui.hover), HEX - 1);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Text, in screen pixels so it stays readable at any zoom.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    idle.forEach(function (ip) {
      var q = screenOf({ x: ip.x + HEX * 0.45, y: ip.y - HEX * 0.45 });
      ctx.beginPath();
      ctx.arc(q.x, q.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#e53935';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Segoe UI, sans-serif';
      ctx.fillText('!', q.x, q.y + 0.5);
    });
    settlerSpots.forEach(function (sp) {
      var q = screenOf(sp);
      ctx.fillStyle = '#111';
      ctx.font = 'bold ' + Math.max(10, Math.round(13 * z)) + 'px Segoe UI, sans-serif';
      ctx.fillText('S', q.x, q.y + 0.5);
    });
    var taken = []; // city name labels, which route labels keep clear of
    s.cities.forEach(function (c) {
      var q = screenOf(centre(c.tile)), rad = HEX * 0.6 * z;
      ctx.font = 'bold ' + Math.max(11, Math.round(16 * z)) + 'px Segoe UI, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.strokeText(String(c.size), q.x, q.y + 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(String(c.size), q.x, q.y + 1);
      ctx.font = 'bold 13px Segoe UI, sans-serif';
      var tw = ctx.measureText(c.name).width + 12;
      pill(q.x, q.y + rad + 12, tw, 19, 'rgba(10,14,20,0.85)', cityColor(c));
      taken.push({ x: q.x - tw / 2, y: q.y + rad + 2.5, w: tw, h: 19 });
      ctx.fillStyle = '#fff';
      ctx.fillText(c.name, q.x, q.y + rad + 12.5);
      // Buildings: small lettered squares above the city.
      var bw = 15, startX = q.x - (c.buildings.length * (bw + 2) - 2) / 2;
      c.buildings.forEach(function (k, j) {
        var bx = startX + j * (bw + 2), by = q.y - rad - bw - 3;
        ctx.fillStyle = '#f5f0e6';
        ctx.fillRect(bx, by, bw, bw);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, bw, bw);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px Segoe UI, sans-serif';
        ctx.fillText(N.builds[k].name.charAt(0), bx + bw / 2, by + bw / 2 + 0.5);
      });
    });
    ui.labels = [];
    routeLabels.forEach(function (l) {
      var q = screenOf(l), text = fmt(G.routeShare(s, l.route)) + ' ' + l.route.good;
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      var tw = ctx.measureText(text).width + 10;
      // Move a route label down until it covers no city name and no other route label.
      while (taken.concat(ui.labels).some(function (o) { return Math.abs(o.x + o.w / 2 - q.x) < (o.w + tw) / 2 && Math.abs(o.y + o.h / 2 - q.y) < 19; })) q.y += 20;
      pill(q.x, q.y, tw, 18, 'rgba(10,14,20,0.88)', GOOD_COLORS[l.route.good]);
      ctx.fillStyle = GOOD_COLORS[l.route.good];
      ctx.fillText(text, q.x, q.y + 0.5);
      ui.labels.push({ x: q.x - tw / 2, y: q.y - 9, w: tw, h: 18, tip: routeTip(l.route) });
    });
  }

  function pill(x, y, w, h, fill, stroke) {
    var r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + r, y - r);
    ctx.lineTo(x + w / 2 - r, y - r);
    ctx.arc(x + w / 2 - r, y, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x - w / 2 + r, y + r);
    ctx.arc(x - w / 2 + r, y, r, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ---- Hover text ----

  function showTip(text, x, y) {
    tip.textContent = text;
    tip.style.display = 'block';
    var w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(6, Math.min(x + 14, window.innerWidth - w - 8)) + 'px';
    tip.style.top = (y + 18 + h > window.innerHeight ? Math.max(6, y - h - 10) : y + 18) + 'px';
  }

  function hideTip() { tip.style.display = 'none'; }

  function tileTip(t) {
    var s = S(), lines = [TERRAIN[s.terrain[t]].name + ' ' + where(t) + (G.passable(s, t) ? '' : ': can\'t be entered')];
    var city = G.cityAt(s, t), site = G.siteAt(s, t);
    if (city) lines.push(city.name + ', size ' + city.size);
    if (site) lines.push(N.builds[site.type].name + ' of ' + G.cityById(s, site.city).name);
    var n = G.settlersAt(s, t).length;
    if (n) lines.push(count(n, 'settler', 'settlers'));
    lines.push(s.owner[t] ? 'Held by ' + G.cityById(s, s.owner[t]).name : 'Held by nobody');
    if (ui.pick) {
      var why = pickProblem(t);
      lines.push(why ? 'Can\'t: ' + why : 'Click to give the order (' + moveCost() + ')');
    }
    return lines.join('\n');
  }

  function canvasPoint(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function canvasHover(e) {
    var m = canvasPoint(e);
    var label = ui.labels.find(function (l) { return m.x >= l.x && m.x <= l.x + l.w && m.y >= l.y && m.y <= l.y + l.h; });
    var t = tileAt(m.x, m.y);
    if (t !== ui.hover) {
      ui.hover = t;
      draw();
    }
    if (label) showTip(label.tip, e.clientX, e.clientY);
    else if (t >= 0) showTip(tileTip(t), e.clientX, e.clientY);
    else hideTip();
  }

  // ---- Actions ----

  function result(res) {
    ui.msg = res.ok ? null : res.reason;
    render();
  }

  function select(t, centreOn) {
    ui.sel = t;
    ui.msg = null;
    if (centreOn && t >= 0) {
      var q = screenOf(centre(t)), w = canvas.clientWidth, h = canvas.clientHeight;
      if (q.x < 40 || q.y < 40 || q.x > w - 40 || q.y > h - 40) {
        ui.cam.x += w / 2 - q.x;
        ui.cam.y += h / 2 - q.y;
      }
    }
    render();
  }

  function clickTile(t) {
    if (ui.pick) {
      if (t < 0) return;
      var res = pickTry(t);
      if (res.ok) ui.pick = null;
      ui.msg = res.ok ? null : res.reason;
      render();
      return;
    }
    select(t, false);
  }

  function endTurn() {
    var turn = S().turn;
    ui.pick = null;
    ui.msg = null;
    G.endTurn(game);
    history.unshift({ turn: turn, entries: S().log });
    history.length = Math.min(history.length, LOG_TURNS);
    render();
  }

  function doUndo() {
    ui.pick = null;
    result(G.undo(game));
  }

  function newGame(seed) {
    game = G.newGame(seed);
    history = [];
    ui.pick = null;
    ui.msg = null;
    ui.sel = S().cities[0].tile;
    $('seed').value = seed;
    fit();
    render();
  }

  function newGameFromInput() {
    var seed = Math.floor(Math.abs(Number($('seed').value)));
    if (!isFinite(seed)) seed = N.map.defaultSeed;
    if ((S().turn > 1 || game.undo.length) && !window.confirm('Start a new game on seed ' + seed + '? This game will be lost.')) return;
    newGame(seed);
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el || el.disabled) return;
    if (el.tagName === 'BUTTON') el.blur();
    var s = S(), d = el.dataset, r;
    switch (d.act) {
      case 'end': endTurn(); break;
      case 'undo': doUndo(); break;
      case 'new': newGameFromInput(); break;
      case 'random':
        $('seed').value = Math.floor(Math.random() * 100000);
        newGameFromInput();
        break;
      case 'goto': select(+d.tile, true); break;
      case 'build':
        if (N.builds[d.kind].site) startPick({ kind: 'site', city: +d.city, build: d.kind });
        else result(G.orderBuild(game, +d.city, d.kind));
        break;
      case 'send': startPick({ kind: 'send', settler: +d.settler }); break;
      case 'found': result(G.orderFound(game, +d.settler)); break;
      case 'route-new': startPick({ kind: 'route', from: +d.city, good: d.good }); break;
      case 'route-good':
        r = G.routeById(s, +d.route);
        result(G.orderChangeRoute(game, r.id, r.to, r.good === 'food' ? 'stone' : 'food'));
        break;
      case 'route-dest':
        r = G.routeById(s, +d.route);
        startPick({ kind: 'route', from: r.from, good: r.good, route: r.id });
        break;
      case 'route-cancel': result(G.orderCancelRoute(game, +d.route)); break;
      case 'cancel-pick': cancelPick(); break;
      case 'dismiss': ui.msg = null; render(); break;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') {
      if (e.key === 'Enter') newGameFromInput();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) endTurn();
    } else if (e.key === 'Escape') {
      if (ui.pick) cancelPick();
      else select(-1, false);
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      doUndo();
    }
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === ' ' && e.target.tagName !== 'INPUT') e.preventDefault();
  });

  canvas.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    ui.down = { x: e.clientX, y: e.clientY, cx: ui.cam.x, cy: ui.cam.y, moved: false };
  });
  window.addEventListener('mousemove', function (e) {
    if (ui.down) {
      var dx = e.clientX - ui.down.x, dy = e.clientY - ui.down.y;
      if (!ui.down.moved && Math.sqrt(dx * dx + dy * dy) > DRAG_PX) ui.down.moved = true;
      if (ui.down.moved) {
        ui.cam.x = ui.down.cx + dx;
        ui.cam.y = ui.down.cy + dy;
        canvas.style.cursor = 'grabbing';
        hideTip();
        draw();
      }
      return;
    }
    if (e.target === canvas) return canvasHover(e);
    var el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (el) showTip(el.dataset.tip, e.clientX, e.clientY);
    else hideTip();
  });
  window.addEventListener('mouseup', function (e) {
    if (!ui.down) return;
    var d = ui.down;
    ui.down = null;
    canvas.style.cursor = '';
    if (!d.moved && e.target === canvas) {
      var m = canvasPoint(e);
      clickTile(tileAt(m.x, m.y));
    }
  });
  canvas.addEventListener('mouseleave', function () {
    ui.hover = -1;
    hideTip();
    draw();
  });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var m = canvasPoint(e), z0 = ui.cam.zoom;
    var z = Math.max(0.3, Math.min(3, z0 * Math.exp(-e.deltaY * 0.0015)));
    ui.cam.x = m.x - (m.x - ui.cam.x) * z / z0;
    ui.cam.y = m.y - (m.y - ui.cam.y) * z / z0;
    ui.cam.zoom = z;
    draw();
  }, { passive: false });
  canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    if (ui.pick) cancelPick();
  });
  window.addEventListener('resize', draw);

  // ---- Start ----

  $('top').innerHTML = '<span class="title">TemuCiv · slice 1</span><span id="stats" style="display:contents"></span>' +
    '<span class="spacer"></span>' +
    '<span class="ow"><button id="undo" data-act="undo">Undo</button></span>' +
    '<span class="ow" data-tip="End the turn (Enter or Space). Everything follows its last orders; unused moves are saved.">' +
    '<button id="endturn" data-act="end">End turn ⏎</button></span>' +
    '<span class="stat" data-tip="The map comes from this number: the same seed always gives the same map. Type any number and press Enter or New game.">' +
    '<span class="label">Seed</span><input id="seed" type="number" min="0"><button data-act="new">New game</button>' +
    '<button data-act="random">Random</button></span>';
  var legend = document.createElement('div');
  legend.style.cssText = 'position:absolute;left:10px;bottom:36px;display:flex;gap:10px;flex-wrap:wrap;background:rgba(12,16,21,0.75);padding:4px 8px;border-radius:6px;font-size:13px';
  legend.innerHTML = Object.keys(TERRAIN).map(function (k) {
    return '<span><span style="display:inline-block;width:12px;height:12px;border:1px solid #000;vertical-align:-1px;background:' +
      TERRAIN[k].color + '"></span> ' + TERRAIN[k].name + '</span>';
  }).join('') + '<span><b style="color:' + SITE_FILL.farm + '">■</b> farm</span><span><b style="color:#c9a27e">▲</b> quarry</span>' +
    '<span>⚪ settler</span><span><b style="color:#ffc94d">◌</b> attention</span>';
  $('mapwrap').appendChild(legend);
  newGame(N.map.defaultSeed);
})();
