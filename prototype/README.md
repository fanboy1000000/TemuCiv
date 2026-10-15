# TemuCiv prototype, slice 1: the solo sandbox

A rough, throwaway version of the game, made only so you can play the untested ideas and feel how they work
together: a limited number of moves per turn, coin plus food and stone that must be hauled, cities that build
farms and quarries worked by their people, and routes between cities. It is a tool, not the game: none of this
code goes into the real game, and the folder is deleted when production starts. The rules it follows are in
[RULES.md](RULES.md).

## Opening it

Double-click `index.html` in this folder. It opens in Edge or Chrome. Nothing needs to be installed and nothing
is sent anywhere. There is no saving: reloading the page starts a new game.

## Controls

- **Look (free):** click a tile, a city or a settler. The panel on the right shows it; press Esc to see the
  whole empire.
- **Map:** drag to scroll, mouse wheel to zoom. Hover over a tile to see its terrain and who holds it.
- **Orders (one move each):** buttons in the right panel. A button you can't use right now is greyed out and
  says why. Farms, quarries, sending a settler and routes ask you to pick a tile or a city on the map
  (the allowed ones are outlined); Esc or a right-click cancels.
- **Undo:** the Undo button or Ctrl+Z takes back your last order this turn, with its move and costs. Repeat to
  go back to the start of the turn.
- **End turn:** the button, Enter or Space.
- **Hover over any underlined number** to see what it is made of.
- **Waiting for you** (bottom left) lists cities with nothing to build, idle sites, settlers without orders
  and cities whose food is falling. Click a line to go there. The **turn log** (bottom right) says what
  happened at the end of the last few turns.
- **Seed** (top right): the number the map is made from. Type another number and press Enter (or New game),
  or press Random.

## Changing a number

Every number the rules use is in `numbers.js`, each with a short note saying what it does.

1. Open `numbers.js` in Notepad (right-click, Open with, Notepad).
2. Change a number, for example `movesPerTurn: 4,` to `movesPerTurn: 6,`. Keep the comma at the end.
3. Save, then reload the page (F5). A new game starts with your number.

If the page says it could not start after an edit, a comma or bracket was probably removed by accident: undo
the edit in Notepad (Ctrl+Z), save and reload.

## For engineers

`game.js` holds the rules with no screen code, `ui.js` draws the screen, `numbers.js` holds every number.
`node prototype/smoke.js` (from the repository root) plays 300 turns of random orders and checks that nothing
breaks.
