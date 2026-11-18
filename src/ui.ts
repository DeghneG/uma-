import gsap from "gsap";
import { field } from "./art";
import { sfx, soundOn } from "./sound";
import { GOAL, onChange, peso, state } from "./state";
import { text, type Dict } from "./text";

export const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const T = (): Dict => text[state.lang];

export const $ = <E extends HTMLElement = HTMLElement>(id: string): E => document.getElementById(id) as E;

export function h(tag: keyof HTMLElementTagNameMap, cls?: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/* ---------- HUD ---------- */
const shown = { money: state.money, morale: state.morale };
let label: () => string = () => "";

export function setLabel(f: () => string): void {
  label = f;
  renderHud();
}

export function renderHud(): void {
  const t = T();
  const m = shown.money;
  $("g-l").textContent = t.hud.savings;
  $("g-v").textContent = `${peso(m)} / ${peso(GOAL)}`;
  $("g-b").style.width = `${Math.min(100, (m / GOAL) * 100)}%`;
  $("g-b").parentElement?.classList.toggle("done", state.money >= GOAL);
  $("g-s").textContent = state.money >= GOAL ? t.hud.reached : t.hud.needed(peso(GOAL - state.money));
  $("g-p").textContent = `${Math.min(100, Math.floor((m / GOAL) * 100))}%`;
  $("m-l").textContent = t.hud.morale;
  $("m-v").textContent = String(Math.round(shown.morale));
  $("m-b").style.width = `${shown.morale}%`;
  $("m-s").textContent = t.hud.moods[shown.morale >= 70 ? 2 : shown.morale >= 40 ? 1 : 0];
  // month tracker: five pips, the finished months filled and the current one blinking
  const cur = Math.min(5, Math.max(1, 6 - state.monthsLeft));
  $("mo-l").textContent = t.hud.month(cur, t.hud.crops[cur - 1]);
  $("mo-v").textContent = t.hud.left(state.monthsLeft);
  $("mo-s").textContent = cur < 5 ? `→ ${t.hud.crops[cur]}` : "";
  const pips = $("mo-p");
  while (pips.children.length < 5) pips.appendChild(document.createElement("i"));
  [...pips.children].forEach((p, i) => {
    p.className = i + 1 < cur ? "done" : i + 1 === cur ? "cur" : "";
  });
  $("lbl").textContent = label();
  $("title").textContent = t.title;
  $("subtitle").textContent = t.subtitle;
  $("snd").textContent = soundOn() ? t.hud.soundOn : t.hud.soundOff;
  $("snd").setAttribute("aria-pressed", String(soundOn()));
}

/** Tween the visible field (weeds cleared, water spreading, rows planted, harvest cut, pests). */
export function tweenField(vars: Record<string, number>, duration = 1): gsap.core.Tween {
  return gsap.to(field, { ...vars, duration: reduce ? 0 : duration, ease: "power1.inOut" });
}
export function tweenPest(i: number, to: number): void {
  gsap.to(field.pests, { [String(i)]: to, duration: reduce ? 0 : 0.7, ease: "power1.inOut" });
}

/** Click sound on any button in the panel, and number keys 1-9 pick the nth card. */
export function initPanelInput(): void {
  $("panel").addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("button")) sfx("click");
  });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1 || n > 9) return;
    const cards = [...document.querySelectorAll<HTMLButtonElement>("#panel .card")];
    const card = cards[n - 1];
    if (card && !card.disabled) card.click();
  });
}

/** The stats bar only shows in story mode (explore mode and the title screen have none). */
export function setStory(on: boolean): void {
  $("game").classList.toggle("story", on);
}

let lastMoney = state.money;
export function initHud(): void {
  onChange(() => {
    const d = state.money - lastMoney;
    lastMoney = state.money;
    if (d !== 0) {
      const el = $("g-d");
      el.textContent = `${d > 0 ? "+" : "−"}${peso(Math.abs(d))}`;
      el.className = `delta ${d > 0 ? "up" : "down"}`;
      gsap.fromTo(el, { opacity: 1, y: 0 }, { opacity: 0, y: -8, duration: reduce ? 0 : 1.4, delay: reduce ? 0.6 : 1, ease: "power1.in" });
    }
    gsap.to(shown, {
      money: state.money,
      morale: state.morale,
      duration: reduce ? 0 : 0.8,
      ease: "power2.out",
      onUpdate: renderHud,
    });
    renderHud();
  });
  renderHud();
}

/* ---------- panel ---------- */
let builder: ((p: HTMLElement) => void) | null = null;

export function show(build: (p: HTMLElement) => void, animate = true): void {
  builder = build;
  const p = $("panel");
  p.innerHTML = "";
  build(p);
  if (animate && !reduce) {
    gsap.fromTo(p, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.35, clearProps: "transform" });
  } else {
    gsap.set(p, { autoAlpha: 1, y: 0 });
  }
}
export function rerender(): void {
  if (builder) show(builder, false);
}

export function shake(): void {
  if (reduce) return;
  gsap.fromTo("#cv", { x: -6 }, { x: 0, duration: 0.45, ease: "elastic.out(1, 0.3)", clearProps: "transform" });
}

/* ---------- reusable pieces ---------- */
export function storyPanel(
  p: HTMLElement,
  o: { tag: string; h: string; p: string; s?: string; quote?: string; go: string; onGo: () => void },
): void {
  p.appendChild(h("div", "tag", o.tag));
  p.appendChild(h("h2", undefined, o.h));
  p.appendChild(h("p", undefined, o.p));
  if (o.quote) p.appendChild(h("div", "quote", `<b>Mang Ben:</b> “${o.quote}”`));
  if (o.s) p.appendChild(h("div", "struggle", `<b>${T().common.struggle}:</b> ${o.s}`));
  const b = h("button", "btn", o.go);
  b.addEventListener("click", o.onGo);
  p.appendChild(b);
}

export function starsEl(n: number): HTMLElement {
  const e = h("div", "stars");
  for (let i = 0; i < 3; i++) e.appendChild(h("span", undefined, i < n ? "★" : "☆"));
  if (!reduce) gsap.from(e.children, { scale: 0, duration: 0.35, stagger: 0.12, ease: "back.out(2.5)", delay: 0.15 });
  return e;
}

export function starsFor(mistakes: number): number {
  return mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
}

export function resultPanel(
  p: HTMLElement,
  o: { stars: number; mistakes: number; note?: string; extra?: { text: string; bad: boolean }; btn: string; onNext: () => void },
): void {
  const t = T();
  p.appendChild(h("h2", undefined, t.common.result));
  p.appendChild(starsEl(o.stars));
  p.appendChild(h("p", undefined, `${t.common.mistakes}: ${o.mistakes} → ${o.stars} ${t.common.stars}.`));
  if (o.note) p.appendChild(h("p", "fb", o.note));
  if (o.extra) p.appendChild(h("p", `fb${o.extra.bad ? " bad" : ""}`, o.extra.text));
  const b = h("button", "btn", o.btn);
  b.addEventListener("click", o.onNext);
  p.appendChild(b);
}
