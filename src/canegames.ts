/**
 * Hands-on close-ups for the sugarcane month: plow the furrows, spread fertilizer, plant the setts and mulch the rows.
 * They build on the same helpers as the rice-month close-ups (closeups.ts).
 */
import { R, backdrop, customScenes, layer, reduce, rnd, weedSoil } from "./art";
import { begin, gameEl, loop, pos } from "./closeups";
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

function dragGame(kind: string, key: "setts" | "mulch", d: Drag, done: () => void): void {
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
  const run = begin(kind, key, () => `${key === "setts" ? T().cc.settsLeft : T().cc.mulchLeft}: ${left()}`, {
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

customScenes.ccPlow = drawTrace;
customScenes.ccFert = drawTrace;
customScenes.ccSetts = drawDrag;
customScenes.ccMulch = drawDrag;
