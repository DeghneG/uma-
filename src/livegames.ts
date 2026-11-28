/**
 * Month 3, livestock: four hands-on close-ups. Each draws its own scene (registered in customScenes),
 * reads the hand through the close-up kit, and reports how many mistakes were made.
 */
import { R, backdrop, customScenes, disc, flipAt, reduce, rnd } from "./art";
import { begin, gameEl, loop, pos } from "./closeups";
import { sfx } from "./sound";
import { T } from "./ui";

const W = 640;
const H = 360;
const dist = (a: number, b: number, c: number, d: number): number => Math.hypot(a - c, b - d);

/** a rope drawn as a chain of pixels from (x0,y0) to (x1,y1) with a little sag */
function rope(x0: number, y0: number, x1: number, y1: number): void {
  const n = Math.max(6, Math.round(dist(x0, y0, x1, y1) / 3));
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const sag = Math.sin(u * Math.PI) * 6;
    R(Math.round(x0 + (x1 - x0) * u) - 1, Math.round(y0 + (y1 - y0) * u + sag) - 1, 3, 3, k % 2 ? "#e0c890" : "#b8935a");
  }
}

/* ============================================================
 * 1. Collect the eggs: take them from the nests, carry them to the basket without cracking them
 * ============================================================ */
type Nest = { st: "hen" | "egg" | "empty"; t: number; peck: number };
const NEST_W = 150;
const NEST_H = 92;
const BASKET = { x: 232, y: 296, w: 176, h: 56 };
const eg = {
  nests: [] as Nest[],
  held: false,
  got: 0,
  splats: [] as { x: number; y: number; t: number }[],
  seed: 0,
};
const EGG_GOAL = 8;

function nestAt(i: number): { x: number; y: number } {
  return { x: 40 + (i % 3) * 190, y: 52 + Math.floor(i / 3) * 108 };
}
function bigHen(x: number, y: number, t: number, flap: boolean): void {
  const bob = reduce ? 0 : Math.round(Math.sin(t / 300 + x) * 1);
  const wing = flap ? -6 : 0;
  R(x - 40, y - 40 + bob, 80, 50, "#7a3f1c");
  R(x - 38, y - 40 + bob, 76, 44, "#c9783a");
  R(x - 38, y - 40 + bob, 76, 8, "#e0a060");
  R(x - 20, y - 26 + bob + wing, 42, 22, "#b8622a");
  R(x - 20, y - 26 + bob + wing, 42, 4, "#d98a50");
  R(x + 28, y - 64 + bob, 26, 28, "#7a3f1c");
  R(x + 30, y - 62 + bob, 22, 24, "#c9783a");
  R(x + 36, y - 74 + bob, 10, 12, "#d23a2e");
  R(x + 52, y - 50 + bob, 14, 8, "#f2c94c");
  R(x + 44, y - 54 + bob, 5, 5, "#1a1a1a");
  R(x + 48, y - 38 + bob, 8, 10, "#d23a2e");
  R(x - 50, y - 42 + bob, 14, 22, "#a8501e");
}
function drawEggs(t: number): void {
  // the inside of the coop: bamboo slats, a thatch edge above, straw underfoot
  R(0, 0, W, H, "#8a6a3a");
  for (let x = 0; x < W; x += 20) {
    R(x, 0, 3, H, "#6a4a22");
    R(x + 3, 0, 14, H, x % 40 ? "#a8844a" : "#9a763e");
  }
  R(0, 0, W, 24, "#c9a64a");
  for (let x = 0; x < W; x += 10) R(x, 18 + (x % 20 ? 0 : 4), 4, 10, "#a8862e");
  R(0, 296, W, 64, "#d8b860");
  for (let i = 0; i < 90; i++) R(rnd(i) * W, 300 + rnd(i + 90) * 56, 14, 2, rnd(i + 5) > 0.5 ? "#c4a048" : "#ecd078");
  const now = performance.now();
  eg.nests.forEach((n, i) => {
    const { x, y } = nestAt(i);
    // the nest box: a wooden frame with straw in it
    R(x - 2, y + 12, NEST_W + 4, NEST_H - 8, "#2a1608");
    R(x, y + 14, NEST_W, NEST_H - 12, "#6a4a22");
    R(x + 6, y + 30, NEST_W - 12, NEST_H - 30, "#e0c070");
    for (let k = 0; k < 14; k++) R(x + 8 + rnd(k + i * 9) * (NEST_W - 30), y + 34 + rnd(k * 3 + i) * (NEST_H - 44), 16, 2, k % 2 ? "#c49a3a" : "#f0d890");
    R(x - 2, y + 12, NEST_W + 4, 5, "#8a6a3e");
    if (n.st === "hen") {
      const flap = now - n.peck < 400;
      bigHen(x + NEST_W / 2 - 8, y + 70, t, flap);
    } else if (n.st === "egg") {
      const ex = x + NEST_W / 2 - 10;
      const ey = y + 44;
      R(ex - 1, ey - 1, 22, 28, "#6a5a3a");
      R(ex, ey, 20, 26, "#f6efdc");
      R(ex + 2, ey + 2, 5, 10, "#ffffff");
      R(ex + 12, ey + 14, 7, 11, "#e0d4b4");
      // a glint so the player can see which are ready
      if (!reduce && Math.floor(t / 400) % 2) R(ex + 21, ey - 4, 4, 4, "#fff6a8");
    }
  });
  // the basket
  R(BASKET.x - 2, BASKET.y - 2, BASKET.w + 4, BASKET.h + 4, "#2a1608");
  R(BASKET.x, BASKET.y, BASKET.w, BASKET.h, "#9a6a32");
  for (let k = 0; k < 9; k++) R(BASKET.x + k * 20, BASKET.y, 3, BASKET.h, "#6a4620");
  for (let k = 0; k < 3; k++) R(BASKET.x, BASKET.y + 8 + k * 16, BASKET.w, 3, "#b88a4a");
  for (let k = 0; k < Math.min(EGG_GOAL, eg.got); k++) {
    const ex = BASKET.x + 14 + (k % 4) * 40;
    const ey = BASKET.y - 16 - Math.floor(k / 4) * 14;
    R(ex, ey, 22, 26, "#f6efdc");
    R(ex + 3, ey + 3, 5, 9, "#ffffff");
    R(ex + 12, ey + 15, 8, 10, "#e0d4b4");
  }
  R(BASKET.x, BASKET.y, BASKET.w, 6, "#c49a58");
  // broken eggs on the floor
  for (const s of eg.splats) {
    R(s.x - 16, s.y, 32, 8, "#f2d13a");
    R(s.x - 12, s.y - 3, 24, 5, "#fbf6e0");
    R(s.x - 6, s.y + 2, 12, 5, "#e0a820");
  }
  // an egg in the hand
  if (eg.held) {
    R(pos.x - 14, pos.y + 16, 28, 4, "rgba(0,0,0,0.25)");
    R(pos.x - 12, pos.y - 16, 24, 30, "#f6efdc");
    R(pos.x - 9, pos.y - 13, 6, 11, "#ffffff");
  }
}
export function playLiveEggs(done: (mistakes: number) => void): void {
  const start: Nest["st"][] = ["egg", "hen", "egg", "egg", "hen", "hen"];
  eg.nests = start.map((st, i) => ({ st, t: 1800 + i * 800, peck: 0 }));
  eg.held = false;
  eg.got = 0;
  eg.splats = [];
  eg.seed = 0;
  let mistakes = 0;
  let finished = false;
  const inBox = (x: number, y: number, i: number): boolean => {
    const n = nestAt(i);
    return x > n.x && x < n.x + NEST_W && y > n.y + 10 && y < n.y + NEST_H + 10;
  };
  const grab = (x: number, y: number): void => {
    if (eg.held || finished) return;
    const i = eg.nests.findIndex((_n, k) => inBox(x, y, k));
    if (i < 0) return;
    const n = eg.nests[i];
    if (n.st === "egg") {
      n.st = "empty";
      n.t = 1800 + rnd(++eg.seed) * 1500;
      eg.held = true;
      gameEl()?.classList.add("grab");
      sfx("pluck");
    } else if (n.st === "hen") {
      // the hen pecks the hand that reaches under her
      n.peck = performance.now();
      mistakes++;
      sfx("cluck");
      sfx("bad");
      run.refresh();
    }
  };
  const drop = (x: number, y: number): void => {
    if (!eg.held) return;
    eg.held = false;
    gameEl()?.classList.remove("grab");
    if (x > BASKET.x - 14 && x < BASKET.x + BASKET.w + 14 && y > BASKET.y - 70 && y < BASKET.y + BASKET.h) {
      eg.got++;
      sfx("egg");
    } else {
      // dropped on the floor: it cracks
      eg.splats.push({ x, y: Math.min(330, Math.max(304, y)), t: performance.now() });
      mistakes++;
      sfx("squish");
    }
    run.refresh();
    if (eg.got >= EGG_GOAL && !finished) {
      finished = true;
      run.finish(() => done(mistakes));
    }
  };
  const run = begin("liveEggs", "eggs", () => `${T().lv.eggsLeft}: ${Math.max(0, EGG_GOAL - eg.got)}`, {
    down: (x, y) => grab(x, y),
    up: (x, y) => drop(x, y),
    key: (e, x, y) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (!e.repeat) (eg.held ? drop : grab)(x, y);
      return true;
    },
  }, "lv");
  const stop = loop((dt) => {
    for (const n of eg.nests) {
      if (n.st === "egg") continue;
      n.t -= dt;
      if (n.t > 0) continue;
      if (n.st === "hen") {
        n.st = "egg"; // she gets up and leaves a warm egg
        sfx("cluck");
      } else {
        n.st = "hen";
        n.t = 2600 + rnd(++eg.seed) * 2200;
      }
    }
    if (finished) stop();
  });
}

/* ============================================================
 * 2. Milk the carabao: strokes alternate between two teats, and not too fast, or she kicks
 * ============================================================ */
const mk = { milk: 0, annoy: 0, last: -1, lastAt: 0, jet: [0, 0], kickAt: 0, gripped: -1, anchor: 0 };
const TEATS = [318, 364];
const TEAT_TOP = 256;
const BUCKET = { x: 284, y: 298, w: 116, h: 50 };

function drawMilk(t: number): void {
  const now = performance.now();
  // a barn: boards behind, straw underfoot
  R(0, 0, W, H, "#6a4a2a");
  for (let x = 0; x < W; x += 28) {
    R(x, 0, 3, 300, "#3a2412");
    R(x + 3, 0, 25, 300, x % 56 ? "#8a643a" : "#7a5630");
  }
  R(0, 0, W, 16, "#2a1a0c");
  R(0, 300, W, 60, "#c8a458");
  for (let i = 0; i < 80; i++) R(rnd(i) * W, 304 + rnd(i + 70) * 52, 14, 2, rnd(i + 4) > 0.5 ? "#b08c40" : "#e0c070");
  const kick = now - mk.kickAt < 450 ? Math.sin(((now - mk.kickAt) / 450) * Math.PI) * 18 : 0;
  // the carabao: a heavy dark body with a hump, thick legs, a long head with swept-back horns
  const tail = reduce ? 0 : Math.round(Math.sin(t / (260 - mk.annoy * 160)) * (4 + mk.annoy * 14));
  for (const lx of [118, 168, 410, 462]) {
    R(lx, 236 - kick * (lx > 300 ? 1 : 0), 38, 64, "#2a2a30");
    R(lx + 3, 236 - kick * (lx > 300 ? 1 : 0), 32, 60, lx % 2 ? "#3f3f46" : "#34343a");
    R(lx, 288, 38, 14, "#14141a");
  }
  R(96, 98, 428, 150, "#2a2a30");
  R(100, 100, 420, 142, "#4a4a52");
  R(100, 100, 420, 10, "#62626c");
  R(100, 224, 420, 18, "#34343a");
  R(190, 80, 100, 26, "#4a4a52");
  R(190, 80, 100, 8, "#62626c");
  R(520 + tail, 120, 10, 120, "#3f3f46");
  R(516 + tail, 232, 20, 24, "#2a2a30");
  // the head, at the left: a long muzzle, swept-back horns and an ear
  R(84, 118, 70, 90, "#2a2a30");
  R(88, 120, 62, 84, "#4a4a52");
  R(88, 120, 62, 8, "#62626c");
  R(34, 150, 66, 64, "#2a2a30");
  R(38, 152, 58, 58, "#3f3f48");
  R(30, 184, 30, 30, "#2a2a30");
  R(34, 190, 22, 20, "#5a5a64");
  R(36, 196, 8, 8, "#14141a");
  R(64, 164, 12, 12, "#e8e4d4");
  R(68, 168, 6, 6, "#14141a");
  R(120, 96, 30, 26, "#34343a");
  // horns sweeping up and back
  R(86, 108, 22, 12, "#2a2a30");
  R(66, 96, 26, 14, "#2a2a30");
  R(48, 90, 24, 12, "#2a2a30");
  R(88, 110, 18, 8, "#e8e0c8");
  R(70, 98, 20, 10, "#e8e0c8");
  R(52, 92, 18, 8, "#d8d0b4");
  R(44, 84, 12, 10, "#b8b09a");
  // her udder, pink and heavy, with two teats
  R(296, 236, 86, 28, "#c27a72");
  R(298, 236, 82, 22, "#e8a8a0");
  R(298, 236, 82, 5, "#f4c4bc");
  for (const tx of TEATS) {
    R(tx - 9, TEAT_TOP + 6, 18, 42, "#8a4a46");
    R(tx - 7, TEAT_TOP + 6, 14, 40, "#e8a8a0");
    R(tx - 7, TEAT_TOP + 6, 4, 38, "#f4c4bc");
    R(tx - 8, TEAT_TOP + 44, 16, 8, "#b86a64");
  }
  // a clear cue: the teat to squeeze next glows, with arrows showing the pull
  if (mk.gripped < 0 && mk.milk < 1) {
    const pulse = reduce ? 1 : 0.5 + 0.5 * Math.sin(t / 220);
    const next = mk.last === 0 ? [1] : mk.last === 1 ? [0] : [0, 1];
    for (const i of next) {
      const tx = TEATS[i];
      const c = pulse > 0.5 ? "#fff6a8" : "#f2c94a";
      R(tx - 17, TEAT_TOP + 2, 34, 3, c);
      R(tx - 17, TEAT_TOP + 56, 34, 3, c);
      R(tx - 17, TEAT_TOP + 2, 3, 57, c);
      R(tx + 14, TEAT_TOP + 2, 3, 57, c);
      const ay = TEAT_TOP + 4 + (reduce ? 8 : (t / 14) % 30);
      R(tx + 22, ay, 14, 4, "#fff6a8");
      R(tx + 25, ay + 4, 8, 4, "#fff6a8");
      R(tx + 28, ay + 8, 2, 4, "#fff6a8");
    }
  }
  // jets of milk into the pail
  for (let i = 0; i < 2; i++) {
    const a = now - mk.jet[i];
    if (a < 170) {
      const tx = TEATS[i];
      R(tx - 2, TEAT_TOP + 44, 4, BUCKET.y + 6 + (1 - mk.milk) * 30 - (TEAT_TOP + 44), "#fbf8ee");
      R(tx - 6, BUCKET.y + 4 + (1 - mk.milk) * 30, 12, 3, "#ffffff");
    }
  }
  // the pail: wooden bands, milk rising inside
  R(BUCKET.x - 2, BUCKET.y - 2, BUCKET.w + 4, BUCKET.h + 4, "#2a1608");
  R(BUCKET.x, BUCKET.y, BUCKET.w, BUCKET.h, "#9a6a32");
  R(BUCKET.x, BUCKET.y, BUCKET.w, 5, "#c49a58");
  R(BUCKET.x, BUCKET.y + 18, BUCKET.w, 3, "#5a3a1a");
  R(BUCKET.x, BUCKET.y + 36, BUCKET.w, 3, "#5a3a1a");
  const fill = Math.round(34 * mk.milk);
  R(BUCKET.x + 6, BUCKET.y + 6 + (34 - fill), BUCKET.w - 12, fill + 2, "#fbf8ee");
  if (fill > 0) R(BUCKET.x + 6, BUCKET.y + 6 + (34 - fill), BUCKET.w - 12, 3, "#ffffff");
  // her patience: a bar that turns red, with a warning mark
  R(440, 322, 160, 20, "#14141a");
  R(442, 324, 156, 16, "#2a2a30");
  const pw = Math.round(156 * Math.min(1, mk.annoy));
  R(442, 324, pw, 16, mk.annoy > 0.7 ? "#d9432e" : mk.annoy > 0.4 ? "#f2c94a" : "#6fbf46");
  if (mk.annoy > 0.7 && !reduce && Math.floor(t / 200) % 2) R(606, 320, 8, 22, "#d9432e");
  // the hand squeezing
  if (mk.gripped >= 0) {
    R(pos.x - 16, pos.y - 12, 32, 22, "#2a1608");
    R(pos.x - 14, pos.y - 10, 28, 18, "#e8b88a");
  }
}
export function playLiveMilk(done: (mistakes: number) => void): void {
  Object.assign(mk, { milk: 0, annoy: 0, last: -1, lastAt: 0, jet: [0, 0], kickAt: 0, gripped: -1, anchor: 0 });
  let mistakes = 0;
  let finished = false;
  const stroke = (i: number): void => {
    if (finished) return;
    const now = performance.now();
    const quick = now - mk.lastAt < 260;
    mk.annoy += (i === mk.last ? 0.2 : -0.04) + (quick ? 0.24 : 0);
    mk.annoy = Math.max(0, mk.annoy);
    mk.last = i;
    mk.lastAt = now;
    mk.jet[i] = now;
    mk.milk = Math.min(1, mk.milk + 0.045);
    sfx("squirt");
    if (mk.annoy >= 1) {
      // she kicks the pail over
      mistakes++;
      mk.milk = Math.max(0, mk.milk - 0.22);
      mk.annoy = 0.3;
      mk.kickAt = now;
      sfx("bad");
      sfx("thud");
    }
    run.refresh();
    if (mk.milk >= 1 && !finished) {
      finished = true;
      run.finish(() => done(mistakes));
    }
  };
  const teatAt = (x: number, y: number): number => TEATS.findIndex((tx) => Math.abs(x - tx) < 30 && y > TEAT_TOP - 8 && y < TEAT_TOP + 70);
  const run = begin("liveMilk", "milk", () => `${T().lv.milkLeft}: ${Math.round(mk.milk * 100)}%`, {
    down: (x, y) => {
      mk.gripped = teatAt(x, y);
      mk.anchor = y;
    },
    move: (_x, y) => {
      if (mk.gripped < 0) return;
      if (y < mk.anchor) mk.anchor = y;
      if (y - mk.anchor >= 16) {
        stroke(mk.gripped);
        mk.anchor = y;
      }
    },
    up: () => {
      mk.gripped = -1;
    },
    key: (e, x) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (!e.repeat) stroke(Math.abs(x - TEATS[0]) < Math.abs(x - TEATS[1]) ? 0 : 1);
      return true;
    },
  }, "lv");
  const stop = loop((dt) => {
    mk.annoy = Math.max(0, mk.annoy - dt * 0.00022);
    if (finished) stop();
  });
}

/* ============================================================
 * 3. Goats on leashes: carry each goat to fresh grass and stake it; it grazes as far as its rope goes
 * ============================================================ */
type Goat = { x: number; y: number; sx: number; sy: number; full: number; held: boolean; dir: number; eating: boolean; bleatAt: number; col: string };
const COLS = 15;
const ROWS = 6;
const CW = 32;
const CH = 30;
const GX = 24;
const GY = 150;
const ROPE = 74;
const GARDEN = { x: 520, y: 176, w: 120, h: 150 };
const gt = { goats: [] as Goat[], grass: [] as number[], held: -1, crop: 0, cropAt: 0, rich: 0.75 };

function bigGoat(g: Goat, t: number): void {
  const x = Math.round(g.x);
  const y = Math.round(g.y);
  R(x - 34, y - 2, 70, 6, "rgba(0,0,0,0.25)");
  flipAt(x, g.dir, () => {
    const chew = g.eating && !reduce ? Math.round(Math.abs(Math.sin(t / 130)) * 6) : 0;
    const dip = g.eating ? 14 : 0;
    for (const lx of [-20, -12, 18, 26]) R(x + lx, y - 26, 6, 26, "#c9c0aa");
    R(x - 24, y - 54, 62, 32, g.col);
    R(x - 24, y - 54, 62, 6, "#f6f2e6");
    R(x + 4, y - 50, 24, 20, "#8a6a43");
    R(x - 44, y - 62 + dip, 26, 28, g.col);
    R(x - 52, y - 50 + dip + chew, 14, 12, g.col);
    R(x - 48, y - 52 + dip, 10, 4, "#c9c0aa");
    R(x - 40, y - 76 + dip, 5, 16, "#8a7a5a");
    R(x - 30, y - 76 + dip, 5, 16, "#8a7a5a");
    R(x - 32, y - 56 + dip, 4, 4, "#1a1a1a");
    R(x - 46, y - 40 + dip + chew, 8, 12, "#f6f2e6");
    R(x + 36, y - 52, 6, 12, g.col);
    // the collar the rope is tied to
    R(x - 28, y - 48 + dip, 8, 20, "#c0453a");
  });
}
function cellAt(x: number, y: number): number {
  const cx = Math.floor((x - GX) / CW);
  const cy = Math.floor((y - GY) / CH);
  return cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS ? cy * COLS + cx : -1;
}
function drawGoats(t: number): void {
  backdrop(t, 130);
  R(0, 130, W, H - 130, "#58a040");
  for (let i = 0; i < 60; i++) R(rnd(i) * W, 134 + rnd(i + 80) * 220, 14, 2, i % 2 ? "#4a8a36" : "#6ab84a");
  // the tall grass, cell by cell: it is eaten down as the goats graze
  for (let i = 0; i < gt.grass.length; i++) {
    const a = gt.grass[i];
    if (a < 0.04) {
      R(GX + (i % COLS) * CW + 6, GY + Math.floor(i / COLS) * CH + 20, 18, 3, "#7a6a3a");
      continue;
    }
    const cx = GX + (i % COLS) * CW;
    const cy = GY + Math.floor(i / COLS) * CH;
    const n = 3 + Math.round(a * 4);
    for (let k = 0; k < n; k++) {
      const bx = cx + 3 + k * 4 + (k % 2) * 2;
      const hh = 8 + Math.round(a * 20) + (k % 3) * 3;
      const sw = reduce ? 0 : Math.round(Math.sin(t / 700 + bx) * 1.2);
      R(bx + sw, cy + 26 - hh, 3, hh, k % 2 ? "#3f9a2a" : "#59b32f");
      R(bx + sw, cy + 26 - hh, 3, 3, "#9bdc4a");
    }
  }
  // the neighbor's vegetable garden, fenced off: goats must stay out
  R(GARDEN.x, GARDEN.y, GARDEN.w, GARDEN.h, "#5a3d22");
  for (let r = 0; r < 5; r++) {
    R(GARDEN.x + 8, GARDEN.y + 14 + r * 28, GARDEN.w - 16, 8, "#3a2812");
    for (let k = 0; k < 6; k++) {
      disc(GARDEN.x + 18 + k * 17, GARDEN.y + 12 + r * 28, 6, gt.crop > r * 0.7 + 0.2 && k < 3 ? "#6a4a22" : "#59b32f");
    }
  }
  for (let y = GARDEN.y - 6; y < GARDEN.y + GARDEN.h; y += 14) R(GARDEN.x - 6, y, 6, 14, "#8a6a3a");
  R(GARDEN.x - 6, GARDEN.y - 8, GARDEN.w + 6, 5, "#8a6a3a");
  // each goat, its stake and its rope
  gt.goats.forEach((g, i) => {
    R(g.sx - 5, g.sy - 14, 10, 18, "#2a1608");
    R(g.sx - 3, g.sy - 16, 6, 18, "#8a6a3a");
    const hx = g.held ? pos.x : g.x - (g.dir > 0 ? -22 : 22);
    const hy = g.held ? pos.y : g.y - 32;
    rope(g.sx, g.sy - 14, hx, hy);
    void i;
  });
  const order = [...gt.goats].sort((a, b) => a.y - b.y);
  for (const g of order) {
    bigGoat(g, t);
    // a fullness bar and, if it cannot reach any grass, a call for help
    R(g.x - 22, g.y - 90, 44, 8, "#14141a");
    R(g.x - 20, g.y - 88, 40, 4, "#2a2a30");
    R(g.x - 20, g.y - 88, Math.round(40 * Math.min(1, g.full)), 4, g.full >= 1 ? "#6fbf46" : "#f2c94a");
    if (!g.eating && !g.held && g.full < 1 && !reduce && Math.floor(t / 500) % 2) R(g.x - 3, g.y - 108, 6, 12, "#d9432e");
  }
  if (performance.now() - gt.cropAt < 900) R(GARDEN.x + 10, GARDEN.y - 30, 100, 18, "#d9432e");
  if (gt.held >= 0) R(pos.x - 14, pos.y + 10, 28, 4, "rgba(0,0,0,0.22)");
}
export function playLiveGoats(done: (mistakes: number) => void, richness = 0.75): void {
  gt.rich = richness;
  gt.crop = 0;
  gt.cropAt = 0;
  gt.held = -1;
  gt.grass = Array.from({ length: COLS * ROWS }, (_v, i) => (cellAt(GARDEN.x + 10, GARDEN.y + 10) === i ? 0 : Math.min(1, richness * (0.55 + rnd(i * 3 + 1) * 0.6))));
  gt.goats = [
    { x: 70, y: 340, sx: 70, sy: 340, full: 0, held: false, dir: 1, eating: false, bleatAt: 0, col: "#e8e2d4" },
    { x: 150, y: 346, sx: 150, sy: 346, full: 0, held: false, dir: 1, eating: false, bleatAt: 0, col: "#d8c8a8" },
    { x: 230, y: 340, sx: 230, sy: 340, full: 0, held: false, dir: 1, eating: false, bleatAt: 0, col: "#b8a888" },
  ];
  let mistakes = 0;
  let finished = false;
  let munch = 0;
  const left = (): number => gt.goats.filter((g) => g.full < 1).length;
  const grab = (x: number, y: number): void => {
    if (gt.held >= 0 || finished) return;
    let best = -1;
    let bd = 54;
    gt.goats.forEach((g, i) => {
      const d = dist(x, y, g.x, g.y - 30);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best < 0) return;
    gt.held = best;
    gt.goats[best].held = true;
    gameEl()?.classList.add("grab");
    sfx("bleat");
  };
  const drop = (x: number, y: number): void => {
    if (gt.held < 0) return;
    const g = gt.goats[gt.held];
    gt.held = -1;
    g.held = false;
    gameEl()?.classList.remove("grab");
    const inGarden = x > GARDEN.x - 20 && y > GARDEN.y - 20;
    if (inGarden) {
      // it munches the neighbor's vegetables before it is pulled back
      mistakes++;
      gt.crop++;
      gt.cropAt = performance.now();
      sfx("bad");
      g.x = GARDEN.x - 40;
      g.y = Math.min(332, Math.max(GY + 30, y));
    } else {
      g.x = Math.min(GARDEN.x - 36, Math.max(40, x));
      g.y = Math.min(346, Math.max(GY + 36, y + 24));
    }
    g.sx = g.x;
    g.sy = g.y;
    sfx("thud");
    run.refresh();
  };
  const run = begin("liveGoats", "goats", () => `${T().lv.goatsLeft}: ${left()}`, {
    down: grab,
    up: drop,
    key: (e, x, y) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (!e.repeat) (gt.held >= 0 ? drop : grab)(x, y);
      return true;
    },
  }, "lv");
  const stop = loop((dt, now) => {
    for (const g of gt.goats) {
      if (g.held) {
        g.x += (pos.x - g.x) * 0.25;
        g.y += (pos.y + 34 - g.y) * 0.25;
        g.eating = false;
        continue;
      }
      // graze: head for the richest grass within rope length of the stake, and eat it down
      let target = -1;
      let td = 1e9;
      for (let i = 0; i < gt.grass.length; i++) {
        if (gt.grass[i] < 0.06) continue;
        const cx = GX + (i % COLS) * CW + CW / 2;
        const cy = GY + Math.floor(i / COLS) * CH + CH - 2;
        if (cx > GARDEN.x - 24) continue;
        if (dist(cx, cy, g.sx, g.sy) > ROPE) continue;
        const d = dist(cx, cy, g.x, g.y);
        if (d < td) {
          td = d;
          target = i;
        }
      }
      g.eating = false;
      if (target >= 0 && g.full < 1) {
        const cx = GX + (target % COLS) * CW + CW / 2;
        const cy = GY + Math.floor(target / COLS) * CH + CH - 2;
        if (td > 10) {
          const sp = (dt / 1000) * 34;
          g.x += ((cx - g.x) / td) * Math.min(sp, td);
          g.y += ((cy - g.y) / td) * Math.min(sp, td);
          g.dir = cx > g.x ? 1 : -1;
        } else {
          g.eating = true;
          const bite = Math.min(gt.grass[target], dt * 0.00052);
          gt.grass[target] -= bite;
          g.full += bite * 0.3;
          if (g.full >= 1) run.refresh();
        }
      } else if (g.full < 1 && now - g.bleatAt > 3800) {
        g.bleatAt = now;
        sfx("bleat");
      }
    }
    if (gt.goats.some((g) => g.eating) && now - munch > 330) {
      munch = now;
      sfx("munch");
    }
    if (left() === 0 && !finished) {
      finished = true;
      run.finish(() => done(mistakes));
    }
    if (finished) stop();
  });
}

/* ============================================================
 * 4. Clean the pig pen: shovel the muck into the wheelbarrow, then spread fresh straw on the wet spots
 * ============================================================ */
type Pile = { x: number; y: number; gone: boolean };
const BARROW = { x: 30, y: 262, w: 112, h: 70 };
const BALE = { x: 520, y: 282, w: 100, h: 56 };
const pn = { piles: [] as Pile[], spots: [] as { x: number; y: number; straw: boolean }[], held: -1, phase: 0, heldKind: "", mess: [] as { x: number; y: number }[], seed: 0 };
const PILE_AT: [number, number][] = [
  [210, 196],
  [330, 238],
  [430, 190],
  [250, 292],
];

function bigPig(x: number, y: number, t: number, seed: number, dir: number): void {
  const wig = reduce ? 0 : Math.round(Math.sin(t / 220 + seed) * 2);
  flipAt(x, dir, () => {
    R(x - 44, y - 2, 96, 6, "rgba(0,0,0,0.22)");
    for (const lx of [-30, -14, 22, 36]) R(x + lx, y - 18, 12, 18, "#e58a98");
    R(x - 44, y - 56, 94, 44, "#d98a96");
    R(x - 42, y - 56, 90, 40, "#f0a8b0");
    R(x - 42, y - 56, 90, 10, "#f7c2c8");
    R(x - 42, y - 24, 90, 8, "#d98a96");
    R(x - 70, y - 54, 34, 36, "#f0a8b0");
    R(x - 82, y - 42, 16, 16, "#e58a98");
    R(x - 78, y - 38, 4, 6, "#7a3a4a");
    R(x - 74, y - 62, 14, 14, "#e58a98");
    R(x - 60, y - 44, 5, 5, "#2a2a30");
    R(x + 48, y - 46 + wig, 8, 8, "#e58a98");
    R(x + 54, y - 42 + wig, 6, 6, "#e58a98");
  });
}
function muck(x: number, y: number, t: number): void {
  R(x - 24, y + 6, 48, 10, "#2a1608");
  R(x - 22, y - 6, 44, 18, "#3a2410");
  R(x - 22, y - 6, 44, 6, "#5a3a1a");
  R(x - 14, y - 16, 28, 14, "#4a2e14");
  R(x - 14, y - 16, 28, 4, "#6a4a22");
  if (!reduce) for (let k = 0; k < 3; k++) R(x - 16 + ((t / 8 + k * 31) % 34), y - 26 - Math.round(Math.sin(t / 150 + k * 2) * 4), 3, 3, "#14141a");
}
function strawBit(x: number, y: number): void {
  R(x - 22, y - 4, 44, 10, "#a88a30");
  for (let k = 0; k < 8; k++) R(x - 20 + k * 5, y - 7 + (k % 3) * 2, 3, 10, k % 2 ? "#e8cc66" : "#f2dc88");
}
function drawPen(t: number): void {
  // a farmyard pen: a wall of planks, mud underfoot
  R(0, 0, W, 130, "#6a8a5a");
  backdrop(t, 90);
  R(0, 96, W, 40, "#7a5a2e");
  for (let x = 0; x < W; x += 26) {
    R(x, 96, 3, 40, "#3a2412");
    R(x + 3, 96, 23, 40, x % 52 ? "#a07a44" : "#8a6636");
  }
  R(0, 96, W, 4, "#c49a58");
  R(0, 136, W, H - 136, "#7a5a32");
  for (let i = 0; i < 90; i++) R(rnd(i) * W, 140 + rnd(i + 80) * 216, 20, 3, rnd(i + 8) > 0.5 ? "#5a3f1e" : "#8a6a3e");
  // wet spots left where the muck was, and straw spread over them
  for (const s of pn.spots) {
    if (s.straw) strawBit(s.x, s.y);
    else if (pn.phase === 1) {
      R(s.x - 26, s.y - 6, 52, 14, "#3a2812");
      R(s.x - 24, s.y - 4, 48, 8, "#4a3418");
    }
  }
  for (const m of pn.mess) muck(m.x, m.y, t);
  for (const p of pn.piles) if (!p.gone) muck(p.x, p.y, t);
  // the pigs, wandering at the back
  bigPig(440 + Math.round(Math.sin(t / 2400) * 30), 176, t, 1, Math.cos(t / 2400) >= 0 ? 1 : -1);
  bigPig(560 + Math.round(Math.sin(t / 2000 + 2) * 20), 160, t, 4, Math.cos(t / 2000 + 2) >= 0 ? 1 : -1);
  // the wheelbarrow
  R(BARROW.x, BARROW.y + 22, BARROW.w, BARROW.h - 22, "#14141a");
  R(BARROW.x + 3, BARROW.y + 24, BARROW.w - 6, BARROW.h - 28, "#6a8a9a");
  R(BARROW.x + 3, BARROW.y + 24, BARROW.w - 6, 6, "#9ab8c8");
  R(BARROW.x - 18, BARROW.y + 8, 34, 10, "#6a4a22");
  disc(BARROW.x + BARROW.w / 2 + 8, BARROW.y + BARROW.h + 2, 10, "#14141a");
  disc(BARROW.x + BARROW.w / 2 + 8, BARROW.y + BARROW.h + 2, 5, "#9a9a9a");
  const heap = pn.piles.filter((p) => p.gone).length;
  for (let k = 0; k < heap; k++) {
    R(BARROW.x + 10 + k * 16, BARROW.y + 8 - (k % 2) * 4, 24, 20, "#3a2410");
    R(BARROW.x + 10 + k * 16, BARROW.y + 8 - (k % 2) * 4, 24, 5, "#5a3a1a");
  }
  // the straw bale
  R(BALE.x, BALE.y, BALE.w, BALE.h, "#6a5418");
  R(BALE.x + 3, BALE.y + 3, BALE.w - 6, BALE.h - 6, "#e0c050");
  for (let k = 0; k < 5; k++) R(BALE.x + 3, BALE.y + 8 + k * 9, BALE.w - 6, 2, "#c4a238");
  R(BALE.x + 26, BALE.y, 5, BALE.h, "#8a5a2e");
  R(BALE.x + 70, BALE.y, 5, BALE.h, "#8a5a2e");
  if (pn.held >= 0) {
    R(pos.x - 22, pos.y + 22, 44, 4, "rgba(0,0,0,0.25)");
    if (pn.heldKind === "muck") {
      // a shovel carrying muck
      R(pos.x - 4, pos.y - 46, 8, 52, "#8a5a2e");
      R(pos.x - 20, pos.y + 2, 40, 14, "#2a2a30");
      R(pos.x - 18, pos.y - 8, 36, 12, "#4a2e14");
    } else strawBit(pos.x, pos.y);
  }
}
export function playLivePen(done: (mistakes: number) => void): void {
  pn.piles = PILE_AT.map(([x, y]) => ({ x, y, gone: false }));
  pn.spots = PILE_AT.map(([x, y]) => ({ x, y, straw: false }));
  pn.held = -1;
  pn.heldKind = "";
  pn.phase = 0;
  pn.mess = [];
  pn.seed = 0;
  let mistakes = 0;
  let finished = false;
  const left = (): number => (pn.phase === 0 ? pn.piles.filter((p) => !p.gone).length : pn.spots.filter((s) => !s.straw).length);
  const grab = (x: number, y: number): void => {
    if (pn.held >= 0 || finished) return;
    if (pn.phase === 0) {
      const i = pn.piles.findIndex((p) => !p.gone && dist(x, y, p.x, p.y) < 40);
      if (i < 0) return;
      pn.held = i;
      pn.heldKind = "muck";
      sfx("scoop");
    } else if (x > BALE.x - 10 && x < BALE.x + BALE.w + 10 && y > BALE.y - 14 && y < BALE.y + BALE.h + 10) {
      pn.held = 0;
      pn.heldKind = "straw";
      sfx("rustle");
    } else return;
    gameEl()?.classList.add("grab");
  };
  const drop = (x: number, y: number): void => {
    if (pn.held < 0) return;
    const kind = pn.heldKind;
    const i = pn.held;
    pn.held = -1;
    gameEl()?.classList.remove("grab");
    if (kind === "muck") {
      if (x > BARROW.x - 14 && x < BARROW.x + BARROW.w + 14 && y > BARROW.y - 30 && y < BARROW.y + BARROW.h) {
        pn.piles[i].gone = true;
        sfx("thud");
        if (pn.piles.every((p) => p.gone)) pn.phase = 1;
      } else {
        // spilled: the muck lands where it was dropped
        pn.piles[i].x = Math.min(600, Math.max(60, x));
        pn.piles[i].y = Math.min(340, Math.max(170, y));
        mistakes++;
        sfx("bad");
      }
    } else {
      const s = pn.spots.find((q) => !q.straw && dist(x, y, q.x, q.y) < 46);
      if (s) {
        s.straw = true;
        sfx("rustle");
      } else {
        mistakes++;
        sfx("bad");
      }
    }
    run.refresh();
    if (pn.phase === 1 && pn.spots.every((s) => s.straw) && !finished) {
      finished = true;
      sfx("oink");
      run.finish(() => done(mistakes));
    }
  };
  const run = begin("livePen", "pen", () => `${pn.phase === 0 ? T().lv.penMuck : T().lv.penStraw}: ${left()}`, {
    down: grab,
    up: drop,
    key: (e, x, y) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (!e.repeat) (pn.held >= 0 ? drop : grab)(x, y);
      return true;
    },
  }, "lv");
  const stop = loop(() => {
    if (finished) stop();
  });
}

customScenes.liveEggs = drawEggs;
customScenes.liveMilk = drawMilk;
customScenes.liveGoats = drawGoats;
customScenes.livePen = drawPen;
