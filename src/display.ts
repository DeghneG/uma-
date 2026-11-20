/** Screen modes: a smaller bordered window, a borderless window that fills the browser, and true full screen. */
export type DisplayMode = "windowed" | "borderless" | "fullscreen";
const KEY = "uma-display";
const ORDER: DisplayMode[] = ["windowed", "borderless", "fullscreen"];
let mode: DisplayMode = "borderless";
let lastWindow: DisplayMode = "borderless";
const game = (): HTMLElement => document.getElementById("game") as HTMLElement;

export const displayMode = (): DisplayMode => mode;

/** Scale the fixed 1920x1080 frame to the window (80% of it when windowed). */
export function fit(): void {
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080) * (mode === "windowed" ? 0.8 : 1);
  const g = game();
  g.style.setProperty("--s", String(s));
  g.classList.toggle("win", mode === "windowed");
}

function save(): void {
  try {
    localStorage.setItem(KEY, mode === "fullscreen" ? lastWindow : mode);
  } catch {
    /* storage blocked */
  }
}

export function setDisplay(m: DisplayMode): void {
  if (m !== "fullscreen") {
    lastWindow = m;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  } else if (!document.fullscreenElement) {
    // needs a user gesture; if the browser refuses, stay in the windowed mode we were in
    document.documentElement.requestFullscreen().catch(() => {
      mode = lastWindow;
      fit();
    });
  }
  mode = m;
  save();
  fit();
}

export function cycleDisplay(): DisplayMode {
  setDisplay(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]);
  return mode;
}

export function initDisplay(): void {
  try {
    const s = localStorage.getItem(KEY);
    if (s === "windowed" || s === "borderless") mode = lastWindow = s;
  } catch {
    /* storage blocked */
  }
  window.addEventListener("resize", fit);
  // leaving full screen with Esc or F11 drops back to the window mode we came from
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && mode === "fullscreen") {
      mode = lastWindow;
      fit();
    }
  });
  fit();
}
