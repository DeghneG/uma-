import { setScene } from "../art";
import { closeUp, zoomIn } from "../closeups";
import { mapState, onArrive, placeAt, resetMap, travel } from "../mapworld";
import { sfx } from "../sound";
import { OPEN_PLACES, visitPlace, type OpenPlace } from "./places";
import { T, h, setBack, setLabel, show } from "../ui";

/** Place numbers on the map that can be entered: Home, the Rice field and the Market. */
const openId = (i: number): OpenPlace | null => (i >= 0 && i < OPEN_PLACES.length ? OPEN_PLACES[i] : null);

/** Explore mode: a map of the whole barrio. Click a place to walk there; Home, the Rice field and the Market open up. */
export function explore(back: () => void): void {
  setScene("map");
  zoomIn();
  resetMap();
  setLabel(() => T().explore.head);
  const game = document.getElementById("game");
  game?.classList.add("closeup");
  const pos = { x: 320, y: 180 };

  const render = (): void =>
    show((p) => {
      const t = T().explore;
      const here = mapState.arrived >= 0 ? mapState.arrived : -1;
      p.appendChild(h("h2", undefined, here >= 0 ? t.places[here].n : t.head));
      p.appendChild(h("p", "note cuhint", t.hint));
      if (here >= 0) {
        p.appendChild(h("p", undefined, t.places[here].d));
        if (openId(here)) {
          const b = h("button", "btn", t.enter);
          b.addEventListener("click", goIn);
          p.appendChild(b);
        } else p.appendChild(h("p", "note", t.soon));
      }
    }, false);
  render();

  const stop = closeUp(
    ".cuhint",
    {
      move: (x, y) => {
        mapState.hover = placeAt(x, y);
      },
      down: (x, y) => {
        const i = placeAt(x, y);
        if (i < 0 || mapState.route.length || i === mapState.at) return;
        sfx("click");
        travel(i);
        render();
      },
      key: (e) => {
        // Enter goes inside the place you are at; Space walks to the place under the pointer
        if (e.key === "Enter" && mapState.arrived >= 0 && !mapState.route.length && openId(mapState.arrived)) {
          if (!e.repeat) goIn();
          return true;
        }
        if (e.key !== " " && e.key !== "Enter") return false;
        const i = placeAt(pos.x, pos.y);
        if (i >= 0 && !e.repeat) {
          travel(i);
          render();
        }
        return true;
      },
    },
    pos,
  );
  onArrive(() => {
    sfx("good");
    render();
  });
  const exit = (): void => {
    stop();
    onArrive(null);
    game?.classList.remove("closeup");
  };
  function goIn(): void {
    const id = openId(mapState.arrived);
    if (!id || mapState.route.length) return;
    exit();
    visitPlace(id, () => explore(back));
  }
  setBack(() => {
    exit();
    back();
  });
}
