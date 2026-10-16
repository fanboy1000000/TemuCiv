// TemuCiv prototype: the smoke check (docs/WORKFLOW.md, "Prototype phase").
//
// Plays TURNS turns from a fixed seed, giving random valid orders of every kind, undoing some of them, and trying
// some refused ones; then a shorter war game the same way, from a start with a large army next to a rival city
// (see warStart). After every order and every turn it checks: no exception, no NaN, no negative coin, food or
// stone, moves never negative, moves per turn never above the cap, armies and garrisons whole and never negative,
// and that undo restores the state exactly. The run must reach battles, a captured city and a hungry army, so it
// tests them.
//
//   node prototype/smoke.js      (from the repository root; exit 0 = every check held, 1 = a failure, explained)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const SEED = 1;
const TURNS = 300;
const WAR_TURNS = 100; // the second, shorter game that starts with an army next to a rival city (see warStart)
const WAR_ARMY = 40; // regiments in that army: enough to be very likely to win its first battle
const MAX_ORDERS_PER_TURN = 6;
const UNDO_CHANCE = 0.25; // after an order, how often it is taken back again
const UNDO_ALL_CHANCE = 0.05; // how often a whole turn's orders are taken back
const REFUSED_CHANCE = 0.3; // how often a turn also tries an order that should be refused
const TO_RIVAL_CHANCE = 0.5; // how often a march goes to a tile next to a rival city, so battles happen
// Every kind of order; the run fails if one was never given.
const ORDER_KINDS = ['build', 'site', 'send', 'found', 'route-new', 'route-change', 'route-cancel', 'general', 'regiment',
  'march', 'take', 'leave', 'supply-set', 'supply-change', 'supply-cancel'];

for (const file of ['numbers.js', 'game.js']) {
  vm.runInThisContext(readFileSync(join(import.meta.dirname, file), 'utf8'), { filename: join('prototype', file) });
}
const G = globalThis.Game;
const N = globalThis.NUMBERS;

let turnNow = 0, gameNow = '';
function fail(message) {
  const err = new Error(message);
  err.check = true;
  throw err;
}

/** Every number anywhere in the state is finite (no NaN, no Infinity). */
function checkNumbers(value, path) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(`${path} is ${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => checkNumbers(v, `${path}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) checkNumbers(v, `${path}.${k}`);
  }
}

function checkState(s, when) {
  checkNumbers(s, 'state');
  if (s.coin < 0) fail(`${when}: coin is negative (${s.coin})`);
  if (s.moves < 0) fail(`${when}: moves are negative (${s.moves})`);
  const perTurn = G.movesPerTurn(s);
  const fromHalls = N.movesPerTurn + G.hallsBuilt(s) * N.builds.hall.moves;
  if (perTurn > N.movesCap) fail(`${when}: moves per turn ${perTurn} above the cap ${N.movesCap}`);
  if (fromHalls > Math.max(N.movesCap, N.movesPerTurn)) fail(`${when}: ${G.hallsBuilt(s)} Halls push moves per turn to ${fromHalls}, above the cap ${N.movesCap}`);
  for (const c of s.cities) {
    if (c.food < 0) fail(`${when}: ${c.name} has negative food (${c.food})`);
    if (c.stone < 0) fail(`${when}: ${c.name} has negative stone (${c.stone})`);
    if (c.size < N.minCitySize) fail(`${when}: ${c.name} has size ${c.size}`);
    if (c.build && (c.build.progress < 0 || c.build.progress > c.build.cost)) fail(`${when}: ${c.name} build progress ${c.build.progress}/${c.build.cost}`);
  }
  for (const g of s.transit) if (g.amount < 0) fail(`${when}: negative ${g.good} on the way (${g.amount})`);
  for (const r of s.routes) if (r.last < 0) fail(`${when}: route ${r.id} shipped a negative amount (${r.last})`);
  const whole = (n) => Number.isInteger(n) && n >= 0;
  for (const c of s.cities) if (!whole(c.garrison)) fail(`${when}: ${c.name} has garrison ${c.garrison}`);
  for (const r of s.rivals) {
    if (!whole(r.garrison) || r.garrison < 1) fail(`${when}: rival ${r.name} has garrison ${r.garrison}`);
    if (G.cityAt(s, r.tile)) fail(`${when}: rival ${r.name} shares a tile with one of your cities`);
  }
  for (const g of s.generals) {
    if (!whole(g.regiments)) fail(`${when}: general ${g.id} has ${g.regiments} regiments`);
    if (g.baggage < 0) fail(`${when}: general ${g.id} has negative baggage (${g.baggage})`);
    if (!G.passable(s, g.tile) || G.rivalAt(s, g.tile)) fail(`${when}: general ${g.id} stands on a tile it can't enter`);
    if (g.supply !== null && !G.cityById(s, g.supply)) fail(`${when}: general ${g.id} is supplied by a city you don't have`);
  }
}

/** Every order the player could try now, valid or not, grouped by kind. */
function candidates(game, rng) {
  const s = game.state;
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const out = {};
  for (const kind of ORDER_KINDS) out[kind] = [];
  const add = (kind, check, run) => out[kind].push({ kind, check, run });
  for (const city of s.cities) {
    for (const kind of Object.keys(N.builds)) {
      if (N.builds[kind].site) {
        const tiles = G.siteTiles(s, city, kind);
        const wrong = Math.floor(rng() * s.terrain.length); // any tile, usually a refused one
        for (const t of tiles.concat([wrong])) {
          add('site', () => G.checkBuild(s, city.id, kind, t), () => G.orderBuild(game, city.id, kind, t));
        }
      } else {
        // Generals and regiments are counted apart from the other builds, so the run proves it gave them.
        const label = kind === 'general' || kind === 'regiment' ? kind : 'build';
        add(label, () => G.checkBuild(s, city.id, kind), () => G.orderBuild(game, city.id, kind));
      }
    }
    for (const to of s.cities) {
      for (const good of G.GOODS) {
        add('route-new', () => G.checkRoute(s, city.id, to.id, good), () => G.orderRoute(game, city.id, to.id, good));
      }
    }
  }
  for (const st of s.settlers) {
    const places = G.reachable(s, st.tile);
    const t = places.length && rng() < 0.9 ? pick(places) : Math.floor(rng() * s.terrain.length);
    add('send', () => G.checkSend(s, st.id, t), () => G.orderSend(game, st.id, t));
    add('found', () => G.checkFound(s, st.id), () => G.orderFound(game, st.id));
  }
  for (const r of s.routes) {
    const other = r.good === 'food' ? 'stone' : 'food';
    const to = pick(s.cities).id;
    add('route-change', () => G.checkRoute(s, r.from, r.to, other, r.id), () => G.orderChangeRoute(game, r.id, r.to, other));
    add('route-change', () => G.checkRoute(s, r.from, to, r.good, r.id), () => G.orderChangeRoute(game, r.id, to, r.good));
    add('route-cancel', () => G.checkCancelRoute(s, r.id), () => G.orderCancelRoute(game, r.id));
  }
  const blocked = G.armyBlocked(s);
  for (const g of s.generals) {
    const places = G.reachable(s, g.tile, blocked);
    const nextToRival = places.filter((t) => G.rivalsNext(s, t).length);
    const t = nextToRival.length && rng() < TO_RIVAL_CHANCE ? pick(nextToRival)
      : places.length && rng() < 0.9 ? pick(places) : Math.floor(rng() * s.terrain.length);
    add('march', () => G.checkMarch(s, g.id, t), () => G.orderMarch(game, g.id, t));
    const here = G.cityAt(s, g.tile);
    const takeN = 1 + Math.floor(rng() * ((here ? here.garrison : 0) + 1)); // sometimes one too many
    add('take', () => G.checkTake(s, g.id, takeN), () => G.orderTake(game, g.id, takeN));
    const leaveN = 1 + Math.floor(rng() * (g.regiments + 1));
    add('leave', () => G.checkLeave(s, g.id, leaveN), () => G.orderLeave(game, g.id, leaveN));
    const city = pick(s.cities);
    add(g.supply === null ? 'supply-set' : 'supply-change', () => G.checkSupply(s, g.id, city.id), () => G.orderSupply(game, g.id, city.id));
    add('supply-cancel', () => G.checkCancelSupply(s, g.id), () => G.orderCancelSupply(game, g.id));
  }
  return out;
}

/**
 * The war game's start (a test fixture, set directly in the state): the first general leads a large army with
 * full baggage on a tile next to the nearest rival city, so the first turn ends in a battle it is very likely to
 * win. Random orders alone never muster such an army, so without this the run would not test wins, captures and
 * play with captured cities.
 */
function warStart(seed) {
  const game = G.newGame(seed), s = game.state, home = s.cities[0], g = s.generals[0];
  const near = G.reachable(s, home.tile, G.armyBlocked(s)).filter((t) => G.rivalsNext(s, t).length);
  near.sort((a, b) => G.dist(s, home.tile, a) - G.dist(s, home.tile, b) || a - b);
  if (!near.length || !g) fail('the war game found no tile next to a rival city for its army');
  g.tile = near[0];
  g.regiments = WAR_ARMY;
  g.baggage = G.baggageCap(g);
  return game;
}

/** Plays `turns` turns of random orders, checking everything after each order and each turn. */
function play(game, turns, rng, tally) {
  for (let turn = 1; turn <= turns; turn++) {
    turnNow = game.state.turn;
    const turnStart = JSON.stringify(game.state);
    const orders = Math.min(game.state.moves, Math.floor(rng() * (MAX_ORDERS_PER_TURN + 1)));

    for (let k = 0; k < orders; k++) {
      const all = candidates(game, rng);
      const valid = Object.values(all).map((list) => list.filter((o) => o.check().ok)).filter((list) => list.length);
      if (!valid.length) break;
      const kindList = valid[Math.floor(rng() * valid.length)];
      const order = kindList[Math.floor(rng() * kindList.length)];
      const before = JSON.stringify(game.state);
      const movesBefore = game.state.moves;
      const res = order.run();
      if (!res.ok) fail(`a ${order.kind} order passed its check but was refused: ${res.reason}`);
      if (game.state.moves !== movesBefore - N.orderMoves) fail(`a ${order.kind} order cost ${movesBefore - game.state.moves} moves, not ${N.orderMoves}`);
      tally.counts[order.kind]++;
      checkState(game.state, `after a ${order.kind} order`);
      if (rng() < UNDO_CHANCE) {
        if (!G.undo(game).ok) fail('undo refused right after an order');
        if (JSON.stringify(game.state) !== before) fail(`undo after a ${order.kind} order did not restore the state exactly`);
        tally.undone++;
      }
    }

    if (rng() < REFUSED_CHANCE) {
      const all = candidates(game, rng);
      const bad = Object.values(all).flat().filter((o) => !o.check().ok);
      if (bad.length) {
        const order = bad[Math.floor(rng() * bad.length)];
        const before = JSON.stringify(game.state), undoDepth = game.undo.length;
        if (order.run().ok) fail(`a ${order.kind} order failed its check but was carried out`);
        if (JSON.stringify(game.state) !== before || game.undo.length !== undoDepth) fail(`a refused ${order.kind} order changed the state`);
        tally.refused++;
      }
    }

    if (rng() < UNDO_ALL_CHANCE && game.undo.length) {
      while (game.undo.length) G.undo(game);
      if (JSON.stringify(game.state) !== turnStart) fail('undoing every order of the turn did not restore the start of the turn');
      tally.undoneTurns++;
    }

    const movesBefore = game.state.moves;
    for (const e of G.endTurn(game).log) if (e.kind) tally.events[e.kind]++;
    turnNow = game.state.turn;
    checkState(game.state, 'after ending the turn');
    if (game.state.moves - movesBefore !== G.movesPerTurn(game.state)) fail('the turn did not add exactly the moves per turn');
    if (G.undo(game).ok) fail('undo reached back past the start of the turn');
  }
}

function main() {
  const rng = G.makeRng(SEED * 7919 + 13);
  const tally = { counts: {}, events: { battle: 0, capture: 0, hunger: 0 }, undone: 0, undoneTurns: 0, refused: 0 };
  for (const kind of ORDER_KINDS) tally.counts[kind] = 0;

  gameNow = 'the main game';
  const game = G.newGame(SEED);
  checkState(game.state, 'new game');
  play(game, TURNS, rng, tally);
  const mainBattles = tally.events.battle;
  if (!mainBattles) fail('the main game never reached a battle, so it did not test them');

  gameNow = 'the war game';
  const war = warStart(SEED);
  checkState(war.state, 'the war start');
  play(war, WAR_TURNS, rng, tally);

  const { counts, events } = tally;
  const never = Object.entries(counts).filter(([, n]) => n === 0).map(([k]) => k);
  if (never.length) fail(`these orders were never given, so the run did not test them: ${never.join(', ')}`);
  if (!tally.undone || !tally.undoneTurns) fail('undo was never tested');
  const missed = Object.entries(events).filter(([, n]) => n === 0).map(([k]) => k);
  if (missed.length) fail(`the run never had these, so it did not test them: ${missed.join(', ')}`);

  const end = (s) => `${s.cities.length} cities, ${s.cities.reduce((sum, c) => sum + c.size, 0)} people, ` +
    `${s.generals.length} generals with ${s.generals.reduce((sum, g) => sum + g.regiments, 0)} regiments, ` +
    `${s.rivals.length} rival cities, ${G.fmt(s.coin)} coin`;
  const given = Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(', ');
  console.log(`smoke: OK · seed ${SEED} · main game ${TURNS} turns (${mainBattles} battles), war game ${WAR_TURNS} turns · ` +
    `orders: ${given} · ${tally.undone} single undos and ${tally.undoneTurns} whole-turn undos restored exactly · ` +
    `${tally.refused} refused orders left the state alone · ${events.battle} battles, ${events.capture} cities taken, ` +
    `${events.hunger} hungry armies · main game end: ${end(game.state)} · war game end: ${end(war.state)}`);
}

try {
  main();
} catch (err) {
  console.log(`smoke: FAIL in ${gameNow} at turn ${turnNow} · ${err.check ? err.message : 'the game threw an error'}`);
  if (!err.check) console.log(err.stack);
  process.exitCode = 1;
}
