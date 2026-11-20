/**
 * Hands-on close-ups for the jobs a player picks: every choice is carried out by hand, zoomed in.
 * Each game draws its own scene (registered in customScenes), reads the mouse (or W A S D + Space)
 * and calls back when the job is done.
 */
import gsap from "gsap";
import { R, customScenes, disc, layer, reduce, rnd, setScene, tuft, weedSoil, backdrop } from "./art";
import { sfx } from "./sound";
import { T, h, show, statusRow } from "./ui";

/* ---------- shared plumbing ---------- */
export type Handlers = {
  down?: (x: number, y: number) => void;
  move?: (x: number, y: number) => void;
  up?: (x: number, y: number) => void;
  key?: (e: KeyboardEvent, x: number, y: number) => boolean;
};

/** Pointer position on the canvas, a liveness check, and clean-up. The hand also moves with W A S D. */
export function closeUp(live: string, handlers: Handlers, pos: { x: number; y: number }): () => void {
  const cv = document.getElementById("cv") as HTMLCanvasElement;
  let off = false;
  const alive = (): boolean => {
    if (!off && !document.querySelector(live)) stop();
    return !off;
  };
  const xy = (e: PointerEvent): [number, number] => {
    const r = cv.getBoundingClientRect();
    pos.x = Math.min(634, Math.max(4, ((e.clientX - r.left) / r.width) * 640));
    pos.y = Math.min(350, Math.max(4, ((e.clientY - r.top) / r.height) * 360));
    return [pos.x, pos.y];
  };
  const d = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (alive()) handlers.down?.(...xy(e));
  };
  const m = (e: PointerEvent): void => {
    if (alive()) handlers.move?.(...xy(e));
  };
  const u = (e: PointerEvent): void => {
    if (alive()) handlers.up?.(...xy(e));
  };
  const k = (e: KeyboardEvent): void => {
    if (!alive()) return;
    const step = 9;
    const key = e.key.toLowerCase();
    if (key === "a") pos.x = Math.max(4, pos.x - step);
    else if (key === "d") pos.x = Math.min(634, pos.x + step);
    else if (key === "w") pos.y = Math.max(4, pos.y - step);
    else if (key === "s") pos.y = Math.min(350, pos.y + step);
    else if (handlers.key?.(e, pos.x, pos.y)) {
      e.preventDefault();
      return;
    } else return;
    e.preventDefault();
    handlers.move?.(pos.x, pos.y);
  };
  window.addEventListener("pointerdown", d);
  window.addEventListener("pointermove", m);
  window.addEventListener("pointerup", u);
  document.addEventListener("keydown", k);
  function stop(): void {
    if (off) return;
    off = true;
    window.removeEventListener("pointerdown", d);
    window.removeEventListener("pointermove", m);
    window.removeEventListener("pointerup", u);
    document.removeEventListener("keydown", k);
    document.getElementById("game")?.classList.remove("grab", "planting");
  }
  return stop;
}

export const zoomIn = (): void => {
  if (!reduce) gsap.fromTo("#cv", { scale: 1.2, filter: "brightness(1.6)" }, { scale: 1, filter: "brightness(1)", duration: 0.5, ease: "power3.out", clearProps: "transform,filter" });
};
export const backToField = (): void => {
  setScene("field");
  if (!reduce) gsap.fromTo("#cv", { scale: 1.1 }, { scale: 1, duration: 0.5, ease: "power2.out", clearProps: "transform" });
};

const pos = { x: 320, y: 230 };
const gameEl = (): HTMLElement | null => document.getElementById("game");
type Run = { refresh: () => void; finish: (cb: () => void) => void };
const cuText = (k: string, f: "Head" | "Hint"): string => (T().cu as Record<string, string>)[k + f];

/** Start a close-up: switch the scene, show the panel (title, hint, one status chip) and listen for the hand. */
function begin(kind: string, key: string, status: () => string, handlers: Handlers): Run {
  setScene(kind);
  zoomIn();
  gameEl()?.classList.add("closeup");
  show((p) => {
    p.appendChild(h("h2", undefined, cuText(key, "Head")));
    p.appendChild(h("p", "note cuhint", cuText(key, "Hint")));
    p.appendChild(statusRow([status()]));
  });
  const stop = closeUp(".cuhint", handlers, pos);
  return {
    refresh: () => {
      const s = document.querySelector("#panel .status span");
      if (s) s.textContent = status();
    },
    finish: (cb) => {
      stop();
      gameEl()?.classList.remove("closeup", "grab");
      setTimeout(() => {
        backToField();
        cb();
      }, 900);
    },
  };
}

/** Animation frames for as long as the close-up panel is on screen. */
function loop(fn: (dt: number, t: number) => void): () => void {
  let raf = 0;
  let last = 0;
  let off = false;
  const tick = (now: number): void => {
    if (off || !document.querySelector(".cuhint")) return;
    fn(last ? Math.min(60, now - last) : 16, now);
    last = now;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    off = true;
    cancelAnimationFrame(raf);
  };
}

/* ---------- drawing helpers ---------- */
const hex = (c: string): number[] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const lerpHex = (a: string, b: string, t: number): string => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * Math.min(1, Math.max(0, t)))).join(",")})`;
};
const gradient = (y0: number, y1: number, a: string, b: string, step = 6): void => {
  for (let y = y0; y < y1; y += step) R(0, y, 640, step, lerpHex(a, b, (y - y0) / (y1 - y0)));
};
const ripples = (t: number, y0: number, y1: number, n: number, c: string): void => {
  for (let k = 0; k < n; k++) {
    const y = y0 + ((k * 37) % (y1 - y0));
    R((((k * 71 + (reduce ? 0 : t / 45)) % 700) - 30), y, 14 + (k % 4) * 6, 1 + (y > (y0 + y1) / 2 ? 1 : 0), c);
  }
};

/* ============================================================
 * 1. Hand-pick and crush: pick pink snail-egg clusters and drop them on the stone
 * ============================================================ */
type Egg = { x: number; y: number; done: boolean };
let eggs: Egg[] = [];
let eggHeld = -1;
const splats: { x: number; y: number; t: number }[] = [];
const STONE = { x: 468, y: 292, w: 140, h: 52 };

function cluster(x: number, y: number): void {
  const dots: [number, number][] = [[-8, -6], [0, -8], [8, -6], [-12, 2], [-4, 0], [4, 0], [12, 2], [-8, 8], [0, 7], [8, 8]];
  for (const [dx, dy] of dots) {
    R(x + dx - 4, y + dy - 4, 9, 9, "#8a1f45");
    R(x + dx - 3, y + dy - 3, 7, 7, "#e75480");
    R(x + dx - 2, y + dy - 2, 3, 3, "#f8b4cc");
  }
}
function leaf(x0: number, y0: number, dir: number, len: number, light: string, dark: string): void {
  for (let i = 0; i < len; i++) {
    const x = x0 + dir * i * 2;
    const y = y0 - i * 1.4 + i * i * 0.012;
    const w = Math.max(2, Math.round(7 - (i / len) * 5));
    R(x, y, w + 2, 4, dark);
    R(x + 1, y, w, 3, light);
  }
}
function drawEggs(t: number): void {
  gradient(0, 300, "#b8dde0", "#6aa4b4");
  for (let i = 0; i < 40; i++) disc(rnd(i + 3) * 640, rnd(i + 8) * 290, 3 + Math.round(rnd(i) * 7), "rgba(255,255,255,0.1)");
  R(0, 300, 640, 60, "#4d8fa0");
  ripples(t, 304, 356, 18, "#a8dde8");
  // big rice stalks with nodes and arching leaves
  for (let i = 0; i < 7; i++) {
    const x = 36 + i * 92 + Math.round(rnd(i + 4) * 20);
    R(x - 2, 0, 12, 300, "#14340e");
    R(x, 0, 8, 300, "#3f9a2a");
    R(x, 0, 3, 300, "#7fd04a");
    R(x + 6, 0, 2, 300, "#2f7a1f");
    for (let n = 40; n < 300; n += 70) {
      R(x - 2, n, 12, 4, "#14340e");
      R(x - 1, n + 1, 10, 2, "#a8e060");
    }
    leaf(x + 8, 120 + (i % 3) * 30, 1, 34, "#59b32f", "#14340e");
    leaf(x, 200 - (i % 2) * 40, -1, 30, "#86d13a", "#14340e");
  }
  // the flat stone, with what is left of the crushed clusters
  R(STONE.x - 3, STONE.y - 3, STONE.w + 6, STONE.h + 6, "#1c1c20");
  R(STONE.x, STONE.y, STONE.w, STONE.h, "#8a8f98");
  R(STONE.x, STONE.y, STONE.w, 6, "#c4c9d0");
  R(STONE.x, STONE.y + STONE.h - 8, STONE.w, 8, "#5f646c");
  for (let i = 0; i < 18; i++) R(STONE.x + rnd(i + 1) * (STONE.w - 6), STONE.y + 8 + rnd(i + 9) * (STONE.h - 20), 3, 2, i % 2 ? "#6f747c" : "#a8adb5");
  const now = performance.now();
  for (const s of splats) {
    const a = Math.min(1, (now - s.t) / 200);
    R(s.x - 12 * a, s.y - 2, 24 * a, 6, "#c43a6a");
    R(s.x - 8 * a, s.y - 4, 16 * a, 4, "#e75480");
    for (let k = 0; k < 6; k++) R(s.x + (k - 3) * 6 * a, s.y - 8 * a - (k % 2) * 3, 3, 3, "#f08ab0");
  }
  eggs.forEach((e, i) => {
    if (e.done || i === eggHeld) return;
    const bob = reduce ? 0 : Math.round(Math.sin(t / 400 + i));
    cluster(e.x, e.y + bob);
  });
  if (eggHeld >= 0) {
    R(pos.x - 16, pos.y + 14, 32, 4, "rgba(0,0,0,0.25)");
    cluster(pos.x, pos.y);
  }
}
export function playEggs(done: () => void): void {
  eggs = [[90, 178], [176, 250], [300, 165], [340, 220], [430, 150], [500, 240], [586, 120], [380, 60]].map(([x, y]) => ({ x, y, done: false }));
  eggHeld = -1;
  splats.length = 0;
  const left = (): number => eggs.filter((e) => !e.done).length;
  let finished = false;
  const grab = (x: number, y: number): void => {
    if (eggHeld >= 0) return;
    let best = -1;
    let bd = 34;
    eggs.forEach((e, i) => {
      const d = Math.hypot(e.x - x, e.y - y);
      if (!e.done && d < bd) {
        best = i;
        bd = d;
      }
    });
    if (best < 0) return;
    eggHeld = best;
    gameEl()?.classList.add("grab");
    sfx("click");
  };
  const drop = (x: number, y: number): void => {
    if (eggHeld < 0) return;
    const e = eggs[eggHeld];
    eggHeld = -1;
    gameEl()?.classList.remove("grab");
    if (x > STONE.x - 10 && x < STONE.x + STONE.w + 10 && y > STONE.y - 24 && y < STONE.y + STONE.h) {
      e.done = true;
      splats.push({ x: Math.min(STONE.x + STONE.w - 14, Math.max(STONE.x + 14, x)), y: STONE.y + 16 + rnd(splats.length) * 18, t: performance.now() });
      sfx("cut");
      run.refresh();
      if (left() === 0 && !finished) {
        finished = true;
        run.finish(done);
      }
    }
  };
  const run = begin("cuEggs", "eggs", () => `${T().cu.eggsLeft}: ${left()}`, {
    down: grab,
    up: drop,
    key: (e, x, y) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (!e.repeat) (eggHeld >= 0 ? drop : grab)(x, y);
      return true;
    },
  });
}

/* ============================================================
 * 2. Set cheap traps: carry traps from the box to the paw-print marks on the rat trail
 * ============================================================ */
type Spot = { x: number; y: number; set: number };
let spots: Spot[] = [];
let trapsInBox = 3;
let trapHeld = false;
const BOX = { x: 70, y: 316 };

function trapArt(x: number, y: number, armed: boolean): void {
  R(x - 17, y - 8, 34, 17, "#2a1608");
  R(x - 16, y - 7, 32, 15, "#8a5a2e");
  R(x - 16, y - 7, 32, 3, "#b8844a");
  R(x - 16, y + 5, 32, 3, "#5a3a1e");
  R(x - 14, y - 10, 28, 3, armed ? "#aeb6bc" : "#7f878d");
  R(x - 14, y - 10, 28, 1, "#e4eaee");
  for (let k = 0; k < 4; k++) R(x - 10 + k * 5, y - 3, 3, 6, "#c9ced2");
  R(x + 6, y - 6, 9, 7, "#8a6a10");
  R(x + 7, y - 5, 7, 5, "#f2c94c");
  R(x + 9, y - 4, 2, 2, "#c9a02a");
}
function paw(x: number, y: number, c: string): void {
  R(x - 2, y, 5, 4, c);
  R(x - 4, y - 3, 2, 2, c);
  R(x - 1, y - 4, 2, 2, c);
  R(x + 2, y - 3, 2, 2, c);
}
function drawTraps(t: number): void {
  backdrop(t, 104);
  layer("weeding-soil", weedSoil);
  // the packed earth of the rat trail, with paw prints and a dragged tail
  for (let x = 0; x < 640; x += 4) {
    const y = 214 + Math.round(Math.sin(x * 0.014) * 24);
    R(x, y - 18, 4, 44, "#8a6a3e");
    R(x, y - 18, 4, 3, "#6a4d2a");
    R(x, y + 24, 4, 3, "#a07a48");
    if (x % 28 === 0) {
      paw(x + 4, y - 4, "#4a3418");
      paw(x + 16, y + 8, "#4a3418");
    }
    if (x % 8 === 0) R(x, y + 2, 4, 1, "#6a4d2a");
  }
  // marks to drop traps on
  spots.forEach((s) => {
    const pulse = reduce ? 0 : Math.round(Math.sin(t / 250 + s.x) * 2);
    if (!s.set) {
      for (let a = 0; a < 16; a++) {
        if (a % 2) continue;
        const ang = (a / 16) * 6.28;
        R(s.x + Math.cos(ang) * (26 + pulse) - 2, s.y + Math.sin(ang) * (14 + pulse / 2) - 2, 5, 5, "#f4f1e4");
      }
      paw(s.x - 6, s.y + 2, "#f4f1e4");
      paw(s.x + 7, s.y + 10, "#f4f1e4");
    } else {
      R(s.x - 20, s.y + 10, 40, 5, "rgba(0,0,0,0.3)");
      trapArt(s.x, s.y, true);
    }
  });
  // the box of traps
  R(BOX.x - 52, BOX.y - 26, 104, 48, "#1c0d08");
  R(BOX.x - 50, BOX.y - 24, 100, 44, "#9a7440");
  R(BOX.x - 50, BOX.y - 24, 100, 5, "#c49a5c");
  for (let k = 0; k < 4; k++) R(BOX.x - 40 + k * 26, BOX.y - 24, 3, 44, "#6a4a22");
  for (let k = 0; k < trapsInBox; k++) trapArt(BOX.x - 28 + k * 28, BOX.y - 30 - (k % 2) * 3, false);
  if (trapHeld) {
    R(pos.x - 20, pos.y + 12, 40, 4, "rgba(0,0,0,0.25)");
    trapArt(pos.x, pos.y, false);
  }
}
export function playTraps(done: () => void): void {
  spots = [{ x: 130, y: 224, set: 0 }, { x: 318, y: 204, set: 0 }, { x: 510, y: 232, set: 0 }];
  trapsInBox = 3;
  trapHeld = false;
  let finished = false;
  const grab = (x: number, y: number): void => {
    if (trapHeld || trapsInBox === 0 || Math.hypot(x - BOX.x, y - (BOX.y - 14)) > 62) return;
    trapHeld = true;
    trapsInBox--;
    gameEl()?.classList.add("grab");
    sfx("click");
  };
  const drop = (x: number, y: number): void => {
    if (!trapHeld) return;
    trapHeld = false;
    gameEl()?.classList.remove("grab");
    let best: Spot | null = null;
    let bd = 44;
    for (const s of spots) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (!s.set && d < bd) {
        best = s;
        bd = d;
      }
    }
    if (!best) {
      trapsInBox++;
      return;
    }
    best.set = performance.now();
    sfx("cut");
    run.refresh();
    if (spots.every((s) => s.set) && !finished) {
      finished = true;
      run.finish(done);
    }
  };
  const run = begin("cuTraps", "traps", () => `${T().cu.trapsLeft}: ${spots.filter((s) => !s.set).length}`, {
    down: grab,
    up: drop,
    key: (e, x, y) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (!e.repeat) (trapHeld ? drop : grab)(x, y);
      return true;
    },
  });
}

/* ============================================================
 * 3. Spray pesticide: hold the sprayer over each yellow blight patch until it turns green
 * ============================================================ */
type Patch = { x: number; y: number; r: number; heal: number };
let patches: Patch[] = [];
let spraying = false;
let sprayUntil = 0;

function drawSpray(t: number): void {
  gradient(0, 360, "#1d4a14", "#3f8a2a", 8);
  // broad leaves with a pale midrib, running across the view
  for (let k = 0; k < 6; k++) {
    const base = -120 + k * 130;
    for (let y = 0; y < 360; y += 3) {
      const x = base + y * 0.55;
      R(x, y, 120, 3, k % 2 ? "#59b32f" : "#4aa02a");
      R(x, y, 5, 3, "#14340e");
      R(x + 115, y, 5, 3, "#14340e");
      R(x + 58, y, 4, 3, "#a8e060");
      R(x + 20, y, 2, 3, "#6fcb3c");
      R(x + 92, y, 2, 3, "#3f8a2a");
    }
  }
  for (const p of patches) {
    const c = lerpHex("#e6d24a", "#59b32f", p.heal);
    const rim = lerpHex("#b89a2a", "#3f9a2a", p.heal);
    for (let dy = -p.r; dy <= p.r; dy += 3) {
      const w = Math.floor(Math.sqrt(p.r * p.r - dy * dy) * (1 + 0.15 * Math.sin(dy * 0.5 + p.x)));
      R(p.x - w - 2, p.y + dy, w * 2 + 4, 3, rim);
      R(p.x - w, p.y + dy, w * 2, 3, c);
    }
    for (let k = 0; k < 6; k++) {
      if (p.heal > 0.85) continue;
      R(p.x + (rnd(k + p.x) - 0.5) * p.r * 1.3, p.y + (rnd(k * 3 + p.y) - 0.5) * p.r * 1.2, 4, 4, lerpHex("#8a6a1a", "#59b32f", p.heal));
    }
    if (p.heal >= 1 && !reduce) R(p.x + Math.round(Math.sin(t / 200 + p.x) * 6), p.y - p.r - 6, 3, 3, "#f4f1e4");
  }
  const on = spraying || performance.now() < sprayUntil;
  if (on) {
    for (let k = 0; k < 26; k++) {
      const a = reduce ? k : (t / 70 + k * 1.7) % 9;
      const sp = ((k * 7) % 9) - 4;
      R(pos.x + sp * a * 0.9 - 2, pos.y + a * 3.2 + (k % 3) * 2 - 6, 4, 4, k % 3 ? "#d6f0f6" : "#8fd2e2");
    }
  }
  // the sprayer: a bottle with a trigger head, nozzle at the pointer
  R(pos.x + 4, pos.y - 34, 30, 40, "#14284a");
  R(pos.x + 6, pos.y - 32, 26, 36, "#3a7bd0");
  R(pos.x + 6, pos.y - 32, 5, 36, "#7fb0f0");
  R(pos.x + 2, pos.y - 44, 22, 12, "#1c0d08");
  R(pos.x + 4, pos.y - 42, 18, 8, "#d9432e");
  R(pos.x - 8, pos.y - 8, 14, 7, "#1c0d08");
  R(pos.x - 6, pos.y - 7, 10, 5, "#e8e8ea");
  R(pos.x - 3, pos.y - 2, 4, 4, "#1c0d08");
}
export function playSpray(done: () => void): void {
  patches = [[110, 180, 24], [220, 190, 28], [330, 80, 22], [430, 230, 30], [540, 120, 26], [150, 280, 24], [560, 300, 22]].map(([x, y, r]) => ({ x, y, r, heal: 0 }));
  spraying = false;
  sprayUntil = 0;
  let finished = false;
  const left = (): number => patches.filter((p) => p.heal < 1).length;
  const run = begin("cuSpray", "spray", () => `${T().cu.sprayLeft}: ${left()}`, {
    down: () => {
      spraying = true;
      sfx("click");
    },
    up: () => {
      spraying = false;
    },
    key: (e) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      sprayUntil = performance.now() + 420;
      return true;
    },
  });
  const stopLoop = loop((dt) => {
    if (!(spraying || performance.now() < sprayUntil)) return;
    let healed = false;
    for (const p of patches) {
      if (p.heal < 1 && Math.hypot(p.x - pos.x, p.y - pos.y) < p.r + 14) {
        p.heal = Math.min(1, p.heal + dt / 900);
        if (p.heal >= 1) healed = true;
      }
    }
    if (healed) {
      sfx("cut");
      run.refresh();
    }
    if (left() === 0 && !finished) {
      finished = true;
      spraying = false;
      sprayUntil = 0;
      stopLoop();
      run.finish(done);
    }
  });
}

/* ============================================================
 * 4. Buy fuel and run the pump: pour from the can until the tank is full, then pull the cord
 * ============================================================ */
const TANK = { x: 250, y: 96, w: 140, h: 70 };
const CAP = { x: 320, y: 90 };
const fuelState = { level: 0, pours: false, pulls: 0, pullAt: 0, running: false };

function drawFuel(t: number): void {
  // the shed wall and floor
  gradient(0, 240, "#7a5a36", "#5a3f24", 10);
  for (let x = 0; x < 640; x += 40) R(x, 0, 3, 240, "#3a2814");
  R(0, 240, 640, 120, "#9c7a47");
  R(0, 240, 640, 4, "#6a4d2a");
  for (let i = 0; i < 60; i++) R(rnd(i + 3) * 640, 248 + rnd(i * 5) * 108, 10 + rnd(i) * 16, 2, "#7a5a36");
  const sh = fuelState.running && !reduce ? Math.round(Math.sin(t / 30)) : 0;
  // engine body
  R(196 + sh, 160, 270, 130, "#1c0d08");
  R(200 + sh, 164, 262, 122, "#c0392b");
  R(200 + sh, 164, 262, 10, "#e0604a");
  R(200 + sh, 276, 262, 10, "#8a2a1e");
  R(222 + sh, 190, 70, 56, "#aeb6bc");
  R(222 + sh, 190, 70, 6, "#d8dfe3");
  R(222 + sh, 238, 70, 8, "#7f878d");
  R(332 + sh, 196, 90, 80, "#1c0d08");
  R(336 + sh, 200, 82, 72, "#5a6066");
  disc(377 + sh, 236, 26, "#1c0d08");
  disc(377 + sh, 236, 22, "#3a3f44");
  R(374 + sh, 218, 6, 36, "#aeb6bc");
  R(359 + sh, 233, 36, 6, "#aeb6bc");
  // the tank on top with a fuel window, cap hole and the level
  R(TANK.x - 3 + sh, TANK.y - 3, TANK.w + 6, TANK.h + 6, "#1c0d08");
  R(TANK.x + sh, TANK.y, TANK.w, TANK.h, "#c9ced2");
  R(TANK.x + sh, TANK.y, TANK.w, 8, "#eef1f3");
  R(TANK.x + sh, TANK.y + TANK.h - 8, TANK.w, 8, "#8a9096");
  R(CAP.x - 18 + sh, CAP.y - 6, 36, 10, "#1c0d08");
  R(CAP.x - 14 + sh, CAP.y - 4, 28, 6, fuelState.level > 0.02 ? "#e8a23a" : "#3a3f44");
  R(TANK.x + 10 + sh, TANK.y + 14, 16, 48, "#1c0d08");
  R(TANK.x + 12 + sh, TANK.y + 16, 12, 44, "#4a4f55");
  const fh = Math.round(44 * fuelState.level);
  R(TANK.x + 12 + sh, TANK.y + 60 - fh, 12, fh, "#e8a23a");
  R(TANK.x + 12 + sh, TANK.y + 60 - fh, 12, 2, "#ffd470");
  for (let k = 0; k < 5; k++) R(TANK.x + 28 + sh, TANK.y + 16 + k * 11, 6, 2, "#1c0d08");
  // the pull cord: a handle on a rope that slides out and snaps back
  const pull = fuelState.pullAt && performance.now() - fuelState.pullAt < 220 ? 22 : 0;
  R(130, 232, 70, 6, "#1c0d08");
  R(132 - pull, 234, 66 + pull, 3, "#e8dcc0");
  R(108 - pull, 222, 24, 28, "#1c0d08");
  R(110 - pull, 224, 20, 24, fuelState.level >= 1 ? "#d9432e" : "#6a4d33");
  R(110 - pull, 224, 20, 4, fuelState.level >= 1 ? "#f08a78" : "#8a6c45");
  if (fuelState.level >= 1 && !fuelState.running && !reduce) {
    const a = Math.round(Math.sin(t / 150) * 4);
    R(76 + a, 232, 22, 4, "#f2c94c");
    R(94 + a, 228, 4, 12, "#f2c94c");
  }
  if (fuelState.running && !reduce) for (let k = 0; k < 6; k++) disc(470 + ((t / 50 + k * 11) % 50), 150 - ((t / 40 + k * 17) % 60), 4 + (k % 3), "rgba(50,50,56,0.45)");
  // the jerrycan in hand, tipped while pouring
  if (fuelState.level < 1) {
    const can = (x: number, y: number, tip: boolean): void => {
      R(x - 24, y - 20, 48, 40, "#1c0d08");
      R(x - 22, y - 18, 44, 36, "#d9432e");
      R(x - 22, y - 18, 44, 5, "#f08a78");
      R(x - 22, y + 12, 44, 6, "#a02a1a");
      R(x - 14, y - 8, 28, 12, "#f4f1e4");
      R(x - 8, y - 6, 16, 3, "#d9432e");
      R(x + 6, y - 30, 14, 12, "#1c0d08");
      R(x + 8, y - 28, 10, 8, "#e8a23a");
      if (tip) {
        R(x - 38, y + 12, 18, 8, "#1c0d08");
        R(x - 36, y + 14, 14, 4, "#aeb6bc");
      } else {
        R(x - 22, y - 28, 8, 10, "#1c0d08");
        R(x - 20, y - 26, 4, 6, "#aeb6bc");
      }
    };
    can(pos.x + 26, pos.y - 20, fuelState.pours);
    if (fuelState.pours) for (let k = 0; k < 7; k++) R(pos.x - 14 + Math.round(Math.sin(k) * 1), pos.y + 2 + ((reduce ? k * 5 : t / 6 + k * 14) % Math.max(10, CAP.y - pos.y + 6)), 4, 9, "#e8a23a");
  }
}
export function playFuel(done: () => void): void {
  Object.assign(fuelState, { level: 0, pours: false, pulls: 0, pullAt: 0, running: false });
  let finished = false;
  const overTank = (x: number, y: number): boolean => Math.hypot(x - CAP.x, y - (CAP.y - 6)) < 54;
  const run = begin("cuFuel", "fuel", () => (fuelState.level < 1 ? `${T().cu.fuelPour}: ${Math.round(fuelState.level * 100)}%` : `${T().cu.fuelPull}: ${fuelState.pulls} / 3`), {
    down: (x, y) => {
      if (fuelState.level >= 1) {
        // the cord handle
        if (Math.hypot(x - 120, y - 236) < 40 && !finished) {
          fuelState.pulls++;
          fuelState.pullAt = performance.now();
          sfx("cut");
          run.refresh();
          if (fuelState.pulls >= 3) {
            finished = true;
            fuelState.running = true;
            sfx("good");
            run.finish(done);
          }
        }
        return;
      }
      fuelState.pours = overTank(x, y);
    },
    move: (x, y) => {
      if (fuelState.pours && !overTank(x, y)) fuelState.pours = false;
    },
    up: () => {
      fuelState.pours = false;
    },
    key: (e, x, y) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (e.repeat) return true;
      if (fuelState.level >= 1) {
        if (!finished && Math.hypot(x - 120, y - 236) < 70) {
          fuelState.pulls++;
          fuelState.pullAt = performance.now();
          sfx("cut");
          run.refresh();
          if (fuelState.pulls >= 3) {
            finished = true;
            fuelState.running = true;
            run.finish(done);
          }
        }
      } else fuelState.pours = !fuelState.pours && overTank(x, y);
      return true;
    },
  });
  const stopLoop = loop((dt) => {
    if (fuelState.pours && fuelState.level < 1) {
      fuelState.level = Math.min(1, fuelState.level + dt / 2400);
      run.refresh();
      if (fuelState.level >= 1) {
        fuelState.pours = false;
        sfx("good");
      }
    }
    if (finished) stopLoop();
  });
}

/* ============================================================
 * 5. Take turns at the canal: open each gate in turn, close it when that field is full
 * ============================================================ */
const GATES = [{ x: 110 }, { x: 320 }, { x: 530 }];
const canal = { turn: 0, open: false, fill: [0, 0, 0], msgAt: 0 };

function drawCanal(t: number): void {
  backdrop(t, 96);
  R(0, 96, 640, 30, "#5d9a48");
  for (let i = 0; i < 70; i++) tuft(rnd(i + 5) * 640, 108 + rnd(i * 3) * 16, "#3f8a3f", "#4aa045");
  // the canal runs across the top
  R(0, 120, 640, 52, "#7a5a36");
  R(0, 126, 640, 40, "#4aa0b8");
  R(0, 126, 640, 4, "#8fd2e2");
  for (let k = 0; k < 14; k++) R(((k * 53 + (reduce ? 0 : t / 22)) % 660) - 20, 138 + (k % 4) * 8, 18, 2, "#d6f0f6");
  // three plots: yours first, then the neighbors'
  const flags = ["#f2c94c", "#d9432e", "#3a7bd0"];
  GATES.forEach((g, i) => {
    const px = g.x - 90;
    R(px - 3, 206, 186, 150, "#2a1608");
    R(px, 210, 180, 144, "#b58f58");
    for (let k = 0; k < 40; k++) R(px + 4 + rnd(k + i * 9) * 168, 214 + rnd(k * 3 + i) * 134, 8, 1, "#7a5a36");
    const f = canal.fill[i];
    if (f > 0) {
      const wh = Math.round(144 * f);
      R(px, 354 - wh, 180, wh, "#4aa0b8");
      R(px, 354 - wh, 180, 3, "#8fd2e2");
      for (let k = 0; k < 6; k++) R(px + ((k * 41 + (reduce ? 0 : t / 30)) % 160), 358 - wh + 8 + (k % 3) * 9, 14, 1, "#d6f0f6");
    }
    // fence posts and a flag in the owner's color
    for (let k = 0; k < 7; k++) R(px - 2 + k * 30, 200, 5, 14, "#6a4a22");
    R(px + 84, 168, 3, 40, "#6a4a22");
    R(px + 87, 170, 18, 12, flags[i]);
    // the gate: boards slide up when open
    const open = canal.turn === i && canal.open;
    R(g.x - 22, 168, 44, 40, "#1c0d08");
    R(g.x - 18, 172, 36, 34, open ? "#4aa0b8" : "#8a6a3e");
    if (!open) for (let k = 0; k < 4; k++) R(g.x - 18, 174 + k * 8, 36, 2, "#5a3f1e");
    if (open) {
      R(g.x - 18, 160, 36, 8, "#b8844a");
      for (let k = 0; k < 4; k++) R(g.x - 2 + (k % 2) * 4, 176 + ((reduce ? k * 7 : t / 12 + k * 9) % 28), 3, 7, "#d6f0f6");
    }
    // the pointer over the gate whose turn it is
    if (canal.turn === i && !reduce) {
      const a = Math.round(Math.sin(t / 160) * 4);
      R(g.x - 8, 142 + a, 16, 8, "#f2c94c");
      R(g.x - 4, 150 + a, 8, 8, "#f2c94c");
    }
    if (canal.fill[i] >= 1) {
      R(px + 60, 280, 60, 26, "#1c0d08");
      R(px + 63, 283, 54, 20, "#52c24a");
      R(px + 72, 290, 6, 6, "#14340e");
      R(px + 86, 290, 6, 6, "#14340e");
      R(px + 100, 290, 6, 6, "#14340e");
    }
  });
}
export function playCanal(done: () => void): void {
  Object.assign(canal, { turn: 0, open: false, fill: [0, 0, 0], msgAt: 0 });
  let finished = false;
  const click = (x: number, y: number): void => {
    if (finished) return;
    const g = GATES[canal.turn];
    if (Math.abs(x - g.x) > 34 || y < 150 || y > 215) return;
    if (!canal.open) {
      canal.open = true;
      sfx("good");
      return;
    }
    if (canal.fill[canal.turn] < 0.98) {
      canal.msgAt = performance.now();
      sfx("bad");
      return;
    }
    canal.open = false;
    sfx("cut");
    canal.turn++;
    run.refresh();
    if (canal.turn >= 3) {
      finished = true;
      run.finish(done);
    }
  };
  const run = begin("cuCanal", "canal", () => `${T().cu.canalTurn}: ${Math.min(3, canal.turn + 1)} / 3`, {
    down: click,
    key: (e, x, y) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (!e.repeat) click(GATES[Math.min(2, canal.turn)].x, 180 + 0 * (x + y));
      return true;
    },
  });
  const stopLoop = loop((dt) => {
    if (canal.open && canal.turn < 3) canal.fill[canal.turn] = Math.min(1, canal.fill[canal.turn] + dt / 2200);
    if (finished) stopLoop();
  });
}

/* ============================================================
 * 6. Plant fewer rows: click two rows to dam them off with soil
 * ============================================================ */
const ROWS_N = 6;
const rowsState = { dam: Array<number>(ROWS_N).fill(0), hover: -1 };
const rowTop = (i: number): number => 150 + i * 34;

function drawRows(t: number): void {
  backdrop(t, 100);
  R(0, 100, 640, 40, "#5d9a48");
  for (let i = 0; i < 80; i++) tuft(rnd(i + 5) * 640, 118 + rnd(i * 3) * 18, "#3f8a3f", "#4aa045");
  // the feeder canal on the left edge
  R(0, 140, 34, 220, "#2a1608");
  R(4, 140, 26, 220, "#4aa0b8");
  for (let k = 0; k < 8; k++) R(8, 150 + ((k * 31 + (reduce ? 0 : t / 25)) % 200), 18, 2, "#d6f0f6");
  const now = performance.now();
  for (let i = 0; i < ROWS_N; i++) {
    const y = rowTop(i);
    const d = rowsState.dam[i] ? Math.min(1, (now - rowsState.dam[i]) / 450) : 0;
    const dx = 190 + i * 12; // where this row's dam stands
    R(34, y - 3, 606, 32, "#2a1608");
    R(34, y, 606, 28, "#b58f58");
    // the open water, or only up to the dam when it is closed
    const wEnd = d > 0 ? dx : 640;
    R(34, y + 2, wEnd - 34, 24, "#4aa0b8");
    R(34, y + 2, wEnd - 34, 3, "#8fd2e2");
    for (let k = 0; k < 6; k++) {
      const x = 40 + ((k * 97 + (reduce ? 0 : t / (d > 0 ? 60 : 30))) % Math.max(20, wEnd - 60));
      R(x, y + 10 + (k % 3) * 5, 18, 1, "#d6f0f6");
    }
    if (d > 0) {
      // dry, cracked soil beyond the dam, and the soil bund itself rising
      for (let k = 0; k < 14; k++) R(dx + 16 + rnd(k + i * 7) * (600 - dx), y + 6 + rnd(k * 3 + i) * 16, 9, 1, "#7a5a36");
      const hgt = Math.round(30 * d);
      R(dx - 8, y + 28 - hgt, 28, hgt, "#2a1608");
      R(dx - 6, y + 28 - hgt + 2, 24, hgt - 2, "#8a6a3e");
      R(dx - 6, y + 28 - hgt + 2, 24, 4, "#c4a068");
      for (let k = 0; k < 5; k++) R(dx - 4 + k * 5, y + 28 - hgt + 8 + (k % 2) * 6, 3, 2, "#6a4d2a");
      if (d >= 1) {
        R(dx + 22, y + 4, 4, 14, "#6a4a22");
        R(dx + 20, y + 2, 8, 5, "#d6b27a");
      }
    } else if (rowsState.hover === i) {
      for (let x = 40; x < 636; x += 14) R(x, y - 1, 8, 2, "#f4f1e4");
      for (let x = 40; x < 636; x += 14) R(x, y + 27, 8, 2, "#f4f1e4");
    }
  }
}
export function playRows(done: () => void): void {
  rowsState.dam.fill(0);
  rowsState.hover = -1;
  let finished = false;
  const rowAt = (y: number): number => {
    const i = Math.floor((y - 150) / 34);
    return i >= 0 && i < ROWS_N && y - rowTop(i) < 30 ? i : -1;
  };
  const dammed = (): number => rowsState.dam.filter((v) => v).length;
  const toggle = (i: number): void => {
    if (i < 0 || finished) return;
    if (rowsState.dam[i]) rowsState.dam[i] = 0;
    else if (dammed() < 2) rowsState.dam[i] = performance.now();
    else return;
    sfx("cut");
    run.refresh();
    if (dammed() === 2) {
      finished = true;
      sfx("good");
      run.finish(done);
    }
  };
  const run = begin("cuRows", "rows", () => `${T().cu.rowsLeft}: ${2 - dammed()}`, {
    down: (_x, y) => toggle(rowAt(y)),
    move: (_x, y) => {
      rowsState.hover = rowAt(y);
    },
    key: (e, _x, y) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (!e.repeat) toggle(rowAt(y));
      return true;
    },
  });
}

customScenes.cuEggs = drawEggs;
customScenes.cuTraps = drawTraps;
customScenes.cuSpray = drawSpray;
customScenes.cuFuel = drawFuel;
customScenes.cuCanal = drawCanal;
customScenes.cuRows = drawRows;
