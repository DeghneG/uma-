import "./style.css";
import { fieldAtWeek, initArt, initPlayer } from "./art";
import { toggleSound } from "./sound";
import { armMusic, refreshMusic, setMood, type Mood } from "./music";
import { initDisplay } from "./display";
import { initTouch } from "./touch";
import { initSettings } from "./settings";
import { transition } from "./transition";
import { setMotor, stopHolds } from "./sound";
import { T } from "./ui";
import { applySave, clearSave, patch, readSave, resetGame, saveGame, state, type Lang } from "./state";
import { $, initHud, initPanelInput, renderHud, rerender, setBack, setMode } from "./ui";
import { prologue, setContinue, title } from "./scenes/intro";
import { week1 } from "./scenes/week1";
import { week2 } from "./scenes/week2";
import { week3 } from "./scenes/week3";
import { week4 } from "./scenes/week4";
import { market } from "./scenes/market";
import { summary } from "./scenes/summary";
import { cane1, cane2, cane3, cane4, cane5, caneMarket, caneSummary } from "./scenes/cane";
import { caneAtWeek } from "./caneworld";
import { live1, live2, live3, live4, liveMarket, liveSummary } from "./scenes/live";
import { liveAtWeek } from "./livestockworld";

const steps: ((next: () => void, back?: () => void) => void)[] = [title, prologue, week1, week2, week3, week4, market, summary, cane1, cane2, cane3, cane4, cane5, caneMarket, caneSummary, live1, live2, live3, live4, liveMarket, liveSummary];
const names = ["title", "prologue", "week1", "week2", "week3", "week4", "market", "summary", "cane1", "cane2", "cane3", "cane4", "cane5", "caneMarket", "caneSummary", "live1", "live2", "live3", "live4", "liveMarket", "liveSummary"];
/** The score follows the story: warm at home, steady at work, tense in the dry spell, lively at the harvest. */
const MOOD: Record<string, Mood> = { title: "home", prologue: "home", week1: "work", week2: "work", week3: "tense", week4: "harvest", market: "market", summary: "reflect", cane1: "work", cane2: "work", cane3: "tense", cane4: "harvest", cane5: "work", caneMarket: "market", caneSummary: "reflect", live1: "work", live2: "work", live3: "tense", live4: "harvest", liveMarket: "market", liveSummary: "reflect" };
// Dev shortcut: open /#week3 to start at that scene.
const devJump = location.hash.length > 1;
let i = Math.max(0, names.indexOf(location.hash.slice(1)));
/** Dev jumps and the Skip button: put the world in the state the target scene expects. */
function prepare(name: string): void {
  const wk = /^week(d)$/.exec(name);
  if (wk) fieldAtWeek(Number(wk[1]) - 1);
  if (name === "market" && state.sacks === 0) patch({ sacks: 4 }); // bring some sacks to sell
  const ck = /^cane(d)$/.exec(name);
  if (ck) {
    caneAtWeek(Number(ck[1]) - 1);
    patch({ monthsLeft: 4 });
  }
  const lv = /^live(d)$/.exec(name);
  if (lv) liveAtWeek(Number(lv[1]) - 1);
  if (/^live/.test(name) && state.monthsLeft > 3) patch({ monthsLeft: 3 });
  if (name === "liveMarket" || name === "liveSummary") {
    if (state.lots === 0) patch({ lots: 4 }); // bring some goods
  }
  if ((name === "cane5" || name === "caneMarket" || name === "caneSummary") && state.tons === 0) patch({ tons: 4, monthsLeft: 4 }); // bring some cane
}
prepare(names[i]);
let runId = 0;

function run(): void {
  // story mode starts when the family goes to the field (week 1); the title and prologue have no stats bar
  setMode({ title: i === 0, story: i >= names.indexOf("week1") });
  setBack(null);
  setMood(MOOD[names[i]]);
  // progress is kept in this browser: each week starts from a saved state (dev jumps are not saved)
  if (!devJump && i >= names.indexOf("week1")) saveGame(names[i]);
  const id = ++runId;
  updateSkip();
  steps[i](
    () => {
      if (id !== runId) return; // this scene was skipped past
      i++;
      if (i >= steps.length) {
        resetGame();
        clearSave();
        i = 0;
        run();
        return;
      }
      // a short title card carries the story from one stage to the next
      transition(names[i], run);
    },
    () => {
      i = 0;
      run();
    },
  );
}

/** Skip button for testing: jump straight to the next scene, from anywhere (even inside a close-up). */
function updateSkip(): void {
  const b = document.getElementById("skip");
  if (b) b.textContent = T().common.skip + " >>";
  const p = document.getElementById("prev");
  if (p) p.textContent = "<< " + T().common.prev;
}
function skip(delta = 1): void {
  const card = document.getElementById("trans");
  if (card) {
    card.click(); // a title card: let it finish
    if (delta > 0) return;
  }
  runId++; // anything the old scene still has pending is ignored
  setMotor(false);
  stopHolds();
  document.getElementById("game")?.classList.remove("closeup", "grab", "nocursor", "planting");
  document.querySelector(".cuhint")?.remove();
  if (i + delta >= steps.length || i + delta < 0) return;
  i += delta;
  prepare(names[i]);
  run();
}
{
  const b = document.createElement("button");
  b.id = "skip";
  b.type = "button";
  b.addEventListener("click", () => skip(1));
  document.getElementById("game")?.appendChild(b);
  // and one to go back a scene (state such as money is kept as it was)
  const pv = document.createElement("button");
  pv.id = "prev";
  pv.type = "button";
  pv.addEventListener("click", () => skip(-1));
  document.getElementById("game")?.appendChild(pv);
}

function setLang(lang: Lang): void {
  patch({ lang });
  document.documentElement.lang = lang === "en" ? "en" : "fil";
  $("l-en").setAttribute("aria-pressed", String(lang === "en"));
  $("l-fil").setAttribute("aria-pressed", String(lang === "fil"));
  try {
    localStorage.setItem("uma-lang", lang);
  } catch {
    /* storage blocked */
  }
  renderHud();
  updateSkip();
  rerender();
}

let saved: Lang = "en";
try {
  if (localStorage.getItem("uma-lang") === "fil") saved = "fil";
} catch {
  /* storage blocked */
}

/** Continue from the saved scene with the saved money, morale and choices. */
setContinue(() => {
  const s = readSave();
  if (!s) return;
  applySave(s);
  i = Math.max(names.indexOf("week1"), names.indexOf(s.step));
  run();
});
initDisplay();

// the glove cursor closes into a fist while the mouse button is held
{
  const game = document.getElementById("game");
  const press = (on: boolean) => (): void => void game?.classList.toggle("press", on);
  window.addEventListener("pointerdown", (e) => (e.button === 0 ? press(true)() : undefined));
  for (const ev of ["pointerup", "pointercancel", "blur"]) window.addEventListener(ev, press(false));
}

initPlayer();
initTouch();
armMusic();
initArt($<HTMLCanvasElement>("cv"));
initHud();
initPanelInput();
$("l-en").addEventListener("click", () => setLang("en"));
$("l-fil").addEventListener("click", () => setLang("fil"));
$("snd").addEventListener("click", () => {
  toggleSound();
  refreshMusic();
  renderHud();
});
setLang(saved);
initSettings();
run();
