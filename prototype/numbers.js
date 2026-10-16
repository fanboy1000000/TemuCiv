// TemuCiv prototype, slices 1 and 2: every number the rules use (prototype/RULES.md says where each one comes from).
//
// To try a different number: change it here, save the file, and reload the page (F5). The game starts over.
// Only change the numbers (and the names in quotes, if you like); keep the commas, colons and brackets as they are.
// If the page goes blank after an edit, a comma or bracket was probably removed by accident.

var NUMBERS = {
  // ---- The map ----
  map: {
    width: 24, // tiles across
    height: 18, // tiles down
    defaultSeed: 2026, // the map you get when the page opens (type another seed on screen for another map)
    // How the map is made: engineering's own choices, not from RULES.md.
    landShare: 0.5, // share of all tiles that is land; the rest is water
    waterEdge: 1, // rows of water kept along the map's edges, so the land is one island
    forestPatches: 7, // how many forests
    forestSize: 6, // tiles in each forest, at most
    hillPatches: 7, // how many patches of hills
    hillSize: 4, // tiles in each patch of hills, at most
    mountainPatches: 3, // how many mountain ranges
    mountainSize: 3, // tiles in each mountain range, at most
  },

  // ---- The start ----
  start: {
    citySize: 2, // people in your first city
    coin: 30, // coin in your purse
    food: 10, // food in your first city's store
    stone: 10, // stone in your first city's store
    settlers: 1, // settlers standing next to your first city
    generals: 1, // generals standing in your first city
  },

  // ---- Moves ----
  movesPerTurn: 4, // moves you get each turn (before any Hall)
  orderMoves: 1, // moves each order costs
  movesCap: 8, // moves per turn can never go above this, however many Halls you build
  attentionTurns: 5, // turns a city keeps its attention after you give an order there
  attentionBonus: 0.25, // extra output from an attended city's sites (0.25 = a quarter more)

  // ---- Cities, food and growth ----
  cityTileFood: 2, // food a city's own tile makes each turn, with nobody working it
  foodPerPerson: 2, // food each person eats each turn
  growthBase: 10, // food needed to grow = growthBase + growthPerSize x the city's size
  growthPerSize: 5, // (see growthBase)
  growBy: 1, // people a city gains when it grows
  starveLoss: 1, // people a city loses when its store can't feed everyone (at size 1: garrison regiments instead)
  minCitySize: 1, // a city never shrinks below this many people
  newCitySize: 1, // people in a city a settler founds

  // ---- Production ----
  productionBase: 2, // production every city has, whatever its size
  productionPerPerson: 1, // production each person adds

  // ---- Borders ----
  cityRadius: 1, // a new city holds the tiles this many steps from its own tile (1 = the six around it)
  siteClaimRadius: 1, // a finished site adds its tile and the tiles this many steps around it to the borders

  // ---- Hauling (site output and routes) ----
  tilesPerTravelTurn: 3, // goods take 1 turn per this many tiles of distance, rounded up
  minTravelTurns: 1, // goods always take at least this many turns

  // ---- Coin ----
  coinPerPerson: 1, // coin each person pays each turn
  tradeCoinPerUnit: 0.5, // coin earned for each unit of goods a route delivers

  // ---- Routes ----
  foodReserveTurns: 3, // a route only ships food above what the sending city eats in this many turns
  stoneReserve: 10, // a route leaves the sending city this much stone

  // ---- Settlers ----
  settlerSteps: 2, // tiles a settler walks each turn
  minCityDistance: 3, // a new city must be at least this many tiles from every other city

  // ---- Generals, regiments and armies ----
  foodPerRegiment: 2, // food each regiment eats each turn: in a city from its store, with a general from the baggage
  baggageTurns: 3, // an army's baggage limit: this many turns of its eating (filling and supply aim at it)
  armyReserveTurns: 1, // supply lines and baggage only take food above what the city eats in this many turns
  armySteps: 2, // tiles an army marches each turn
  hungerLoss: 1, // regiments an army loses in a turn its baggage can't feed it
  lowFoodTurns: 2, // "Waiting for you" lists an army that will go hungry within this many turn ends

  // ---- The rival ----
  rival: {
    cities: 3, // how many cities the rival has
    citySize: 3, // people in each rival city
    spacing: 3, // rival cities stand at least this many tiles from each other
    garrison: 3, // regiments defending each rival city at the start
    garrisonGrowth: 1, // regiments a rival garrison gains...
    garrisonEvery: 5, // ...every this many turns
    garrisonMax: 8, // a rival garrison never grows above this
  },

  // ---- Battles ----
  battlePower: 2, // your chance to win is A^2 / (A^2 + D^2), A your regiments, D the defence; 2 is that square
  walls: 1.5, // a city's defence D is its garrison times this, for its walls
  winnerLoss: 0.5, // the winner loses this share of the loser's regiments, rounded down (0.5 = half)
  winnerKeeps: 1, // ...but always keeps at least this many
  plunderPerPerson: 10, // coin you take for each person in a rival city you capture

  // ---- What cities can build ----
  // coin is paid from your purse, stone (and food) from the city's store, all when you give the order.
  // production is how much production the build needs before it is finished.
  builds: {
    farm: {
      name: 'Farm',
      site: true, // a site: built on a tile next to the city and worked by its people
      terrain: 'grassland', // the only terrain it can go on
      coin: 10,
      stone: 0,
      production: 15,
      people: 1, // people it needs to work
      makes: 'food', // what it makes
      amount: 4, // how much it makes each turn when worked
    },
    quarry: {
      name: 'Quarry',
      site: true,
      terrain: 'hills',
      coin: 10,
      stone: 0,
      production: 20,
      people: 2,
      makes: 'stone',
      amount: 2,
    },
    settler: {
      name: 'Settler',
      coin: 0,
      stone: 0,
      food: 15, // food paid from the city's store when ordered
      production: 20,
      people: 1, // people the city gives up when the settler is finished
    },
    general: {
      name: 'General',
      coin: 30,
      stone: 0,
      production: 20, // a general takes no person, and you can have as many as you like
    },
    regiment: {
      name: 'Regiment',
      coin: 15,
      stone: 5,
      production: 20,
      people: 1, // people the city gives up when the regiment is finished (it waits while the city is size 1)
    },
    hall: {
      name: 'Hall',
      onePerCity: true,
      coin: 40,
      stone: 20,
      production: 40,
      moves: 1, // extra moves per turn
      priceGrowth: 1.5, // each further Hall's coin and stone cost this many times the one before
    },
    granary: {
      name: 'Granary',
      onePerCity: true,
      coin: 20,
      stone: 10,
      production: 25,
      growthDiscount: 0.25, // growing needs this much less food (0.25 = a quarter less)
    },
    market: {
      name: 'Market',
      onePerCity: true,
      coin: 25,
      stone: 10,
      production: 30,
      coinBonus: 0.5, // extra coin from the city's people and from trade arriving there (0.5 = half more)
    },
    workshop: {
      name: 'Workshop',
      onePerCity: true,
      coin: 20,
      stone: 15,
      production: 30,
      productionBonus: 0.5, // extra production (0.5 = half more)
    },
  },
};
