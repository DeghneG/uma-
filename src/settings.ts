/**
 * The in-game settings: a gear button opens a small calm panel with sound, music, language, screen mode and Resume.
 * The loud header controls are gone from the game; they live only here and on the title screen.
 */
import { cycleDisplay, displayMode } from "./display";
import { musicOn, toggleMusic } from "./music";
import { soundOn } from "./sound";
import { $, T, rerender } from "./ui";
import { state } from "./state";

/** A pixel-art gear, drawn once as a data URI. */
function gearImage(): string {
  const N = 16;
  let rects = "";
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const d = Math.hypot(dx, dy);
      const tooth = d > 5.4 && d < 7.6 && Math.cos(Math.atan2(dy, dx) * 8) > 0.35;
      const body = d <= 5.6 && d >= 2.4;
      if (tooth || body) rects += `<rect x='${x}' y='${y}' width='1' height='1'/>`;
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 16 16' shape-rendering='crispEdges' fill='#f1eee0'>${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function initSettings(): void {
  const game = $("game");
  const gear = $("gear");
  gear.style.setProperty("--gear", gearImage());
  const box = document.createElement("div");
  box.id = "settings";
  box.className = "settings";
  box.innerHTML = `<div class="sbox" role="dialog" aria-modal="true"><h3 id="s-title"></h3><div class="slist" id="s-list"></div></div>`;
  game.appendChild(box);

  const items = (): { label: string; run: () => void }[] => {
    const t = T();
    return [
      { label: soundOn() ? t.hud.soundOn : t.hud.soundOff, run: () => $("snd").click() },
      { label: musicOn() ? t.hud.musicOn : t.hud.musicOff, run: () => toggleMusic() },
      { label: `${t.start.menu.language}: ${state.lang === "en" ? "English" : "Filipino"}`, run: () => $(state.lang === "en" ? "l-fil" : "l-en").click() },
      { label: `${t.hud.screen}: ${t.hud.screenModes[displayMode()]}`, run: () => cycleDisplay() },
      { label: t.common.resume, run: () => close() },
    ];
  };
  const render = (): void => {
    $("s-title").textContent = T().start.menu.settings;
    const list = $("s-list");
    list.replaceChildren();
    items().forEach((it, i) => {
      const b = document.createElement("button");
      b.textContent = it.label;
      b.className = i === 4 ? "s-resume" : "";
      b.addEventListener("click", () => {
        it.run();
        if (box.classList.contains("open")) render();
      });
      list.appendChild(b);
    });
  };
  function open(): void {
    render();
    box.classList.add("open");
    (box.querySelector("button") as HTMLElement | null)?.focus();
  }
  function close(): void {
    box.classList.remove("open");
    rerender();
  }
  gear.addEventListener("click", () => (box.classList.contains("open") ? close() : open()));
  box.addEventListener("pointerdown", (e) => {
    if (e.target === box) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && box.classList.contains("open")) close();
  });
}
