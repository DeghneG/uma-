import { field, fieldAtWeek, setScene } from "../art";
import { sfx } from "../sound";
import { patch } from "../state";
import { T, h, resultPanel, setLabel, shake, show, starsFor, statusRow, storyPanel, tweenField } from "../ui";

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
      done.push(job);
      sfx("good");
      if (job === "weeds") tweenField({ weeds: 0 }, 1);
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
