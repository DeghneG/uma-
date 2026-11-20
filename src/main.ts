import "./style.css";
import { fieldAtWeek, initArt, initPlayer } from "./art";
import { toggleSound } from "./sound";
import { armMusic, refreshMusic, setMood, type Mood } from "./music";
import { initDisplay } from "./display";
import { patch, resetGame, type Lang } from "./state";
import { $, initHud, initPanelInput, renderHud, rerender, setBack, setMode } from "./ui";
import { prologue, title } from "./scenes/intro";
import { week1 } from "./scenes/week1";
import { week2 } from "./scenes/week2";
import { week3 } from "./scenes/week3";
import { week4 } from "./scenes/week4";
import { market } from "./scenes/market";
import { summary } from "./scenes/summary";

const steps: ((next: () => void, back?: () => void) => void)[] = [title, prologue, week1, week2, week3, week4, market, summary];
const names = ["title", "prologue", "week1", "week2", "week3", "week4", "market", "summary"];
/** The score follows the story: warm at home, steady at work, tense in the dry spell, lively at the harvest. */
const MOOD: Record<string, Mood> = { title: "home", prologue: "home", week1: "work", week2: "work", week3: "tense", week4: "harvest", market: "market", summary: "reflect" };
// Dev shortcut: open /#week3 to start at that scene.
let i = Math.max(0, names.indexOf(location.hash.slice(1)));
const wk = /^week(\d)$/.exec(names[i]);
if (wk) fieldAtWeek(Number(wk[1]) - 1);

function run(): void {
  // story mode starts when the family goes to the field (week 1); the title and prologue have no stats bar
  setMode({ title: i === 0, story: i >= names.indexOf("week1") });
  setBack(null);
  setMood(MOOD[names[i]]);
  steps[i](
    () => {
      i++;
      if (i >= steps.length) {
        resetGame();
        i = 0;
      }
      run();
    },
    () => {
      i = 0;
      run();
    },
  );
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
  rerender();
}

let saved: Lang = "en";
try {
  if (localStorage.getItem("uma-lang") === "fil") saved = "fil";
} catch {
  /* storage blocked */
}

initDisplay();

// the glove cursor closes into a fist while the mouse button is held
{
  const game = document.getElementById("game");
  const press = (on: boolean) => (): void => void game?.classList.toggle("press", on);
  window.addEventListener("pointerdown", (e) => (e.button === 0 ? press(true)() : undefined));
  for (const ev of ["pointerup", "pointercancel", "blur"]) window.addEventListener(ev, press(false));
}

initPlayer();
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
run();
