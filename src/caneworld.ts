/** The sugarcane plot for month 2: bare ground, furrows, setts, shoots and tall cane, and the rows after cutting. */
import { R, backdrop, bigTree, customScenes, disc, drawPlayer, fgBushes, mangBen, reduce, rnd, shadow, tatay, tuft } from "./art";

/** Cane state: every number is a 0..1 fraction so GSAP can tween it. */
export const cf = {
  /** rows plowed into furrows */
  prep: 0,
  /** fertilizer along the furrows */
  fert: 0,
  /** setts laid and covered */
  plant: 0,
  /** how tall the cane is */
  grow: 0,
  /** rows cut at harvest */
  cut: 0,
  /** how much of each pest remains: borers, rats, aphids */
  pests: [1, 1, 1],
  week: 0,
  working: false,
};

/** The state of the plot at the start of each week (also used by the #cane2 dev jumps). */
export function caneAtWeek(week: number): void {
  Object.assign(cf, {
    prep: week >= 1 ? 1 : 0,
    fert: week >= 1 ? 1 : 0,
    plant: week >= 1 ? 1 : 0,
    grow: [0, 0.3, 0.65, 1][Math.min(3, week)],
    cut: 0,
    pests: [1, 1, 1],
    week,
    working: false,
  });
}

const W = 640;
const H = 360;
const ROWS = 6;
const ROW0 = 182;
const ROWH = 25;

/** One cane stalk standing on `base`: segmented, with leaves that sway. */
function stalk(x: number, base: number, hgt: number, t: number, j: number, borer: boolean, aphid: boolean): void {
  if (hgt <= 6) {
    // a sprout from the sett: a pale shoot with two tiny leaves
    R(x, base - hgt, 2, hgt, "#a8e060");
    R(x - 2, base - hgt - 1, 3, 2, "#59b32f");
    R(x + 1, base - hgt - 2, 3, 2, "#86d13a");
    return;
  }
  const sw = reduce ? 0 : Math.round(Math.sin(t / 900 + x * 0.3 + j) * 1.4);
  R(x - 1, base - hgt, 5, hgt, "#4a3a0c");
  R(x, base - hgt, 3, hgt, j % 2 ? "#cdbd48" : "#bfae38");
  R(x, base - hgt, 1, hgt, "#e4d870");
  for (let n = 7; n < hgt; n += 9) R(x - 1, base - n, 5, 1, "#7a6a20");
  const top = base - hgt;
  // long leaves arching out of the crown and drooping down the stalk
  R(x - 11 + sw, top, 12, 2, "#1f5a14");
  R(x - 10 + sw, top, 10, 1, "#59b32f");
  R(x + 3 + sw, top - 3, 12, 2, "#1f5a14");
  R(x + 4 + sw, top - 3, 10, 1, "#86d13a");
  R(x - 14 + sw, top + 2, 4, 6, "#3f9a2a");
  R(x + 14 + sw, top - 1, 3, 6, "#59b32f");
  R(x - 2 + sw, top - 9, 2, 9, "#3f9a2a");
  R(x + 1 + sw, top - 8, 2, 8, "#59b32f");
  if (borer) R(x, top + hgt * 0.4, 2, 2, "#1c0d08");
  if (aphid) R(x - 5 + sw, top - 1, 5, 3, "#e6d24a");
}

function caneScene(t: number): void {
  backdrop(t, 150);
  // the bank and the road beside the plot
  R(0, 150, W, H - 150, "#5d9a48");
  R(0, 158, W, 14, "#8d8a80");
  R(0, 158, W, 2, "#a29f94");
  for (let x = 6; x < W; x += 34) R(x, 164, 16, 2, "#e8e4cc");
  for (let i = 0; i < 40; i++) tuft(6 + rnd(i) * 628, 176, "#3f8a3f", "#4aa045");

  const w = cf;
  const cols = Math.round(52 * w.plant);
  const rowsCut = Math.round(w.cut * ROWS);
  const hgt = Math.round(4 + w.grow * 72);
  const borers = Math.round(8 * w.pests[0]);
  for (let j = 0; j < ROWS; j++) {
    const top = ROW0 + j * ROWH;
    const ready = w.prep * ROWS > j + 0.01;
    // dry, cracked soil: ridged and furrowed once the plow has been through
    R(0, top, W, 22, ready ? "#a8794a" : "#b58f58");
    R(0, top + 21, W, 3, "#7a5a36");
    if (ready) {
      R(0, top + 2, W, 5, "#c29a60");
      R(0, top + 2, W, 1, "#d8b478");
      R(0, top + 10, W, 9, "#5a3d22");
      R(0, top + 10, W, 2, "#7a5a36");
      R(0, top + 17, W, 2, "#3f2a16");
    } else {
      for (let i = 0; i < 22; i++) {
        const cxp = rnd(i + j * 31) * (W - 12);
        R(cxp, top + 4 + rnd(i + j) * 14, 6, 1, "#7a5c34");
        R(cxp + 3, top + 6 + rnd(i + 5 + j) * 10, 1, 4, "#7a5c34");
      }
    }
    if (ready && w.fert * ROWS > j + 0.01 && w.plant < 1) for (let x = 4; x < W; x += 9) R(x + (j % 3) * 2, top + 12 + (x % 3), 2, 2, x % 2 ? "#f4f1e4" : "#f0d870");
    const base = top + 19;
    for (let i = 0; i < cols; i++) {
      const x = 6 + i * 12 + (j % 2) * 5;
      if (j < rowsCut) {
        R(x - 1, base - 3, 4, 3, "#7a6a20");
        if (i % 6 === 0) {
          R(x - 4, base - 6, 14, 3, "#4a3a0c");
          R(x - 3, base - 6, 12, 2, "#cdbd48");
          R(x - 4, base - 3, 14, 3, "#e0c850");
        }
      } else {
        stalk(x, base, hgt, t, j, i % 6 === 0 && i / 6 < borers && w.pests[0] > 0.05, i % 5 === 1 && i / 5 < Math.round(9 * w.pests[2]));
      }
    }
  }
  // a rat sneaking along the edge until it is trapped
  if (w.week === 1 && w.pests[1] > 0.5) {
    R(326, 262, 14, 6, "#6b6b6b");
    R(338, 260, 5, 4, "#6b6b6b");
    R(322, 266, 6, 1, "#4b4b4b");
  }
  // irrigation ditch at the front
  const dy = ROW0 + ROWS * ROWH + 2;
  R(0, dy, W, 12, w.week === 2 ? "#a07840" : "#4aa0b8");
  if (w.week !== 2) {
    R(0, dy, W, 2, "#7cc6d8");
    for (let k = 0; k < 10; k++) R((k * 71 + (reduce ? 0 : t / 40)) % W, dy + 5, 14, 1, "#a8dde8");
  }
  R(0, dy + 12, W, H - dy - 12, "#5d9a48");
  for (let i = 0; i < 40; i++) tuft(6 + rnd(i + 300) * 628, dy + 22 + rnd(i + 400) * 10, "#3f8a3f", "#4aa045");
  for (let i = 0; i < 18; i++) disc(10 + rnd(i + 600) * 620, dy + 20 + rnd(i + 700) * 20, 1, i % 2 ? "#f2c94c" : "#ffffff");

  // Bert works the rows; Mang Ben, who rents the plot out, looks on
  shadow(92, 276);
  tatay(92, 276, t, w.working ? "work" : "idle", 1);
  shadow(176, 282, 30);
  mangBen(176, 282, t, "idle", 3);
  drawPlayer(t);
  bigTree(-16, 384, 200, 54, t, 5);
  fgBushes(21, 9);
}

customScenes.cane = caneScene;
