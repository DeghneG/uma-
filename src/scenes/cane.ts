/**
 * Month 2, sugarcane. The same shape as the rice month: an order puzzle with a hands-on job each,
 * pests with a fix to pick and do by hand, a hard choice in a dry spell, a cutting challenge, and selling.
 */
import gsap from "gsap";
import { setScene } from "../art";
import { caneAtWeek, cf } from "../caneworld";
import { playMulch, playSetts, playTrace } from "../canegames";
import { playEggs, playRows, playSpray, playTraps, setReturnScene } from "../closeups";
import { enterMarket, stalledCount, startUnload, totalToUnload } from "../marketworld";
import { sfx } from "../sound";
import { GOAL, MILL_FEE, MILL_PRICE, TON_PRICE, addMoney, addMorale, computeTons, patch, peso, state } from "../state";
import { T, h, reduce, resultPanel, setLabel, shake, show, starsFor, statusRow, storyPanel } from "../ui";

const tweenCane = (vars: Record<string, number>, duration = 1): gsap.core.Tween => gsap.to(cf, { ...vars, duration: reduce ? 0 : duration, ease: "power1.inOut" });
const tweenPestCane = (i: number, to: number): void => void gsap.to(cf.pests, { [String(i)]: to, duration: reduce ? 0 : 0.7, ease: "power1.inOut" });

function enterCane(week: number): void {
  setReturnScene("cane");
  setScene("cane");
  caneAtWeek(week);
  setLabel(() => T().hud.week2(week + 1));
}

/* ---------------- week 1: prepare and plant ---------------- */
type Job = "furrow" | "feed" | "plant";
const ORDER: Job[] = ["furrow", "feed", "plant"];

export function cane1(next: () => void): void {
  enterCane(0);
  patch({ ledger: [], monthStart: state.money, cMist1: 0, cMist2: 0, cMist4: 0, cbuf: 0, ccap: 6, cnb: false, tons: 0, soldCane: null });
  show((p) => storyPanel(p, { tag: T().hud.week2(1), h: T().cane.w1.h, p: T().cane.w1.p, s: T().cane.w1.s, quote: T().cane.w1.ben, go: T().cane.w1.go, onGo: puzzle }));

  let done: Job[] = [];
  let wrong = 0;
  let fb: { text: string; bad: boolean } | null = null;

  function puzzle(): void {
    done = [];
    wrong = 0;
    fb = null;
    cf.working = true;
    draw(true);
  }
  function draw(animate: boolean): void {
    show((p) => {
      const t = T().cane.w1;
      p.appendChild(h("div", "tag", t.go));
      p.appendChild(h("h2", undefined, t.head));
      p.appendChild(h("p", undefined, t.intro));
      p.appendChild(h("p", "note", t.hint));
      p.appendChild(statusRow([`${t.left}: ${3 - done.length}`, `${T().common.mistakes}: ${wrong}`]));
      const grid = h("div", "cards nonum");
      ORDER.forEach((job) => {
        const b = h("button", "card", `<b>${t.jobs[job][0]}</b><small>${t.jobs[job][1]}</small>`) as HTMLButtonElement;
        b.disabled = done.includes(job);
        b.addEventListener("click", () => pick(job));
        grid.appendChild(b);
      });
      p.appendChild(grid);
      if (fb) p.appendChild(h("p", `fb${fb.bad ? " bad" : ""}`, fb.text));
    }, animate);
  }
  function pick(job: Job): void {
    const t = T().cane.w1;
    if (job === ORDER[done.length]) {
      const go = job === "furrow" ? (d: () => void) => playTrace("plow", d) : job === "feed" ? (d: () => void) => playTrace("fert", d) : playSetts;
      go(() => jobDone(job));
      return;
    }
    wrong++;
    sfx("bad");
    shake();
    fb = { text: job === "feed" ? t.bad.feedFirst : done.length === 0 ? t.bad.plantRaw : t.bad.plantUnfed, bad: true };
    draw(false);
  }
  function jobDone(job: Job): void {
    done.push(job);
    sfx("good");
    if (job === "furrow") tweenCane({ prep: 1 }, 1.4);
    if (job === "feed") tweenCane({ fert: 1 }, 1);
    if (job === "plant") tweenCane({ plant: 1, grow: 0.12 }, 1.2);
    fb = { text: T().cane.w1.ok[job], bad: false };
    if (done.length === 3) return finish();
    draw(true);
  }
  function finish(): void {
    cf.working = false;
    patch({ cMist1: Math.min(3, wrong) });
    show((p) => resultPanel(p, { stars: starsFor(wrong), mistakes: wrong, btn: T().common.continue, onNext: next }));
  }
}

/* ---------------- week 2: pests ---------------- */
type Tool = "hand" | "trap" | "spray";
const TOOLS: Tool[] = ["hand", "trap", "spray"];
/** rank 0 = best fix, 2 = worst, per pest (borer eggs, rats, aphids). */
const RANK: Record<Tool, number>[] = [
  { hand: 0, spray: 1, trap: 2 },
  { trap: 0, hand: 1, spray: 2 },
  { spray: 0, hand: 1, trap: 2 },
];
const REMAINS = [0, 0.4, 0.85];

export function cane2(next: () => void): void {
  enterCane(1);
  show((p) => storyPanel(p, { tag: T().hud.week2(2), h: T().cane.w2.h, p: T().cane.w2.p, s: T().cane.w2.s, quote: T().cane.w2.ben, go: T().cane.w2.go, onGo: start }));
  let i = 0;
  let loss = 0;
  let mist = 0;
  let fb: { text: string; bad: boolean } | null = null;

  function start(): void {
    i = 0;
    loss = 0;
    mist = 0;
    fb = null;
    cf.working = true;
    draw(true);
  }
  function draw(animate: boolean): void {
    show((p) => {
      const t = T().cane.w2;
      const pest = t.pests[i];
      p.appendChild(h("div", "tag", t.go));
      p.appendChild(h("h2", undefined, pest.n));
      p.appendChild(h("p", undefined, pest.d));
      p.appendChild(h("p", "note", t.hint));
      p.appendChild(statusRow([`${t.round} ${i + 1} / 3`, `${T().common.mistakes}: ${mist}`]));
      const grid = h("div", "cards");
      TOOLS.forEach((tool) => {
        const b = h("button", "card", `<b>${t.tools[tool][0]}</b><small>${t.tools[tool][1]}</small>`);
        b.addEventListener("click", () => pick(tool));
        grid.appendChild(b);
      });
      p.appendChild(grid);
      if (fb) p.appendChild(h("p", `fb${fb.bad ? " bad" : ""}`, fb.text));
    }, animate);
  }
  /** Each fix is done by hand in a close-up first; the result follows when the job is finished. */
  function pick(tool: Tool): void {
    const job = tool === "hand" ? (d: () => void) => playEggs(d, "cane") : tool === "trap" ? (d: () => void) => playTraps(d, "cane") : (d: () => void) => playSpray(d, "cane");
    job(() => apply(tool));
  }
  function apply(tool: Tool): void {
    const r = RANK[i][tool];
    if (tool === "hand") addMorale(-2);
    else if (tool === "trap") addMoney(-250, "ctraps");
    else addMoney(-600, "cspray");
    loss += r;
    tweenPestCane(i, REMAINS[r]);
    if (r > 0) {
      mist++;
      sfx("bad");
      shake();
    } else sfx("good");
    fb = { text: `${T().w2.r[r]} ${T().cane.w2.pests[i].tip}`, bad: r > 0 };
    i++;
    if (i >= 3) return finish();
    draw(false);
  }
  function finish(): void {
    cf.working = false;
    patch({ cMist2: mist });
    const stars = loss <= 1 ? 3 : loss <= 3 ? 2 : 1;
    show((p) => resultPanel(p, { stars, mistakes: mist, note: fb?.text, btn: T().common.continue, onNext: next }));
  }
}

/* ---------------- week 3: hungry ground ---------------- */
export function cane3(next: () => void): void {
  enterCane(2);
  show((p) => storyPanel(p, { tag: T().hud.week2(3), h: T().cane.w3.h, p: T().cane.w3.p, s: T().cane.w3.s, quote: T().cane.w3.ben, go: T().cane.w3.go, onGo: choose }));
  function choose(): void {
    show((p) => {
      const t = T().cane.w3;
      p.appendChild(h("h2", undefined, t.go));
      const grid = h("div", "cards");
      t.choices.forEach((c, idx) => {
        const b = h("button", "card", `<b>${c[0]}</b><small>${c[1]}</small>`);
        b.addEventListener("click", () => (idx === 0 ? (d: () => void) => playTrace("fert", d) : idx === 1 ? playMulch : (d: () => void) => playRows(d, true))(() => apply(idx)));
        grid.appendChild(b);
      });
      p.appendChild(grid);
    });
  }
  function apply(idx: number): void {
    if (idx === 0) {
      addMoney(-900, "cfert");
      patch({ cbuf: 1 });
    } else if (idx === 1) {
      addMorale(5);
      patch({ cnb: true });
    } else {
      addMoney(300, "cfewer");
      addMorale(-3);
      patch({ ccap: 4 });
    }
    sfx("good");
    tweenCane({ grow: 1 }, 1.2);
    next();
  }
}

/* ---------------- week 4: cutting day ---------------- */
export function cane4(next: () => void): void {
  enterCane(3);
  const c = T().cane.w4;
  show((p) => storyPanel(p, { tag: T().hud.week2(4), h: c.h, p: T().cane.w4.p + (state.cnb ? T().cane.w4.nbYes : T().cane.w4.nbNo), s: T().cane.w4.s, quote: state.cnb ? T().cane.w4.benYes : T().cane.w4.benNo, go: T().cane.w4.go, onGo: game }));

  function game(): void {
    const zoneW = 20.5 + (state.cnb ? 8 : 0);
    const zones = [28, 52, 40];
    let round = 0;
    let hits = 0;
    let pos = 0;
    let dir = 1;
    let last = 0;
    let raf = 0;
    let onKey: ((e: KeyboardEvent) => void) | null = null;
    cf.working = true;
    const cleanup = (): void => {
      cancelAnimationFrame(raf);
      if (onKey) document.removeEventListener("keydown", onKey);
      onKey = null;
    };
    show((p) => {
      cleanup();
      last = 0;
      const t = T().cane.w4;
      p.appendChild(h("div", "tag", t.go));
      p.appendChild(h("h2", undefined, t.h));
      p.appendChild(h("p", "note", t.hint));
      const info = h("div", "status");
      const track = h("div", "timing");
      const zone = h("div", "zone");
      const mark = h("div", "mark");
      track.append(zone, mark);
      const btn = h("button", "btn", t.tap);
      p.append(info, track, btn);
      const upd = (): void => {
        info.innerHTML = `<span>${t.round} ${round + 1} / 3</span><span>${t.hits}: ${hits}</span>`;
        zone.style.left = `${zones[round]}%`;
        zone.style.width = `${zoneW}%`;
      };
      upd();
      const tick = (now: number): void => {
        const dt = last ? Math.min(40, now - last) : 16;
        last = now;
        pos += dir * dt * 0.0616;
        if (pos >= 100) {
          pos = 100;
          dir = -1;
        }
        if (pos <= 0) {
          pos = 0;
          dir = 1;
        }
        mark.style.left = `calc(${pos}% - ${pos * 0.06}px)`;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      const onHit = (): void => {
        if (pos >= zones[round] && pos <= zones[round] + zoneW) {
          hits++;
          sfx("cut");
        } else {
          sfx("bad");
          shake();
        }
        if (!reduce) gsap.fromTo(zone, { opacity: 0.4 }, { opacity: 1, duration: 0.25 });
        round++;
        tweenCane({ cut: round / 3 }, 0.6);
        if (round >= 3) {
          cleanup();
          finish(3 - hits);
        } else upd();
      };
      onKey = (e: KeyboardEvent): void => {
        if (e.repeat) return;
        if (e.code === "Space") {
          e.preventDefault();
          onHit();
        }
      };
      btn.addEventListener("click", onHit);
      document.addEventListener("keydown", onKey);
    });
  }
  function finish(hMist: number): void {
    cf.working = false;
    patch({ cMist4: hMist });
    const { tons, mistakes } = computeTons();
    patch({ tons });
    const stars = hMist === 0 ? 3 : hMist === 1 ? 2 : 1;
    show((p) => resultPanel(p, { stars, mistakes: hMist, extra: { text: T().cane.res.tonsLine(tons, mistakes), bad: tons < 3 }, btn: T().cane.res.toMill, onNext: next }));
  }
}

/* ---------------- the mill: unload by hand, then sell ---------------- */
export function caneMarket(next: () => void): void {
  setReturnScene("cane");
  setScene("market");
  enterMarket(state.tons, "cane");
  setLabel(() => `${T().hud.crops[1]} · ${T().cane.market.tag}`);
  const sell = (amount: number, morale: number): void => {
    addMoney(amount, "csale");
    addMorale(morale);
    patch({ soldCane: amount, monthsLeft: 3 });
    if (amount > 0) sfx("coin");
    next();
  };
  const offers = (): void =>
    show((p) => {
      const t = T().cane.market;
      p.appendChild(h("div", "tag", t.tag));
      p.appendChild(h("h2", undefined, t.h));
      if (state.tons <= 0) {
        p.appendChild(h("p", undefined, t.none));
        const b = h("button", "btn", T().common.continue);
        b.addEventListener("click", () => sell(0, -6));
        p.appendChild(b);
        return;
      }
      const trader = state.tons * TON_PRICE;
      const mill = Math.round(state.tons * MILL_PRICE) - MILL_FEE;
      p.appendChild(h("p", undefined, t.p(state.tons)));
      p.appendChild(h("div", "quote", `<b>Mang Ben:</b> “${t.ben}”`));
      const grid = h("div", "cards");
      const a = t.trader(peso(trader));
      const m = t.mill(peso(mill), peso(MILL_FEE));
      const b1 = h("button", "card", `<b>${a[0]}</b><small>${a[1]}</small>`);
      const b2 = h("button", "card", `<b>${m[0]}</b><small>${m[1]}</small>`);
      b1.addEventListener("click", () => sell(trader, -3));
      b2.addEventListener("click", () => sell(mill, 3));
      grid.append(b1, b2);
      p.appendChild(grid);
    });
  if (state.tons <= 0) return offers();
  show((p) => {
    const t = T().cane.market;
    p.appendChild(h("h2", undefined, t.unloadHead));
    p.appendChild(h("p", "note mkhint", t.unloadHint));
    p.appendChild(statusRow([`${t.unloadLeft}: ${stalledCount()} / ${totalToUnload()}`]));
  });
  const stop = startUnload(
    () => {
      const s = document.querySelector("#panel .status span");
      if (s) s.textContent = `${T().cane.market.unloadLeft}: ${stalledCount()} / ${totalToUnload()}`;
    },
    () => {
      stop();
      offers();
    },
  );
}

/* ---------------- the month's summary ---------------- */
function table(rows: [string, string, boolean?][]): HTMLElement {
  const el = h("table", "ledger");
  rows.forEach(([k, v, total]) => el.appendChild(h("tr", total ? "total" : undefined, `<td>${k}</td><td>${v}</td>`)));
  return el;
}

export function caneSummary(next: () => void): void {
  setScene("market");
  setLabel(() => T().cane.summary.tag);
  show((p) => {
    const t = T().cane.summary;
    p.appendChild(h("div", "tag", t.tag));
    p.appendChild(h("h2", undefined, t.h));
    p.appendChild(h("h3", undefined, t.how));
    p.appendChild(
      table([
        [t.lines.week1, String(Math.min(3, state.cMist1))],
        [t.lines.week2, String(state.cMist2)],
        [t.lines.week4, String(state.cMist4)],
        [t.lines.tons, `${state.tons} / 6`],
      ]),
    );
    const sums = new Map<string, number>();
    state.ledger.forEach((e) => sums.set(e.key, (sums.get(e.key) ?? 0) + e.amount));
    const rows: [string, string, boolean?][] = [[t.lines.start, peso(state.monthStart)]];
    sums.forEach((amount, key) => rows.push([t.ledger[key] ?? key, (amount >= 0 ? "+" : "−") + peso(Math.abs(amount))]));
    rows.push([t.lines.savings, peso(state.money), true]);
    rows.push([t.lines.left, peso(Math.max(0, GOAL - state.money))]);
    p.appendChild(h("h3", undefined, t.money));
    p.appendChild(table(rows));
    p.appendChild(h("p", "note", t.next));
    const b = h("button", "btn alt", T().common.playAgain);
    b.addEventListener("click", next);
    p.appendChild(b);
  });
}
