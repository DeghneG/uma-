/** The family's animal yard for month 3: chicken house, carabao shed, grazing goats and the pig pen. */
import { R, backdrop, bigTree, carabao, chick, customScenes, disc, drawPlayer, fgBushes, goat, hen, mangBen, pig, reduce, rnd, rooster, shadow, tatay, tuft } from "./art";

/** Livestock state: 0..1 fractions so GSAP can tween them. */
export const lf = {
  /** eggs gathered in the basket by the coop */
  eggs: 0,
  /** milk in the pail by the shed */
  milk: 0,
  /** how much grass is left on the pasture (1 = untouched) */
  grass: 1,
  /** how clean the pen is */
  pen: 0.2,
  /** crates stacked for the truck */
  load: 0,
  week: 0,
  working: false,
};

/** The yard at the start of each week (also used by the #live2 dev jumps). */
export function liveAtWeek(week: number): void {
  Object.assign(lf, {
    eggs: week >= 1 ? 1 : 0,
    milk: week >= 1 ? 1 : 0,
    grass: week >= 2 ? 0.35 : 1,
    pen: week >= 3 ? 1 : 0.2,
    load: 0,
    week,
    working: false,
  });
}

const W = 640;
const H = 360;

function coop(t: number): void {
  // a raised bamboo house with a thatch roof, a ramp, and hens pecking below
  R(34, 196, 6, 52, "#5a3a1a");
  R(132, 196, 6, 52, "#5a3a1a");
  R(28, 188, 118, 6, "#3a2412");
  R(32, 150, 108, 40, "#2a1608");
  R(34, 152, 104, 36, "#c9a66a");
  for (let x = 38; x < 136; x += 8) R(x, 152, 2, 36, "#8a6a3e");
  R(78, 164, 20, 24, "#2a1608");
  R(26, 128, 120, 26, "#a8862e");
  R(40, 116, 92, 16, "#c9a64a");
  for (let x = 28; x < 146; x += 6) R(x, 146 + (x % 12 ? 0 : 4), 3, 10, "#7a5a1c");
  // the ramp
  for (let k = 0; k < 8; k++) R(84 + k * 4, 188 + k * 5, 4, 4, "#8a6a3e");
  // a basket that fills with eggs
  R(140, 258, 36, 22, "#2a1608");
  R(142, 260, 32, 18, "#9a6a32");
  const n = Math.round(lf.eggs * 4);
  for (let k = 0; k < n; k++) R(145 + k * 7, 254 + (k % 2), 6, 8, "#f6efdc");
  hen(60, 288, t, 1);
  hen(112, 292, t, 2, "#b8582f");
  rooster(30, 286, t, 3);
  chick(92, 296, t, 1);
  chick(124, 300, t, 2);
}
function shed(t: number): void {
  // an open shed on posts, the carabao standing in its shade, a pail at its side
  R(224, 150, 6, 100, "#5a3a1a");
  R(412, 150, 6, 100, "#5a3a1a");
  R(212, 126, 218, 28, "#a8862e");
  R(228, 114, 188, 16, "#c9a64a");
  for (let x = 214; x < 428; x += 6) R(x, 148 + (x % 12 ? 0 : 4), 3, 10, "#7a5a1c");
  R(224, 250, 200, 6, "rgba(0,0,0,0.18)");
  carabao(262, 268, t);
  R(352, 248, 30, 24, "#2a1608");
  R(354, 250, 26, 20, "#9a6a32");
  R(354, 250, 26, 4, "#c49a58");
  const fill = Math.round(lf.milk * 14);
  R(356, 254 + (14 - fill), 22, fill + 2, "#fbf8ee");
}
function pasture(t: number): void {
  // a grassy strip; the goats eat it down as the month goes on
  const g = lf.grass;
  for (let i = 0; i < 40; i++) {
    const x = 190 + rnd(i + 40) * 280;
    const y = 292 + rnd(i + 80) * 36;
    if (rnd(i + 2) < g + 0.15) tuft(x, y, "#2f8a2f", "#59b32f");
  }
  for (let i = 0; i < 24; i++) {
    const x = 196 + rnd(i + 120) * 270;
    const y = 292 + rnd(i + 160) * 34;
    if (rnd(i + 9) < g) R(x, y - 12, 3, 12, "#3f9a2a");
  }
  goat(250, 322, t, 1);
  goat(330, 328, t, 4, "#d8c8a8");
  goat(410, 322, t, 7, "#b8a888");
}
function penYard(t: number): void {
  // the pig pen on the right: fence rails around mud that turns to clean straw
  const c = lf.pen;
  R(488, 196, 148, 112, "#14100a");
  R(490, 198, 144, 108, c > 0.6 ? "#c9a64a" : "#6a4a2a");
  for (let k = 0; k < 18; k++) R(494 + rnd(k) * 128, 210 + rnd(k + 20) * 88, 22, 3, c > 0.6 ? (k % 2 ? "#e8cc66" : "#a88a30") : k % 2 ? "#4a3018" : "#8a6a3e");
  for (let x = 484; x < 640; x += 18) R(x, 178, 5, 40, "#8a6a3a");
  R(484, 184, 156, 5, "#a07a44");
  R(484, 202, 156, 5, "#a07a44");
  R(500, 262, 40, 12, "#6a8a9a");
  pig(534, 268, t, 1, 1);
  pig(594, 262, t, 5, 1);
  if (c < 0.6 && !reduce) for (let k = 0; k < 4; k++) R(510 + k * 28 + ((t / 30 + k * 11) % 16), 220 + Math.round(Math.sin(t / 150 + k) * 4), 2, 2, "#14141a");
}
function crates(): void {
  // crates stacked by the road for the truck
  const n = Math.round(lf.load * 6);
  for (let k = 0; k < n; k++) {
    const x = 176 + (k % 3) * 34;
    const y = 214 - Math.floor(k / 3) * 28;
    R(x, y, 32, 26, "#2a1608");
    R(x + 2, y + 2, 28, 22, "#b88a4a");
    R(x + 2, y + 10, 28, 3, "#8a6a3a");
    R(x + 13, y + 2, 4, 22, "#8a6a3a");
  }
}
function liveScene(t: number): void {
  backdrop(t, 150);
  R(0, 150, W, H - 150, "#5d9a48");
  R(0, 158, W, 14, "#8d8a80");
  R(0, 158, W, 2, "#a29f94");
  for (let x = 6; x < W; x += 34) R(x, 164, 16, 2, "#e8e4cc");
  for (let i = 0; i < 60; i++) tuft(6 + rnd(i) * 628, 178 + rnd(i + 50) * 170, "#3f8a3f", "#4aa045");
  for (let i = 0; i < 20; i++) disc(10 + rnd(i + 600) * 620, 180 + rnd(i + 700) * 160, 1, i % 2 ? "#f2c94c" : "#ffffff");
  coop(t);
  shed(t);
  pasture(t);
  penYard(t);
  crates();
  shadow(120, 306);
  tatay(120, 306, t, lf.working ? "work" : "idle", 1);
  shadow(446, 312, 30);
  mangBen(446, 312, t, "idle", 3);
  drawPlayer(t);
  bigTree(-16, 384, 200, 54, t, 5);
  fgBushes(31, 9);
}

customScenes.live = liveScene;
