import gsap from "gsap";
import { BUNDLE, field, fieldAtWeek, plantAt, pump, resetSow, seedsLeft, setScene, shears, snipWeeds, sow, weedsLeft } from "../art";
import { sfx } from "../sound";
import { patch } from "../state";
import { T, h, reduce, resultPanel, setLabel, shake, show, starsFor, statusRow, storyPanel, tweenField } from "../ui";

type Job = "weeds" | "water" | "plant";
const ORDER: Job[] = ["weeds", "water", "plant"];

export function week1(next: () => void): void {
  setScene("field");
  fieldAtWeek(0);
  setLabel(() => T().hud.week(1));

  show((p) =>
    storyPanel(p, {
      tag: T().hud.week(1),
      h: T().w1.h,
      p: T().w1.p,
      s: T().w1.s,
      quote: T().w1.ben,
      go: T().w1.go,
      onGo: puzzle,
    }),
  );

  let done: Job[] = [];
  let wrong = 0;
  let fb: { text: string; bad: boolean } | null = null;

  function puzzle(): void {
    done = [];
    wrong = 0;
    fb = null;
    field.working = true;
    draw(true);
  }

  function draw(animate: boolean): void {
    show((p) => {
      const t = T().w1;
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
    const t = T().w1;
    const expected = ORDER[done.length];
    if (job === expected) {
      if (job === "weeds") return weed();
      if (job === "water") return pumpJob();
      if (job === "plant") return plantJob();
    } else {
      wrong++;
      sfx("bad");
      shake();
      fb = { text: job === "water" ? t.bad.waterFirst : field.weeds > 0 ? t.bad.plantWeeds : t.bad.plantDry, bad: true };
    }
    draw(false);
  }

  /** Weeding is done by hand: equip the grass shears, then snip every clump (click, drag, or WASD + Space). */
  function weed(): void {
    const stop: (() => void)[] = [];
    const cleanup = (): void => {
      stop.splice(0).forEach((f) => f());
      document.getElementById("game")?.classList.remove("weeding");
    };

    const equip = (): void => {
      show((p) => {
        p.appendChild(h("h2", undefined, T().w1.shearsHead));
        p.appendChild(h("p", undefined, T().w1.shearsSay));
        const b = h("button", "btn", T().w1.shearsBtn);
        b.addEventListener("click", cut);
        p.appendChild(b);
      });
    };

    const cut = (): void => {
      setScene("weeding");
      if (!reduce) gsap.fromTo("#cv", { scale: 1.2, filter: "brightness(1.6)" }, { scale: 1, filter: "brightness(1)", duration: 0.5, ease: "power3.out", clearProps: "transform,filter" });
      shears.on = true;
      shears.snip = 0;
      shears.x = 320;
      shears.y = 240;
      field.working = true;
      sfx("good");
      document.getElementById("game")?.classList.add("weeding");
      const cv = document.getElementById("cv") as HTMLCanvasElement;
      let finished = false;
      const live = (): boolean => !!document.querySelector("#panel .weedhint");

      show((p) => {
        p.appendChild(h("h2", undefined, T().w1.cutHead));
        p.appendChild(h("p", "note weedhint", T().w1.cutHint));
        p.appendChild(statusRow([`${T().w1.weedsLeft}: ${weedsLeft()}`]));
      });

      const refresh = (): void => {
        const s = document.querySelector("#panel .status span");
        if (s) s.textContent = `${T().w1.weedsLeft}: ${weedsLeft()}`;
      };
      const snip = (r: number): void => {
        shears.snip = 1;
        gsap.to(shears, { snip: 0, duration: 0.18, ease: "power2.out", overwrite: true });
        const n = snipWeeds(shears.x, shears.y, r);
        if (n) sfx("cut");
        refresh();
        if (weedsLeft() === 0 && !finished) {
          finished = true;
          cleanup();
          setTimeout(() => {
            shears.on = false;
            setScene("field");
            if (!reduce) gsap.fromTo("#cv", { scale: 1.1 }, { scale: 1, duration: 0.5, ease: "power2.out", clearProps: "transform" });
            field.working = false;
            field.weeds = 0;
            done.push("weeds");
            sfx("good");
            fb = { text: T().w1.ok.weeds, bad: false };
            draw(true);
          }, 650);
        }
      };
      const at = (e: PointerEvent): void => {
        const r = cv.getBoundingClientRect();
        shears.x = Math.min(634, Math.max(4, ((e.clientX - r.left) / r.width) * 640));
        shears.y = Math.min(350, Math.max(150, ((e.clientY - r.top) / r.height) * 360));
      };
      const down = (e: PointerEvent): void => {
        if ((e.target as HTMLElement).closest("button")) return;
        if (!live()) return cleanup();
        at(e);
        snip(14);
      };
      const move = (e: PointerEvent): void => {
        if (!live()) return cleanup();
        at(e);
        if (e.buttons & 1) snip(11);
      };
      const key = (e: KeyboardEvent): void => {
        if (!live()) return cleanup();
        const k = e.key.toLowerCase();
        const step = 9;
        if (k === "a") shears.x = Math.max(4, shears.x - step);
        else if (k === "d") shears.x = Math.min(634, shears.x + step);
        else if (k === "w") shears.y = Math.max(150, shears.y - step);
        else if (k === "s") shears.y = Math.min(350, shears.y + step);
        else if (k === " " || k === "enter") {
          if (e.repeat) return;
          e.preventDefault();
          snip(16);
        } else return;
        if (k !== " " && k !== "enter") e.preventDefault();
      };
      window.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      document.addEventListener("keydown", key);
      stop.push(
        () => window.removeEventListener("pointerdown", down),
        () => window.removeEventListener("pointermove", move),
        () => document.removeEventListener("keydown", key),
      );
    };
    equip();
  }

  /** Shared plumbing for a close-up job: pointer position on the canvas, a liveness check, and clean-up. */
  type Handlers = {
    down?: (x: number, y: number) => void;
    move?: (x: number, y: number) => void;
    up?: (x: number, y: number) => void;
    key?: (e: KeyboardEvent, x: number, y: number) => boolean;
  };
  function closeUp(live: string, handlers: Handlers, pos: { x: number; y: number }): () => void {
    const cv = document.getElementById("cv") as HTMLCanvasElement;
    let off = false;
    const alive = (): boolean => {
      if (!off && !document.querySelector(live)) stop();
      return !off;
    };
    const xy = (e: PointerEvent): [number, number] => {
      const r = cv.getBoundingClientRect();
      pos.x = Math.min(634, Math.max(4, ((e.clientX - r.left) / r.width) * 640));
      pos.y = Math.min(350, Math.max(120, ((e.clientY - r.top) / r.height) * 360));
      return [pos.x, pos.y];
    };
    const d = (e: PointerEvent): void => {
      if ((e.target as HTMLElement).closest("button")) return;
      if (alive()) handlers.down?.(...xy(e));
    };
    const m = (e: PointerEvent): void => {
      if (alive()) handlers.move?.(...xy(e));
    };
    const u = (e: PointerEvent): void => {
      if (alive()) handlers.up?.(...xy(e));
    };
    const k = (e: KeyboardEvent): void => {
      if (!alive()) return;
      const step = 9;
      const key = e.key.toLowerCase();
      if (key === "a") pos.x = Math.max(4, pos.x - step);
      else if (key === "d") pos.x = Math.min(634, pos.x + step);
      else if (key === "w") pos.y = Math.max(120, pos.y - step);
      else if (key === "s") pos.y = Math.min(350, pos.y + step);
      else if (handlers.key?.(e, pos.x, pos.y)) {
        e.preventDefault();
        return;
      } else return;
      e.preventDefault();
      handlers.move?.(pos.x, pos.y);
    };
    window.addEventListener("pointerdown", d);
    window.addEventListener("pointermove", m);
    window.addEventListener("pointerup", u);
    document.addEventListener("keydown", k);
    function stop(): void {
      if (off) return;
      off = true;
      window.removeEventListener("pointerdown", d);
      window.removeEventListener("pointermove", m);
      window.removeEventListener("pointerup", u);
      document.removeEventListener("keydown", k);
      document.getElementById("game")?.classList.remove("grab", "planting");
    }
    return stop;
  }

  const zoomIn = (): void => {
    if (!reduce) gsap.fromTo("#cv", { scale: 1.2, filter: "brightness(1.6)" }, { scale: 1, filter: "brightness(1)", duration: 0.5, ease: "power3.out", clearProps: "transform,filter" });
  };
  const backToField = (): void => {
    setScene("field");
    if (!reduce) gsap.fromTo("#cv", { scale: 1.1 }, { scale: 1, duration: 0.5, ease: "power2.out", clearProps: "transform" });
  };
  /** A job is finished: show the whole field again, then the job list. */
  function jobDone(job: Job): void {
    backToField();
    field.working = false;
    done.push(job);
    sfx("good");
    if (job === "water") tweenField({ water: 1 }, 1.4);
    if (job === "plant") tweenField({ plant: 1 }, 1.2);
    fb = { text: T().w1.ok[job], bad: false };
    if (done.length === 3) return finish();
    draw(true);
  }

  /** Irrigation by hand: start the pump, watch the gauge, stop it inside the green zone. */
  function pumpJob(): void {
    setScene("pumping");
    zoomIn();
    pump.on = false;
    pump.level = 0;
    field.working = false;
    let msg: { text: string; bad: boolean } | null = null;
    let raf = 0;
    let last = 0;
    let busy = false;

    const render = (): void =>
      show((p) => {
        const t = T().w1;
        p.appendChild(h("h2", undefined, t.pumpHead));
        p.appendChild(h("p", "note pumphint", t.pumpHint));
        p.appendChild(statusRow([`${T().common.mistakes}: ${wrong}`]));
        if (msg) p.appendChild(h("p", `fb${msg.bad ? " bad" : ""}`, msg.text));
        const b = h("button", "btn", pump.on ? t.pumpStop : t.pumpStart);
        b.addEventListener("click", toggle);
        p.appendChild(b);
      }, false);

    const tick = (now: number): void => {
      if (!document.querySelector(".pumphint")) {
        pump.on = false;
        document.removeEventListener("keydown", onKey);
        return;
      }
      const dt = last ? Math.min(60, now - last) : 16;
      last = now;
      if (pump.on) pump.level = Math.min(1, pump.level + dt * 0.00011);
      raf = requestAnimationFrame(tick);
    };
    const toggle = (): void => {
      if (busy) return;
      if (!pump.on) {
        pump.on = true;
        msg = null;
        sfx("good");
        render();
        return;
      }
      pump.on = false;
      sfx("click");
      if (pump.level < pump.lo) {
        wrong++;
        sfx("bad");
        msg = { text: T().w1.tooLittle, bad: true };
      } else if (pump.level > pump.hi) {
        wrong++;
        sfx("bad");
        shake();
        msg = { text: T().w1.tooMuch, bad: true };
        busy = true;
        gsap.to(pump, { level: 0.25, duration: reduce ? 0 : 1.6, ease: "power1.inOut", onComplete: () => (busy = false) });
      } else {
        busy = true;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        setTimeout(() => jobDone("water"), 900);
        return render();
      }
      render();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat || (e.key !== " " && e.key !== "Enter")) return;
      if (!document.querySelector(".pumphint")) return;
      if ((e.target as HTMLElement | null)?.closest?.("button")) return; // a focused button handles its own key
      e.preventDefault();
      toggle();
    };
    document.addEventListener("keydown", onKey);
    render();
    raf = requestAnimationFrame(tick);
  }

  /** Planting by hand: pick a seedling from the bundle, drag it, and drop it on a mark in the mud. */
  function plantJob(): void {
    setScene("planting");
    zoomIn();
    resetSow();
    field.working = true;
    const game = document.getElementById("game");
    game?.classList.add("planting");
    let finished = false;
    const refresh = (): void => {
      const s = document.querySelector("#panel .status span");
      if (s) s.textContent = `${T().w1.seedsLeft}: ${seedsLeft()}`;
    };
    show((p) => {
      p.appendChild(h("h2", undefined, T().w1.sowHead));
      p.appendChild(h("p", "note sowhint", T().w1.sowHint));
      p.appendChild(statusRow([`${T().w1.seedsLeft}: ${seedsLeft()}`]));
    });
    const grab = (x: number, y: number): void => {
      if (sow.held || Math.hypot(x - BUNDLE.x, y - (BUNDLE.y - 6)) > 44) return;
      sow.held = true;
      game?.classList.add("grab");
      sfx("click");
    };
    const drop = (x: number, y: number): void => {
      if (!sow.held) return;
      sow.held = false;
      game?.classList.remove("grab");
      if (!plantAt(x, y)) return;
      sfx("cut");
      refresh();
      if (seedsLeft() === 0 && !finished) {
        finished = true;
        stop();
        sow.on = false;
        setTimeout(() => jobDone("plant"), 900);
      }
    };
    const stop = closeUp(
      ".sowhint",
      {
        down: grab,
        up: drop,
        key: (e, x, y) => {
          if (e.key !== " " && e.key !== "Enter") return false;
          if (e.repeat) return true;
          if (sow.held) drop(x, y);
          else grab(x, y);
          return true;
        },
      },
      sow,
    );
  }

  function finish(): void {
    field.working = false;
    patch({ wMist: Math.min(3, wrong) });
    show((p) =>
      resultPanel(p, {
        stars: starsFor(wrong),
        mistakes: wrong,
        btn: T().common.continue,
        onNext: next,
      }),
    );
  }
}
