import gsap from "gsap";
import { field, speakerAnchor, view } from "./art";
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
  $("back").textContent = t.start.menu.back;
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

/** A Back button at the top left (also Backspace or the left arrow). Pass null to hide it. */
let backFn: (() => void) | null = null;
const onBackKey = (e: KeyboardEvent): void => {
  if (e.key === "Backspace" || e.key === "ArrowLeft") {
    e.preventDefault();
    backFn?.();
  }
};
export function setBack(fn: (() => void) | null): void {
  backFn = fn;
  $("back").hidden = !fn;
  document.removeEventListener("keydown", onBackKey);
  if (fn) document.addEventListener("keydown", onBackKey);
}

/** Screen mode: the title screen has no panel or buttons bar; the stats bar only shows in story mode. */
export function setMode(m: { title: boolean; story: boolean }): void {
  $("game").classList.toggle("title", m.title);
  $("game").classList.toggle("story", m.story);
}

let lastMoney = state.money;
export function initHud(): void {
  $("back").addEventListener("click", () => {
    sfx("click");
    backFn?.();
  });
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

/* ---------- drawn shapes the stylesheet uses (komiks balloon tail, star burst, rating stars) ---------- */
const svgUrl = (w: number, h: number, body: string, crisp = true): string =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'${crisp ? " shape-rendering='crispEdges'" : ""}>${body}</svg>`)}")`;
const star = (cx: number, cy: number, outer: number, inner: number, points: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 ? inner : outer;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(" ");
};
function initShapes(): void {
  const ink = "#14110f";
  const rect = (x: number, y: number, w: number, hh: number, c: string): string => `<rect x='${x}' y='${y}' width='${w}' height='${hh}' fill='${c}'/>`;
  // stepped pixel tail, pointing down and to the left
  let tail = "";
  for (let r = 0; r < 11; r++) {
    const left = 2 - Math.round(r / 10);
    const right = 12 - r;
    if (right <= left) break;
    tail += rect(left - 1, r, 1, 1, ink) + rect(left, r, right - left, 1, "#fffdf4") + rect(right, r, 1, 1, ink);
  }
  tail += rect(0, 11, 2, 1, ink);
  const root = document.documentElement.style;
  root.setProperty("--tail-img", svgUrl(14, 12, tail));
  root.setProperty("--burst-img", svgUrl(48, 48, `<polygon points='${star(24, 24, 23, 15, 8)}' fill='#ffd23c' stroke='${ink}' stroke-width='3' stroke-linejoin='miter'/>`, false));
  root.setProperty("--star-on", svgUrl(24, 24, `<polygon points='${star(12, 13, 11, 4.6, 5)}' fill='#ffd23c' stroke='${ink}' stroke-width='1.6' stroke-linejoin='miter'/>`, false));
  root.setProperty("--star-off", svgUrl(24, 24, `<polygon points='${star(12, 13, 11, 4.6, 5)}' fill='#3a3530' stroke='${ink}' stroke-width='1.6' stroke-linejoin='miter'/>`, false));
  root.setProperty("--star-hud", svgUrl(24, 24, `<polygon points='${star(12, 13, 11, 4.6, 5)}' fill='#b3c4a8' stroke='${ink}' stroke-width='1.6'/>`, false));
  root.setProperty("--star-hud-on", svgUrl(24, 24, `<polygon points='${star(12, 13, 11, 4.6, 5)}' fill='#ffd23c' stroke='${ink}' stroke-width='1.6'/>`, false));
}
initShapes();

/* ---------- panel ---------- */
let builder: ((p: HTMLElement) => void) | null = null;
let host: HTMLElement | null = null;

const SPEAKERS = ["Tatay Bert", "Nanay Flor", "Mang Ben"];
/** "Tatay Bert: Five months..." or 'Mang Ben: "..."' as {who, text}, or null for plain narration. */
function parseSpeech(text: string): { who: string; text: string } | null {
  for (const who of SPEAKERS) {
    if (text.startsWith(who + ":")) return { who, text: text.slice(who.length + 1).trim().replace(/^[“"]\s*/, "").replace(/\s*[”"]$/, "") };
  }
  return null;
}
function balloon(who: string, text: string): HTMLElement {
  const b = h("div", "balloon");
  b.dataset.who = who;
  b.appendChild(h("span", "who", who));
  b.appendChild(h("p", undefined, text));
  return b;
}

/**
 * Sort whatever a scene put in the panel into komiks parts: narration and titles in a caption box (top left),
 * spoken lines in balloons pointing at the speaker, and everything the player acts on in a row along the bottom.
 */
function arrange(p: HTMLElement): void {
  const cap = h("div", "cap-zone");
  const say = h("div", "say-zone");
  const ask = h("div", "ask-zone");
  for (const el of [...p.children] as HTMLElement[]) {
    const cl = el.classList;
    if (cl.contains("tag")) continue; // the corner label already names the scene; no kicker above a heading
    if (cl.contains("quote")) {
      const s = parseSpeech(el.textContent ?? "");
      say.appendChild(balloon(s?.who ?? "Mang Ben", s?.text ?? (el.textContent ?? "")));
    } else if (el.tagName === "P" && !el.className) {
      const s = parseSpeech(el.textContent ?? "");
      if (s) say.appendChild(balloon(s.who, s.text));
      else cap.appendChild(el);
    } else if (["fb", "cards", "timing", "btn"].some((c) => cl.contains(c))) ask.appendChild(el);
    else cap.appendChild(el);
  }
  p.replaceChildren(...[cap, say, ask].filter((z) => z.childElementCount));
  p.classList.toggle("sheet", !!cap.querySelector(".ledger"));
  placeBalloons(p);
}

/** Put each balloon above its speaker with the tail pointing down at their head; keep clear of the caption and the choice row. */
function placeBalloons(p: HTMLElement): void {
  const cap = p.querySelector<HTMLElement>(".cap-zone");
  const ask = p.querySelector<HTMLElement>(".ask-zone");
  const askTop = ask ? ask.offsetTop : 1000;
  p.querySelectorAll<HTMLElement>(".balloon").forEach((b) => {
    const w = b.offsetWidth;
    const hh = b.offsetHeight;
    const a = speakerAnchor(b.dataset.who ?? "");
    let left = 64;
    let top = cap ? cap.offsetTop + cap.scrollHeight + 80 : 300;
    let tail = 20;
    if (!a && view.scene !== "title") {
      // an off-screen voice speaks from the empty sky at the top right, tail pointing off the right edge (keeps the scene clear)
      left = 1880 - w;
      top = 210;
      tail = w - 84;
      b.classList.add("flip");
    }
    if (a) {
      const x = a[0] * 3;
      const y = a[1] * 3;
      left = Math.min(Math.max(x - 30, 40), 1880 - w);
      top = y - hh - 64;
      tail = Math.min(Math.max(x - left - 4, 20), w - 76);
      if (cap) {
        const capBottom = cap.offsetTop + cap.scrollHeight;
        const clash = left < cap.offsetLeft + cap.offsetWidth + 20 && left + w > cap.offsetLeft && top < capBottom + 40 && top + hh > cap.offsetTop - 40;
        if (clash) top = capBottom + 70;
      }
    }
    top = Math.max(150, Math.min(top, askTop - 70 - hh));
    b.style.left = `${left}px`;
    b.style.top = `${top}px`;
    b.style.setProperty("--tail", `${tail}px`);
    b.style.transformOrigin = `${tail + (b.classList.contains("flip") ? 52 : 4)}px 100%`;
  });
}

/** The authored moment: caption slides in, balloons pop (komiks overshoot), choices rise from the bottom edge. */
function enter(p: HTMLElement): void {
  gsap.set(p, { autoAlpha: 1 });
  if (reduce) return;
  const e = "expo.out";
  gsap.from(p.querySelectorAll(".cap-zone > *"), { x: -50, autoAlpha: 0, duration: 0.5, stagger: 0.08, ease: e });
  gsap.from(p.querySelectorAll(".balloon"), { scale: 0.4, autoAlpha: 0, duration: 0.5, delay: 0.25, stagger: 0.15, ease: "back.out(2.2)" });
  gsap.from(p.querySelector(".ask-zone"), { y: 90, autoAlpha: 0, duration: 0.55, delay: 0.35, ease: e });
}

/** Render a scene builder into the story panel (or another host such as the title menu). */
export function show(build: (p: HTMLElement) => void, animate = true, into?: HTMLElement): void {
  builder = build;
  host = into ?? $("panel");
  const p = host;
  p.innerHTML = "";
  build(p);
  if (p.id === "panel") arrange(p);
  if (p.id === "panel" && animate) enter(p);
  else if (animate && !reduce) gsap.fromTo(p, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.35, clearProps: "transform" });
  else gsap.set(p, { autoAlpha: 1, y: 0 });
}
export function rerender(): void {
  if (builder) show(builder, false, host ?? undefined);
}

export function shake(): void {
  if (reduce) return;
  gsap.fromTo("#cv", { x: -6 }, { x: 0, duration: 0.45, ease: "elastic.out(1, 0.3)", clearProps: "transform" });
}

/* ---------- reusable pieces ---------- */
/** A row of small status chips (rounds left, mistakes so far...). */
export function statusRow(items: string[]): HTMLElement {
  const row = h("div", "status");
  for (const s of items) row.appendChild(h("span", undefined, s));
  return row;
}

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
  for (let i = 0; i < 3; i++) e.appendChild(h("span", i < n ? "on" : "off"));
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
