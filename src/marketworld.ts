/**
 * The market: a street of stalls with villagers who walk, look and buy, and the player's own stall.
 * After the harvest the sacks ride in on a truck; the player unloads them by hand (press E) and sets
 * them on the stall counter, where they fall, bounce and stack.
 */
import {
  R, backdrop, bunting, chick, customScenes, disc, drawPlayer, getCtx, goat, hen, lantern, layer, nanay, player, reduce, rnd, shadow, solids, tatay, tuft, villager,
} from "./art";
import { pixelText, textWidth } from "./pixeltext";
import { sfx } from "./sound";
import { T } from "./ui";

/* ---------- layout ---------- */
const STALL_N = 5;
const stallX = (i: number): number => 6 + i * 127;
const STALL_W = 119;
const COUNTER_TOP = 190; // vendor stalls: counter surface
const MY = { x0: 436, x1: 604, top: 260, bottom: 284 }; // the player's own stall
const TRUCK = { x0: 14, x1: 152, y0: 250, y1: 284 };
const AWN: [string, string][] = [["#d0452d", "#f3ecd2"], ["#2f7a9a", "#f3ecd2"], ["#3f8a4a", "#f3ecd2"], ["#e8a23a", "#fff5d6"], ["#8a4a9a", "#f3ecd2"]];
const WALL: string[] = ["#e8d8b0", "#d6e0c8", "#e8c8a8", "#c8d8e0", "#e0c8d8"];
const GOODS_COL = ["#d9432e", "#f2a23a", "#aeb6bc", "#f4ecd0", "#7a5a36"];

/* ---------- unloading state ---------- */
type Sack = { x: number; y: number; vx: number; vy: number; floor: number; mode: "fall" | "stall" | "ground"; squash: number };
const sacks: Sack[] = [];
let truckLeft = 0;
let carrying = false;
let carryBob = 0;
let totalSacks = 0;
let unloadLive = false;
let onProgress: (() => void) | null = null;
let onAllDone: (() => void) | null = null;
let doneFired = false;

export const stalledCount = (): number => sacks.filter((s) => s.mode === "stall").length;
export const totalToUnload = (): number => totalSacks;

/* ---------- villagers ---------- */
type Npc = { v: number; x: number; y: number; tx: number; ty: number; stall: number; wait: number; buying: number; face: number; seed: number };
let npcs: Npc[] = [];
const pops: { x: number; y: number; t: number; c: string }[] = [];

const front = (i: number): [number, number] => {
  let x = stallX(i) + 28 + rnd(i + Math.floor(performance.now() / 4000)) * (STALL_W - 56);
  // the kiosk hides everything behind it, so shoppers at the stalls it overlaps wait just beside it
  if (x > MY.x0 - 24 && x < MY.x1 + 24) x = i === 3 ? MY.x0 - 26 - rnd(i) * 14 : MY.x1 + 22 + rnd(i) * 8;
  return [x, 222 + rnd(i * 5 + Math.floor(performance.now() / 3000)) * 14];
};
function newTarget(n: Npc): void {
  n.stall = Math.floor(rnd(n.seed * 7 + performance.now() / 2500) * STALL_N);
  [n.tx, n.ty] = front(n.stall);
  n.buying = 0;
}

/** What the truck carries: sacks of rice, or bundles of sugarcane in month 2. */
let cargo: "rice" | "cane" | "sugar" = "rice";
export function enterMarket(count: number, load: "rice" | "cane" | "sugar" = "rice"): void {
  cargo = load;
  totalSacks = count;
  truckLeft = count;
  sacks.length = 0;
  carrying = false;
  doneFired = false;
  unloadLive = false;
  solids.length = 0;
  solids.push([TRUCK.x0, TRUCK.y0, TRUCK.x1, TRUCK.y1], [MY.x0, MY.top - 2, MY.x1, MY.bottom], [168, 276, 192, 288], [194, 280, 218, 292]);
  npcs = Array.from({ length: 8 }, (_, i) => {
    const n: Npc = { v: 5 + i, x: 30 + i * 74, y: 226 + (i % 3) * 8, tx: 0, ty: 0, stall: 0, wait: 0, buying: 0, face: 0, seed: i + 1 };
    newTarget(n);
    return n;
  });
  pops.length = 0;
}

/** Start the unloading job: E picks a sack up at the truck and drops it at the stall. */
export function startUnload(progress: () => void, done: () => void): () => void {
  unloadLive = true;
  onProgress = progress;
  onAllDone = done;
  const key = (e: KeyboardEvent): void => {
    if (e.repeat || e.key.toLowerCase() !== "e" || !unloadLive) return;
    if (!document.querySelector(".mkhint")) {
      stop();
      return;
    }
    interact();
  };
  document.addEventListener("keydown", key);
  const stop = (): void => {
    unloadLive = false;
    document.removeEventListener("keydown", key);
  };
  return stop;
}

const distToRect = (x: number, y: number, x0: number, y0: number, x1: number, y1: number): number => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
const nearStall = (): boolean => distToRect(player.x, player.y, MY.x0, MY.top, MY.x1, MY.bottom) < 34;
const nearTruck = (): boolean => distToRect(player.x, player.y, TRUCK.x0, TRUCK.y0, TRUCK.x1, TRUCK.y1) < 30;
const nearGround = (): Sack | null => sacks.find((s) => s.mode === "ground" && Math.hypot(s.x - player.x, s.y - player.y) < 26) ?? null;

function interact(): void {
  if (carrying) {
    carrying = false;
    const onCounter = nearStall();
    const sx = onCounter ? Math.min(MY.x1 - 14, Math.max(MY.x0 + 14, player.x)) : player.x;
    // set on the counter from just above it, or let go of at the hands' height when put down elsewhere
    const y0 = onCounter ? MY.top - 22 : player.y - 8;
    sacks.push({ x: sx, y: y0, vx: (onCounter ? 0 : (player.face || 1) * 10) + (Math.random() - 0.5) * 30, vy: onCounter ? -20 : 0, floor: Math.min(304, Math.max(228, player.y)), mode: "fall", squash: 0 });
    sfx("lift");
    return;
  }
  const g = nearGround();
  if (g) {
    sacks.splice(sacks.indexOf(g), 1);
    carrying = true;
    sfx("lift");
    onProgress?.();
    return;
  }
  if (nearTruck() && truckLeft > 0) {
    truckLeft--;
    carrying = true;
    sfx("lift");
  }
}

/* ---------- physics ---------- */
const SW = 20;
const SH = 15;
const GRAV = 1500;
function stepSacks(dt: number): void {
  for (const s of sacks) {
    if (s.mode !== "fall") {
      s.squash = Math.max(0, s.squash - dt * 6);
      continue;
    }
    s.vy += GRAV * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    const overStall = s.x > MY.x0 - 4 && s.x < MY.x1 + 4;
    // the highest thing under it: the counter, a sack already there, or the ground it was dropped over
    let floor = overStall ? MY.top : 1e9;
    for (const o of sacks) if (o !== s && o.mode === "stall" && Math.abs(o.x - s.x) < SW * 0.85) floor = Math.min(floor, o.y - SH + 2);
    if (!overStall) floor = Math.min(floor, s.floor);
    if (s.y >= floor) {
      s.y = floor;
      if (Math.abs(s.vy) > 150) {
        s.vy = -s.vy * 0.32;
        s.vx *= 0.5;
        s.squash = 1;
        sfx("thud");
      } else {
        s.vy = 0;
        s.vx = 0;
        s.mode = overStall && floor <= MY.top ? "stall" : "ground";
        s.squash = 0.6;
        sfx("thud");
        if (s.mode === "stall") {
          sfx("coin");
          onProgress?.();
          if (stalledCount() >= totalSacks && !doneFired) {
            doneFired = true;
            setTimeout(() => onAllDone?.(), 900);
          }
        }
      }
    }
  }
}

/* ---------- drawing: pieces ---------- */
/** A tied bundle of cane stalks, lying down. */
function caneBundleArt(x: number, y: number, squash: number): void {
  const sq = Math.round(squash * 2);
  const w = SW + 4 + sq * 2;
  const h = SH - sq - 1;
  const x0 = Math.round(x - w / 2);
  const y0 = Math.round(y - h);
  R(x0 - 1, y0 - 1, w + 2, h + 2, "#2a2208");
  for (let k = 0; k < 4; k++) {
    R(x0, y0 + k * 3, w, 3, k % 2 ? "#bfae38" : "#cdbd48");
    R(x0, y0 + k * 3, w, 1, "#e8dc78");
  }
  for (let k = 0; k < 4; k++) R(x0 + 3 + k * 6, y0, 1, h, "#7a6a20");
  R(x0 + 5, y0 - 1, 3, h + 2, "#a02a1a");
  R(x0 + w - 8, y0 - 1, 3, h + 2, "#a02a1a");
  R(x0 - 3, y0 + 2, 4, 3, "#3f9a2a");
  R(x0 + w - 1, y0 + h - 5, 4, 3, "#59b32f");
}
function sackArt(x: number, y: number, squash: number): void {
  if (cargo === "cane") return caneBundleArt(x, y, squash);
  const sugar = cargo === "sugar";
  const body = sugar ? "#b8844a" : "#e7d9a8";
  const hi = sugar ? "#d8a868" : "#f4ead0";
  const shade = sugar ? "#8a6234" : "#cdbf8c";
  const stripe = sugar ? "#a8743c" : "#d8c994";
  const label = sugar ? "#f0e2b8" : "#9a8a58";
  const sq = Math.round(squash * 2);
  const w = SW + sq * 2;
  const h = SH - sq;
  const x0 = Math.round(x - w / 2);
  const y0 = Math.round(y - h);
  R(x0 - 1, y0 - 1, w + 2, h + 2, "#3a2a14");
  R(x0, y0, w, h, body);
  R(x0, y0, w, 3, hi);
  R(x0, y0 + h - 4, w, 4, shade);
  R(x0 + 2, y0 + 4, 3, h - 7, stripe);
  R(x0 + w - 6, y0 + 4, 3, h - 7, stripe);
  R(x0 + w / 2 - 5, y0 + 5, 10, 3, label);
  R(x0 + 4, y0 - 4, w - 8, 4, "#3a2a14");
  R(x0 + 5, y0 - 3, w - 10, 3, body);
  R(x0 + w / 2 - 1, y0 - 5, 2, 4, "#a02a1a");
}
function keyE(x: number, y: number, t: number): void {
  const b = reduce ? 0 : Math.round(Math.sin(t / 180) * 2);
  R(x - 8, y - 8 + b, 16, 16, "#1c0d08");
  R(x - 7, y - 7 + b, 14, 14, "#f4f1e4");
  R(x - 7, y + 4 + b, 14, 3, "#cdbf8c");
  R(x - 3, y - 4 + b, 2, 8, "#1c0d08");
  R(x - 3, y - 4 + b, 6, 2, "#1c0d08");
  R(x - 3, y - 1 + b, 5, 2, "#1c0d08");
  R(x - 3, y + 2 + b, 6, 2, "#1c0d08");
}
function crate(x: number, y: number, w: number, h: number): void {
  R(x - 1, y - 1, w + 2, h + 2, "#2a1608");
  R(x, y, w, h, "#9a7440");
  R(x, y, w, 3, "#c49a5c");
  for (let k = 5; k < h; k += 6) R(x, y + k, w, 1, "#6a4a22");
  R(x + 2, y, 2, h, "#7a5a2e");
  R(x + w - 4, y, 2, h, "#7a5a2e");
}
function basket(x: number, y: number, w: number, c: string): void {
  R(x - 1, y - 1, w + 2, 12, "#3a2a14");
  R(x, y, w, 10, c);
  for (let k = 0; k < w; k += 4) R(x + k, y + (k % 8 ? 2 : 0), 2, 8, "#00000022");
  R(x, y, w, 2, "#ffffff22");
}
const ball = (x: number, y: number, r: number, c: string, hi: string): void => {
  disc(x, y, r + 1, "#2a1608");
  disc(x, y, r, c);
  R(x - r / 2, y - r / 2, Math.max(1, r / 2), Math.max(1, r / 3), hi);
};

/* ---------- vendor stall goods (on the counter) ---------- */
function goods(i: number, x0: number): void {
  const cx = x0 + STALL_W / 2;
  const y = COUNTER_TOP;
  if (i === 0) {
    // vegetables: tomatoes, eggplants, greens, squash
    crate(x0 + 8, y - 16, 44, 16);
    for (let k = 0; k < 7; k++) ball(x0 + 14 + k * 6, y - 18 + (k % 2), 4, "#d9432e", "#f08a78");
    crate(x0 + 58, y - 16, 44, 16);
    for (let k = 0; k < 5; k++) {
      R(x0 + 62 + k * 8, y - 28 + (k % 2) * 2, 6, 14, "#2a1448");
      R(x0 + 63 + k * 8, y - 27 + (k % 2) * 2, 4, 12, "#6a3a9a");
      R(x0 + 63 + k * 8, y - 27 + (k % 2) * 2, 1, 8, "#a87ad0");
      R(x0 + 62 + k * 8, y - 30 + (k % 2) * 2, 6, 3, "#3f8a2a");
    }
    for (let k = 0; k < 4; k++) R(x0 + 10 + k * 9, y - 30, 6, 12, k % 2 ? "#3f9a2a" : "#59b32f");
  } else if (i === 1) {
    // fruit: mangoes, bananas, papaya
    crate(x0 + 8, y - 16, 50, 16);
    for (let k = 0; k < 8; k++) {
      R(x0 + 12 + k * 6, y - 22 + (k % 3), 7, 6, "#2a1608");
      R(x0 + 13 + k * 6, y - 21 + (k % 3), 5, 4, k % 2 ? "#f2a23a" : "#f2c94c");
    }
    for (let b = 0; b < 3; b++) for (let k = 0; k < 4; k++) {
      R(x0 + 66 + b * 12 + k * 2, y - 30 + k * 2 + b, 3, 14, "#2a1608");
      R(x0 + 67 + b * 12 + k * 2, y - 29 + k * 2 + b, 1, 12, "#f2d94a");
    }
    ball(x0 + 104, y - 8, 7, "#59a83a", "#a8e060");
    R(x0 + 100, y - 10, 8, 2, "#f2a23a");
  } else if (i === 2) {
    // fish on ice trays
    R(x0 + 6, y - 14, 104, 14, "#1c1c20");
    R(x0 + 8, y - 12, 100, 11, "#dfeaee");
    for (let k = 0; k < 6; k++) {
      const fx = x0 + 12 + k * 16;
      R(fx, y - 11 + (k % 2) * 2, 13, 6, "#4a6a82");
      R(fx + 1, y - 10 + (k % 2) * 2, 11, 3, "#9ab8cc");
      R(fx + 12, y - 10 + (k % 2) * 2, 3, 4, "#4a6a82");
      R(fx + 2, y - 10 + (k % 2) * 2, 1, 1, "#14100a");
    }
    for (let k = 0; k < 4; k++) {
      R(x0 + 14 + k * 24, y - 44, 1, 14, "#3a2a14");
      R(x0 + 11 + k * 24, y - 31, 8, 4, "#c9a870");
    }
  } else if (i === 3) {
    // hens in cages and baskets of eggs
    crate(x0 + 8, y - 24, 44, 24);
    for (let k = 0; k < 6; k++) R(x0 + 12 + k * 7, y - 22, 1, 20, "#1c0d08");
    R(x0 + 12, y - 16, 36, 10, "#c9783a");
    R(x0 + 40, y - 20, 6, 8, "#c9783a");
    R(x0 + 44, y - 18, 3, 2, "#f2c94c");
    R(x0 + 42, y - 22, 3, 3, "#d23a2e");
    basket(x0 + 60, y - 12, 22, "#b8844a");
    for (let k = 0; k < 6; k++) ball(x0 + 64 + (k % 3) * 6, y - 14 - Math.floor(k / 3) * 4, 3, "#f4ecd0", "#ffffff");
    basket(x0 + 88, y - 12, 20, "#b8844a");
    for (let k = 0; k < 5; k++) ball(x0 + 92 + (k % 3) * 5, y - 14 - Math.floor(k / 3) * 4, 3, "#e8d8b0", "#ffffff");
  } else {
    // coconuts, one split open, and bottles
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6 - r; k++) ball(x0 + 14 + r * 6 + k * 11, y - 8 - r * 8, 6, "#6a4a22", "#9a7a46");
    R(cx + 18, y - 10, 12, 8, "#1c0d08");
    R(cx + 19, y - 9, 10, 6, "#f4f1e4");
    R(cx + 21, y - 8, 6, 3, "#cfd8d0");
    for (let k = 0; k < 3; k++) {
      R(x0 + 94 + k * 7, y - 22, 5, 14, "#2a1608");
      R(x0 + 95 + k * 7, y - 21, 3, 12, "#d6c890");
    }
  }
}

/* ---------- stall names ---------- */
/** A painted board above each awning, so every stall is easy to tell apart. */
function stallNames(): void {
  const names = T().market.stalls;
  for (let i = 0; i < STALL_N; i++) {
    const x0 = stallX(i);
    const name = names[i];
    const w = Math.max(60, textWidth(name, 2) + 14);
    const bx = Math.round(x0 + STALL_W / 2 - w / 2);
    R(bx - 2, 107, w + 4, 18, "#1c0d08");
    R(bx, 109, w, 14, "#f0e2b8");
    R(bx, 109, w, 2, "#fff8dc");
    R(bx, 121, w, 2, "#cdbf8c");
    R(bx + 2, 124, 2, 4, "#3a2814");
    R(bx + w - 4, 124, 2, 4, "#3a2814");
    pixelText(name, x0 + STALL_W / 2, 112, 2, AWN[i][0]);
  }
  const mine = cargo === "rice" ? T().market.mine : T().cane.market.mine;
  const mw = textWidth(mine, 2) + 14;
  const mx = Math.round((MY.x0 + MY.x1) / 2 - mw / 2);
  R(mx - 2, 170, mw + 4, 18, "#1c0d08");
  R(mx, 172, mw, 14, "#fff2c0");
  R(mx, 172, mw, 2, "#ffffff");
  R(mx, 184, mw, 2, "#e8d08a");
  pixelText(mine, (MY.x0 + MY.x1) / 2, 175, 2, "#a02a1a");
}

/* ---------- static layers ---------- */
function paintBack(): void {
  for (let i = 0; i < STALL_N; i++) {
    const x0 = stallX(i);
    // the shop house behind the stall
    R(x0 - 2, 88, STALL_W + 8, 120, WALL[i]);
    R(x0 - 2, 88, STALL_W + 8, 4, "#ffffff44");
    for (let y = 100; y < 206; y += 8) R(x0 - 2, y, STALL_W + 8, 1, "#00000010");
    // tiled roof
    R(x0 - 6, 78, STALL_W + 16, 12, "#a8492a");
    for (let k = 0; k < (STALL_W + 16) / 6; k++) R(x0 - 6 + k * 6, 80 + (k % 2) * 4, 5, 4, "#c0603a");
    R(x0 - 6, 88, STALL_W + 16, 3, "#6a2a14");
    // shuttered window above the awning
    R(x0 + 14, 98, 28, 22, "#3a2a14");
    R(x0 + 16, 100, 11, 18, "#8fb7c9");
    R(x0 + 29, 100, 11, 18, "#8fb7c9");
    R(x0 + 10, 98, 5, 22, "#4a8a5a");
    R(x0 + 41, 98, 5, 22, "#4a8a5a");
    R(x0 + 70, 98, 28, 22, "#3a2a14");
    R(x0 + 72, 100, 11, 18, "#c8d8a8");
    R(x0 + 85, 100, 11, 18, "#c8d8a8");
    // a dark doorway behind the vendor
    R(x0 + 38, 148, 44, 58, "#2a1608");
    R(x0 + 40, 150, 40, 56, "#4a321c");
    // posts
    R(x0 + 2, 128, 6, 80, "#7b5836");
    R(x0 + STALL_W - 8, 128, 6, 80, "#7b5836");
    R(x0 + 2, 128, 2, 80, "#a8844f");
    R(x0 + STALL_W - 8, 128, 2, 80, "#a8844f");
    // striped awning with a scalloped edge
    const [c1, c2] = AWN[i];
    R(x0 - 4, 124, STALL_W + 8, 22, c1);
    for (let k = 0; k < (STALL_W + 8) / 14; k++) R(x0 - 4 + k * 14, 124, 7, 22, c2);
    for (let k = 0; k < (STALL_W + 8) / 7; k++) R(x0 - 4 + k * 7, 144, 7, 4 - (k % 2) * 2, k % 2 ? c1 : c2);
    R(x0 - 4, 124, STALL_W + 8, 3, "#ffffff55");
    R(x0 - 4, 146, STALL_W + 8, 2, "#00000033");
    // sign board hung from the awning
    R(x0 + STALL_W / 2 - 16, 130, 32, 14, "#1c0d08");
    R(x0 + STALL_W / 2 - 15, 131, 30, 12, "#f0e2b8");
    ball(x0 + STALL_W / 2, 137, 4, GOODS_COL[i], "#ffffff");
    // hanging strings of chilies and garlic
    for (let k = 0; k < 4; k++) {
      R(x0 + 14 + k * 28, 148, 1, 10 + (k % 2) * 4, "#3a2a14");
      R(x0 + 12 + k * 28, 158 + (k % 2) * 4, 5, 6, k % 2 ? "#d9432e" : "#f0ead0");
    }
  }
  // the street
  R(0, 206, 640, 154, "#b99a6f");
  for (let y = 206; y < 360; y += 8) {
    const k = (y - 206) / 154;
    for (let x = (y / 8) % 2 ? 0 : 8; x < 640; x += 16) {
      const r = rnd(x * 3 + y);
      R(x, y, 14, 6, r > 0.66 ? "#c8aa7c" : r > 0.33 ? "#c0a274" : "#b0905f");
      R(x, y, 14, 1, "#d8bc8e");
      R(x, y + 5, 14, 1, "#8a6c42");
      if (r > 0.9) R(x + 4, y + 1, 5, 2, "#7a9a5a");
    }
    if (k > 0.5) R(0, y + 6, 640, 1, "#00000012");
  }
  // a puddle that mirrors the awnings
  for (let k = 0; k < 6; k++) R(250 + k * 2, 322 + k, 112 - k * 4, 3, k % 2 ? "#8fb2c0" : "#a8c8d4");
  R(264, 326, 24, 2, "#d6f0f6");
  R(318, 330, 20, 1, "#d6f0f6");
  // fallen leaves, drain grate, pebbles
  for (let i = 0; i < 26; i++) R(rnd(i + 3) * 630, 214 + rnd(i * 9) * 134, 4, 2, i % 3 ? "#8a9a50" : "#a8742a");
  R(180, 342, 34, 6, "#1c0d08");
  for (let k = 0; k < 6; k++) R(182 + k * 5, 343, 2, 4, "#5a5a60");
  bunting(0, 640, 108);
}

function paintFront(): void {
  for (let i = 0; i < STALL_N; i++) {
    const x0 = stallX(i);
    goods(i, x0);
    // the counter: top plank and a front of boards
    R(x0, COUNTER_TOP, STALL_W, 24, "#1c0d08");
    R(x0 + 1, COUNTER_TOP + 1, STALL_W - 2, 5, "#c49a5c");
    R(x0 + 1, COUNTER_TOP + 6, STALL_W - 2, 17, "#8a6a43");
    for (let k = 0; k < STALL_W; k += 17) R(x0 + k, COUNTER_TOP + 6, 2, 17, "#6a4d2a");
    R(x0 + 1, COUNTER_TOP + 20, STALL_W - 2, 3, "#5a3f1e");
    R(x0 + 4, COUNTER_TOP + 8, 20, 12, "#2a3a2a");
    R(x0 + 5, COUNTER_TOP + 9, 18, 10, "#3a4a3a");
    R(x0 + 8, COUNTER_TOP + 12, 12, 1, "#cfd8d0");
    R(x0 + 8, COUNTER_TOP + 15, 8, 1, "#cfd8d0");
    // a crate and a basket at each stall's feet
    if (i % 2 === 0) crate(x0 + STALL_W - 28, COUNTER_TOP + 12, 24, 12);
    else basket(x0 + 6, COUNTER_TOP + 14, 18, "#b8844a");
  }
}

/* ---------- the truck and the player's stall ---------- */
function truck(t: number): void {
  const wob = reduce ? 0 : Math.round(Math.sin(t / 700) * 0);
  shadow(83, TRUCK.y1, 140);
  // the open bed on the left, the cab on the right
  R(TRUCK.x0, 254 + wob, 84, 26, "#1c1c20");
  R(TRUCK.x0 + 2, 256 + wob, 80, 22, "#3f7bb0");
  R(TRUCK.x0 + 2, 256 + wob, 80, 3, "#7fb0f0");
  R(TRUCK.x0 + 2, 274 + wob, 80, 4, "#2a5a90");
  R(TRUCK.x0 + 4, 240 + wob, 4, 18, "#8a8f98");
  R(TRUCK.x0 + 76, 240 + wob, 4, 18, "#8a8f98");
  R(TRUCK.x0 + 4, 240 + wob, 76, 3, "#aeb6bc");
  R(98, 242 + wob, 52, 40, "#1c1c20");
  R(100, 244 + wob, 48, 36, "#3f7bb0");
  R(100, 244 + wob, 48, 4, "#7fb0f0");
  R(106, 247 + wob, 24, 14, "#8fb7c9");
  R(106, 247 + wob, 24, 3, "#cfe8f0");
  R(134, 247 + wob, 10, 14, "#5a7a8a");
  R(146, 268 + wob, 6, 6, "#f2c94c");
  for (const wx of [34, 126]) {
    disc(wx, 282 + wob, 9, "#1a1a1a");
    disc(wx, 282 + wob, 4, "#9a9a9a");
    disc(wx, 282 + wob, 1, "#5a5a60");
  }
  // sacks still on the bed
  for (let i = 0; i < truckLeft; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    sackArt(TRUCK.x0 + 16 + col * 17 + row * 8, 258 - row * 14 + wob, 0);
  }
}
function myStall(t: number): void {
  // roof of blue tarp, a plank back wall behind the counter, and posts
  const x0 = MY.x0 - 6;
  const w = MY.x1 - MY.x0 + 12;
  R(MY.x0 - 2, 190, MY.x1 - MY.x0 + 4, MY.top - 190, "#1c0d08");
  R(MY.x0, 206, MY.x1 - MY.x0, MY.top - 206, "#9a7a4a");
  for (let k = 0; k < MY.x1 - MY.x0; k += 14) R(MY.x0 + k, 206, 2, MY.top - 206, "#6a4d2a");
  for (let y = 206; y < MY.top; y += 12) R(MY.x0, y, MY.x1 - MY.x0, 1, "#7a5a36");
  R(MY.x0, 206, MY.x1 - MY.x0, 3, "#c4a068");
  R(x0, 188, w, 20, "#1c3a6a");
  for (let k = 0; k < w / 12; k++) R(x0 + k * 12, 188, 6, 20, "#3a7bd0");
  R(x0, 188, w, 3, "#7fb0f0");
  R(x0, 206, w, 2, "#0c1c3a");
  for (let k = 0; k < w / 6; k++) R(x0 + k * 6, 208, 6, 2 + (k % 2), k % 2 ? "#1c3a6a" : "#3a7bd0");
  R(MY.x0 + 2, 206, 6, MY.top - 206, "#7b5836");
  R(MY.x1 - 8, 206, 6, MY.top - 206, "#7b5836");
  R(MY.x0 + 2, 206, 2, MY.top - 206, "#a8844f");
  R(MY.x1 - 8, 206, 2, MY.top - 206, "#a8844f");
  // sign with a golden grain
  R(MY.x0 + 56, 222, 52, 18, "#1c0d08");
  R(MY.x0 + 57, 223, 50, 16, "#f0e2b8");
  for (let k = 0; k < 5; k++) {
    R(MY.x0 + 66 + k * 7, 228 + (k % 2), 3, 8, "#c9a02a");
    R(MY.x0 + 65 + k * 7, 226 + (k % 2), 5, 3, "#f2c94c");
  }
  lantern(MY.x0 + 14, 222, t);
  lantern(MY.x1 - 14, 222, t);
  // the counter itself
  R(MY.x0, MY.top, MY.x1 - MY.x0, MY.bottom - MY.top, "#1c0d08");
  R(MY.x0 + 1, MY.top + 1, MY.x1 - MY.x0 - 2, 4, "#c49a5c");
  R(MY.x0 + 1, MY.top + 5, MY.x1 - MY.x0 - 2, MY.bottom - MY.top - 6, "#8a6a43");
  for (let k = 0; k < MY.x1 - MY.x0; k += 21) R(MY.x0 + k, MY.top + 5, 2, MY.bottom - MY.top - 6, "#6a4d2a");
  R(MY.x0 + 1, MY.bottom - 4, MY.x1 - MY.x0 - 2, 3, "#5a3f1e");
  // a hanging scale
  R(MY.x0 + 6, MY.top - 12, 2, 12, "#aeb6bc");
  R(MY.x0 + 2, MY.top - 4, 12, 3, "#aeb6bc");
  shadow((MY.x0 + MY.x1) / 2, MY.bottom + 2, MY.x1 - MY.x0);
}

/* ---------- the world ---------- */
let lastT = 0;
function drawMarketWorld(t: number): void {
  const now = performance.now();
  const dt = Math.min(0.05, (now - (lastT || now - 16)) / 1000);
  lastT = now;
  stepSacks(dt);
  backdrop(t, 96);
  layer("mk-back", paintBack);
  stallNames();
  // vendors behind their counters
  for (let i = 0; i < STALL_N; i++) villager(i, stallX(i) + 24 + (i % 2) * 36, COUNTER_TOP + 4, t, "idle", i + 1, i % 2 ? 1 : 0);
  layer("mk-front", paintFront);
  // the street's animals
  hen(236, 300, t, 3);
  hen(250, 306, t, 6, "#a8452a");
  chick(268, 308, t, 2);
  chick(276, 311, t, 4);
  goat(560, 336, t, 5);
  for (let i = 0; i < 26; i++) tuft(8 + rnd(i + 5) * 620, 338 + rnd(i + 70) * 22, "#8a9a50", "#6a7a3a");

  // villagers: walk to a stall, look, buy, move on
  for (const n of npcs) {
    const dx = n.tx - n.x;
    const dy = n.ty - n.y;
    const d = Math.hypot(dx, dy);
    if (n.buying === 0 && d > 2) {
      const sp = 24 * dt;
      n.x += (dx / d) * sp;
      n.y += (dy / d) * sp;
      if (Math.abs(dx) > 1) n.face = dx > 0 ? 1 : -1;
    } else if (n.buying === 0) {
      n.buying = now;
      n.face = stallX(n.stall) + 60 > n.x ? 1 : -1;
    } else if (now - n.buying > 600 && now - n.buying < 650 && !pops.some((p) => now - p.t < 100 && p.x === n.x)) {
      pops.push({ x: n.x, y: n.y - 40, t: now, c: GOODS_COL[n.stall] });
      sfx("click");
    } else if (now - n.buying > 2200) newTarget(n);
  }
  // everyone is sorted by their feet so nobody walks through anyone
  type Ent = { y: number; draw: () => void };
  const ents: Ent[] = [];
  for (const n of npcs) {
    const moving = n.buying === 0 && Math.hypot(n.tx - n.x, n.ty - n.y) > 2;
    ents.push({
      y: n.y,
      draw: () => {
        shadow(Math.round(n.x), Math.round(n.y), 22);
        villager(n.v, Math.round(n.x), Math.round(n.y), t, moving ? "walk" : "idle", n.seed, n.face);
      },
    });
  }
  ents.push({ y: TRUCK.y1, draw: () => truck(t) });
  ents.push({ y: MY.bottom - 0.5, draw: () => myStall(t) });
  ents.push({
    y: 286,
    draw: () => {
      shadow(180, 286, 24);
      tatay(180, 286, t, "idle", 4);
    },
  });
  ents.push({
    y: 290,
    draw: () => {
      shadow(206, 290, 24);
      nanay(206, 290, t, "idle", 5);
    },
  });
  for (const s of sacks) {
    const base = s.mode === "stall" ? MY.bottom + 1 + (MY.top - s.y) * 0.01 : s.y + 1;
    ents.push({ y: base + (s.mode === "stall" ? 0.5 : 0), draw: () => sackArt(s.x, s.y, s.squash) });
  }
  ents.push({
    y: player.y,
    draw: () => {
      drawPlayer(t);
      if (carrying) {
        // hugged against the belly with both hands on it
        carryBob = reduce ? 0 : Math.round(Math.abs(Math.sin(t / 110)) * (player.moving ? 1.4 : 0));
        const sx = Math.round(player.x);
        const by = Math.round(player.y - 6 - carryBob);
        sackArt(sx, by, 0);
        R(sx - 13, by - 12, 4, 5, "#1a1a1a");
        R(sx - 12, by - 11, 3, 3, "#edc39a");
        R(sx + 9, by - 12, 4, 5, "#1a1a1a");
        R(sx + 9, by - 11, 3, 3, "#edc39a");
      }
    },
  });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) e.draw();
  // coins and goods popping up as villagers buy
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    const a = (now - p.t) / 900;
    if (a > 1) {
      pops.splice(i, 1);
      continue;
    }
    getCtx().globalAlpha = 1 - a;
    R(p.x - 3, p.y - a * 16, 6, 6, "#2a1608");
    R(p.x - 2, p.y - a * 16 + 1, 4, 4, p.c);
    R(p.x + 6, p.y - a * 22, 4, 4, "#f2c94c");
    getCtx().globalAlpha = 1;
  }
  // E prompt when something can be picked up or put down
  if (unloadLive) {
    const show = carrying ? nearStall() : nearGround() !== null || (nearTruck() && truckLeft > 0);
    if (show) keyE(Math.round(player.x), Math.round(player.y - 66), t);
  }
}

customScenes.market = drawMarketWorld;
