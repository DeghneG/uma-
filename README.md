# Uma

A top-down pixel-art web game about a tenant farming family in the Visayas. They have five months' notice and no payment before the landowner clears the paddy for a factory. They have ₱4,000 and need ₱20,000 to start over in the city. See [PLAN.md](PLAN.md) for the full design.

**Status:** Month 1 (rice) is complete: the notice, four weeks of work with visible field progress, Mang Ben's advice each week, sound effects (toggle in the header), the market sale and an itemized money summary. Other crops and free roam are not built yet.

Keyboard: press 1, 2 or 3 to pick a card; Space cuts rice in the harvest game. Dev shortcut: open `http://localhost:5173/#week3` (also `week1`, `week2`, `week4`, `market`, `summary`) to start at that scene, or `/#intro` to play the intro cards. Title menu: arrow keys and Enter, or click.

## Run

```
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## Structure

| File | Purpose |
|---|---|
| `src/state.ts` | Game state, constants (goal, prices) and the rice sack rule |
| `src/text.ts` | All English and Filipino text, one object per language |
| `src/art.ts` | Pixel scenes drawn in code on a 640x360 grid (shown at 3x in a 1920x1080 frame); hand-drawn sprites load from public/sprites |
| `src/ui.ts` | Savings/morale HUD, panel rendering, GSAP motion helpers |
| `src/scenes/` | One file per scene: intro, week1 to week4, market, summary |
| `src/music.ts` | Generative background music (3/4 ukulele arpeggio, bamboo flute, shakers, gongs); mood follows the story |
| `src/main.ts` | Scene order and language toggle |

`game-walkthrough.html` is the earlier standalone storyboard prototype.

## Next

- Month 2 sugarcane, month 3 livestock, month 4 coconut and vegetables, month 5 last week.
- Replace placeholder art with real sprites.
- Free roam mode ("Explore" at home).
- Sound.
