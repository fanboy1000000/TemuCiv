// TemuCiv prototype: the smoke check (docs/WORKFLOW.md, "Prototype phase").
//
// Plays TURNS turns from a fixed seed, giving random valid orders of every kind, undoing some of them, and trying
// some refused ones. After every order and every turn it checks: no exception, no NaN, no negative coin, food or
// stone, moves never negative, moves per turn never above the cap, and that undo restores the state exactly.
//
//   node prototype/smoke.js      (from the repository root; exit 0 = every check held, 1 = a failure, explained)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const SEED = 1;
const TURNS = 300;
const MAX_ORDERS_PER_TURN = 6;
const UNDO_CHANCE = 0.25; // after an order, how often it is taken back again
const UNDO_ALL_CHANCE = 0.05; // how often a whole turn's orders are taken back
const REFUSED_CHANCE = 0.3; // how often a turn also tries an order that should be refused

for (const file of ['numbers.js', 'game.js']) {
  vm.runInThisContext(readFileSync(join(import.meta.dirname, file), 'utf8'), { filename: join('prototype', file) });
}
const G = globalThis.Game;
const N = globalThis.NUMBERS;

let turnNow = 0;
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
}

/** Every order the player could try now, valid or not, grouped by kind. */
function candidates(game, rng) {
  const s = game.state;
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const out = { build: [], site: [], send: [], found: [], 'route-new': [], 'route-change': [], 'route-cancel': [] };
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
        add('build', () => G.checkBuild(s, city.id, kind), () => G.orderBuild(game, city.id, kind));
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
  return out;
}

function main() {
  const rng = G.makeRng(SEED * 7919 + 13);
  const game = G.newGame(SEED);
  const counts = { build: 0, site: 0, send: 0, found: 0, 'route-new': 0, 'route-change': 0, 'route-cancel': 0 };
  let undone = 0, undoneTurns = 0, refused = 0;
  checkState(game.state, 'new game');

  for (let turn = 1; turn <= TURNS; turn++) {
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
      counts[order.kind]++;
      checkState(game.state, `after a ${order.kind} order`);
      if (rng() < UNDO_CHANCE) {
        if (!G.undo(game).ok) fail('undo refused right after an order');
        if (JSON.stringify(game.state) !== before) fail(`undo after a ${order.kind} order did not restore the state exactly`);
        undone++;
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
        refused++;
      }
    }

    if (rng() < UNDO_ALL_CHANCE && game.undo.length) {
      while (game.undo.length) G.undo(game);
      if (JSON.stringify(game.state) !== turnStart) fail('undoing every order of the turn did not restore the start of the turn');
      undoneTurns++;
    }

    const movesBefore = game.state.moves;
    G.endTurn(game);
    turnNow = game.state.turn;
    checkState(game.state, 'after ending the turn');
    if (game.state.moves - movesBefore !== G.movesPerTurn(game.state)) fail('the turn did not add exactly the moves per turn');
    if (G.undo(game).ok) fail('undo reached back past the start of the turn');
  }

  const never = Object.entries(counts).filter(([, n]) => n === 0).map(([k]) => k);
  if (never.length) fail(`these orders were never given, so the run did not test them: ${never.join(', ')}`);
  if (!undone || !undoneTurns) fail('undo was never tested');

  const s = game.state;
  const people = s.cities.reduce((sum, c) => sum + c.size, 0);
  const given = Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(', ');
  console.log(`smoke: OK · seed ${SEED} · ${TURNS} turns · orders: ${given} · ${undone} single undos and ${undoneTurns} whole-turn undos restored exactly · ` +
    `${refused} refused orders left the state alone · end: ${s.cities.length} cities, ${people} people, ${G.fmt(s.coin)} coin, ${s.moves} moves`);
}

try {
  main();
} catch (err) {
  console.log(`smoke: FAIL at turn ${turnNow} · ${err.check ? err.message : 'the game threw an error'}`);
  if (!err.check) console.log(err.stack);
  process.exitCode = 1;
}
