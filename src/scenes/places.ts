import { fieldAtWeek, player, setScene } from "../art";
import { zoomIn } from "../closeups";
import { enterMarket } from "../marketworld";
import { sfx } from "../sound";
import { T, h, setBack, setLabel, show } from "../ui";

export type OpenPlace = "home" | "rice" | "market";
export const OPEN_PLACES: OpenPlace[] = ["home", "rice", "market"];

type Talk = { x: number; y: number };
/** Who can be talked to in each place, and roughly where they stand (canvas pixels). */
const FOLK: Record<OpenPlace, Talk[]> = {
  home: [{ x: 334, y: 286 }, { x: 402, y: 292 }],
  rice: [{ x: 92, y: 276 }, { x: 176, y: 282 }],
  market: [
    { x: 24 + 6, y: 196 }, { x: 24 + 127 + 36, y: 196 }, { x: 24 + 254, y: 196 },
    { x: 24 + 381 + 36, y: 196 }, { x: 24 + 508, y: 196 }, { x: 180, y: 286 }, { x: 206, y: 290 },
  ],
};

/** Walk around Home, the Rice field or the Market on your own; press E near someone to talk. */
export function visitPlace(id: OpenPlace, backToMap: () => void): void {
  if (id === "home") setScene("home");
  else if (id === "rice") {
    fieldAtWeek(3);
    setScene("field");
  } else {
    setScene("market");
    enterMarket(0);
  }
  zoomIn();
  player.x = id === "market" ? 320 : id === "rice" ? 150 : 300;
  player.y = id === "market" ? 296 : id === "rice" ? 290 : 300;
  const name = (): string => T().explore.places[id === "home" ? 0 : id === "rice" ? 1 : 2].n;
  setLabel(() => name());
  let line = "";
  const near = (): number => {
    let best = -1;
    let bd = 52;
    FOLK[id].forEach((f, i) => {
      const d = Math.hypot(f.x - player.x, f.y - player.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  const render = (): void =>
    show((p) => {
      const t = T().explore;
      p.appendChild(h("h2", undefined, name()));
      p.appendChild(h("p", "note pvhint", t.visitHint));
      if (line) p.appendChild(h("p", undefined, line));
    }, false);
  render();
  const key = (e: KeyboardEvent): void => {
    if (e.repeat || e.key.toLowerCase() !== "e") return;
    if (!document.querySelector(".pvhint")) {
      document.removeEventListener("keydown", key);
      return;
    }
    const f = near();
    if (f < 0) return;
    line = T().explore.talk[id][f] ?? "";
    sfx("click");
    render();
  };
  document.addEventListener("keydown", key);
  setBack(() => {
    document.removeEventListener("keydown", key);
    backToMap();
  });
}
