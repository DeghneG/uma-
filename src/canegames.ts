/**
 * Hands-on close-ups for the sugarcane month: plow the furrows, spread fertilizer, plant the setts and mulch the rows.
 * They build on the same helpers as the rice-month close-ups (closeups.ts).
 */
import { R, backdrop, carabao, customScenes, disc, flipAt, layer, reduce, rnd, weedSoil } from "./art";
import { begin, gameEl, gradient, lerpHex, loop, pos } from "./closeups";
import { sfx } from "./sound";
import { T } from "./ui";

const ROW_Y = [176, 226, 276, 326];

/* ============================================================
 * 1 + 2. Plow and fertilize: hold and trace each row from left to right
 * ============================================================ */
let traceMode: "plow" | "fert" = "plow";
let rowProg = [0, 0, 0, 0];
const BINS = 32;
let fedBins: boolean[][] = [];
let held = false;
let keyHeld = false;

function trench(y: number, x1: number): void {
  if (x1 <= 0) return;
  R(0, y - 15, x1, 5, "#c29a60");
  R(0, y - 15, x1, 1, "#e0bd80");
  R(0, y - 10, x1, 3, "#8a6a3e");
  R(0, y - 7, x1, 15, "#5a3d22");
  R(0, y - 7, x1, 2, "#7a5a36");
  R(0, y + 6, x1, 2, "#3f2a16");
  R(0, y + 8, x1, 5, "#b08850");
  R(0, y + 13, x1, 2, "#7a5a36");
  for (let x = 6; x < x1; x += 11) {
    R(x, y - 17 - (x % 3), 4, 2, "#a07a48");
    R(x + 3, y + 14 + (x % 2), 3, 2, "#8a6a3e");
  }
}
function drawTrace(t: number): void {
  backdrop(t, 104);
  layer("weeding-soil", weedSoil);
  const fert = traceMode === "fert";
  ROW_Y.forEach((y, i) => {
    trench(y, fert ? 640 : Math.round(rowProg[i]));
    if (!fert) {
      // a dotted guide on the row ahead of the plow
      for (let x = Math.max(0, Math.round(rowProg[i])) + 6; x < 640; x += 14) R(x, y - 1, 6, 3, "#f4f1e4");
    } else {
      for (let b = 0; b < BINS; b++) {
        if (!fedBins[i]?.[b]) continue;
        for (let k = 0; k < 6; k++) R(b * 20 + 2 + rnd(b * 7 + k + i * 61) * 16, y - 3 + rnd(b * 13 + k + i * 17) * 9, 2, 2, k % 3 ? "#f4f1e4" : k % 2 ? "#f2e08a" : "#fff");
      }
    }
  });
  const x = Math.round(pos.x);
  const y = Math.round(pos.y);
  const on = held || keyHeld;
  if (!fert) {
    if (on && !reduce) for (let k = 0; k < 8; k++) R(x - 8 - ((t / 40 + k * 7) % 26), y - 8 - ((k * 5 + t / 30) % 12), 3, 3, k % 2 ? "#a07a48" : "#7a5a36");
    // the plow: share, beam and handles
    R(x - 7, y - 4, 16, 10, "#1c1c20");
    R(x - 6, y - 3, 14, 8, "#aeb6bc");
    R(x - 6, y - 3, 14, 2, "#e4eaee");
    R(x - 10, y + 2, 5, 4, "#7f878d");
    R(x + 8, y - 8, 30, 5, "#1c0d08");
    R(x + 9, y - 7, 28, 3, "#8a5a2e");
    R(x + 30, y - 30, 5, 26, "#1c0d08");
    R(x + 31, y - 30, 3, 26, "#a8742e");
    R(x + 24, y - 34, 18, 5, "#1c0d08");
    R(x + 25, y - 33, 16, 3, "#c8883a");
  } else {
    if (on) for (let k = 0; k < 16; k++) R(x - 2 + Math.sin(k) * 3, y - 4 + ((reduce ? k * 3 : t / 8 + k * 9) % 30), 2, 3, k % 3 ? "#f4f1e4" : "#f2e08a");
    // a fertilizer sack tipped over the furrow
    R(x - 4, y - 16, 36, 30, "#1c0d08");
    R(x - 3, y - 15, 34, 28, "#e8e8e8");
    R(x - 3, y - 15, 34, 4, "#ffffff");
    R(x - 3, y - 4, 34, 8, "#2f8a4a");
    R(x + 2, y - 12, 22, 5, "#d9432e");
    R(x + 2, y + 5, 22, 4, "#cfcfcf");
    R(x - 8, y - 6, 6, 6, "#1c0d08");
    R(x - 7, y - 5, 4, 4, "#d8d8d8");
  }
}

export function playTrace(mode: "plow" | "fert", done: () => void): void {
  traceMode = mode;
  rowProg = [0, 0, 0, 0];
  fedBins = ROW_Y.map(() => Array<boolean>(BINS).fill(false));
  held = false;
  keyHeld = false;
  let finished = false;
  const fedRows = (): number => fedBins.filter((r) => r.filter(Boolean).length >= BINS * 0.9).length;
  const doneRows = (): number => (mode === "plow" ? rowProg.filter((p) => p >= 612).length : fedRows());
  const apply = (x: number, y: number): void => {
    if (!(held || keyHeld)) return;
    ROW_Y.forEach((ry, i) => {
      if (Math.abs(y - ry) > 20) return;
      if (mode === "plow") {
        // the plow only moves forward from where it left off
        if (x >= rowProg[i] - 28 && x - rowProg[i] <= 50) rowProg[i] = Math.max(rowProg[i], Math.min(640, x));
      } else {
        const b = Math.min(BINS - 1, Math.max(0, Math.floor(x / 20)));
        fedBins[i][b] = true;
        if (b > 0) fedBins[i][b - 1] = fedBins[i][b - 1] || x % 20 < 8;
      }
    });
    run.refresh();
    if (doneRows() >= 4 && !finished) {
      finished = true;
      held = false;
      keyHeld = false;
      sfx("good");
      run.finish(done);
    }
  };
  const run = begin(mode === "plow" ? "ccPlow" : "ccFert", mode, () => `${mode === "plow" ? T().cc.plowLeft : T().cc.fertLeft}: ${doneRows()} / 4`, {
    down: (x, y) => {
      held = true;
      sfx("click");
      apply(x, y);
    },
    up: () => {
      held = false;
    },
    move: apply,
    key: (e, x, y) => {
      if (e.key === " " || e.key === "Enter") {
        if (!e.repeat) keyHeld = !keyHeld;
        apply(x, y);
        return true;
      }
      if (e.key.toLowerCase() === "e" && mode === "fert") {
        keyHeld = true;
        apply(x, y);
        return true;
      }
      return false;
    },
  }, "cc");
  const eUp = (e: KeyboardEvent): void => {
    if (e.key.toLowerCase() === "e" && mode === "fert") keyHeld = false;
    if (!document.querySelector(".cuhint")) document.removeEventListener("keyup", eUp);
  };
  document.addEventListener("keyup", eUp);
  gameEl()?.classList.add("nocursor");
  const stop = loop(() => {
    if (finished) {
      stop();
      document.removeEventListener("keyup", eUp);
    }
  });
}

/* ============================================================
 * 3 + 4. Plant the setts and mulch the rows: drag from the pile into place
 * ============================================================ */
type Slot = { x: number; y: number; t: number };
type Drag = {
  slots: Slot[];
  src: { x: number; y: number };
  held: boolean;
  bg: (t: number) => void;
  mark: (s: Slot, t: number) => void;
  item: (x: number, y: number) => void;
  placed: (s: Slot, age: number) => void;
  pile: (x: number, y: number, left: number) => void;
};
let drag: Drag | null = null;

function drawDrag(t: number): void {
  const d = drag;
  if (!d) return;
  d.bg(t);
  const now = performance.now();
  for (const s of d.slots) {
    if (s.t === 0) d.mark(s, t);
    else d.placed(s, now - s.t);
  }
  d.pile(d.src.x, d.src.y, d.slots.filter((s) => s.t === 0).length);
  if (d.held) {
    R(pos.x - 14, pos.y + 12, 30, 4, "rgba(0,0,0,0.25)");
    d.item(Math.round(pos.x), Math.round(pos.y));
  }
}

/** Sett lying across a furrow: a cut piece of stalk with two buds. */
function sett(x: number, y: number): void {
  R(x - 15, y - 4, 31, 9, "#2a2208");
  R(x - 14, y - 3, 29, 7, "#cdbd48");
  R(x - 14, y - 3, 29, 2, "#e8dc78");
  R(x - 14, y + 3, 29, 1, "#8a7a24");
  R(x - 1, y - 4, 3, 9, "#7a6a20");
  R(x - 9, y - 6, 4, 3, "#59b32f");
  R(x + 6, y + 4, 4, 3, "#59b32f");
  R(x - 15, y - 3, 2, 7, "#8a7a24");
  R(x + 14, y - 3, 2, 7, "#8a7a24");
}
function dryBundle(x: number, y: number): void {
  R(x - 17, y - 9, 35, 20, "#3a2a0a");
  for (let k = 0; k < 9; k++) {
    R(x - 16 + k * 4, y - 8 + (k % 3), 4, 18 - (k % 3), k % 2 ? "#c8a040" : "#e0bd5a");
    R(x - 16 + k * 4, y - 8 + (k % 3), 1, 18 - (k % 3), "#f4de90");
  }
  R(x - 3, y - 8, 6, 20, "#8a5a2e");
  R(x - 18, y - 12, 8, 5, "#a8892c");
  R(x + 10, y - 13, 8, 5, "#c8a040");
}

function dragGame(kind: string, key: "setts" | "mulch" | "press" | "bag", d: Drag, done: () => void): void {
  drag = d;
  d.held = false;
  let finished = false;
  const left = (): number => d.slots.filter((s) => s.t === 0).length;
  const grab = (x: number, y: number): void => {
    if (d.held || left() === 0 || Math.hypot(x - d.src.x, y - d.src.y) > 44) return;
    d.held = true;
    gameEl()?.classList.add("grab");
    sfx("click");
  };
  const drop = (x: number, y: number): void => {
    if (!d.held) return;
    d.held = false;
    gameEl()?.classList.remove("grab");
    let best: Slot | null = null;
    let bd = 34;
    for (const s of d.slots) {
      const dist = Math.hypot(s.x - x, s.y - y);
      if (s.t === 0 && dist < bd) {
        best = s;
        bd = dist;
      }
    }
    if (!best) return;
    best.t = performance.now();
    sfx("cut");
    run.refresh();
    if (left() === 0 && !finished) {
      finished = true;
      run.finish(done);
    }
  };
  const labels = (): string => ({ setts: T().cc.settsLeft, mulch: T().cc.mulchLeft, press: T().cc.pressLeft, bag: T().cc.bagLeft })[key];
  const run = begin(kind, key, () => `${labels()}: ${left()}`, {
    down: grab,
    up: drop,
    key: (e, x, y) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (!e.repeat) (d.held ? drop : grab)(x, y);
      return true;
    },
  }, "cc");
}

export function playSetts(done: () => void): void {
  const slots: Slot[] = [];
  ROW_Y.forEach((y) => [150, 320, 490].forEach((x) => slots.push({ x, y, t: 0 })));
  dragGame("ccSetts", "setts", {
    slots,
    src: { x: 582, y: 122 },
    held: false,
    bg: (t) => {
      backdrop(t, 104);
      layer("weeding-soil", weedSoil);
      ROW_Y.forEach((y) => trench(y, 640));
    },
    mark: (s, t) => {
      const a = reduce ? 0 : Math.round(Math.sin(t / 220 + s.x) * 1);
      for (let k = 0; k < 8; k++) {
        R(s.x - 17 + k * 4, s.y - 8 - a, 3, 2, "#f4f1e4");
        R(s.x - 17 + k * 4, s.y + 7 + a, 3, 2, "#f4f1e4");
      }
    },
    item: sett,
    placed: (s, age) => {
      sett(s.x, s.y);
      // soil is drawn over it a moment after it is laid
      const c = Math.min(1, Math.max(0, (age - 400) / 400));
      if (c > 0) {
        R(s.x - 17, s.y - 7, 35, Math.round(15 * c), "#7a5a36");
        R(s.x - 17, s.y - 8, 35, 3, "#c29a60");
        for (let k = 0; k < 7; k++) R(s.x - 15 + k * 5, s.y - 8 + (k % 2), 3, 2, "#8a6a3e");
      }
    },
    pile: (x, y, left) => {
      R(x - 38, y + 8, 76, 6, "rgba(0,0,0,0.3)");
      for (let k = 0; k < Math.min(6, left); k++) sett(x - 4 + (k % 2) * 6, y - 14 + k * 5);
      R(x - 22, y - 2, 44, 4, "#a02a1a");
    },
  }, done);
}

export function playMulch(done: () => void): void {
  const slots: Slot[] = [];
  [[130, 200], [290, 200], [450, 200], [130, 290], [290, 290], [450, 290]].forEach(([x, y]) => slots.push({ x, y, t: 0 }));
  dragGame("ccMulch", "mulch", {
    slots,
    src: { x: 582, y: 122 },
    held: false,
    bg: (t) => {
      backdrop(t, 104);
      layer("weeding-soil", weedSoil);
    },
    mark: (s, t) => {
      const a = reduce ? 0 : Math.round(Math.sin(t / 260 + s.y) * 1);
      for (let k = 0; k < 12; k++) {
        R(s.x - 46 + k * 8, s.y - 22 - a, 5, 2, "#f4f1e4");
        R(s.x - 46 + k * 8, s.y + 22 + a, 5, 2, "#f4f1e4");
      }
      for (let k = 0; k < 6; k++) {
        R(s.x - 48, s.y - 20 + k * 8, 2, 5, "#f4f1e4");
        R(s.x + 46, s.y - 20 + k * 8, 2, 5, "#f4f1e4");
      }
    },
    item: dryBundle,
    placed: (s, age) => {
      const c = Math.min(1, age / 350);
      R(s.x - 48, s.y - 22, 96, 45, "#5a3d22");
      for (let k = 0; k < Math.round(46 * c); k++) {
        const x = s.x - 46 + rnd(k * 3 + s.x) * 88;
        const y = s.y - 20 + rnd(k * 5 + s.y) * 40;
        R(x, y, 10, 2, k % 3 ? "#d8b44a" : k % 2 ? "#c89a3a" : "#ecd078");
      }
      R(s.x - 48, s.y - 22, 96, 2, "#8a6a2a");
    },
    pile: (x, y, left) => {
      R(x - 40, y + 10, 80, 6, "rgba(0,0,0,0.3)");
      for (let k = 0; k < Math.min(5, left); k++) dryBundle(x - 6 + (k % 2) * 8, y - 12 + k * 4);
    },
  }, done);
}


/* ============================================================
 * 5. Press the cane: feed bundles into the rollers and catch the juice
 * ============================================================ */
function caneBundleItem(x: number, y: number): void {
  R(x - 17, y - 9, 35, 19, "#2a2208");
  for (let k = 0; k < 4; k++) {
    R(x - 16, y - 8 + k * 4, 33, 4, k % 2 ? "#bfae38" : "#cdbd48");
    R(x - 16, y - 8 + k * 4, 33, 1, "#e8dc78");
  }
  for (let k = 0; k < 5; k++) R(x - 12 + k * 7, y - 8, 1, 17, "#7a6a20");
  R(x - 8, y - 10, 4, 21, "#a02a1a");
  R(x + 6, y - 10, 4, 21, "#a02a1a");
  R(x - 20, y - 4, 5, 3, "#3f9a2a");
  R(x + 16, y + 2, 5, 3, "#59b32f");
}
function millYard(t: number): void {
  backdrop(t, 104);
  layer("weeding-soil", weedSoil);
  // a plank floor around the mill
  R(150, 214, 340, 108, "#1c0d08");
  R(152, 216, 336, 104, "#7a5a36");
  for (let k = 0; k < 7; k++) R(152, 216 + k * 15, 336, 2, "#5a3f1e");
}
export function playPress(n: number, done: () => void): void {
  const slots: Slot[] = Array.from({ length: n }, () => ({ x: 300, y: 130, t: 0 }));
  const placed = (): number => slots.filter((q) => q.t !== 0).length;
  let lastPut = 0;
  dragGame("ccPress", "press", {
    slots,
    src: { x: 96, y: 300 },
    held: false,
    bg: (t) => {
      millYard(t);
      const now = performance.now();
      // the carabao walks a slow circle round the press, hitched to a long pole (behind it, then in front)
      const phi = reduce ? 1.2 : t / 2400;
      const cxn = Math.round(340 + 128 * Math.cos(phi));
      const cyn = Math.round(244 + 34 * Math.sin(phi));
      const front = Math.sin(phi) > 0;
      const walk = (): void => {
        // the pole runs from the middle roller to the carabao's shoulder, with its yoke
        const sx = cxn;
        const sy = cyn - 26;
        const n = 60;
        for (let k = 0; k <= n; k++) {
          const px = 340 + ((sx - 340) * k) / n;
          const py = 192 + ((sy - 192) * k) / n;
          R(px - 2, py - 2, 5, 5, "#1c0d08");
          R(px - 1, py - 1, 3, 3, "#a8742e");
        }
        flipAt(cxn, Math.sin(phi) < 0 ? 1 : -1, () => carabao(cxn, cyn, t));
        R(cxn - 5, cyn - 32, 10, 4, "#6a4a22");
      };
      if (!front) walk();
      // the three rollers
      R(250, 232, 100, 32, "#1c0d08");
      R(252, 234, 96, 28, "#6a4a22");
      for (let i = 0; i < 3; i++) {
        const cx = 272 + i * 28;
        R(cx - 12, 148, 24, 92, "#1c0d08");
        R(cx - 11, 149, 22, 90, "#8a5a2e");
        R(cx - 10, 149, 5, 90, "#c49a5c");
        R(cx - 11, 172, 22, 4, "#3a2a14");
        R(cx - 11, 214, 22, 4, "#3a2a14");
        R(cx - 13, 144, 26, 6, "#5a3a1a");
      }
      // the hopper on top
      R(246, 112, 108, 32, "#1c0d08");
      R(248, 114, 104, 28, "#7a5a36");
      R(256, 116, 88, 8, "#1c0d08");
      if (front) walk();
      // the juice vat below, filling as cane goes in
      const p = n ? placed() / n : 0;
      R(294, 264, 12, 12, "#aeb6bc");
      if (now - lastPut < 900 && !reduce) for (let k = 0; k < 4; k++) R(298 + (k % 2) * 4, 268 + ((now / 20 + k * 6) % 14), 3, 4, "#b8e060");
      R(258, 276, 84, 48, "#1c0d08");
      R(260, 278, 80, 44, "#8a5a2e");
      R(260, 286, 80, 3, "#5a3a1a");
      R(260, 306, 80, 3, "#5a3a1a");
      R(268, 282, 64, 34, "#2a1a08");
      const fillH = Math.round(32 * p);
      R(268, 316 - fillH, 64, fillH, "#b8e060");
      if (fillH > 0) R(268, 316 - fillH, 64, 2, "#e8f8a0");
    },
    mark: (_s, t) => {
      for (let k = 0; k < 16; k++) {
        const ang = (k / 16) * 6.28 + (reduce ? 0 : t / 900);
        R(300 + Math.cos(ang) * 44 - 2, 128 + Math.sin(ang) * 22 - 2, 4, 4, "#f4f1e4");
      }
    },
    item: caneBundleItem,
    placed: (s, age) => {
      if (age < 450) {
        R(292, 132 + age / 5, 16, 4, "#cdbd48");
        R(296, 140 + age / 4, 8, 3, "#3f9a2a");
      }
      lastPut = Math.max(lastPut, s.t);
    },
    pile: (x, y, left) => {
      R(x - 40, y + 10, 80, 6, "rgba(0,0,0,0.3)");
      for (let k = 0; k < Math.min(5, left); k++) caneBundleItem(x - 6 + (k % 2) * 8, y - 12 + k * 4);
    },
  }, done);
}

/* ============================================================
 * 6. Boil the juice: keep the fire in the green zone until the sugar thickens
 * ============================================================ */
const boil = { heat: 0.3, prog: 0, burn: 0, fuelAt: 0 };
const HEAT_LO = 0.5;
const HEAT_HI = 0.74;
function drawBoil(t: number): void {
  const now = performance.now();
  // the boiling shed: board walls, an earth floor
  gradient(0, 230, "#5a3f22", "#3f2a14", 10);
  for (let x = 0; x < 640; x += 36) R(x, 0, 3, 230, "#2a1a0a");
  R(0, 230, 640, 130, "#3a2a14");
  for (let i = 0; i < 60; i++) R(rnd(i + 3) * 640, 236 + rnd(i * 5) * 120, 12, 2, "#2a1c0e");
  // the brick furnace with its fire mouth
  R(150, 232, 340, 92, "#1c0d08");
  R(152, 234, 336, 88, "#8a3a22");
  for (let y = 234; y < 322; y += 8) for (let x = 152 + ((y / 8) % 2) * 14; x < 488; x += 28) {
    R(x, y, 26, 6, (x + y) % 3 ? "#9a4a2a" : "#7a3220");
  }
  R(236, 262, 168, 52, "#14100a");
  const h = boil.heat;
  for (let k = 0; k < 11; k++) {
    const fh = 8 + h * 36 + (reduce ? 0 : Math.sin(t / 90 + k * 1.7) * 5);
    const fx = 244 + k * 14;
    R(fx, 312 - fh, 12, fh, "#d9432e");
    R(fx + 2, 312 - fh * 0.78, 8, fh * 0.78, "#f2994a");
    R(fx + 4, 312 - fh * 0.5, 4, fh * 0.5, "#f2e04a");
  }
  // the wide pan, with the juice darkening and thickening as it boils
  const juice = lerpHex("#b8e060", "#b8742a", boil.prog);
  R(130, 196, 380, 40, "#0c0c10");
  R(134, 198, 372, 34, "#3a3f44");
  R(138, 202, 364, 26, juice);
  R(138, 202, 364, 3, lerpHex("#e8f8a0", "#e0a85c", boil.prog));
  const bub = Math.round(4 + h * 26);
  for (let k = 0; k < bub; k++) {
    const bx = 150 + rnd(k * 3 + Math.floor(now / 360)) * 340;
    const by = 206 + rnd(k * 7 + Math.floor(now / 360)) * 16;
    const r = 2 + Math.round(rnd(k + 9) * 3);
    R(bx - r, by - r, r * 2, r * 2, "rgba(255,255,255,0.55)");
    R(bx - r + 1, by - r + 1, Math.max(1, r - 1), 1, "#ffffff");
  }
  if (!reduce) for (let k = 0; k < 6; k++) disc(150 + k * 62 + ((now / 50 + k * 17) % 20), 188 - ((now / 22 + k * 23) % 90), 5 + (k % 3) * 2, `rgba(240,240,240,${(0.28 * h).toFixed(2)})`);
  // a ladle and the firewood pile
  R(500, 170, 5, 70, "#1c0d08");
  R(501, 170, 3, 70, "#a8742e");
  R(494, 236, 18, 8, "#1c0d08");
  R(496, 238, 14, 4, "#aeb6bc");
  for (let k = 0; k < 4; k++) {
    R(40, 300 + k * 10, 90, 9, "#1c0d08");
    R(41, 301 + k * 10, 88, 6, k % 2 ? "#8a5a2e" : "#a8742e");
    R(124, 302 + k * 10, 4, 5, "#e0c890");
  }
  if (now - boil.fuelAt < 300 && !reduce) {
    const u = (now - boil.fuelAt) / 300;
    R(Math.round(120 + u * 160), Math.round(310 - Math.sin(u * 3.14) * 40 + u * 6), 36, 8, "#1c0d08");
    R(Math.round(121 + u * 160), Math.round(311 - Math.sin(u * 3.14) * 40 + u * 6), 34, 5, "#c8883a");
  }
  // the heat gauge on the right, and the thickening bar along the bottom
  R(556, 128, 30, 170, "#1c0d08");
  R(558, 130, 26, 166, "#2a2f34");
  const yHi = 296 - Math.round(HEAT_HI * 166);
  const yLo = 296 - Math.round(HEAT_LO * 166);
  R(558, 130, 26, yHi - 130, "#d9432e");
  R(558, yHi, 26, yLo - yHi, "#52c24a");
  R(558, yLo, 26, 296 - yLo, "#e8a23a");
  const my = 296 - Math.round(h * 166);
  R(548, my - 6, 46, 12, "#1c0d08");
  R(550, my - 4, 42, 8, "#f2c94c");
  R(150, 336, 340, 14, "#1c0d08");
  R(152, 338, 336, 10, "#3a2a14");
  R(152, 338, Math.round(336 * boil.prog), 10, juice);
}
export function playBoil(done: (quality: number) => void): void {
  Object.assign(boil, { heat: 0.32, prog: 0, burn: 0, fuelAt: 0 });
  let finished = false;
  const feed = (): void => {
    boil.heat = Math.min(1, boil.heat + 0.13);
    boil.fuelAt = performance.now();
    sfx("click");
  };
  const run = begin("ccBoil", "boil", () => `${T().cc.boilLeft}: ${Math.round(boil.prog * 100)}%`, {
    down: feed,
    key: (e) => {
      if (e.key !== " " && e.key !== "Enter" && e.key.toLowerCase() !== "e") return false;
      if (!e.repeat) feed();
      return true;
    },
  }, "cc");
  let acc = 0;
  const stop = loop((dt) => {
    boil.heat = Math.max(0, boil.heat - dt * 0.00011);
    if (boil.heat >= HEAT_LO && boil.heat <= HEAT_HI) boil.prog = Math.min(1, boil.prog + dt / 7000);
    if (boil.heat > 0.84) boil.burn += dt / 1000;
    acc += dt;
    if (acc > 250) {
      acc = 0;
      run.refresh();
    }
    if (boil.prog >= 1 && !finished) {
      finished = true;
      stop();
      sfx("good");
      const q = Math.max(0.7, 1 - boil.burn * 0.06);
      run.finish(() => done(q));
    }
  });
}

/* ============================================================
 * 7. Bag the sugar: set a sugar cake into each sack
 * ============================================================ */
function sugarCake(x: number, y: number): void {
  R(x - 14, y - 7, 29, 15, "#2a1608");
  R(x - 13, y - 6, 27, 13, "#a8743c");
  R(x - 13, y - 6, 27, 3, "#d8a868");
  R(x - 13, y + 3, 27, 4, "#7a5224");
  for (let k = 0; k < 4; k++) R(x - 9 + k * 7, y - 3, 2, 6, "#8a5a2e");
}
export function playBag(n: number, done: () => void): void {
  const slots: Slot[] = [];
  for (let i = 0; i < n; i++) slots.push({ x: 350 + (i % 3) * 110, y: 214 + Math.floor(i / 3) * 96, t: 0 });
  const sack = (x: number, y: number, full: number): void => {
    R(x - 28, y - 30, 56, 62, "#2a1a08");
    R(x - 26, y - 28, 52, 58, "#e0cc98");
    R(x - 26, y - 28, 52, 6, "#f0e2b8");
    R(x - 26, y + 22, 52, 8, "#b8a468");
    R(x - 19, y - 18, 6, 44, "#ccb880");
    R(x + 13, y - 18, 6, 44, "#ccb880");
    if (full > 0) {
      R(x - 20, y - 34, 40, 10, "#2a1a08");
      R(x - 18, y - 33, 36, Math.round(8 * full), "#a8743c");
      R(x - 18, y - 33, 36, 2, "#d8a868");
      R(x - 4, y - 24, 8, 16, "#a02a1a");
    } else R(x - 22, y - 34, 44, 6, "#14100a");
  };
  dragGame("ccBag", "bag", {
    slots,
    src: { x: 96, y: 290 },
    held: false,
    bg: (t) => {
      void t;
      gradient(0, 230, "#6a4a28", "#4a3418", 10);
      for (let x = 0; x < 640; x += 40) R(x, 0, 3, 230, "#2a1a0a");
      R(0, 230, 640, 130, "#8a6a3e");
      for (let k = 0; k < 8; k++) R(0, 232 + k * 16, 640, 2, "#5a3f1e");
      // a stack of finished sacks behind
      for (let i = 0; i < 6; i++) R(540 + (i % 3) * 30, 150 + Math.floor(i / 3) * 24, 28, 22, "#cdbf8c");
    },
    mark: (s, t) => {
      sack(s.x, s.y, 0);
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * 6.28 + (reduce ? 0 : t / 800);
        R(s.x + Math.cos(ang) * 38 - 2, s.y - 2 + Math.sin(ang) * 40 - 2, 4, 4, "#f4f1e4");
      }
    },
    item: sugarCake,
    placed: (s, age) => sack(s.x, s.y, Math.min(1, age / 300)),
    pile: (x, y, left) => {
      R(x - 52, y + 6, 104, 8, "rgba(0,0,0,0.3)");
      R(x - 50, y - 16, 100, 26, "#1c0d08");
      R(x - 48, y - 14, 96, 22, "#9a7440");
      for (let k = 0; k < Math.min(6, left); k++) sugarCake(x - 30 + (k % 3) * 30, y - 8 - Math.floor(k / 3) * 8);
    },
  }, done);
}

customScenes.ccPlow = drawTrace;
customScenes.ccFert = drawTrace;
customScenes.ccSetts = drawDrag;
customScenes.ccMulch = drawDrag;
customScenes.ccPress = drawDrag;
customScenes.ccBag = drawDrag;
customScenes.ccBoil = drawBoil;
