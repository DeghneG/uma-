import { T } from "./ui";

/** Tiny pixel icons for the title cards between stages. */
const ICONS: Record<string, string> = {
  sprout: `<rect x="7" y="6" width="2" height="6" fill="#59b32f"/><rect x="4" y="4" width="3" height="2" fill="#7bd04a"/><rect x="9" y="3" width="3" height="2" fill="#7bd04a"/><rect x="3" y="10" width="10" height="2" fill="#6a4a22"/>`,
  sun: `<rect x="6" y="4" width="4" height="4" fill="#f2c94a"/><rect x="7" y="1" width="2" height="2" fill="#f2c94a"/><rect x="7" y="9" width="2" height="2" fill="#f2c94a"/><rect x="3" y="5" width="2" height="2" fill="#f2c94a"/><rect x="11" y="5" width="2" height="2" fill="#f2c94a"/><rect x="2" y="12" width="12" height="1" fill="#8a6a3a"/>`,
  grain: `<rect x="7" y="4" width="2" height="8" fill="#c9a43a"/><rect x="5" y="2" width="2" height="3" fill="#e6c04a"/><rect x="9" y="2" width="2" height="3" fill="#e6c04a"/><rect x="5" y="6" width="2" height="3" fill="#e6c04a"/><rect x="9" y="6" width="2" height="3" fill="#e6c04a"/>`,
  cane: `<rect x="5" y="3" width="2" height="9" fill="#8bd05a"/><rect x="9" y="1" width="2" height="11" fill="#6fbf46"/><rect x="5" y="6" width="2" height="1" fill="#3a6a22"/><rect x="9" y="5" width="2" height="1" fill="#3a6a22"/><rect x="2" y="3" width="3" height="1" fill="#59b32f"/><rect x="11" y="2" width="3" height="1" fill="#59b32f"/>`,
  truck: `<rect x="0" y="4" width="10" height="1" fill="#5a3a1a"/><rect x="0" y="5" width="10" height="4" fill="#a8703a"/><rect x="0" y="7" width="10" height="1" fill="#7a4a22"/><rect x="1" y="2" width="3" height="2" fill="#e8dcb0"/><rect x="5" y="2" width="3" height="2" fill="#e8dcb0"/><rect x="10" y="4" width="2" height="5" fill="#2d7a4c"/><rect x="12" y="6" width="3" height="3" fill="#2d7a4c"/><rect x="11" y="5" width="2" height="2" fill="#bfe6f4"/><rect x="0" y="9" width="15" height="1" fill="#3a3a3a"/><rect x="2" y="9" width="3" height="3" fill="#1c1c1c"/><rect x="3" y="10" width="1" height="1" fill="#9a9a9a"/><rect x="11" y="9" width="3" height="3" fill="#1c1c1c"/><rect x="12" y="10" width="1" height="1" fill="#9a9a9a"/>`,
  egg: `<rect x="3" y="9" width="10" height="3" fill="#c9a64a"/><rect x="6" y="3" width="5" height="7" fill="#f6efdc"/><rect x="7" y="2" width="3" height="1" fill="#f6efdc"/><rect x="7" y="4" width="1" height="3" fill="#ffffff"/>`,
  house: `<rect x="3" y="6" width="10" height="6" fill="#c9a06a"/><rect x="2" y="4" width="12" height="2" fill="#a8452d"/><rect x="4" y="2" width="8" height="2" fill="#a8452d"/><rect x="7" y="8" width="2" height="4" fill="#5a3a1a"/>`,
};

/** next scene name -> icon (the card's words live in text.ts under `trans`). */
const ICON_FOR: Record<string, string> = {
  week1: "sprout", week2: "sprout", week3: "sun", week4: "grain", market: "truck", summary: "house",
  live1: "egg", live2: "sprout", live3: "sun", live4: "egg", liveMarket: "truck", liveSummary: "house",
  cane1: "cane", cane2: "cane", cane3: "sun", cane4: "cane", cane5: "cane", caneMarket: "truck", caneSummary: "house",
};

const HOLD = 2600;
let busy = false;

/** A short title card between stages: fade to dark, say where the story goes next, then fade into it. Click, Enter or Space skips. */
export function transition(to: string, go: () => void): void {
  const words = T().trans[to];
  const game = document.getElementById("game");
  if (!words || !game || busy) return go();
  busy = true;
  const icon = ICON_FOR[to] ?? "sprout";
  const el = document.createElement("div");
  el.id = "trans";
  el.innerHTML = `<div class="tc"><svg viewBox="0 0 16 14" shape-rendering="crispEdges" class="ti ${icon}">${ICONS[icon]}</svg><div class="road"></div><h2>${words[0]}</h2><p>${words[1]}</p></div>`;
  game.appendChild(el);
  let done = false;
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finish();
    }
  };
  const finish = (): void => {
    if (done) return;
    done = true;
    document.removeEventListener("keydown", onKey, true);
    go(); // the next stage builds behind the dark card
    el.classList.remove("on");
    setTimeout(() => {
      el.remove();
      busy = false;
    }, 600);
  };
  document.addEventListener("keydown", onKey, true);
  el.addEventListener("click", finish);
  requestAnimationFrame(() => el.classList.add("on"));
  setTimeout(finish, HOLD + 500);
}
