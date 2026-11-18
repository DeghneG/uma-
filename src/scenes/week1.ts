import gsap from "gsap";
import { field, fieldAtWeek, setScene, shears, snipWeeds, weedsLeft } from "../art";
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
      const grid = h("div", "cards");
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
      done.push(job);
      sfx("good");
      if (job === "water") tweenField({ water: 1 }, 1.4);
      if (job === "plant") tweenField({ plant: 1 }, 1.2);
      fb = { text: t.ok[job], bad: false };
      if (done.length === 3) return finish();
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
      cv.addEventListener("pointerdown", down);
      cv.addEventListener("pointermove", move);
      document.addEventListener("keydown", key);
      stop.push(
        () => cv.removeEventListener("pointerdown", down),
        () => cv.removeEventListener("pointermove", move),
        () => document.removeEventListener("keydown", key),
      );
    };
    equip();
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
