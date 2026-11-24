/**
 * Hands-on close-ups for the jobs a player picks: every choice is carried out by hand, zoomed in.
 * Each game draws its own scene (registered in customScenes), reads the mouse (or W A S D + Space)
 * and calls back when the job is done.
 */
import gsap from "gsap";
import { R, backdrop, customScenes, disc, frogJump, layer, reduce, rnd, setScene, tuft, weedSoil, zoom } from "./art";
import { sfx } from "./sound";
import { T, getBack, getView, h, setBack, show, statusRow } from "./ui";

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
    pos.x = Math.min(640, Math.max(0, ((e.clientX - r.left) / r.width) * 640));
    pos.y = Math.min(360, Math.max(0, ((e.clientY - r.top) / r.height) * 360));
    return [pos.x, pos.y];
  };
  const d = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (!alive()) return;
    const [x, y] = xy(e);
    handlers.down?.(x, y);
  };
  const m = (e: PointerEvent): void => {
    if (!alive()) return;
    const [x, y] = xy(e);
    handlers.move?.(x, y);
  };
  const u = (e: PointerEvent): void => {
    if (!alive()) return;
    const [x, y] = xy(e);
    handlers.up?.(x, y);
  };
  const k = (e: KeyboardEvent): void => {
    if (!alive()) return;
    const step = 9;
    const key = e.key.toLowerCase();
    if (key === "a") pos.x = Math.max(0, pos.x - step);
    else if (key === "d") pos.x = Math.min(640, pos.x + step);
    else if (key === "w") pos.y = Math.max(0, pos.y - step);
    else if (key === "s") pos.y = Math.min(360, pos.y + step);
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
/** Which wide scene a close-up returns to: the rice paddy, or the sugarcane plot in month 2. */
let returnScene = "field";
export const setReturnScene = (k: string): void => {
  returnScene = k;
};
export const backToField = (): void => {
  setScene(returnScene);
  if (!reduce) gsap.fromTo("#cv", { scale: 1.1 }, { scale: 1, duration: 0.5, ease: "power2.out", clearProps: "transform" });
};

export const pos = { x: 320, y: 230 };
export const gameEl = (): HTMLElement | null => document.getElementById("game");
export type Run = { refresh: () => void; finish: (cb: () => void) => void };
const cuText = (k: string, f: "Head" | "Hint", ns: "cu" | "cc"): string => (T()[ns] as Record<string, string>)[k + f];

/** Start a close-up: switch the scene, show the panel (title, hint, one status chip) and listen for the hand. */
export function begin(kind: string, key: string, status: () => string, handlers: Handlers, ns: "cu" | "cc" = "cu"): Run {
  const prevView = getView();
  const prevBack = getBack();
  setScene(kind);
  zoomIn();
  gameEl()?.classList.add("closeup");
  show((p) => {
    p.appendChild(h("h2", undefined, cuText(key, "Head", ns)));
    p.appendChild(h("p", "note cuhint", cuText(key, "Hint", ns)));
    p.appendChild(statusRow([status()]));
  });
  const stop = closeUp(".cuhint", handlers, pos);
  // Back: give the job up (nothing is paid or changed) and return to the choices
  setBack(() => {
    stop();
    gameEl()?.classList.remove("closeup", "grab", "nocursor");
    backToField();
    setBack(prevBack);
    if (prevView.builder) show(prevView.builder, false, prevView.host ?? undefined);
  });
  return {
    refresh: () => {
      const s = document.querySelector("#panel .status span");
      if (s) s.textContent = status();
    },
    finish: (cb) => {
      stop();
      setBack(prevBack);
      gameEl()?.classList.remove("closeup", "grab", "nocursor");
      setTimeout(() => {
        backToField();
        cb();
      }, 900);
    },
  };
}

/** Animation frames for as long as the close-up panel is on screen. */
export function loop(fn: (dt: number, t: number) => void): () => void {
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
export const hex = (c: string): number[] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const lerpHex = (a: string, b: string, t: number): string => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * Math.min(1, Math.max(0, t)))).join(",")})`;
};
export const gradient = (y0: number, y1: number, a: string, b: string, step = 6): void => {
  for (let y = y0; y < y1; y += step) R(0, y, 640, step, lerpHex(a, b, (y - y0) / (y1 - y0)));
};
export const ripples = (t: number, y0: number, y1: number, n: number, c: string): void => {
  for (let k = 0; k < n; k++) {
    const y = y0 + ((k * 37) % (y1 - y0));
    R((((k * 71 + (reduce ? 0 : t / 45)) % 700) - 30), y, 14 + (k % 4) * 6, 1 + (y > (y0 + y1) / 2 ? 1 : 0), c);
  }
};

/* ============================================================
 * 1. Hand-pick and crush: pick pink snail-egg clusters and drop them on the stone
 * ============================================================ */
type Egg = { x: number; y: number; done: boolean };
let eggTheme: "rice" | "cane" = "rice";
let eggs: Egg[] = [];
let eggHeld = -1;
const splats: { x: number; y: number; t: number }[] = [];
const STONE = { x: 468, y: 292, w: 140, h: 52 };

function cluster(x: number, y: number): void {
  // a grape-like bunch of small bright-pink eggs with a wet shine
  const dots: [number, number][] = [[-9, -8], [-3, -9], [3, -9], [9, -8], [-12, -2], [-6, -3], [0, -3], [6, -3], [12, -2], [-9, 3], [-3, 3], [3, 3], [9, 3], [-6, 9], [0, 9], [6, 9], [0, 14]];
  const cane = eggTheme === "cane";
  if (cane) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6 - (row % 2); col++) {
        const sx = x - 18 + col * 6 + (row % 2) * 3;
        const sy = y - 8 + row * 5;
        R(sx, sy, 8, 6, "#6a5a1a");
        R(sx + 1, sy + 1, 6, 4, "#ece0a0");
        R(sx + 1, sy + 1, 4, 1, "#fff8d0");
        R(sx + 5, sy + 3, 2, 1, "#c8b868");
      }
    }
    return;
  }
  for (const [dx, dy] of dots) {
    R(x + dx - 3, y + dy - 3, 7, 7, cane ? "#6a5a1a" : "#8a1f45");
    R(x + dx - 2, y + dy - 2, 5, 5, cane ? "#e8d890" : "#ec5a8e");
    R(x + dx - 2, y + dy - 2, 2, 2, cane ? "#fff8d0" : "#ffc4da");
  }
}
function cxAlphaRect(x: number, y: number, w: number, h: number): void {
  for (let k = 0; k < h; k += 3) R(x + k * 0.3, y + k, w - k * 0.6, 3, `rgba(20,52,14,${0.35 - k / 90})`);
}
/** A tapering blade along a curve from base to tip (quadratic Bezier), dark outline, lit centre. */
function blade(x0: number, y0: number, cxm: number, cym: number, x1: number, y1: number, w0: number, mid: string, lit: string): void {
  const n = 130;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * x0 + 2 * u * t * cxm + t * t * x1;
    const y = u * u * y0 + 2 * u * t * cym + t * t * y1;
    const w = Math.max(1, Math.round(w0 * (1 - t * 0.85)));
    R(x - w / 2 - 1, y, w + 2, 4, "#14340e");
    R(x - w / 2, y, w, 4, mid);
    R(x - w / 2, y, Math.max(1, Math.round(w / 3)), 4, lit);
  }
}
const GREENS: [string, string][] = [["#3f9a2a", "#6fcb3c"], ["#59b32f", "#9bdc4a"], ["#86d13a", "#c8ee6a"], ["#2f8a28", "#59b32f"]];
/** One rice hill: a fan of thin tillers and a few long arching leaves rising out of the water. */
function riceHill(bx: number, seed: number, t: number): void {
  const sway = reduce ? 0 : Math.sin(t / 1300 + seed) * 3;
  for (let k = 0; k < 10; k++) {
    const dx = (k - 4.5) * 15 + (rnd(seed * 9 + k) - 0.5) * 8;
    const tipY = 60 + rnd(seed * 5 + k) * 150;
    const g = GREENS[k % 4];
    blade(bx + dx * 0.15, 306, bx + dx * 0.5, 306 + (tipY - 306) * 0.6, bx + dx + sway * (1 - tipY / 300), tipY, 5, g[0], g[1]);
  }
  for (let k = 0; k < 4; k++) {
    const dir = k % 2 ? 1 : -1;
    const sy = 200 + rnd(seed * 3 + k) * 70;
    const g = GREENS[(k + 1) % 4];
    blade(bx + dir * 6, sy, bx + dir * (30 + rnd(seed + k) * 20), sy - 90, bx + dir * (62 + rnd(seed * 2 + k) * 26), sy + 8 + sway, 8, g[0], g[1]);
  }
  // the hill's base: dark roots and mud where the tillers meet the water
  R(bx - 16, 300, 32, 10, "#14340e");
  R(bx - 13, 301, 26, 6, "#2f6a1f");
  R(bx - 9, 303, 18, 3, "#59b32f");
}
/** The rest of the paddy, out of focus behind the close-up: rows of rice hills receding to the mountains. */
function paddyFar(t: number): void {
  backdrop(t, 92);
  layer("far-paddy", () => {
    R(0, 96, 640, 270, "#6fb0be");
    for (let r = 0; r < 11; r++) {
      const y = 104 + Math.round(Math.pow(r / 11, 1.5) * 200);
      const sc = 0.32 + r * 0.085;
      R(0, y + Math.round(sc * 3), 640, Math.max(1, Math.round(sc * 2)), "#55703a");
      const step = 15 * sc + 5;
      for (let x = (r % 2) * step * 0.5; x < 650; x += step)
        zoom(Math.round(x), y, sc, () => {
          R(-5, -1, 11, 2, "#14340e");
          R(-4, -9, 2, 9, "#3f9a2a");
          R(-1, -12, 2, 12, "#59b32f");
          R(2, -9, 2, 9, "#86d13a");
          R(-6, -5, 2, 5, "#2f8a28");
          R(4, -6, 2, 6, "#2f8a28");
        });
    }
    for (let y = 96; y < 304; y += 4) R(0, y, 640, 4, `rgba(214,238,230,${(0.34 - (y - 96) / 900).toFixed(2)})`);
  });
}
/** The rest of the sugarcane field, out of focus: dry furrows with rows of tall cane running back to the hills. */
function caneFar(t: number): void {
  backdrop(t, 92);
  layer("far-cane", () => {
    R(0, 96, 640, 270, "#a8864c");
    for (let r = 0; r < 11; r++) {
      const y = 108 + Math.round(Math.pow(r / 11, 1.5) * 200);
      const sc = 0.34 + r * 0.09;
      R(0, y, 640, Math.max(1, Math.round(sc * 2)), "#5a3d22");
      const step = 9 * sc + 3;
      for (let x = (r % 2) * step * 0.5; x < 650; x += step)
        zoom(Math.round(x), y, sc, () => {
          R(-1, -36, 4, 36, "#3a2e08");
          R(0, -36, 2, 36, "#cdbd48");
          R(-8, -37, 9, 3, "#2f7a1f");
          R(2, -40, 9, 3, "#3f9a2a");
          R(-3, -47, 2, 10, "#59b32f");
          R(1, -45, 2, 8, "#3f9a2a");
        });
    }
    for (let y = 96; y < 304; y += 4) R(0, y, 640, 4, `rgba(240,226,184,${(0.34 - (y - 96) / 900).toFixed(2)})`);
  });
}
const caneStalkX = (i: number): number => 36 + i * 112 + Math.round(rnd(i + 4) * 22);
/** Tall cane seen close up: thick jointed stalks with long arching leaves in front of the rest of the field. */
function drawCaneBase(t: number): void {
  caneFar(t);
  for (let i = 0; i < 6; i++) {
    const x = caneStalkX(i);
    const sway = reduce ? 0 : Math.sin(t / 1400 + i) * 2;
    R(x - 2, 90, 16, 216, "#4a3a0c");
    R(x, 90, 12, 216, i % 2 ? "#cdbd48" : "#bfae38");
    R(x, 90, 4, 216, "#e8dc78");
    R(x + 9, 90, 3, 216, "#8a7a24");
    for (let n = 120; n < 306; n += 52) {
      R(x - 2, n, 16, 5, "#4a3a0c");
      R(x - 1, n + 1, 14, 3, "#a8962c");
    }
    for (const [lx, ly, dir] of [[x + 12, 150 + (i % 3) * 30, 1], [x, 220 - (i % 2) * 30, -1]] as [number, number, number][]) {
      blade(lx, ly, lx + dir * 34, ly - 60 + sway, lx + dir * (66 + (i % 3) * 10), ly + 16 + sway, 9, "#59b32f", "#9bdc4a");
    }
  }
  R(0, 304, 640, 56, "#9a7240");
  for (let y = 304; y < 360; y += 8) {
    R(0, y, 640, 3, "#6a4a2a");
    R(0, y + 3, 640, 1, "#c29a60");
  }
  for (let i = 0; i < 50; i++) R(rnd(i + 11) * 640, 308 + rnd(i * 3) * 48, 8, 1, "#7a5a36");
}
/** A stem borer caterpillar: a fat cream body of round segments with a brown head and tiny legs, inching along a leaf. */
function borer(t: number): void {
  const P = [[110, 322], [270, 256], [440, 324]] as const;
  const at = (u: number): [number, number] => {
    const v = 1 - u;
    return [v * v * P[0][0] + 2 * v * u * P[1][0] + u * u * P[2][0], v * v * P[0][1] + 2 * v * u * P[1][1] + u * u * P[2][1]];
  };
  // a broad leaf for it to crawl on
  for (let i = 0; i <= 140; i++) {
    const u = i / 140;
    const [x, y] = at(u);
    const taper = 1 - Math.pow(Math.abs(2 * u - 1), 3) * 0.75;
    const hh = Math.round(20 * taper);
    R(x - 3, y - hh / 2 - 1, 7, hh + 2, "#14340e");
    R(x - 3, y - hh / 2, 7, hh, i % 9 < 4 ? "#59b32f" : "#4aa02a");
    R(x - 3, y - hh / 2, 7, Math.max(1, Math.round(hh / 4)), "#9bdc4a");
  }
  const head = reduce ? 0.4 : 0.12 + ((t / 11000) % 1) * 0.76;
  // a wave of squeezing runs down the body as it crawls
  for (let k = 9; k >= 1; k--) {
    const u = Math.max(0.02, head - k * 0.02);
    const [x, y0] = at(u);
    const sq = reduce ? 0 : Math.sin(t / 150 - k * 0.9);
    const x1 = Math.round(x);
    const y1 = Math.round(y0 - 10 - Math.max(0, sq) * 2);
    disc(x1, y1, 8, "#4a3a14");
    disc(x1, y1, 7, k % 2 ? "#f6efd0" : "#ecdfb4");
    R(x1 - 4, y1 - 5, 7, 2, "#fffbe6");
    R(x1 - 1, y1 + 1, 3, 3, "#6a5a30");
    if (k < 4) {
      R(x1 - 3, y1 + 7, 2, 3, "#2a1c08");
      R(x1 + 2, y1 + 7, 2, 3, "#2a1c08");
    }
  }
  const [hx, hy0] = at(head);
  const hx1 = Math.round(hx + 3);
  const hy1 = Math.round(hy0 - 10);
  disc(hx1, hy1, 9, "#2a1004");
  disc(hx1, hy1, 8, "#8a4a1a");
  R(hx1 - 5, hy1 - 6, 8, 3, "#c88a4a");
  disc(hx1 + 3, hy1 - 1, 2, "#111111");
  disc(hx1 - 3, hy1 - 1, 2, "#111111");
  R(hx1 - 5, hy1 + 4, 10, 2, "#4a2408");
  R(hx1 + 6, hy1 - 12, 2, 5, "#2a1004");
  R(hx1 + 1, hy1 - 12, 2, 5, "#2a1004");
}
function drawCaneEggs(t: number): void {
  drawCaneBase(t);
}
function drawEggs(t: number): void {
  if (eggTheme === "cane") return drawCaneEggs(t), drawEggFront(t), borer(t);
  drawRiceEggs(t);
  drawEggFront(t);
}
function drawRiceEggs(t: number): void {
  paddyFar(t);
  // the water in front, with ripples
  R(0, 304, 640, 56, "#4d8fa0");
  for (let y = 304; y < 360; y += 4) R(0, y, 640, 4, `rgba(26,70,80,${((y - 304) / 120).toFixed(2)})`);
  ripples(t, 310, 356, 18, "#a8dde8");
  [60, 190, 330, 470, 590].forEach((bx, i) => riceHill(bx, i + 1, t));
  for (const bx of [60, 190, 330, 470, 590]) {
    cxAlphaRect(bx - 18, 312, 36, 22);
  }
  // frogs leaping out of the water and diving back in
  frogJump(128, 324, t, 1, 3);
  frogJump(262, 334, t, 3, 3);
  frogJump(410, 326, t, 5, 3);
  frogJump(548, 336, t, 2, 3);
}
function drawEggFront(t: number): void {
  // each cluster is stuck to its own stalk
  eggs.forEach((e, i) => {
    if (e.done) return;
    const g = GREENS[i % 4];
    if (eggTheme === "cane") blade(e.x - 50, e.y + 18, e.x - 4, e.y - 26, e.x + 54, e.y + 20, 15, "#59b32f", "#9bdc4a");
    else blade(e.x + (e.x > 320 ? -6 : 6), 306, e.x + (e.x > 320 ? 4 : -4), (306 + e.y) / 2, e.x, e.y - 34, 5, g[0], g[1]);
  });
  // the flat stone, with what is left of the crushed clusters
  R(STONE.x - 3, STONE.y - 3, STONE.w + 6, STONE.h + 6, "#1c1c20");
  R(STONE.x, STONE.y, STONE.w, STONE.h, "#8a8f98");
  R(STONE.x, STONE.y, STONE.w, 6, "#c4c9d0");
  R(STONE.x, STONE.y + STONE.h - 8, STONE.w, 8, "#5f646c");
  for (let i = 0; i < 18; i++) R(STONE.x + rnd(i + 1) * (STONE.w - 6), STONE.y + 8 + rnd(i + 9) * (STONE.h - 20), 3, 2, i % 2 ? "#6f747c" : "#a8adb5");
  const now = performance.now();
  for (const sp of splats) {
    const a2 = Math.min(1, (now - sp.t) / 200);
    const cane = eggTheme === "cane";
    R(sp.x - 12 * a2, sp.y - 2, 24 * a2, 6, cane ? "#a89a40" : "#c43a6a");
    R(sp.x - 8 * a2, sp.y - 4, 16 * a2, 4, cane ? "#e8d890" : "#e75480");
    for (let k = 0; k < 6; k++) R(sp.x + (k - 3) * 6 * a2, sp.y - 8 * a2 - (k % 2) * 3, 3, 3, cane ? "#fff2b0" : "#f08ab0");
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
export function playEggs(done: () => void, theme: "rice" | "cane" = "rice"): void {
  eggTheme = theme;
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
  const run = begin("cuEggs", "eggs", () => `${theme === "cane" ? T().cc.eggsLeft : T().cu.eggsLeft}: ${left()}`, {
    down: grab,
    up: drop,
    key: (e, x, y) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (!e.repeat) (eggHeld >= 0 ? drop : grab)(x, y);
      return true;
    },
  }, theme === "cane" ? "cc" : "cu");
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
let trapTheme: "rice" | "cane" = "rice";
/** A paddy dike: flooded rice behind it, wet dark mud underfoot, grass on the near bank. */
function riceTrapBg(t: number): void {
  backdrop(t, 104);
  layer("trap-rice-bg", () => {
    // flooded paddy with seedling rows at the back
    R(0, 104, 640, 72, "#4aa0b8");
    R(0, 104, 640, 3, "#8fd2e2");
    for (let r = 0; r < 3; r++) for (let x = 6 + (r % 2) * 8; x < 640; x += 16) {
      R(x, 122 + r * 16, 2, 8, "#14340e");
      R(x - 2, 124 + r * 16, 2, 6, "#3f9a2a");
      R(x + 2, 123 + r * 16, 2, 7, "#86d13a");
    }
    // the dike: wet, dark, shining mud with puddles
    R(0, 172, 640, 132, "#5e4429");
    for (let i = 0; i < 2400; i++) R(rnd(i * 7 + 2) * 640, 174 + rnd(i * 3 + 1) * 128, 2, 1, i % 3 ? "#4a3624" : i % 2 ? "#74583a" : "#3a2a1a");
    for (let i = 0; i < 40; i++) {
      const x = rnd(i + 70) * 600;
      const y = 180 + rnd(i * 5 + 9) * 110;
      R(x, y, 18 + rnd(i) * 22, 5, "#2a1c10");
      R(x + 1, y + 1, 16 + rnd(i) * 22, 3, "#8fb7c9");
      R(x + 3, y + 1, 8, 1, "#e4f6fa");
    }
    R(0, 172, 640, 5, "#3f9a2a");
    for (let x = 0; x < 640; x += 5) R(x, 168 + (x % 3), 3, 6, x % 2 ? "#2f7a1f" : "#59b32f");
    // the grassy near bank
    R(0, 304, 640, 56, "#5d9a48");
    for (let x = 0; x < 640; x += 4) R(x, 300 + (x % 5), 3, 8, x % 2 ? "#3f8a2f" : "#6abf3a");
    for (let i = 0; i < 70; i++) tuft(rnd(i + 21) * 640, 312 + rnd(i * 3) * 44, "#3f8a3f", "#6abf3a");
    for (let i = 0; i < 20; i++) R(rnd(i + 55) * 640, 312 + rnd(i * 7) * 44, 3, 3, i % 2 ? "#f2c94c" : "#ffffff");
  });
  for (let k = 0; k < 10; k++) R(((k * 71 + (reduce ? 0 : t / 40)) % 660) - 20, 110 + (k % 4) * 14, 14, 1, "#d6f0f6");
}
/** A cane furrow: a wall of tall cane behind, dry earth with fallen trash leaves in front. */
function caneTrapBg(t: number): void {
  backdrop(t, 104);
  layer("trap-cane-bg", () => {
    weedSoil();
    // dense cane at the back
    R(0, 100, 640, 110, "#6a5a14");
    for (let i = 0; i < 30; i++) {
      const x = i * 22 + Math.round(rnd(i + 3) * 8);
      R(x - 1, 96, 14, 116, "#3a2e08");
      R(x, 96, 12, 116, i % 2 ? "#cdbd48" : "#bfae38");
      R(x, 96, 4, 116, "#e8dc78");
      R(x + 9, 96, 3, 116, "#8a7a24");
      for (let n = 112; n < 212; n += 34) {
        R(x - 1, n, 14, 3, "#3a2e08");
        R(x, n + 1, 12, 1, "#a8962c");
      }
    }
    R(0, 100, 640, 10, "#3f6a1f");
    for (let i = 0; i < 40; i++) R(rnd(i + 8) * 620, 98 + rnd(i * 3) * 8, 30, 3, i % 2 ? "#59b32f" : "#3f9a2a");
    R(0, 208, 640, 4, "#2a1c10");
    // fallen dry leaves between the rows
    for (let i = 0; i < 60; i++) {
      const x = rnd(i * 5 + 1) * 620;
      const y = 216 + rnd(i * 9 + 4) * 130;
      R(x, y, 24, 2, i % 2 ? "#d8b44a" : "#c89a3a");
      R(x + 4, y + 2, 16, 1, "#8a6a2a");
    }
  });
}
function drawTraps(t: number): void {
  const wet = trapTheme === "rice";
  if (wet) riceTrapBg(t);
  else caneTrapBg(t);
  // the packed earth of the rat trail, with paw prints and a dragged tail
  for (let x = 0; x < 640; x += 4) {
    const y = 214 + Math.round(Math.sin(x * 0.014) * 24);
    R(x, y - 18, 4, 44, wet ? "#4a3220" : "#8a6a3e");
    R(x, y - 18, 4, 3, wet ? "#2e1f12" : "#6a4d2a");
    R(x, y + 24, 4, 3, wet ? "#6a4d30" : "#a07a48");
    if (wet && x % 20 === 0) R(x, y - 4 + (x % 12), 8, 2, "#8fb7c9");
    if (x % 28 === 0) {
      paw(x + 4, y - 4, wet ? "#1c120a" : "#4a3418");
      paw(x + 16, y + 8, wet ? "#1c120a" : "#4a3418");
    }
    if (x % 8 === 0) R(x, y + 2, 4, 1, wet ? "#2e1f12" : "#6a4d2a");
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
export function playTraps(done: () => void, theme: "rice" | "cane" = "rice"): void {
  trapTheme = theme;
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

let sprayTheme: "rice" | "cane" | "rot" = "rice";
/** The brush with its green paste: drag it over the red streaks. */
function drawBrush(t: number): void {
  const x = Math.round(pos.x);
  const y = Math.round(pos.y);
  const on = spraying;
  if (on) for (let k = 0; k < 8; k++) R(x - 5 + ((k * 5) % 14), y - 4 + (k % 3) * 3, 3, 3, k % 2 ? "#9be070" : "#7fd04a");
  R(x - 6, y - 7, 16, 11, "#1c0d08");
  R(x - 5, y - 6, 14, 9, "#efe2b8");
  R(x - 5, y - 1, 14, 4, on ? "#7fd04a" : "#a8e070");
  R(x + 4, y - 48, 7, 44, "#1c0d08");
  R(x + 5, y - 47, 5, 42, "#a8742e");
  R(x + 3, y - 12, 9, 7, "#aeb6bc");
  const b = reduce ? 0 : Math.round(Math.sin(t / 180) * 2);
  R(x + 12, y - 42 + b, 18, 18, "#1c0d08");
  R(x + 13, y - 41 + b, 16, 16, on ? "#9be070" : "#f4f1e4");
  R(x + 17, y - 38 + b, 2, 9, "#1c0d08");
  R(x + 17, y - 38 + b, 7, 2, "#1c0d08");
  R(x + 17, y - 34 + b, 6, 2, "#1c0d08");
  R(x + 17, y - 30 + b, 7, 2, "#1c0d08");
}
function drawSpray(t: number): void {
  if (sprayTheme === "rot") drawCaneBase(t);
  const rot = sprayTheme === "rot";
  const cane = sprayTheme === "cane";
  if (rot) {
    for (const p of patches) {
      // a red-rot streak on the stalk: dark red with a white fuzz, painted over with green paste as it is treated
      R(p.x - 6, p.y - p.r, 12, p.r * 2, "#3a0a10");
      R(p.x - 5, p.y - p.r + 1, 10, p.r * 2 - 2, "#8a1f2a");
      for (let k = 0; k < 7; k++) R(p.x - 4 + (k % 3) * 3, p.y - p.r + 4 + k * ((p.r * 2 - 8) / 7), 3, 2, "#f0e8e0");
      const cover = Math.round((p.r * 2 + 4) * p.heal);
      R(p.x - 7, p.y + p.r + 2 - cover, 14, cover, "#7fd04a");
      R(p.x - 7, p.y + p.r + 2 - cover, 14, Math.min(2, cover), "#c8f090");
      if (p.heal >= 1 && !reduce) R(p.x + Math.round(Math.sin(t / 200 + p.x) * 6), p.y - p.r - 8, 3, 3, "#f4f1e4");
    }
    drawBrush(t);
    return;
  }
  gradient(0, 360, cane ? "#1d4a14" : "#27553a", cane ? "#3f8a2a" : "#4f9a5e", 8);
  if (cane) {
    // broad cane leaves with a pale midrib
    for (let k = 0; k < 6; k++) {
      const base = -120 + k * 130;
      for (let y = 0; y < 360; y += 3) {
        const x = base + y * 0.55;
        R(x, y, 120, 3, k % 2 ? "#59b32f" : "#4aa02a");
        R(x, y, 5, 3, "#14340e");
        R(x + 115, y, 5, 3, "#14340e");
        R(x + 56, y, 8, 3, "#e8f0c0");
        R(x + 20, y, 2, 3, "#6fcb3c");
        R(x + 92, y, 2, 3, "#3f8a2a");
      }
    }
  } else {
    // slim rice blades, closer together, with fine veins
    for (let k = 0; k < 12; k++) {
      const base = -140 + k * 66;
      for (let y = 0; y < 360; y += 3) {
        const x = base + y * 0.55;
        R(x, y, 58, 3, k % 2 ? "#5fb06a" : "#4f9a5a");
        R(x, y, 3, 3, "#14340e");
        R(x + 55, y, 3, 3, "#14340e");
        R(x + 26, y, 3, 3, "#b8e8a0");
        for (let v = 10; v < 52; v += 8) R(x + v, y, 1, 3, "#3f8a4a");
      }
    }
  }
  for (const p of patches) {
    if (cane) {
      // an aphid colony: a crowd of tiny pale-green insects on a sticky shine, thinning out as it is sprayed
      const alive = 1 - p.heal;
      R(p.x - p.r, p.y - p.r * 0.6, p.r * 2, p.r * 1.2, `rgba(220,240,160,${0.28 * alive})`);
      for (let k = 0; k < 46; k++) {
        if (k / 46 > alive) continue;
        const a = rnd(k * 3 + p.x) * 6.28;
        const d = Math.sqrt(rnd(k * 7 + p.y)) * p.r;
        const bx = p.x + Math.cos(a) * d;
        const by = p.y + Math.sin(a) * d * 0.65;
        R(bx - 1, by - 1, 5, 5, "#3f5a14");
        R(bx, by, 3, 3, k % 3 ? "#d8e060" : "#f0f4a0");
        R(bx, by, 1, 1, "#ffffff");
      }
      continue;
    }
    // a rice blast lesion: a spindle of brown with a grey centre and a yellow halo, along the blade
    const heal = p.heal;
    for (let dy = -p.r * 1.3; dy <= p.r * 1.3; dy += 3) {
      const u = dy / (p.r * 1.3);
      const w = Math.floor(Math.sqrt(Math.max(0, 1 - u * u)) * p.r * 0.7);
      const sx = Math.round(dy * 0.55);
      R(p.x + sx - w - 5, p.y + dy, w * 2 + 10, 3, lerpHex("#e6d24a", "#4f9a5a", heal));
      R(p.x + sx - w - 1, p.y + dy, w * 2 + 2, 3, lerpHex("#8a5a2a", "#4f9a5a", heal));
      R(p.x + sx - Math.max(0, w - 4), p.y + dy, Math.max(0, w - 4) * 2, 3, lerpHex("#c4c0a8", "#4f9a5a", heal));
    }
    if (heal >= 1 && !reduce) R(p.x + Math.round(Math.sin(t / 200 + p.x) * 6), p.y - p.r - 6, 3, 3, "#f4f1e4");
  }
  const on = spraying;
  const x = Math.round(pos.x);
  const y = Math.round(pos.y);
  // aim ring around the nozzle, so it is clear where the spray lands
  if (!on) for (let k = 0; k < 14; k++) {
    const ang = (k / 14) * 6.28 + (reduce ? 0 : t / 900);
    R(x + Math.cos(ang) * 16 - 1, y + Math.sin(ang) * 16 - 1, 3, 3, "#f4f1e4");
  }
  if (on) {
    for (let k = 0; k < 30; k++) {
      const a = reduce ? k : (t / 60 + k * 1.7) % 10;
      const sp = ((k * 7) % 11) - 5;
      R(x + sp * a * 0.9 - 2, y + a * 2.6 + (k % 3) * 2 - 4, 4, 4, k % 3 ? "#e4f6fa" : "#8fd2e2");
    }
  }
  // the sprayer: nozzle at the pointer, trigger head, bottle, and a gloved hand on it
  R(x - 2, y - 4, 10, 7, "#1c0d08");
  R(x - 1, y - 3, 8, 5, "#e8e8ea");
  R(x + 8, y - 14, 26, 16, "#1c0d08");
  R(x + 9, y - 13, 24, 14, "#d9432e");
  R(x + 9, y - 13, 24, 3, "#f08a78");
  R(x + 14, y + 2, 6, 11, "#1c0d08");
  R(x + 15, y + 3, 4, 9, on ? "#1c1c20" : "#3a3f44");
  R(x + 22, y + 2, 26, 40, "#14284a");
  R(x + 24, y + 4, 22, 36, "#3a7bd0");
  R(x + 24, y + 4, 5, 36, "#7fb0f0");
  R(x + 24, y + 20, 22, 2, "#d6f0f6");
  R(x + 18, y + 16, 34, 14, "#1c0d08");
  R(x + 19, y + 17, 32, 12, "#e0a85c");
  R(x + 19, y + 17, 32, 3, "#f4cf8a");
  R(x + 19, y + 26, 32, 3, "#b97d36");
  // the E key to hold
  const b = reduce ? 0 : Math.round(Math.sin(t / 180) * 2);
  R(x + 25, y - 34 + b, 18, 18, "#1c0d08");
  R(x + 26, y - 33 + b, 16, 16, on ? "#8fd2e2" : "#f4f1e4");
  R(x + 26, y - 21 + b, 16, 3, on ? "#4aa0b8" : "#cdbf8c");
  R(x + 30, y - 30 + b, 2, 9, "#1c0d08");
  R(x + 30, y - 30 + b, 7, 2, "#1c0d08");
  R(x + 30, y - 26 + b, 6, 2, "#1c0d08");
  R(x + 30, y - 22 + b, 7, 2, "#1c0d08");
}
export function playSpray(done: () => void, theme: "rice" | "cane" | "rot" = "rice"): void {
  sprayTheme = theme;
  const rot = theme === "rot";
  patches = rot
    ? [190, 140, 230, 170, 210, 150].map((y, i) => ({ x: caneStalkX(i) + 6, y, r: 22, heal: 0 }))
    : [[110, 180, 24], [220, 190, 28], [330, 80, 22], [430, 230, 30], [540, 120, 26], [150, 280, 24], [560, 300, 22]].map(([x, y, r]) => ({ x, y, r, heal: 0 }));
  spraying = false;
  let finished = false;
  const left = (): number => patches.filter((p) => p.heal < 1).length;
  gameEl()?.classList.add("nocursor");
  const eUp = (e: KeyboardEvent): void => {
    if (e.key.toLowerCase() === "e") spraying = false;
    if (!document.querySelector(".cuhint")) {
      spraying = false;
      document.removeEventListener("keyup", eUp);
    }
  };
  document.addEventListener("keyup", eUp);
  window.addEventListener("blur", () => (spraying = false));
  const run = begin(
    "cuSpray",
    rot ? "rot" : "spray",
    () => `${rot ? T().cc.rotLeft : T().cu.sprayLeft}: ${left()}`,
    {
      // the brush also works with the mouse button held; the sprayer is E only
      down: () => {
        if (rot) spraying = true;
      },
      up: () => {
        if (rot) spraying = false;
      },
      key: (e) => {
        if (e.key.toLowerCase() !== "e") return false;
        if (!e.repeat) {
          spraying = true;
          sfx("click");
        }
        return true;
      },
    },
    rot ? "cc" : "cu",
  );
  const stopLoop = loop((dt) => {
    if (!spraying) return;
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
      stopLoop();
      document.removeEventListener("keyup", eUp);
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
export function playRows(done: () => void, cane = false): void {
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
  const run = begin("cuRows", "rows", () => `${cane ? T().cc.rowsLeft : T().cu.rowsLeft}: ${2 - dammed()}`, {
    down: (_x, y) => toggle(rowAt(y)),
    move: (_x, y) => {
      rowsState.hover = rowAt(y);
    },
    key: (e, _x, y) => {
      if (e.key !== " " && e.key !== "Enter") return false;
      if (!e.repeat) toggle(rowAt(y));
      return true;
    },
  }, cane ? "cc" : "cu");
}

customScenes.cuEggs = drawEggs;
customScenes.cuTraps = drawTraps;
customScenes.cuSpray = drawSpray;
customScenes.cuFuel = drawFuel;
customScenes.cuCanal = drawCanal;
customScenes.cuRows = drawRows;
