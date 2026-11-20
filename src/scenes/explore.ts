import { setScene } from "../art";
import { closeUp, zoomIn } from "../closeups";
import { mapState, onArrive, placeAt, resetMap, travel } from "../mapworld";
import { sfx } from "../sound";
import { T, h, setBack, setLabel, show } from "../ui";

/** Explore mode: a map of the whole barrio. Click a place to walk there. (The places themselves open up later.) */
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
      p.appendChild(h("h2", undefined, here >= 0 && here !== 0 ? t.places[here].n : t.head));
      p.appendChild(h("p", "note cuhint", t.hint));
      if (here >= 0 && here !== 0) {
        p.appendChild(h("p", undefined, t.places[here].d));
        p.appendChild(h("p", "note", t.soon));
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
        // Space or Enter: go to the place under the pointer
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
  const leave = (): void => {
    stop();
    onArrive(null);
    game?.classList.remove("closeup");
    back();
  };
  setBack(leave);
}
