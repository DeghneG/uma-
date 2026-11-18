/** Placeholder pixel art drawn in code on a 96x54 canvas. Swap for real sprites later. */
export type SceneKind = "home" | "field" | "market";

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
export const view: { scene: SceneKind; sacks: number } = { scene: "home", sacks: 0 };
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
let cx: CanvasRenderingContext2D;

const R = (x: number, y: number, w: number, h: number, c: string): void => {
  cx.fillStyle = c;
  cx.fillRect(Math.round(x), Math.round(y), w, h);
};
const sky = (a: string, b: string): void => {
  R(0, 0, 96, 30, a);
  R(0, 30, 96, 24, b);
};
const sun = (x: number, y: number): void => {
  R(x, y, 6, 6, "#f6d155");
  R(x + 1, y - 1, 4, 8, "#f6d155");
};
const hills = (): void => {
  R(0, 22, 96, 8, "#5a8a6a");
  R(10, 18, 22, 6, "#4d7a5c");
  R(60, 16, 26, 8, "#4d7a5c");
};
/**
 * Chibi villager sprite, 13x16 cells, big head and black outline.
 * K outline, H hat, h hat shade, B hat band, D hair, S skin, T shirt, P shorts.
 * (x, y) keep the old meaning: x is the body centre, y the top of the old 11px figure.
 */
const HAT = [
  "....KKKKK....",
  "..KKHHHHHKK..",
  ".KHHHHHHHHHK.",
  ".KBBBBBBBBBK.",
  "KHHHHHHHHHHhK",
  "KKKKKKKKKKKKK",
];
const HAIR = [
  "....KKKKK....",
  "..KKDDDDDKK..",
  ".KDDDDDDDDDK.",
  ".KDDDDDDDDDK.",
  ".KDDDDDDDDDK.",
  ".KDDDDDDDDDK.",
];
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
/** Optional hand-drawn sprite: put a PNG at public/sprites/kid.png and it replaces the code-drawn kid. */
/** Loads public/sprites/<name>.png; returns a draw function anchored at the feet (same spot as `person`). */
const loadSprite = (name: string, fallback: (x: number, y: number) => void): ((x: number, y: number) => void) => {
  const img = new Image();
  let ready = false;
  img.onload = (): void => {
    ready = true;
  };
  img.src = `/sprites/${name}.png`;
  return (x, y) => {
    if (!ready) return fallback(x, y);
    cx.drawImage(img, Math.round(x - img.width / 2), Math.round(y + 11 - img.height));
  };
};
const kid = loadSprite("kid", (x, y) => person(x, y, "#d96f9a", false));
const tatay = loadSprite("tatay", (x, y) => person(x, y, "#c25a3a"));

const person = (x: number, y: number, shirt: string, hat = true): void => {
  const pal: Record<string, string> = {
    K: "#1b1410", H: "#eebc3c", h: "#c98a1f", B: shirt, D: "#2a1c14",
    S: "#f0c79c", T: shirt, P: "#3f5fa0",
  };
  const rows = [...(hat ? HAT : HAIR), ...BODY];
  const ox = x - 5;
  const oy = y - 5;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const k = row[i];
      if (k !== ".") R(ox + i, oy + j, 1, 1, pal[k]);
    }
  });
};

function home(): void {
  sky("#9fd3ee", "#6fae5a");
  sun(78, 6);
  hills();
  R(0, 36, 96, 18, "#6fae5a");
  R(30, 28, 24, 16, "#8a6a43");
  R(28, 24, 28, 5, "#b8582f");
  R(30, 22, 24, 3, "#b8582f");
  R(40, 34, 6, 10, "#4a321c");
  R(34, 31, 4, 4, "#d9ecf2");
  R(24, 40, 2, 6, "#7b5836");
  tatay(58, 38);
  person(74, 40, "#3f7bb0", false);
}

function fieldScene(t: number): void {
  sky("#aadbf0", "#8a6a43");
  sun(78, 5);
  hills();

  // soil, cracks (fade as water arrives), water spreading from the left
  R(0, 30, 96, 24, field.water > 0.5 ? "#5b4630" : "#b08a55");
  if (field.water < 0.6) {
    for (let i = 0; i < 12; i++) {
      R(i * 8 + 2, 32 + ((i * 5) % 18), 5, 1, "#7a5c34");
      R(i * 8 + 5, 34 + ((i * 7) % 16), 1, 4, "#7a5c34");
    }
  }
  for (let j = 0; j < 5; j++) {
    const f = Math.min(1, Math.max(0, field.water * 5 - j));
    if (f > 0) R(0, 32 + j * 4, 96 * f, 3, "#4aa0b8");
  }

  // weeds: tall olive tufts with yellow tips, removed one by one
  const weeds = Math.round(22 * field.weeds);
  for (let i = 0; i < weeds; i++) {
    const wx = (i * 11) % 92;
    const wy = 32 + ((i * 7) % 18);
    R(wx, wy - 2, 2, 6, "#6b7a2a");
    R(wx + 2, wy, 1, 4, "#85962f");
    R(wx - 1, wy, 1, 4, "#85962f");
    R(wx, wy - 3, 2, 1, "#d6c24a");
  }

  // rice: bright rows when green, gold when ripe, stubble and bundles where cut
  const ripe = field.week >= 3;
  const cols = Math.round(24 * field.plant);
  const rowsCut = Math.round((field.cut / 3) * 5);
  for (let j = 0; j < 5; j++) {
    for (let i = 0; i < cols; i++) {
      const x = i * 4 + (j % 2) * 2;
      if (ripe && j < rowsCut) {
        R(x, 33 + j * 4, 2, 1, "#a88a3a");
        if (i % 6 === 0) {
          R(x, 30 + j * 4, 3, 4, "#c9a43a");
          R(x, 32 + j * 4, 3, 1, "#7b5836");
        }
      } else {
        const s = reduce ? 0 : Math.sin(t / 500 + i + j) > 0.6 ? 1 : 0;
        R(x, (ripe ? 29 : 31) + j * 4 - s, 2, ripe ? 5 : 3, ripe ? "#d9b43a" : "#4fb04a");
      }
    }
  }

  // pests (week 2): snail eggs, a rat, yellow blight patches on the rows
  if (field.week === 1) {
    for (let i = 0; i < Math.round(8 * field.pests[0]); i++) R(8 + i * 10, 36 + ((i * 5) % 12), 2, 2, "#e75480");
    if (field.pests[1] > 0.5) {
      R(60, 46, 5, 2, "#6b6b6b");
      R(64, 45, 2, 1, "#6b6b6b");
    }
    for (let k = 0; k < Math.round(6 * field.pests[2]); k++) R(10 + k * 14, 34 + (k % 3) * 4, 3, 3, "#e6d24a");
  }

  // dry spell: the canal at the bottom is cracked
  if (field.week === 2) {
    R(0, 50, 96, 4, "#a07840");
    for (let i = 0; i < 10; i++) R(i * 10 + 3, 50 + (i % 2), 4, 1, "#6f5128");
  }

  // pump and factory smokestacks
  R(36, 22, 7, 9, "#7a7f86");
  R(33, 24, 4, 2, "#9aa0a6");
  R(42, 28, 3, 3, "#4aa0b8");
  R(84, 10, 4, 13, "#8a8f96");
  R(84, 8, 4, 2, "#b9bec4");
  R(90, 14, 3, 9, "#8a8f96");

  // the SUV and agent are only there for the notice
  if (field.week === 0) {
    R(62, 26, 24, 6, "#f4f4f2");
    R(66, 22, 15, 5, "#f4f4f2");
    R(68, 23, 5, 3, "#8fb7c9");
    R(75, 23, 5, 3, "#8fb7c9");
    R(66, 32, 4, 3, "#222222");
    R(79, 32, 4, 3, "#222222");
    person(88, 25, "#2f4a6b", false);
  }

  // Tatay works with a small bob; Mang Ben joins from week 3
  const bob = field.working && !reduce ? Math.round(Math.sin(t / 180)) : 0;
  tatay(14, 24 + bob);
  if (field.ben) person(26, 26 - bob, "#6f9a3f");
  if (field.ben && field.week === 3) kid(40, 28 + bob);
}

function market(): void {
  sky("#bfe3f0", "#b99a6f");
  R(0, 34, 96, 20, "#b99a6f");
  R(28, 16, 40, 5, "#d0452d");
  for (let s = 0; s < 8; s++) R(28 + s * 5, 16, 3, 5, "#f3ecd2");
  R(30, 21, 2, 18, "#7b5836");
  R(64, 21, 2, 18, "#7b5836");
  R(30, 32, 36, 4, "#8a6a43");
  for (let i = 0; i < view.sacks; i++) {
    R(33 + i * 7, 27, 6, 6, "#e7d9a8");
    R(35 + i * 7, 26, 2, 1, "#9a8a58");
  }
  person(74, 36, "#3f7bb0", false);
  tatay(14, 36);
}

function draw(t: number): void {
  if (view.scene === "home") home();
  else if (view.scene === "field") fieldScene(t);
  else market();
}

export function initArt(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  cx = ctx;
  const frame = (t: number): void => {
    draw(reduce ? 0 : t);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
