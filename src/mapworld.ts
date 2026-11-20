/**
 * The overworld map for Explore mode: a hand-painted pixel landscape with a lake, a river, the sea,
 * forests and dunes, dotted roads, and a place to click for every part of the barrio.
 */
import { R, customScenes, disc, getCtx, layer, reduce, rnd } from "./art";
import { pixelText, textWidth } from "./pixeltext";
import { T } from "./ui";

const W = 640;
const H = 360;

/* ---------- places and roads ---------- */
export type Place = { id: string; x: number; y: number };
export const PLACES: Place[] = [
  { id: "home", x: 168, y: 214 },
  { id: "rice", x: 380, y: 150 },
  { id: "market", x: 336, y: 268 },
  { id: "cane", x: 562, y: 168 },
  { id: "farm", x: 92, y: 180 },
  { id: "coconut", x: 450, y: 306 },
  { id: "veg", x: 64, y: 262 },
  { id: "bus", x: 590, y: 290 },
];
const idx = (id: string): number => PLACES.findIndex((p) => p.id === id);
/** Roads link two places through an optional bend, so they wind a little. */
const ROADS: [string, string, [number, number]?][] = [
  ["home", "rice", [270, 168]],
  ["home", "veg", [108, 250]],
  ["home", "market", [250, 262]],
  ["home", "farm", [124, 186]],
  ["rice", "cane", [480, 110]],
  ["market", "coconut", [400, 296]],
  ["market", "cane", [440, 190]],
  ["coconut", "bus", [530, 312]],
  ["cane", "bus", [592, 232]],
  ["market", "rice", [360, 214]],
];

export const mapState = {
  x: PLACES[0].x,
  y: PLACES[0].y,
  at: 0,
  hover: -1,
  route: [] as [number, number][],
  to: -1,
  arrived: 0,
  dir: 1,
};

/** Points along a road, in order from `a` to `b`. */
function roadPoints(a: Place, b: Place, mid?: [number, number]): [number, number][] {
  const m = mid ?? [(a.x + b.x) / 2, (a.y + b.y) / 2];
  const pts: [number, number][] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([u * u * a.x + 2 * u * t * m[0] + t * t * b.x, u * u * (a.y - 2) + 2 * u * t * m[1] + t * t * (b.y - 2)]);
  }
  return pts;
}
const roadCache: { a: number; b: number; pts: [number, number][] }[] = [];
const roads = (): typeof roadCache => {
  if (!roadCache.length) for (const [a, b, m] of ROADS) roadCache.push({ a: idx(a), b: idx(b), pts: roadPoints(PLACES[idx(a)], PLACES[idx(b)], m) });
  return roadCache;
};

/** The shortest chain of roads between two places, as one list of points. */
export function routeTo(from: number, to: number): [number, number][] {
  const prev = new Map<number, { p: number; pts: [number, number][] }>();
  const queue = [from];
  const seen = new Set([from]);
  while (queue.length) {
    const c = queue.shift() as number;
    if (c === to) break;
    for (const r of roads()) {
      const n = r.a === c ? r.b : r.b === c ? r.a : -1;
      if (n < 0 || seen.has(n)) continue;
      seen.add(n);
      prev.set(n, { p: c, pts: r.a === c ? r.pts : [...r.pts].reverse() });
      queue.push(n);
    }
  }
  const out: [number, number][][] = [];
  for (let c = to; c !== from; ) {
    const e = prev.get(c);
    if (!e) break;
    out.unshift(e.pts);
    c = e.p;
  }
  return out.flat();
}

/* ---------- terrain ---------- */
type Water = "sea" | "river" | null;
const southCoast = (x: number): number => 326 + 11 * Math.sin(x / 37) + 6 * Math.sin(x / 15) - (x > 548 ? (x - 548) * 0.18 : 0);
const westCoast = (y: number): number => 16 + 12 * Math.sin(y / 29) + (y > 250 ? (y - 250) * 0.55 : 0);
const riverX = (y: number): number => 476 + 40 * Math.sin((y - 96) / 54);
function waterAt(x: number, y: number): Water {
  // the little islet off the south-west coast
  const ix = (x - 92) / 28;
  const iy = (y - 338) / 10;
  if (ix * ix + iy * iy < 1) return null;
  if (y > southCoast(x) || x < westCoast(y)) return "sea";
  if (y > 98 && Math.abs(x - riverX(y)) < 4 + (y > 270 ? (y - 270) / 16 : 0)) return "river";
  return null;
}
const landNear = (x: number, y: number, d: number): boolean => !waterAt(x + d, y) || !waterAt(x - d, y) || !waterAt(x, y + d) || !waterAt(x, y - d);
const waterNear = (x: number, y: number, d: number): boolean => !!(waterAt(x + d, y) || waterAt(x - d, y) || waterAt(x, y + d) || waterAt(x, y - d));
/** The mountains rise along the north edge of the island. */
const ridgeY = (x: number): number => 92 + 12 * Math.sin(x / 41) + 6 * Math.sin(x / 17);

function pine(x: number, y: number, k: number): void {
  R(x - 1, y - 3, 3, 4, "#5a3010");
  R(x - 4, y - 7, 9, 4, k % 2 ? "#1f6a2a" : "#2a7a30");
  R(x - 3, y - 10, 7, 4, k % 2 ? "#2f8a34" : "#37963a");
  R(x - 2, y - 13, 5, 4, "#44aa44");
  R(x - 1, y - 15, 3, 3, "#5cc055");
  R(x + 1, y - 10, 2, 2, "#1a5a24");
}
function round(x: number, y: number): void {
  R(x - 1, y - 3, 3, 4, "#5a3010");
  disc(x, y - 7, 5, "#256a2a");
  disc(x - 1, y - 8, 4, "#37963a");
  R(x - 3, y - 11, 3, 2, "#6cc860");
}
/** A coconut palm seen from the side, leaning a little. */
function palmTree(x: number, y: number, lean: number): void {
  for (let i = 0; i < 16; i++) R(x + Math.round(i * 0.18 * lean), y - i, 2, 2, i % 3 ? "#8a5a2a" : "#6a4a22");
  const tx = x + Math.round(16 * 0.18 * lean);
  const ty = y - 16;
  for (const [dx, dy] of [[-9, 2], [-6, -1], [-2, -3], [3, -3], [7, -1], [10, 2], [-5, 4], [6, 4]]) {
    R(tx + dx, ty + dy, 6, 2, "#14340e");
    R(tx + dx + 1, ty + dy, 4, 1, "#3fb048");
  }
  R(tx - 1, ty + 1, 3, 3, "#6a4a22");
  R(tx + 2, ty + 2, 3, 3, "#5a3a14");
}
/** A rocky, forested peak: lit on the left, shaded on the right. */
function peak(cx: number, base: number, hgt: number): void {
  for (let j = 0; j < hgt; j++) {
    const w = Math.round((j / hgt) * (hgt * 0.95));
    const y = base - hgt + j;
    R(cx - w, y, w, 1, j < hgt * 0.35 ? "#b09a82" : "#8a8a6a");
    R(cx, y, w, 1, j < hgt * 0.35 ? "#7a6a58" : "#4f6a3f");
    if (j > hgt * 0.4 && j % 5 === 0) R(cx - w + 2, y, w * 2 - 4, 1, "#3f7a3a");
  }
  R(cx - 1, base - hgt, 2, 2, "#e8dcc8");
  for (let k = 0; k < 6; k++) R(cx - (hgt >> 2) + k * 3, base - Math.round(hgt * 0.45) + (k % 3) * 3, 2, 2, "#2f6a2f");
}
/** Stepped rice terraces climbing a hillside: water and young rice in curved bands. */
function terraces(x0: number, y0: number, w: number, rows: number): void {
  for (let k = 0; k < rows; k++) {
    const y = y0 + k * 11;
    const xs = x0 + k * 7;
    const xe = x0 + w - k * 4;
    for (let x = xs; x < xe; x += 2) {
      const yy = y + Math.round(Math.sin(x / 13 + k) * 2);
      R(x, yy, 2, 9, "#3a5a28");
      R(x, yy + 1, 2, 7, k % 2 ? "#6fd0e0" : "#86d84a");
      R(x, yy, 2, 1, "#c8e890");
      if (k % 2 === 0 && x % 6 === 0) R(x, yy + 3, 1, 4, "#3f9a2a");
    }
  }
}
/** A patchwork of small farm plots around the village. */
function plots(x0: number, y0: number, nx: number, ny: number): void {
  const cols = ["#7fc850", "#e8d070", "#9a7a4a", "#5fb040", "#c8a860"];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = cols[Math.floor(rnd(i * 7 + j * 13) * 5)];
      const x = x0 + i * 26;
      const y = y0 + j * 17;
      R(x, y, 24, 15, "#4a6a2a");
      R(x + 1, y + 1, 22, 13, c);
      for (let r = 0; r < 4; r++) R(x + 1, y + 3 + r * 3, 22, 1, "#00000022");
    }
  }
}

function paintTerrain(): void {
  // grass and water in 2px cells; the sea is turquoise, the island lush
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const w = waterAt(x, y);
      if (w) {
        const shore = landNear(x, y, 3);
        const mid = landNear(x, y, 8);
        const deep = landNear(x, y, 16);
        R(x, y, 2, 2, shore ? "#a8f0e0" : mid ? "#46d0d0" : deep ? "#2ab8c8" : (x + y) % 8 === 0 ? "#1a9ec0" : "#1e9ac8");
        if (landNear(x, y, 1)) R(x, y, 2, 2, "#168a9a");
      } else {
        const r = rnd(x * 0.5 + y * 31.7);
        const dry = y < ridgeY(x) + 8;
        let c = dry ? (r > 0.8 ? "#3f7a34" : "#4a8a3a") : r > 0.82 ? "#48a038" : r < 0.08 ? "#6cc050" : "#54ae3e";
        if (waterNear(x, y, 4)) c = r > 0.5 ? "#f5e6b0" : "#ecd898";
        else if (waterNear(x, y, 7)) c = r > 0.5 ? "#8cc84e" : "#7cc044";
        R(x, y, 2, 2, c);
        if (waterNear(x, y, 1)) R(x, y, 2, 2, "#c8a860");
      }
    }
  }
  // the northern mountains, then the terraces below them and plots around the village
  for (let px = 6; px < W + 30; px += 58) peak(px, 60 + Math.round(rnd(px * 7) * 14), 34 + Math.round(rnd(px * 5) * 24));
  for (let px = 34; px < W + 30; px += 64) peak(px, 78 + Math.round(rnd(px * 9) * 10), 24 + Math.round(rnd(px * 3) * 18));
  for (let px = 18; px < W + 30; px += 52) peak(px, ridgeY(px) + 22, 22 + Math.round(rnd(px) * 16));
  for (let px = 44; px < W + 30; px += 70) peak(px, ridgeY(px) + 26, 14 + Math.round(rnd(px * 3) * 12));
  terraces(296, 100, 164, 5);
  plots(190, 196, 3, 3);
  plots(366, 214, 3, 2);
  // dotted roads
  for (const r of roads()) {
    r.pts.forEach(([x, y], i) => {
      if (i % 2 === 0) {
        R(x - 1, y - 1, 3, 3, "#f0e2a8");
        R(x, y, 1, 1, "#fff8d8");
      }
    });
  }
  // forests where the noise is high, lone trees elsewhere, and palms along the beaches
  const roadPts = roads().flatMap((r) => r.pts);
  const trees: [number, number, number][] = [];
  const busy = (x: number, y: number): boolean => PLACES.some((p) => Math.hypot(p.x - x, p.y - 8 - y) < 28) || roadPts.some(([rx, ry]) => Math.hypot(rx - x, ry - y) < 9);
  for (let gy = 12; gy < H - 6; gy += 12) {
    for (let gx = 8; gx < W - 6; gx += 11) {
      const x = gx + Math.round((rnd(gx * 3 + gy) - 0.5) * 8);
      const y = gy + Math.round((rnd(gy * 5 + gx) - 0.5) * 6);
      if (waterAt(x, y) || waterNear(x, y, 7) || y < ridgeY(x) + 30 || busy(x, y)) continue;
      if (y > 96 && y < 168 && x > 286 && x < 466) continue;
      if (y > 192 && y < 252 && ((x > 186 && x < 272) || (x > 362 && x < 444))) continue;
      const f = Math.sin(x / 33) + Math.sin(y / 27) + Math.sin((x + y) / 21);
      if (f > 1.0 ? rnd(x * 7 + y) < 0.74 : rnd(x * 11 + y) < 0.04) trees.push([x, y, Math.floor(rnd(x + y) * 4)]);
    }
  }
  trees.sort((a, b) => a[1] - b[1]);
  for (const [x, y, k] of trees) (k === 3 ? round : pine)(x, y, k);
  for (let k = 0; k < 90; k++) {
    const x = rnd(k * 3 + 1) * W;
    const y = 150 + rnd(k * 5 + 2) * 190;
    if (waterAt(x, y) || !waterNear(x, y, 12) || waterNear(x, y, 5) || busy(x, y)) continue;
    palmTree(Math.round(x), Math.round(y), rnd(k) > 0.5 ? 1 : -1);
  }
}

/* ---------- place icons (each ~24 wide, standing on (x, y)) ---------- */
function iconHome(x: number, y: number): void {
  R(x - 9, y - 6, 3, 6, "#5a3a1a");
  R(x + 6, y - 6, 3, 6, "#5a3a1a");
  R(x - 10, y - 14, 20, 9, "#2a1608");
  R(x - 9, y - 13, 18, 7, "#d8b878");
  R(x - 3, y - 12, 6, 7, "#3a2410");
  for (let i = 0; i < 8; i++) R(x - 12 + i * 3 - 1 + (i > 3 ? 0 : 0), y - 15 - Math.min(i, 7 - i), 5, 2, "#2a1608");
  for (let i = 0; i < 12; i++) R(x - 11 + i * 2, y - 24 + Math.abs(i - 5.5) * 1.6, 3, 10 - Math.abs(i - 5.5) * 1.6, i % 2 ? "#c9a040" : "#e0b84a");
}
function iconRice(x: number, y: number): void {
  R(x - 13, y - 14, 26, 14, "#3a2a14");
  for (let r = 0; r < 3; r++) {
    R(x - 12, y - 13 + r * 4, 24, 3, r % 2 ? "#4aa0ec" : "#5fb0f0");
    for (let k = 0; k < 6; k++) R(x - 10 + k * 4, y - 13 + r * 4, 2, 3, "#3f9a2a");
  }
  R(x - 13, y - 14, 26, 1, "#a07a48");
}
function iconMarket(x: number, y: number): void {
  R(x - 11, y - 8, 3, 8, "#5a3a1a");
  R(x + 8, y - 8, 3, 8, "#5a3a1a");
  for (let i = 0; i < 6; i++) {
    R(x - 12 + i * 4, y - 16, 4, 8, i % 2 ? "#f3ecd2" : "#d0452d");
    R(x - 12 + i * 4, y - 9, 4, 2, i % 2 ? "#f3ecd2" : "#d0452d");
  }
  R(x - 12, y - 17, 24, 1, "#2a1608");
  R(x - 8, y - 5, 16, 5, "#8a6a43");
  R(x - 6, y - 7, 4, 3, "#e8a23a");
  R(x, y - 7, 4, 3, "#d9432e");
}
function iconCane(x: number, y: number, t: number): void {
  const sw = reduce ? 0 : Math.round(Math.sin(t / 700 + x) * 1);
  for (let k = 0; k < 5; k++) {
    const bx = x - 10 + k * 5;
    const h = 20 + (k % 3) * 3;
    R(bx - 1, y - h, 4, h, "#173d12");
    R(bx, y - h, 2, h, k % 2 ? "#6abf3a" : "#86d13a");
    R(bx - 2 + sw, y - h - 2, 6, 3, "#3f9a2a");
    for (let n = 4; n < h; n += 6) R(bx - 1, y - n, 4, 1, "#c9a02a");
  }
}
function iconFarm(x: number, y: number): void {
  R(x - 12, y - 14, 24, 14, "#1c0d08");
  R(x - 11, y - 13, 22, 13, "#c0392b");
  R(x - 11, y - 13, 22, 2, "#e0604a");
  R(x - 4, y - 9, 8, 9, "#f4f1e4");
  R(x - 4, y - 9, 8, 1, "#1c0d08");
  R(x - 4, y - 9, 1, 9, "#1c0d08");
  R(x + 3, y - 9, 1, 9, "#1c0d08");
  R(x - 14, y - 19, 28, 6, "#1c0d08");
  R(x - 13, y - 18, 26, 4, "#8a2a1e");
  R(x - 18, y - 4, 6, 4, "#f4f1e4");
  R(x + 13, y - 3, 6, 3, "#e8e2d4");
  R(x - 20, y - 2, 40, 1, "#7b5836");
}
function iconCoconut(x: number, y: number, t: number): void {
  const sw = reduce ? 0 : Math.round(Math.sin(t / 800 + x) * 2);
  for (let i = 0; i < 20; i++) R(x - 1 + Math.round(i * 0.15), y - i, 3, 2, "#6a4a22");
  for (const [dx, dy] of [[-10, -3], [-8, 2], [8, 2], [10, -3], [0, -6], [-5, -5], [5, -5]]) {
    R(x + dx + sw - 1, y - 22 + dy, 7, 3, "#14340e");
    R(x + dx + sw, y - 22 + dy, 5, 2, "#3fa040");
  }
  R(x - 2, y - 20, 3, 3, "#6a4a22");
  R(x + 2, y - 19, 3, 3, "#6a4a22");
  R(x - 8, y, 14, 2, "#c8b070");
}
function iconVeg(x: number, y: number): void {
  const cols = ["#d9432e", "#6a3a9a", "#59b32f", "#f2a23a"];
  for (let r = 0; r < 3; r++) {
    R(x - 13, y - 14 + r * 5, 26, 5, "#2a1608");
    R(x - 12, y - 13 + r * 5, 24, 3, "#6a4d33");
    for (let k = 0; k < 6; k++) R(x - 10 + k * 4, y - 14 + r * 5, 3, 3, cols[(k + r) % 4]);
  }
  R(x + 12, y - 18, 2, 18, "#7b5836");
  R(x - 14, y - 18, 2, 18, "#7b5836");
  R(x - 14, y - 19, 28, 2, "#a8844f");
}
function iconBus(x: number, y: number): void {
  R(x - 14, y - 12, 28, 11, "#1c1c20");
  R(x - 13, y - 11, 26, 9, "#f2c94c");
  R(x - 13, y - 5, 26, 3, "#3a7bd0");
  for (let k = 0; k < 4; k++) R(x - 11 + k * 6, y - 10, 4, 4, "#8fb7c9");
  R(x + 9, y - 10, 4, 5, "#cfe8f0");
  disc(x - 8, y - 1, 3, "#1a1a1a");
  disc(x + 7, y - 1, 3, "#1a1a1a");
  R(x + 13, y - 4, 2, 2, "#fff3a0");
}
const ICONS: Record<string, (x: number, y: number, t: number) => void> = {
  home: iconHome, rice: iconRice, market: iconMarket, cane: iconCane, farm: iconFarm, coconut: iconCoconut, veg: iconVeg, bus: iconBus,
};

/* ---------- the little traveller ---------- */
function hero(x: number, y: number, t: number, moving: boolean): void {
  const bob = moving && !reduce ? Math.round(Math.abs(Math.sin(t / 90)) * 2) : 0;
  const yy = Math.round(y) - bob;
  const xx = Math.round(x);
  R(xx - 5, Math.round(y) - 1, 10, 3, "rgba(0,0,0,0.3)");
  R(xx - 4, yy - 3, 3, 3, "#1a1a1a");
  R(xx + 1, yy - 3, 3, 3, "#1a1a1a");
  R(xx - 4, yy - 3, 3, 2, "#2f5fbf");
  R(xx + 1, yy - 3, 3, 2, "#2f5fbf");
  R(xx - 5, yy - 9, 10, 7, "#1a1a1a");
  R(xx - 4, yy - 8, 8, 5, "#f7f2e4");
  R(xx - 4, yy - 8, 8, 1, "#cfd0d8");
  R(xx - 4, yy - 14, 8, 6, "#1a1a1a");
  R(xx - 3, yy - 13, 6, 4, "#edc39a");
  R(xx - 2, yy - 11, 1, 1, "#1a1a1a");
  R(xx + 1, yy - 11, 1, 1, "#1a1a1a");
  R(xx - 8, yy - 16, 16, 3, "#1a1a1a");
  R(xx - 7, yy - 16, 14, 2, "#d8be7c");
  R(xx - 4, yy - 19, 8, 4, "#1a1a1a");
  R(xx - 3, yy - 19, 6, 3, "#e8c860");
  R(xx - 3, yy - 17, 6, 1, "#a8452a");
}

/* ---------- drawing ---------- */
let lastT = 0;
function drawMap(t: number): void {
  const now = performance.now();
  const dt = Math.min(0.05, (now - (lastT || now - 16)) / 1000);
  lastT = now;
  layer("map-terrain", paintTerrain);
  // water glints on the lake, river, pond and sea
  if (!reduce) {
    for (let k = 0; k < 90; k++) {
      const x = (rnd(k * 3 + 1) * W + t / 80) % W;
      const y = rnd(k * 5 + 2) * H;
      if (!waterAt(x, y) || landNear(x, y, 5)) continue;
      if (Math.sin(t / 500 + k) > 0.55) R(x, y, 4, 1, "#d6f0f6");
    }
  }
  // the traveller walks along the planned road
  const s = mapState;
  const moving = s.route.length > 0;
  if (moving) {
    let left = 78 * dt;
    while (left > 0 && s.route.length) {
      const [nx, ny] = s.route[0];
      const d = Math.hypot(nx - s.x, ny - s.y);
      if (d <= left) {
        s.x = nx;
        s.y = ny;
        s.route.shift();
        left -= d;
      } else {
        if (Math.abs(nx - s.x) > 0.2) s.dir = nx > s.x ? 1 : -1;
        s.x += ((nx - s.x) / d) * left;
        s.y += ((ny - s.y) / d) * left;
        left = 0;
      }
    }
    if (!s.route.length) {
      s.at = s.to;
      s.arrived = s.to;
      arrivedHook?.(s.to);
    }
  }
  // places: icons with a small name board, a glowing ring under the pointer
  const places = T().explore.places;
  const order = PLACES.map((p, i) => ({ p, i })).sort((a, b) => a.p.y - b.p.y);
  for (const { p, i } of order) {
    const hov = s.hover === i;
    const bounce = hov && !reduce ? Math.round(Math.abs(Math.sin(t / 150)) * 2) : 0;
    R(p.x - 15, p.y - 1, 30, 4, "rgba(0,0,0,0.22)");
    if (hov || s.at === i) {
      for (let k = 0; k < 18; k++) {
        const ang = (k / 18) * 6.28 + (reduce ? 0 : t / 700);
        R(p.x + Math.cos(ang) * 20 - 1, p.y - 8 + Math.sin(ang) * 15 - 1, 3, 3, hov ? "#fff3a0" : "#ffffff88");
      }
    }
    ICONS[p.id](p.x, p.y - bounce, t);
    const name = places[i].n;
    const k = hov ? 2 : 1;
    const w = textWidth(name, k) + 6;
    const by = p.y + 4;
    R(Math.round(p.x - w / 2) - 1, by - 1, w + 2, 5 * k + 4, "#1c0d08");
    R(Math.round(p.x - w / 2), by, w, 5 * k + 2, hov ? "#fff2c0" : "#f0e2b8");
    pixelText(name, p.x, by + 1, k, hov ? "#a02a1a" : "#3a2410");
  }
  hero(s.x, s.y, t, moving);
  getCtx().globalAlpha = 1;
}
let arrivedHook: ((i: number) => void) | null = null;
export const onArrive = (f: ((i: number) => void) | null): void => {
  arrivedHook = f;
};

export function placeAt(x: number, y: number): number {
  let best = -1;
  let bd = 20;
  PLACES.forEach((p, i) => {
    const d = Math.hypot(p.x - x, p.y - 8 - y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}
export function travel(i: number): void {
  const s = mapState;
  if (s.route.length || i === s.at) return;
  s.to = i;
  s.arrived = -1;
  s.route = routeTo(s.at, i);
}
export function resetMap(): void {
  Object.assign(mapState, { x: PLACES[0].x, y: PLACES[0].y, at: 0, hover: -1, route: [], to: -1, arrived: 0 });
}

customScenes.map = drawMap;
