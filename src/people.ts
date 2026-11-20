/**
 * Villagers drawn in code, in the same pixel style as the family sprites (28x39, black outline, flat colours).
 * Every Look has its own face (skin, hair, brows, beard, glasses, hat), so no two people match.
 */
export type Hair = "short" | "bald" | "long" | "bun" | "cap" | "straw" | "scarf";
export type Look = {
  skin: string;
  hair: string;
  style: Hair;
  /** hat, cap or scarf colour */
  top?: string;
  brow?: string;
  stache?: string;
  beard?: string;
  fringe?: string;
  glasses?: boolean;
  blush?: boolean;
  shirt: string;
  shirt2: string;
  vest?: string;
  pants: string;
  shoes?: string;
  stripes?: boolean;
};

const INK = "#1a1a1a";
const shade = (hex: string, k: number): string => {
  const n = [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))));
  return `rgb(${n.join(",")})`;
};

/** Paint one person onto a fresh 28x39 canvas. */
export function buildSprite(l: Look): HTMLCanvasElement {
  const W = 28;
  const H = 39;
  const g: (string | null)[][] = Array.from({ length: H }, () => Array<string | null>(W).fill(null));
  const put = (x: number, y: number, w: number, h: number, c: string): void => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && i < W && j >= 0 && j < H) g[j][i] = c;
  };
  const dark = shade(l.skin, 0.82);
  // ----- body first, so the head and hat sit on top of it
  // legs and shoes
  put(8, 32, 5, 5, l.pants);
  put(15, 32, 5, 5, l.pants);
  put(8, 36, 5, 1, shade(l.pants, 0.8));
  put(15, 36, 5, 1, shade(l.pants, 0.8));
  put(7, 37, 6, 2, l.shoes ?? "#4f2f18");
  put(15, 37, 6, 2, l.shoes ?? "#4f2f18");
  // torso with a shaded lower hem, arms with sleeves and hands
  put(8, 23, 12, 9, l.shirt);
  put(8, 29, 12, 3, l.shirt2);
  if (l.stripes) for (let y = 24; y < 32; y += 3) put(8, y, 12, 1, l.shirt2);
  if (l.vest) {
    put(8, 23, 4, 9, l.vest);
    put(16, 23, 4, 9, l.vest);
  }
  put(12, 23, 4, 2, dark);
  put(13, 25, 2, 1, dark);
  put(4, 24, 3, 6, l.shirt);
  put(21, 24, 3, 6, l.shirt);
  put(4, 30, 3, 3, l.skin);
  put(21, 30, 3, 3, l.skin);
  put(4, 24, 1, 6, l.shirt2);
  put(23, 24, 1, 6, l.shirt2);
  // ----- head
  put(12, 22, 4, 1, dark);
  put(9, 8, 10, 14, l.skin);
  put(10, 21, 8, 1, l.skin);
  put(8, 14, 1, 3, l.skin);
  put(19, 14, 1, 3, l.skin);
  put(9, 19, 1, 2, dark);
  put(18, 19, 1, 2, dark);
  // hair, hats and scarves
  switch (l.style) {
    case "short":
      put(8, 5, 12, 5, l.hair);
      put(8, 10, 2, 5, l.hair);
      put(18, 10, 2, 5, l.hair);
      put(10, 9, 8, 1, l.hair);
      break;
    case "bald":
      put(11, 8, 5, 1, shade(l.skin, 1.12));
      if (l.fringe) {
        put(8, 11, 2, 6, l.fringe);
        put(18, 11, 2, 6, l.fringe);
        put(9, 9, 2, 2, l.fringe);
        put(17, 9, 2, 2, l.fringe);
      }
      break;
    case "long":
      put(7, 5, 14, 6, l.hair);
      put(7, 11, 3, 16, l.hair);
      put(18, 11, 3, 16, l.hair);
      put(10, 9, 8, 1, l.hair);
      break;
    case "bun":
      put(8, 5, 12, 5, l.hair);
      put(8, 10, 2, 5, l.hair);
      put(18, 10, 2, 5, l.hair);
      put(11, 1, 6, 4, l.hair);
      put(12, 0, 4, 1, l.hair);
      break;
    case "cap":
      put(8, 4, 12, 6, l.top ?? "#3a7bd0");
      put(9, 3, 10, 1, l.top ?? "#3a7bd0");
      put(5, 10, 18, 2, shade(l.top ?? "#3a7bd0", 0.75));
      put(8, 10, 2, 4, l.hair);
      put(18, 10, 2, 4, l.hair);
      break;
    case "straw":
      put(9, 2, 10, 7, "#d8be7c");
      put(2, 8, 24, 3, "#c9ac66");
      put(9, 7, 10, 1, l.top ?? "#a8452a");
      put(8, 11, 2, 3, l.hair);
      put(18, 11, 2, 3, l.hair);
      break;
    case "scarf":
      put(8, 4, 12, 6, l.top ?? "#f2c94c");
      put(8, 10, 2, 9, l.top ?? "#f2c94c");
      put(18, 10, 2, 9, l.top ?? "#f2c94c");
      put(9, 9, 10, 1, shade(l.top ?? "#f2c94c", 0.8));
      put(10, 5, 3, 1, "#ffffff55");
      break;
  }
  // face: brows, eyes, glasses, nose, cheeks, mouth, moustache, beard
  const brow = l.brow ?? l.hair;
  put(10, 12, 3, 1, brow);
  put(15, 12, 3, 1, brow);
  put(11, 14, 1, 2, INK);
  put(16, 14, 1, 2, INK);
  if (l.glasses) {
    put(10, 13, 3, 4, "#6a4d2a");
    put(15, 13, 3, 4, "#6a4d2a");
    put(13, 14, 2, 1, "#6a4d2a");
    put(11, 14, 1, 2, INK);
    put(16, 14, 1, 2, INK);
  }
  put(13, 16, 2, 1, dark);
  if (l.blush) {
    put(10, 17, 2, 1, "#e58ba8");
    put(16, 17, 2, 1, "#e58ba8");
  }
  put(12, 19, 4, 1, "#8a3a2a");
  if (l.stache) {
    put(11, 18, 6, 2, l.stache);
    put(10, 18, 1, 1, l.stache);
    put(17, 18, 1, 1, l.stache);
  }
  if (l.beard) {
    put(10, 19, 8, 3, l.beard);
    put(9, 17, 1, 3, l.beard);
    put(18, 17, 1, 3, l.beard);
    put(12, 19, 4, 1, "#8a3a2a");
  }
  // ----- black outline around everything
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let col = g[y][x];
      if (!col) {
        const n = [g[y - 1]?.[x], g[y + 1]?.[x], g[y]?.[x - 1], g[y]?.[x + 1]];
        if (n.some((v) => v)) col = INK;
      }
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}

const skinA = "#edc39a";
const skinB = "#d4a074";
const skinC = "#b8804f";
const skinD = "#8a5a34";

/** Fourteen different villagers: five vendors, then shoppers. */
export const LOOKS: Look[] = [
  // 0 vegetable seller: bun, red striped blouse
  { skin: skinC, hair: "#1a1410", style: "bun", blush: true, shirt: "#d9432e", shirt2: "#a8321e", stripes: true, pants: "#3a5a9a" },
  // 1 fruit seller: grandmother, white curls, glasses
  { skin: skinA, hair: "#e4e4e4", style: "short", brow: "#cfcfcf", glasses: true, blush: true, shirt: "#f2c94c", shirt2: "#d9a91e", pants: "#6a4d33" },
  // 2 fish seller: navy cap, black moustache
  { skin: skinD, hair: "#1a1410", style: "cap", top: "#234a96", stache: "#1a1410", shirt: "#3f7bb0", shirt2: "#2f5f90", pants: "#2f3a4a" },
  // 3 poultry seller: long dark hair, green blouse
  { skin: skinB, hair: "#2a1a10", style: "long", blush: true, shirt: "#3f9a5a", shirt2: "#2f7a44", pants: "#8a5a2a" },
  // 4 coconut seller: straw hat and a short beard
  { skin: skinC, hair: "#1a1410", style: "straw", top: "#2f7a44", beard: "#2a1a10", shirt: "#e8a23a", shirt2: "#c0801f", pants: "#4a6a3a" },
  // 5 girl with a bun and a pink top
  { skin: skinA, hair: "#6a3a1a", style: "bun", blush: true, shirt: "#f08ab0", shirt2: "#d0608a", pants: "#6f9be8" },
  // 6 boy in a red cap
  { skin: skinB, hair: "#2a1a10", style: "cap", top: "#c0392b", shirt: "#3a7bd0", shirt2: "#2a5ba0", stripes: true, pants: "#6a4d33" },
  // 7 man with glasses and a moustache, white shirt
  { skin: skinD, hair: "#1a1410", style: "short", glasses: true, stache: "#1a1410", shirt: "#f4f1e4", shirt2: "#cfc8b0", pants: "#2f3a4a" },
  // 8 woman in a yellow headscarf
  { skin: skinC, hair: "#1a1410", style: "scarf", top: "#f2c94c", blush: true, shirt: "#8a4a9a", shirt2: "#6a3a7a", pants: "#d0b070" },
  // 9 old man: bald, grey fringe, long grey beard
  { skin: skinA, hair: "#9a9a9a", style: "bald", fringe: "#b8b8b8", brow: "#b8b8b8", beard: "#c8c8c8", shirt: "#3f7bb0", shirt2: "#2f5f90", pants: "#4a4a3a" },
  // 10 woman with long brown hair, teal blouse
  { skin: skinA, hair: "#6a3a1a", style: "long", blush: true, shirt: "#2fa59a", shirt2: "#1f857a", pants: "#3a3a5a" },
  // 11 young man with stubble, red stripes
  { skin: skinB, hair: "#3a2414", style: "short", beard: "#4a3424", shirt: "#d9432e", shirt2: "#a8321e", stripes: true, pants: "#2f4a6a" },
  // 12 teen in a green cap, yellow shirt
  { skin: skinC, hair: "#1a1410", style: "cap", top: "#3f9a2a", shirt: "#f2d94a", shirt2: "#d0b020", pants: "#3a5a9a" },
  // 13 woman in a straw hat with a red band
  { skin: skinB, hair: "#2a1a10", style: "straw", top: "#c0392b", blush: true, shirt: "#e4e4e4", shirt2: "#b8b8b8", pants: "#4a6a8a" },
];

/** Mang Ben: bald with a white fringe, bushy white moustache and brows, round glasses, an olive vest. Not Tatay Bert. */
export const BEN: Look = {
  skin: skinB,
  hair: "#e8e8e8",
  style: "bald",
  fringe: "#f0f0f0",
  brow: "#f4f4f4",
  stache: "#f4f4f4",
  glasses: true,
  shirt: "#e8e0c8",
  shirt2: "#c8c0a8",
  vest: "#5a7a3a",
  pants: "#4a4a3a",
  shoes: "#3a2a14",
};
