/**
 * Month 3, livestock. The same shape as the earlier months: an order puzzle with a hands-on job each,
 * a choice about where the goats graze, a hard choice about the pig pen, a loading challenge, and selling.
 */
import gsap from "gsap";
import { setScene } from "../art";
import { liveAtWeek, lf } from "../livestockworld";
import { playLiveEggs, playLiveGoats, playLiveMilk, playLivePen } from "../livegames";
import { setReturnScene } from "../closeups";
import { sfx } from "../sound";
import { GOAL, LIVE_COOP, LIVE_FEE, LIVE_TRADER, addMoney, addMorale, computeLots, patch, peso, state } from "../state";
import { T, h, reduce, resultPanel, setLabel, shake, show, starsFor, statusRow, storyPanel } from "../ui";

const tweenLive = (vars: Record<string, number>, duration = 1): gsap.core.Tween => gsap.to(lf, { ...vars, duration: reduce ? 0 : duration, ease: "power1.inOut" });

function enterLive(week: number): void {
  setReturnScene("live");
  setScene("live");
  liveAtWeek(week);
  setLabel(() => T().hud.week3(week + 1));
}

/* ---------------- week 1: the morning round ---------------- */
type Job = "milk" | "eggs";
const ORDER: Job[] = ["milk", "eggs"];

export function live1(next: () => void): void {
  enterLive(0);
  patch({ ledger: [], monthStart: state.money, lMist1: 0, lMist2: 0, lMist3: 0, lMist4: 0, lbuf: 0, lcap: 6, lnb: false, lots: 0, soldLive: null });
  show((p) => storyPanel(p, { tag: T().hud.week3(1), h: T().live.w1.h, p: T().live.w1.p, s: T().live.w1.s, quote: T().live.w1.ben, go: T().live.w1.go, onGo: puzzle }));

  let done: Job[] = [];
  let wrong = 0;
  let handMist = 0;
  let fb: { text: string; bad: boolean } | null = null;

  function puzzle(): void {
    done = [];
    wrong = 0;
    handMist = 0;
    fb = null;
    lf.working = true;
    draw(true);
  }
  function draw(animate: boolean): void {
    show((p) => {
      const t = T().live.w1;
      p.appendChild(h("div", "tag", t.go));
      p.appendChild(h("h2", undefined, t.head));
      p.appendChild(h("p", "note", t.hint));
      p.appendChild(statusRow([`${t.left}: ${2 - done.length}`, `${T().common.mistakes}: ${wrong}`]));
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
    if (job === ORDER[done.length]) {
      const go = job === "milk" ? playLiveMilk : playLiveEggs;
      go((m) => jobDone(job, m));
      return;
    }
    wrong++;
    sfx("bad");
    shake();
    fb = { text: T().live.w1.bad.eggsFirst, bad: true };
    draw(false);
  }
  function jobDone(job: Job, m: number): void {
    done.push(job);
    handMist += m;
    sfx("good");
    if (job === "milk") tweenLive({ milk: 1 }, 1);
    else tweenLive({ eggs: 1 }, 1);
    fb = { text: T().live.w1.ok[job], bad: false };
    if (done.length === 2) return finish();
    draw(true);
  }
  function finish(): void {
    lf.working = false;
    const total = wrong + Math.floor(handMist / 2);
    patch({ lMist1: Math.min(3, total) });
    show((p) => resultPanel(p, { stars: starsFor(total), mistakes: total, btn: T().common.continue, onNext: next }));
  }
}

/* ---------------- week 2: hungry goats ---------------- */
/** Grass richness of each place to graze: roadside, Mang Ben's plot, the fallow paddy. */
const RICH = [0.45, 1, 0.75];

export function live2(next: () => void): void {
  enterLive(1);
  show((p) => storyPanel(p, { tag: T().hud.week3(2), h: T().live.w2.h, p: T().live.w2.p, s: T().live.w2.s, quote: T().live.w2.ben, go: T().live.w2.go, onGo: choose }));
  function choose(): void {
    show((p) => {
      const t = T().live.w2;
      p.appendChild(h("h2", undefined, t.go));
      p.appendChild(h("p", "note", t.hint));
      const grid = h("div", "cards");
      t.choices.forEach((c, idx) => {
        const b = h("button", "card", `<b>${c[0]}</b><small>${c[1]}</small>`);
        b.addEventListener("click", () => playLiveGoats((m) => apply(idx, m), RICH[idx]));
        grid.appendChild(b);
      });
      p.appendChild(grid);
    });
  }
  function apply(idx: number, m: number): void {
    if (idx === 1) addMoney(-300, "lgrass");
    else if (idx === 2) addMorale(-2);
    const mist = Math.min(3, m);
    patch({ lMist2: mist });
    sfx(mist ? "bad" : "good");
    tweenLive({ grass: 0.35 }, 1.2);
    show((p) => resultPanel(p, { stars: starsFor(mist), mistakes: mist, btn: T().common.continue, onNext: next }));
  }
}

/* ---------------- week 3: trouble in the pen ---------------- */
export function live3(next: () => void): void {
  enterLive(2);
  show((p) => storyPanel(p, { tag: T().hud.week3(3), h: T().live.w3.h, p: T().live.w3.p, s: T().live.w3.s, quote: T().live.w3.ben, go: T().live.w3.go, onGo: choose }));
  function choose(): void {
    show((p) => {
      const t = T().live.w3;
      p.appendChild(h("h2", undefined, t.go));
      const grid = h("div", "cards");
      t.choices.forEach((c, idx) => {
        const b = h("button", "card", `<b>${c[0]}</b><small>${c[1]}</small>`);
        b.addEventListener("click", () => playLivePen((m) => apply(idx, m)));
        grid.appendChild(b);
      });
      p.appendChild(grid);
    });
  }
  function apply(idx: number, m: number): void {
    if (idx === 0) {
      addMoney(-700, "lsupp");
      patch({ lbuf: 1 });
    } else if (idx === 1) {
      addMorale(5);
      patch({ lnb: true });
    } else {
      addMoney(500, "lpigs");
      addMorale(-3);
      patch({ lcap: 4 });
    }
    const mist = Math.min(3, m);
    patch({ lMist3: mist });
    sfx(mist ? "bad" : "good");
    tweenLive({ pen: 1 }, 1.2);
    show((p) => resultPanel(p, { stars: starsFor(mist), mistakes: mist, btn: T().common.continue, onNext: next }));
  }
}

/* ---------------- week 4: load the truck ---------------- */
export function live4(next: () => void): void {
  enterLive(3);
  const c = T().live.w4;
  show((p) => storyPanel(p, { tag: T().hud.week3(4), h: c.h, p: c.p + (state.lnb ? c.nbYes : c.nbNo), s: c.s, quote: state.lnb ? c.benYes : c.benNo, go: c.go, onGo: game }));

  function game(): void {
    const zoneW = 20.5 + (state.lnb ? 8 : 0);
    const zones = [28, 52, 40];
    let round = 0;
    let hits = 0;
    let pos = 0;
    let dir = 1;
    let last = 0;
    let raf = 0;
    let onKey: ((e: KeyboardEvent) => void) | null = null;
    lf.working = true;
    const cleanup = (): void => {
      cancelAnimationFrame(raf);
      if (onKey) document.removeEventListener("keydown", onKey);
      onKey = null;
    };
    show((p) => {
      cleanup();
      last = 0;
      const t = T().live.w4;
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
          sfx("thud");
        } else {
          sfx("bad");
          shake();
        }
        if (!reduce) gsap.fromTo(zone, { opacity: 0.4 }, { opacity: 1, duration: 0.25 });
        round++;
        tweenLive({ load: round / 3 }, 0.6);
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
  function finish(miss: number): void {
    lf.working = false;
    patch({ lMist4: miss });
    const { lots, mistakes } = computeLots();
    patch({ lots });
    const stars = miss === 0 ? 3 : miss === 1 ? 2 : 1;
    show((p) => resultPanel(p, { stars, mistakes: miss, extra: { text: T().live.res.lotsLine(lots, mistakes), bad: lots < 3 }, btn: T().live.res.toMarket, onNext: next }));
  }
}

/* ---------------- the market: sell the lots ---------------- */
export function liveMarket(next: () => void): void {
  setReturnScene("live");
  setScene("market");
  setLabel(() => `${T().hud.crops[2]} · ${T().live.market.tag}`);
  const sell = (amount: number, morale: number): void => {
    addMoney(amount, "lsale");
    addMorale(morale);
    patch({ soldLive: amount, monthsLeft: 2 });
    if (amount > 0) sfx("coin");
    next();
  };
  show((p) => {
    const t = T().live.market;
    p.appendChild(h("div", "tag", t.tag));
    p.appendChild(h("h2", undefined, t.h));
    if (state.lots <= 0) {
      p.appendChild(h("p", undefined, t.none));
      const b = h("button", "btn", T().common.continue);
      b.addEventListener("click", () => sell(0, -6));
      p.appendChild(b);
      return;
    }
    const trader = state.lots * LIVE_TRADER;
    const coop = state.lots * LIVE_COOP - LIVE_FEE;
    p.appendChild(h("p", undefined, t.p(state.lots)));
    p.appendChild(h("div", "quote", `<b>Mang Ben:</b> “${t.ben}”`));
    const grid = h("div", "cards");
    const a = t.trader(peso(trader));
    const m = t.mill(peso(coop), peso(LIVE_FEE));
    const b1 = h("button", "card", `<b>${a[0]}</b><small>${a[1]}</small>`);
    const b2 = h("button", "card", `<b>${m[0]}</b><small>${m[1]}</small>`);
    b1.addEventListener("click", () => sell(trader, -3));
    b2.addEventListener("click", () => sell(coop, 3));
    grid.append(b1, b2);
    p.appendChild(grid);
  });
}

/* ---------------- the month's summary ---------------- */
function table(rows: [string, string, boolean?][]): HTMLElement {
  const el = h("table", "ledger");
  rows.forEach(([k, v, total]) => el.appendChild(h("tr", total ? "total" : undefined, `<td>${k}</td><td>${v}</td>`)));
  return el;
}

export function liveSummary(next: () => void): void {
  setScene("market");
  setLabel(() => T().live.summary.tag);
  show((p) => {
    const t = T().live.summary;
    p.appendChild(h("div", "tag", t.tag));
    p.appendChild(h("h2", undefined, t.h));
    p.appendChild(h("h3", undefined, t.how));
    p.appendChild(
      table([
        [t.lines.week1, String(state.lMist1)],
        [t.lines.week2, String(state.lMist2)],
        [t.lines.week3, String(state.lMist3)],
        [t.lines.week4, String(state.lMist4)],
        [t.lines.lots, `${state.lots} / 6`],
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
