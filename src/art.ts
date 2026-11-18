/**
 * Scenes drawn in code on a 640x360 pixel grid. The game frame is 1920x1080, so every pixel here
 * is shown at exactly 3x. Hand-drawn character sprites (public/sprites) are drawn 1:1 on this grid.
 * Swap any scene for a painted background later without touching the game logic.
 */
export type SceneKind = "title" | "home" | "field" | "market";

/**
 * Field state. Numbers are 0..1 fractions so GSAP can tween them for visible progress
 * (weeds = how many weeds remain, water = how far the water has spread, plant = rows planted).
 */
export const field = {
  weeds: 1,
  water: 0,
  plant: 0,
  /** harvest rounds cut so far, 0..3 */
  cut: 0,
  /** how much of each pest remains: snails, rats, leaf blight */
  pests: [1, 1, 1],
  /** 0 notice, 1 pests, 2 dry spell, 3 harvest */
  week: 0,
  ben: false,
  working: false,
};
export const view: { scene: SceneKind; sacks: number; logoA: number } = { scene: "home", sacks: 0, logoA: 1 };
export const setScene = (k: SceneKind): void => {
  view.scene = k;
};

/** Put the field in the state it has at the start of a given week (also used by the #week dev shortcut). */
export function fieldAtWeek(week: number): void {
  field.week = week;
  field.working = false;
  field.pests = [1, 1, 1];
  field.cut = 0;
  field.ben = week >= 2;
  if (week === 0) Object.assign(field, { weeds: 1, water: 0, plant: 0 });
  // the dry spell (week 3) leaves only a little water in the field
  else Object.assign(field, { weeds: 0, water: week === 2 ? 0.25 : 1, plant: 1 });
}

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const W = 640;
const H = 360;
let cx: CanvasRenderingContext2D;

/* ---------- drawing helpers ---------- */
const R = (x: number, y: number, w: number, h: number, c: string): void => {
  cx.fillStyle = c;
  cx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
/** Deterministic pseudo random 0..1 so scenery does not flicker between frames. */
const rnd = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const rgb = (c: string): number[] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number): string => {
  const A = rgb(a);
  const B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};
const disc = (x: number, y: number, r: number, c: string): void => {
  for (let j = -r; j <= r; j++) {
    const w = Math.floor(Math.sqrt(r * r - j * j));
    R(x - w, y + j, w * 2 + 1, 1, c);
  }
};
/** Banded vertical gradient, the classic pixel-art sky. */
const sky = (top: string, bottom: string, y1: number): void => {
  for (let y = 0; y < y1; y += 4) R(0, y, W, 4, mix(top, bottom, y / y1));
};
const sun = (x: number, y: number): void => {
  disc(x, y, 34, "rgba(255,244,190,0.16)");
  disc(x, y, 26, "rgba(255,244,190,0.28)");
  disc(x, y, 18, "#ffeea0");
  disc(x, y, 14, "#fff7c8");
};
const CLOUD: [number, number][] = [[14, 20], [6, 36], [0, 52], [4, 46], [12, 30]];
const cloud = (x: number, y: number, s: number, t: number, speed: number): void => {
  const px = ((x + t * speed) % (W + 160)) - 80;
  CLOUD.forEach(([o, w], r) => R(px + o * s, y + r * 4 * s, w * s, 4 * s, r >= 3 ? "#cfe3f1" : "#ffffff"));
};
const hills = (base: number, a1: number, f1: number, a2: number, f2: number, ph: number, col: string, hi: string): void => {
  for (let x = 0; x < W; x++) {
    const y = Math.round(base + Math.sin(x * f1 + ph) * a1 + Math.sin(x * f2 + ph * 2) * a2);
    R(x, y, 1, H - y, col);
    R(x, y, 1, 2, hi);
  }
};
const tuft = (x: number, y: number, c1: string, c2: string): void => {
  R(x, y - 6, 1, 6, c1);
  R(x - 2, y - 4, 1, 4, c2);
  R(x + 2, y - 5, 1, 5, c2);
};
const palm = (x: number, base: number, h: number, t: number, lean = 1): void => {
  const sway = reduce ? 0 : Math.sin(t / 900 + x) * 2;
  let tx = x;
  let ty = base;
  for (let i = 0; i < h; i += 2) {
    const p = i / h;
    tx = x + lean * Math.sin(p * 1.3) * h * 0.12 + sway * p;
    ty = base - i;
    R(tx - 2, ty, 5, 2, i % 8 < 4 ? "#7b5a3a" : "#6a4a2e");
    R(tx + 1, ty, 1, 2, "#9a7550");
  }
  for (const d of [-1, -0.7, -0.38, 0.38, 0.7, 1]) {
    for (let k = 0; k < 24; k++) {
      const fx = tx + d * k * 2.1;
      const fy = ty - 4 + k * (0.5 - Math.abs(d) * 0.25) + k * k * 0.028 + d * sway * 0.3;
      R(fx, fy, 4, 3, k % 6 < 3 ? "#438f3f" : "#2f6f33");
      if (k % 3 === 0) R(fx, fy + 3, 2, 2, "#438f3f");
    }
  }
  disc(tx - 3, ty + 3, 3, "#6a4a2e");
  disc(tx + 3, ty + 4, 3, "#5a3d26");
};
const smoke = (x: number, y: number, t: number): void => {
  for (let k = 0; k < 6; k++) {
    const age = reduce ? k * 10 : (t / 40 + k * 14) % 84;
    disc(x + Math.sin(age / 12 + k) * 4 + age * 0.15, y - age * 0.55, 3 + age / 14, `rgba(214,214,220,${0.6 - age / 160})`);
  }
};
const flowers = (x0: number, x1: number, y0: number, y1: number, n: number, seed: number): void => {
  const cols = ["#f6e05a", "#ffffff", "#f08ab0", "#f2994a"];
  for (let i = 0; i < n; i++) R(x0 + rnd(seed + i) * (x1 - x0), y0 + rnd(seed + i + 50) * (y1 - y0), 2, 2, cols[i % 4]);
};

/* ---------- people ---------- */
/**
 * Code-drawn villager (13x16 cells, drawn at 2x): used until a hand-drawn sprite exists for that person.
 * K outline, H hat, h hat shade, B hat band, D hair, S skin, T shirt, P shorts.
 */
const HAT = ["....KKKKK....", "..KKHHHHHKK..", ".KHHHHHHHHHK.", ".KBBBBBBBBBK.", "KHHHHHHHHHHhK", "KKKKKKKKKKKKK"];
const HAIR = ["....KKKKK....", "..KKDDDDDKK..", ".KDDDDDDDDDK.", ".KDDDDDDDDDK.", ".KDDDDDDDDDK.", ".KDDDDDDDDDK."];
const BODY = [
  ".KDSSSSSSSDK.",
  ".KSSSSSSSSSK.",
  ".KSKSSSSSKSK.",
  ".KSKSSSSSKSK.",
  "..KSSSSSSSK..",
  "..SKTTTTTKS..",
  "..SKTTTTTKS..",
  "...KPPPPPK...",
  "...KPK.KPK...",
  "...KKK.KKK...",
];
const person = (x: number, feet: number, shirt: string, hat = true): void => {
  const pal: Record<string, string> = {
    K: "#1b1410", H: "#eebc3c", h: "#c98a1f", B: shirt, D: "#2a1c14", S: "#f0c79c", T: shirt, P: "#3f5fa0",
  };
  const rows = [...(hat ? HAT : HAIR), ...BODY];
  const s = 2;
  const ox = x - 13 * s * 0.5;
  const oy = feet - rows.length * s;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== ".") R(ox + i * s, oy + j * s, s, s, pal[row[i]]);
  });
};
/** Loads public/sprites/<name>.png (hand-drawn, drawn 1:1); returns draw(x centre, y of feet). */
const loadSprite = (name: string, fallback: (x: number, feet: number) => void): ((x: number, feet: number) => void) => {
  const img = new Image();
  let ready = false;
  img.onload = (): void => {
    ready = true;
  };
  img.src = `/sprites/${name}.png`;
  return (x, feet) => {
    if (!ready) return fallback(x, feet);
    cx.drawImage(img, Math.round(x - img.width / 2), Math.round(feet - img.height));
  };
};
const kid = loadSprite("kid", (x, f) => person(x, f, "#d96f9a", false));
const tatay = loadSprite("tatay", (x, f) => person(x, f, "#c25a3a"));
const nanay = loadSprite("nanay", (x, f) => person(x, f, "#3f7bb0", false));
/** soft ground shadow under a character */
const shadow = (x: number, y: number, w = 26): void => R(x - w / 2, y - 1, w, 3, "rgba(0,0,0,0.22)");

/* ---------- scenes ---------- */
function backdrop(t: number, horizon: number): void {
  sky("#4aa6e6", "#d3ecf6", horizon);
  sun(430, 84);
  cloud(20, 56, 1.5, t, 0.012);
  cloud(190, 86, 1, t, 0.018);
  cloud(330, 52, 2, t, 0.008);
  cloud(520, 96, 1.2, t, 0.014);
  hills(horizon - 34, 18, 0.011, 7, 0.03, 1, "#6f9fba", "#8cb8cb");
  hills(horizon - 14, 12, 0.016, 5, 0.05, 3, "#4f8a72", "#6aa588");
  hills(horizon - 2, 6, 0.02, 3, 0.07, 5, "#3f7a50", "#5a9a62");
}

function home(t: number): void {
  backdrop(t, 150);
  // far rice terraces
  for (let i = 0; i < 6; i++) {
    R(0, 152 + i * 5, W, 5, i % 2 ? "#7cc05a" : "#5fa84a");
    R(0, 152 + i * 5, W, 1, "#9ad46f");
  }
  // grass
  R(0, 184, W, H - 184, "#5fa84a");
  for (let y = 184; y < H; y += 6) R(0, y, W, 3, y % 12 ? "#68b250" : "#5aa045");
  // dirt path to the hut
  for (let i = 0; i < 70; i++) R(150 + i * 1.2 + (i % 5), 262 + i * 1.4, 70 - i * 0.2, 2, i % 3 ? "#b89a62" : "#a98b55");
  palm(46, 292, 150, t, 1);
  palm(404, 270, 118, t, -1);
  hut(210, 268);
  // fence
  for (let x = 4; x < 140; x += 14) {
    R(x, 246, 3, 22, "#8a6a43");
    R(x, 246, 3, 2, "#a8844f");
  }
  R(4, 252, 136, 2, "#8a6a43");
  R(4, 260, 136, 2, "#8a6a43");
  for (let i = 0; i < 70; i++) tuft(8 + rnd(i) * 620, 300 + rnd(i + 90) * 54, "#3f8a3f", "#4aa045");
  flowers(0, 640, 286, 356, 36, 7);
  shadow(330, 305, 40);
  shadow(402, 311, 40);
  tatay(330, 304);
  nanay(402, 310);
}

function hut(x: number, g: number): void {
  for (const dx of [-42, -14, 14, 42]) R(x + dx - 2, g - 34, 4, 34, "#6b4a2c");
  R(x - 52, g - 38, 104, 5, "#8a6a43");
  R(x - 46, g - 78, 92, 40, "#d3b678");
  for (let i = 0; i < 92; i += 6) R(x - 46 + i, g - 78, 1, 40, "#b99a5c");
  R(x - 46, g - 60, 92, 2, "#a68a50");
  R(x - 10, g - 72, 20, 34, "#4a321c");
  R(x - 10, g - 72, 20, 2, "#6b4a2c");
  R(x + 22, g - 70, 18, 16, "#2d3a2a");
  R(x + 22, g - 71, 18, 2, "#8a6a43");
  R(x - 40, g - 70, 18, 16, "#2d3a2a");
  R(x - 40, g - 71, 18, 2, "#8a6a43");
  for (let r = 0; r < 44; r++) {
    const w = 14 + r * 3.2;
    R(x - w / 2, g - 122 + r, w, 1, r % 4 < 2 ? "#c9a14a" : "#b58a36");
    if (r % 4 === 0) for (let i = -w / 2; i < w / 2; i += 7) R(x + i, g - 122 + r, 1, 3, "#8f6a24");
  }
  R(x - 80, g - 79, 160, 2, "#7d5a1e");
  R(x - 62, g - 38, 3, 38, "#6b4a2c");
  R(x - 56, g - 38, 3, 38, "#6b4a2c");
  for (let k = 0; k < 5; k++) R(x - 62, g - 34 + k * 8, 9, 2, "#8a6a43");
  // a few chickens
  for (const cxp of [130, 160]) {
    R(cxp, g - 6, 8, 5, "#f0e6d0");
    R(cxp + 6, g - 9, 3, 3, "#f0e6d0");
    R(cxp + 8, g - 8, 2, 1, "#e07a2e");
    R(cxp + 7, g - 10, 1, 1, "#d23a2e");
  }
}

/* rice field geometry */
const ROWS = 6;
const ROW0 = 182;
const ROWH = 25;

function plantTuft(x: number, base: number, h: number, ripe: boolean, lift: number): void {
  if (ripe) {
    R(x, base - h + lift, 2, h - lift, "#c9a43a");
    R(x - 3, base - h + 4, 2, h - 4, "#bf9a34");
    R(x + 3, base - h + 4, 2, h - 4, "#bf9a34");
    R(x - 2, base - h + lift, 6, 4, "#e6bf3c");
    R(x + 2, base - h + lift + 3, 2, 3, "#e6bf3c");
  } else {
    R(x, base - h + lift, 2, h - lift, "#4fb04a");
    R(x - 3, base - h + 3, 2, h - 3, "#3f9a40");
    R(x + 3, base - h + 3, 2, h - 3, "#3f9a40");
    R(x, base - h + lift, 2, 2, "#8ae06a");
  }
}

function fieldScene(t: number): void {
  const wet = field.water > 0.5;
  backdrop(t, 150);

  // far: factory with smokestacks
  R(340, 108, 96, 44, "#8f949b");
  R(340, 108, 96, 4, "#a5aab0");
  for (let i = 0; i < 6; i++) R(346 + i * 15, 118, 8, 12, "#6e747c");
  R(352, 64, 12, 46, "#7d838b");
  R(352, 78, 12, 4, "#c0453a");
  R(352, 64, 12, 3, "#9aa0a6");
  R(392, 80, 10, 30, "#7d838b");
  R(392, 90, 10, 3, "#c0453a");
  smoke(358, 62, t);
  smoke(397, 78, t + 400);

  // bank, road, bank
  R(0, 150, W, H - 150, "#5d9a48");
  R(0, 158, W, 14, "#8d8a80");
  R(0, 158, W, 2, "#a29f94");
  for (let x = 6; x < W; x += 34) R(x, 164, 16, 2, "#e8e4cc");
  for (let i = 0; i < 40; i++) tuft(6 + rnd(i) * 628, 176, "#3f8a3f", "#4aa045");

  // pump and pipe
  R(42, 152, 18, 24, "#7a7f86");
  R(38, 148, 26, 6, "#9aa0a6");
  R(58, 162, 14, 5, "#9aa0a6");
  R(70, 166, 4, 10, field.water > 0.3 ? "#4aa0b8" : "#9aa0a6");

  // field rows
  for (let j = 0; j < ROWS; j++) {
    const top = ROW0 + j * ROWH;
    R(0, top, W, 22, wet ? "#6a4d33" : "#b58f58");
    R(0, top + 20, W, 2, wet ? "#573e29" : "#9c7a47");
    R(0, top + 22, W, 3, "#7a5a36");
    R(0, top + 22, W, 1, "#8f7144");
    for (let i = 0; i < 90; i++) R(rnd(i + j * 17) * W, top + 1 + rnd(i * 3 + j) * 19, 2, 1, rnd(i + j) > 0.5 ? (wet ? "#7a5a3c" : "#c4a068") : (wet ? "#5a4029" : "#a07d4a"));
    if (field.water < 0.6) {
      for (let i = 0; i < 18; i++) {
        const cxp = rnd(i + j * 31) * (W - 12);
        R(cxp, top + 5 + rnd(i + j) * 12, 6, 1, "#7a5c34");
        R(cxp + 3, top + 7 + rnd(i + 5 + j) * 10, 1, 4, "#7a5c34");
      }
    }
    const frac = Math.min(1, Math.max(0, field.water * ROWS - j));
    if (frac > 0) {
      R(0, top + 1, W * frac, 20, "#4aa0b8");
      R(0, top + 1, W * frac, 2, "#7cc6d8");
      for (let k = 0; k < 14; k++) {
        const x = (k * 53 + (reduce ? 0 : t / 50)) % W;
        if (x < W * frac) R(x, top + 7 + (k % 3) * 5, 10, 1, "#a8dde8");
      }
    }
  }

  // weeds, then rice
  const weeds = Math.round(36 * field.weeds);
  for (let i = 0; i < weeds; i++) {
    const wj = i % ROWS;
    const x = (i * 47 + 13) % 600;
    const b = ROW0 + wj * ROWH + 20;
    R(x, b - 14, 3, 14, "#6b7a2a");
    R(x + 3, b - 10, 2, 10, "#85962f");
    R(x - 2, b - 9, 2, 9, "#85962f");
    R(x, b - 16, 3, 2, "#d6c24a");
  }
  const ripe = field.week >= 3;
  const cols = Math.round(30 * field.plant);
  const rowsCut = Math.round((field.cut / 3) * ROWS);
  for (let j = 0; j < ROWS; j++) {
    const base = ROW0 + j * ROWH + 20;
    for (let i = 0; i < cols; i++) {
      const x = i * 20 + 10 + (j % 2) * 10;
      if (ripe && j < rowsCut) {
        R(x - 1, base - 2, 4, 2, "#a88a3a");
        if (i % 5 === 0) {
          R(x - 4, base - 12, 9, 10, "#c9a43a");
          R(x - 4, base - 8, 9, 2, "#7b5836");
        }
      } else {
        const lift = reduce ? 0 : Math.sin(t / 500 + i + j) > 0.6 ? 1 : 0;
        plantTuft(x, base, ripe ? 17 + j : 10 + j, ripe, lift);
      }
    }
  }

  // pests (week 2): snail eggs, a rat, yellow blight patches
  if (field.week === 1) {
    for (let i = 0; i < Math.round(9 * field.pests[0]); i++) {
      const b = ROW0 + (i % ROWS) * ROWH + 14;
      R(20 + i * 44, b, 4, 4, "#e75480");
      R(23 + i * 44, b + 2, 3, 3, "#f08ab0");
    }
    if (field.pests[1] > 0.5) {
      R(326, 262, 14, 6, "#6b6b6b");
      R(338, 260, 5, 4, "#6b6b6b");
      R(322, 266, 6, 1, "#4b4b4b");
    }
    for (let k = 0; k < Math.round(7 * field.pests[2]); k++) {
      R(30 + k * 58, ROW0 + (k % ROWS) * ROWH + 8, 7, 7, "#e6d24a");
      R(32 + k * 58, ROW0 + (k % ROWS) * ROWH + 10, 3, 3, "#b89a2a");
    }
  }

  // irrigation canal at the front: dry and cracked in the dry spell
  const canalY = ROW0 + ROWS * ROWH + 2;
  if (field.week === 2) {
    R(0, canalY, W, 14, "#a07840");
    for (let i = 0; i < 24; i++) R(i * 27 + 5, canalY + 4 + (i % 2) * 4, 10, 1, "#6f5128");
  } else {
    R(0, canalY, W, 14, "#4aa0b8");
    R(0, canalY, W, 2, "#7cc6d8");
    for (let k = 0; k < 10; k++) R((k * 71 + (reduce ? 0 : t / 40)) % W, canalY + 6, 14, 1, "#a8dde8");
  }
  R(0, canalY + 14, W, H - canalY - 14, "#5d9a48");
  for (let i = 0; i < 40; i++) tuft(6 + rnd(i + 300) * 628, canalY + 22 + rnd(i + 400) * 10, "#3f8a3f", "#4aa045");
  flowers(0, 640, canalY + 16, 356, 20, 11);

  // the SUV and the agent are only there for the notice
  if (field.week === 0) {
    R(150, 140, 80, 20, "#f4f4f2");
    R(164, 124, 50, 18, "#f4f4f2");
    R(168, 128, 18, 11, "#8fb7c9");
    R(190, 128, 18, 11, "#8fb7c9");
    R(156, 156, 14, 9, "#222222");
    R(206, 156, 14, 9, "#222222");
    shadow(300, 280, 28);
    person(300, 280, "#2f4a6b", false);
  }

  // Bert works with a small bob; Mang Ben joins from week 3, with a child at the harvest
  const bob = field.working && !reduce ? Math.round(Math.sin(t / 180) * 2) : 0;
  shadow(92, 276);
  tatay(92, 276 + bob);
  if (field.ben) {
    shadow(176, 282, 30);
    person(176, 282 - bob, "#6f9a3f");
  }
  if (field.ben && field.week === 3) {
    shadow(250, 292);
    kid(250, 292 + bob);
  }
}

function market(t: number): void {
  backdrop(t, 132);
  // shop fronts
  const roofs = ["#b8582f", "#7a8a94", "#4f7a8a", "#b8582f", "#8a6a43"];
  for (let i = 0; i < 5; i++) {
    const x = i * 132 - 10;
    R(x, 118, 126, 12, roofs[i]);
    R(x, 130, 126, 54, i % 2 ? "#d8c79a" : "#cfbf8e");
    R(x + 18, 146, 34, 38, "#4a321c");
    R(x + 70, 142, 36, 22, "#2d3a2a");
    R(x, 118, 126, 2, "#00000022");
  }
  // cobbled ground
  R(0, 184, W, H - 184, "#b99a6f");
  for (let y = 184; y < H; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) R(x, y, 14, 6, (x + y) % 3 ? "#c4a678" : "#ad8f65");
  // stall: posts, striped awning, counter
  R(112, 176, 5, 70, "#7b5836");
  R(300, 176, 5, 70, "#7b5836");
  R(104, 160, 208, 18, "#d0452d");
  for (let s = 0; s < 13; s++) R(104 + s * 16, 160, 8, 18, "#f3ecd2");
  R(104, 178, 208, 3, "#00000030");
  R(112, 226, 192, 22, "#8a6a43");
  R(112, 226, 192, 3, "#a8844f");
  R(112, 246, 192, 3, "#00000030");
  for (let i = 0; i < view.sacks; i++) {
    const sx = 126 + i * 34;
    R(sx, 200, 28, 26, "#e7d9a8");
    R(sx + 4, 196, 20, 5, "#e7d9a8");
    R(sx + 8, 214, 12, 3, "#9a8a58");
    R(sx, 220, 28, 6, "#cdbf8c");
  }
  // crates and baskets
  R(330, 218, 32, 28, "#9a7a48");
  R(330, 218, 32, 4, "#b8955a");
  R(334, 200, 24, 18, "#d99a3a");
  R(40, 224, 28, 22, "#b88a4a");
  disc(54, 222, 11, "#7aa24a");
  palm(580, 240, 110, t, -1);
  // vendor behind the counter, family in front
  shadow(208, 226, 30);
  person(208, 226, "#8a4a9a");
  shadow(92, 298, 40);
  tatay(92, 298);
  shadow(372, 304, 40);
  nanay(372, 304);
  for (let i = 0; i < 30; i++) tuft(8 + rnd(i + 5) * 620, 330 + rnd(i + 70) * 24, "#8a9a50", "#6a7a3a");
}


/* ---------- title screen ---------- */
const GLYPHS: Record<string, number[][]> = {
  U: [[0, 0, 18, 76], [46, 0, 18, 76], [0, 58, 64, 18]],
  M: [[0, 0, 18, 76], [46, 0, 18, 76], [0, 0, 64, 18], [23, 18, 18, 32]],
  A: [[0, 16, 18, 60], [46, 16, 18, 60], [10, 0, 44, 18], [0, 40, 64, 16]],
};
/** Big blocky UMA logo: dark outline, stacked extrusion, golden face. Letters bob gently. */
function logo(t: number): void {
  if (view.logoA <= 0) return;
  cx.globalAlpha = view.logoA;
  const x0 = 204;
  const y0 = 30;
  const place = (fn: (x: number, y: number, w: number, h: number) => void): void =>
    "UMA".split("").forEach((ch, i) => {
      const ox = x0 + i * 84;
      const oy = y0 + (reduce ? 0 : Math.round(Math.sin(t / 700 + i * 0.9) * 2));
      GLYPHS[ch].forEach(([x, y, w, h]) => fn(ox + x, oy + y, w, h));
    });
  for (let k = 0; k <= 10; k++) place((x, y, w, h) => R(x + k - 3, y + k - 3, w + 6, h + 6, "#2a120a"));
  for (let k = 10; k >= 1; k--) place((x, y, w, h) => R(x + k, y + k, w, h, k % 4 < 2 ? "#a8381a" : "#8f2f15"));
  place((x, y, w, h) => R(x, y, w, h, "#f4b92f"));
  place((x, y, w) => R(x + 3, y + 3, w - 6, 3, "#ffe27a"));
  cx.globalAlpha = 1;
}
const bush = (x: number, y: number, r: number): void => {
  disc(x, y, r, "#245a2e");
  disc(x - r * 0.3, y - r * 0.3, r * 0.75, "#2f7a3a");
  disc(x - r * 0.4, y - r * 0.45, r * 0.4, "#4a9a4a");
};
function titleScene(t: number): void {
  sky("#3f9be0", "#cfe9f6", 240);
  cloud(-20, 118, 3.4, t, 0.008);
  cloud(430, 92, 3, t, 0.006);
  cloud(250, 152, 2.2, t, 0.01);
  cloud(560, 138, 2.6, t, 0.007);
  hills(186, 16, 0.012, 6, 0.03, 2, "#6f9fba", "#8cb8cb");
  hills(198, 8, 0.02, 3, 0.06, 4, "#4f8a72", "#6aa588");
  hills(214, 5, 0.013, 2, 0.05, 1, "#3b7d3b", "#5aa84a");
  for (let y = 222; y < H; y += 5) for (let x = (y / 5) % 2 ? 0 : 6; x < W; x += 12) R(x + rnd(x * y) * 5, y, 3, 1, rnd(x + y) > 0.5 ? "#2f6e33" : "#4d9a46");
  // rice terraces climbing to the right, with the kid on the top step
  for (let i = 0; i < 9; i++) {
    const sx = 455 + i * 15;
    const sy = 336 - i * 13;
    R(sx, sy, W - sx, 13, i % 2 ? "#8fbf52" : "#78ad45");
    R(sx, sy, W - sx, 2, "#b4dc78");
    R(sx, sy + 11, W - sx, 2, "#4f7e2a");
  }
  hut(88, 262);
  palm(30, 272, 112, t, 1);
  palm(430, 236, 80, t, -1);
  bush(240, 296, 16);
  bush(150, 304, 20);
  bush(396, 304, 22);
  bush(366, 316, 14);
  flowers(0, 640, 262, 350, 30, 3);
  kid(592, 232);
  // dark grass in the foreground
  for (let x = 0; x < W; x += 2) R(x, H - 10 - rnd(x) * 14, 2, 24, "#0c2414");
  for (let x = 0; x < W; x += 6) R(x + 1, H - 24 - rnd(x + 9) * 10, 1, 10, "#0c2414");
  logo(t);
}

function draw(t: number): void {
  if (view.scene === "title") titleScene(t);
  else if (view.scene === "home") home(t);
  else if (view.scene === "field") fieldScene(t);
  else market(t);
}

export function initArt(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  cx = ctx;
  cx.imageSmoothingEnabled = false;
  const frame = (t: number): void => {
    draw(reduce ? 0 : t);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
