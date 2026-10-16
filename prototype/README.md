# TemuCiv prototype, slice 2: armies and supply

A rough, throwaway version of the game, made only so you can play the untested ideas and feel how they work
together: a limited number of moves per turn, coin plus food and stone that must be hauled, cities that build
farms and quarries worked by their people, routes between cities, and now armies that must be fed far from home,
marching on a rival's cities. It is a tool, not the game: none of this code goes into the real game, and the
folder is deleted when production starts. The rules it follows are in [RULES.md](RULES.md).

## Opening it

Double-click `index.html` in this folder. It opens in Edge or Chrome. Nothing needs to be installed and nothing
is sent anywhere. There is no saving: reloading the page starts a new game.

## Controls

- **Look (free):** click a tile, a city, a settler or an army. The panel on the right shows it; press Esc to see
  the whole empire, with your armies and the rival's cities.
- **Map:** drag to scroll, mouse wheel to zoom. Hover over a tile to see its terrain and who holds it.
- **Orders (one move each):** buttons in the right panel. A button you can't use right now is greyed out and
  says why. Farms, quarries, sending a settler or an army, routes and supply ask you to pick a tile or a city on
  the map (the allowed ones are outlined); Esc or a right-click cancels.
- **Army orders** are in the general's panel (click the army): send it to a tile, take or leave regiments (type
  how many in the box next to the button), and set, change or cancel its supply city. While you pick a tile for
  an army, red dots mark tiles next to a rival city; hover one to see your chance of winning there.
- **Undo:** the Undo button or Ctrl+Z takes back your last order this turn, with its move and costs. Repeat to
  go back to the start of the turn.
- **End turn:** the button, Enter or Space.
- **Hover over any underlined number** to see what it is made of.
- **Waiting for you** (bottom left) lists cities with nothing to build, idle sites, settlers without orders,
  cities whose food is falling, generals without orders outside your cities, and armies that will go hungry at
  one of the next two ends of turn if you give no more orders (the screen finds them by quietly playing those two
  turns ahead on a copy of the game, with the same rules, counting every battle as won so it never gives away how
  a battle will go; an army with a battle ahead is listed as going hungry "if it wins"). Click a line to go there. The **turn log** (bottom
  right) says what happened at the end of the last few turns, battles included.
- **Seed** (top right): the number the map is made from. Type another number and press Enter (or New game),
  or press Random.

## Armies

You start with one general in your first city. A city can build more generals, and regiments: a regiment is one
of the city's people turned soldier, so it takes a person when it is finished (and waits while the city has only
one). Regiments stay in their city as its garrison, eating from the city's food, until a general takes them: only
a general moves regiments. If a city of size 1 can't feed its garrison, a regiment is lost instead of a person. A
general and its regiments are an army, the dark square with a gold edge and the number of regiments on it.
Taking or leaving regiments gives that city attention, like a build; sending the army somewhere gives none.

Away from your cities an army lives on its baggage. Its limit is 3 turns of the army's food: filling and supply
aim at it, and food already carried is kept even above it until eaten. While an army stands in one of your
cities, its baggage fills at the end of the turn, after the city's garrison eats and before the people eat and the
city grows, keeping back only what the city eats in one turn (its whole one-turn eating, the garrison's share
included, although the garrison has already eaten). So an army is fed before its city grows, and you can take
regiments and march off in the same turn; it leaves with full baggage if the city has that much food above its
one turn of eating. Regiments you leave in a city leave the food the smaller army can't use there.

To keep an army fed further away, give the general a supply city: each turn that city sends what keeps the baggage
full when the food arrives, including what the army eats on the way, again keeping back only one turn of its own
eating (routes keep back 3 turns). While the general stands in the city that feeds it, the line sends nothing: the
baggage fills there. The food takes a turn for every 3 tiles and lands wherever the general is by then. A longer
line costs only time: more food on the way and a longer wait for the first delivery, which the baggage must last.
The dashed yellow line shows it, with the amount; setting or changing supply gives the feeding city attention. An
army that runs out of food loses a regiment each turn.

The rival's three cities are red, far from your start, with their garrison in a shield. They never move, but
an army that ends its turn next to one fights it: one battle, decided by luck. The general's panel shows your
chance first. Win, and the city is yours with its people and you take 10 coin per person; lose, and the whole
army is gone, general included. Keep a general with no regiments away from rival cities: it always loses.

## Changing a number

Every number the rules use is in `numbers.js`, each with a short note saying what it does.

1. Open `numbers.js` in Notepad (right-click, Open with, Notepad).
2. Change a number, for example `movesPerTurn: 4,` to `movesPerTurn: 6,`. Keep the comma at the end.
3. Save, then reload the page (F5). A new game starts with your number.

If the page says it could not start after an edit, a comma or bracket was probably removed by accident: undo
the edit in Notepad (Ctrl+Z), save and reload.

## For engineers

`game.js` holds the rules with no screen code, `ui.js` draws the screen, `numbers.js` holds every number.
`node prototype/smoke.js` (from the repository root) plays 300 turns of random orders, then a shorter war game
that starts with an army next to a rival city, and checks that nothing breaks.
