# Game Plan (working title: "Uwi" / "Ani" - TBD)

## Pitch
A top-down pixel-art web game about a teenager on a farm in the Visayas (Iloilo / Negros / Leyte) who spends one year helping their parents, and has to decide: stay on the land or leave for the city. A 15-20 minute playthrough. The goal is to raise awareness of the real struggles farmers face, with a warm, balanced tone (cozy daily life plus real hardship). It ends openly and reflectively, with no "right" answer.

## Story update (supersedes the "stay or leave" framing)
The family are tenant farmers: they do not own the land. The wealthy Sevilla family (placeholder name), the owners, will clear the paddy for a factory. They give the family **five months' notice and no payment**. Leaving is not a choice; the only open question is how much the family can raise before then. The only way to raise it is to plant, harvest and sell the rice at market, then move to the city (a cousin in Cebu has a room). The player's goal is to hit the funds target (gold mark on the Money bar) so the family can start over.

**Money (pesos, always shown in a sticky bar at the top):** the family starts with ₱4,000 and needs ₱20,000 to start over in the city. Every harvest is taken to the market and sold right after it is done (trader: one price, morale -3; cooperative: about 40% more, ₱200 for the ride and a day lost, morale +3). Month 5 is no longer a market: it is "The Last Week" (day work +₱1,500, sell the plow and cart +₱2,500, or say goodbye for morale), then the epilogue.

**Rice sacks (month 1):** counted from mistakes across nine decisions: 3 field-prep picks, 3 pest fixes, 3 harvest timing rounds.
| Mistakes | Sacks of rice |
|---|---|
| 0 to 1 | 5 |
| 2 to 4 | 3 |
| 5 to 8 | 2 |
| 9 (none correct) | 0 |

Dry-spell choice modifies this: buying fuel forgives one mistake, planting fewer rows caps the harvest at 4 sacks, sharing the canal widens the harvest target. Rice sells at ₱1,000 per sack (trader).

**Month structure (one crop per month, each sold right after its harvest):**
| Month | Chapter | Product |
|---|---|---|
| 1 | Rice: the notice, field prep puzzle, dry-spell choice | Rice |
| 2 | Sugarcane: cutting season | Sugarcane |
| 3 | Livestock: the sick carabao | Livestock |
| 4 | Coconut and vegetables: typhoon warning | Coconut and veg |
| 5 | The last week: final choice before leaving | Money |

- **Nothing is sold before month 5.** Months 1 to 4 fill a "harvest in storage" tally (mini-game stars and choices raise or lower each product). Money only changes through costs (fuel, vet) until the market.
- **Month 5 payout:** every product is priced per unit (cane lowest, livestock highest), then multiplied by the buyer: trader x1, cooperative x1.4 (costs a day). The haggle mini-game adds up to +20% on top.
- **Ending:** based on total money against the target (gold mark on the Money bar). Enough to start over, a little short, or almost nothing. The family always leaves.
- A "months left" counter runs 5 to 0.

**Rice chapter (month 1, current focus) runs four weeks:**
1. **Week 1, The Notice:** an agent in a white SUV reads the notice at the paddy edge. Then the field-prep puzzle: order three jobs (clean the weeds, run the pump irrigation, plant the seedlings, in that order). Each wrong pick costs a star.
2. **Week 2, Pests:** three pests (golden snail eggs, rats, leaf blight), three fixes (hand-pick, cheap traps, pesticide). Each pest has one best fix. Hand-picking costs morale, traps cost 2, pesticide costs 5. Stars depend on how well you matched them.
3. **Week 3, Dry spell:** buy fuel and run the pump nightly (money for rice), take turns at the canal with neighbors (morale, and the neighbors will help at harvest), or plant fewer rows (less risk, less rice).
4. **Week 4, Harvest:** timing mini-game. If you shared the canal, the neighbors help and the target zone is wider.

Rice in storage = weekly stars (week 1 x4, week 2 x3, week 4 x4) plus the dry-spell choice. Rice is worth less per unit than the other crops at market because it is the largest crop.

Free roam (Explore at home) is unchanged. All price factors and ending thresholds are placeholders to tune in playtesting.

## Decisions so far
| Topic | Choice |
|---|---|
| Genre | Mini-game collection linked by a story and persistent stats |
| Platform | Web browser (desktop + mobile) |
| Scope | Personal / portfolio, polished vertical slice quality |
| Region | Visayas (Iloilo / Negros / Leyte) |
| Look | Top-down pixel art |
| Language | Bilingual toggle: English / Filipino (Hiligaynon/Cebuano flavor words) |
| Player | A teenager helping their parents (customizable name) |
| Conflict | Stay or leave for the city |
| Message | Raise awareness: tenancy/land ownership, low farm-gate prices/middlemen, typhoons/climate |
| Controls | Keyboard + mouse, tap-friendly on mobile |
| Length | 15-20 min |
| Ending | Open and reflective, shaped by the player's choices |
| Crops | One crop per chapter: rice, sugarcane, livestock, coconut/vegetables |

## Structure (5 chapters + prologue/epilogue)
Each chapter: one crop/theme, 1-2 mini-games, one story beat, one struggle.

| # | Chapter | Mini-games | Struggle shown | Choice |
|---|---|---|---|---|
| 0 | Prologue: Home | Walk the yard, meet family, hear about the city job/school offer | - | Name, look |
| 1 | Palay (rice) | Plow with the kalabaw, transplant seedlings in rhythm | Tenancy: share of harvest goes to the landowner | Help plant vs. study |
| 2 | Tubo (sugarcane) | Cut and load cane | Low farm-gate price / mill and trader power | Sell now vs. wait |
| 3 | Hayop (livestock) | Feed and herd carabao, chickens, pigs | Costs rise, a sick animal | Spend savings on vet or save |
| 4 | Niyog and Gulay (coconut/veg) | Harvest coconuts, tend veg plot | Typhoon strikes: protect crops or house | What to save |
| 5 | Bentahan (market) | Haggle with a trader, count the earnings | Middlemen margins | Fair vs. quick sale |
| 6 | Epilogue: Bus stop | Final scene, bag packed or not | - | Stay / leave / uncertain |

## Core systems
- **Stats (carry over):** Money, Family Morale, Land/Harvest Yield, plus a hidden "Pull to Stay" vs. "Pull to Leave" meter.
- **Mini-game scoring:** 1-3 stars, which affects yield and money.
- **Ending:** open and reflective. The result screen shows what you earned versus what you needed, with real facts about Filipino farmers (add sourced stats later), and ends on a question rather than a verdict.
- **i18n:** all text in one JSON file per language, with an EN/FIL toggle available on every screen.

## Tech
- Vite + TypeScript, HTML Canvas for the top-down world (Phaser optional if physics and tilemaps become painful).
- Tile maps made in Tiled. Pixel art at 16x16 or 32x32, scaled with crisp (nearest-neighbor) rendering.
- GSAP (installed) for UI, transitions, dialogue boxes, screen shakes, typhoon effects and the end screen.
- Input layer abstracts keyboard, mouse and touch (virtual joystick / tap-to-move).
- Save progress in localStorage.
- Deploy as a static site (Vercel / GitHub Pages).

## Milestones
1. **Prototype:** walk around a tilemap, one mini-game (rice transplanting) with star scoring.
2. **Vertical slice:** Prologue and Chapter 1 with dialogue, stats and the EN/FIL toggle.
3. **All chapters:** the remaining mini-games, the struggles and choices.
4. **Ending and polish:** the branching epilogue, music/SFX, mobile touch, title screen.
5. **Ship:** deploy, plus a short portfolio case study.

## Scope risks
- Four crop themes means a lot of pixel art. Mitigation: one shared tileset and a small set of reusable sprites, with each chapter adding only a few props. If time runs out, cut Chapter 3 or 4 first.
- Authenticity: the facts about tenancy, prices and typhoons should be checked against real sources. Consider asking someone from a farming family to review.

## Open questions
- Exact province and dialect for flavor words (Hiligaynon, Cebuano or Waray)?
- Is any part of the story drawn from your own family or hometown?
- Who makes the pixel art: you, free/licensed assets, or AI-assisted?
- Music: original, licensed, or free loops?
- Which city does the teenager consider (Manila, Cebu, Iloilo City, abroad)?
