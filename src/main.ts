import "./style.css";
import { fieldAtWeek, initArt } from "./art";
import { toggleSound } from "./sound";
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
// Dev shortcut: open /#week3 to start at that scene.
let i = Math.max(0, names.indexOf(location.hash.slice(1)));
const wk = /^week(\d)$/.exec(names[i]);
if (wk) fieldAtWeek(Number(wk[1]) - 1);

function run(): void {
  // story mode starts when the family goes to the field (week 1); the title and prologue have no stats bar
  setMode({ title: i === 0, story: i >= names.indexOf("week1") });
  setBack(null);
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

/** The game is a fixed 1920x1080 frame; scale it to fit the window and letterbox the rest. */
function fit(): void {
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  $("game").style.setProperty("--s", String(s));
}
window.addEventListener("resize", fit);
fit();

initArt($<HTMLCanvasElement>("cv"));
initHud();
initPanelInput();
$("l-en").addEventListener("click", () => setLang("en"));
$("l-fil").addEventListener("click", () => setLang("fil"));
$("snd").addEventListener("click", () => {
  toggleSound();
  renderHud();
});
setLang(saved);
run();
