import { field, fieldAtWeek, setScene } from "../art";
import { sfx } from "../sound";
import { addMoney, addMorale, patch } from "../state";
import { T, h, resultPanel, setLabel, shake, show, storyPanel, tweenPest } from "../ui";

type Tool = "hand" | "trap" | "spray";
const TOOLS: Tool[] = ["hand", "trap", "spray"];
/** rank 0 = best fix, 2 = worst, per pest (snails, rats, blight). */
const RANK: Record<Tool, number>[] = [
  { hand: 0, trap: 1, spray: 2 },
  { trap: 0, spray: 1, hand: 2 },
  { spray: 0, hand: 1, trap: 2 },
];
/** How much of the pest is left after a fix of each rank. */
const REMAINS = [0, 0.4, 0.85];

export function week2(next: () => void): void {
  setScene("field");
  fieldAtWeek(1);
  setLabel(() => T().hud.week(2));

  show((p) =>
    storyPanel(p, {
      tag: T().hud.week(2),
      h: T().w2.h,
      p: T().w2.p,
      s: T().w2.s,
      quote: T().w2.ben,
      go: T().w2.go,
      onGo: start,
    }),
  );

  let i = 0;
  let loss = 0;
  let mist = 0;
  let fb: { text: string; bad: boolean } | null = null;

  function start(): void {
    i = 0;
    loss = 0;
    mist = 0;
    fb = null;
    field.working = true;
    draw(true);
  }

  function draw(animate: boolean): void {
    show((p) => {
      const t = T().w2;
      const pest = t.pests[i];
      p.appendChild(h("div", "tag", t.go));
      p.appendChild(h("h2", undefined, pest.n));
      p.appendChild(h("p", undefined, pest.d));
      p.appendChild(h("p", "note", `${t.hint}  |  ${t.round} ${i + 1} / 3  |  ${T().common.mistakes}: ${mist}`));
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

  function pick(tool: Tool): void {
    const t = T().w2;
    const r = RANK[i][tool];
    if (tool === "hand") addMorale(-2);
    else if (tool === "trap") addMoney(-200, "traps");
    else addMoney(-500, "spray");
    loss += r;
    tweenPest(i, REMAINS[r]);
    if (r > 0) {
      mist++;
      sfx("bad");
      shake();
    } else {
      sfx("good");
    }
    fb = { text: `${t.r[r]} ${t.pests[i].tip}`, bad: r > 0 };
    i++;
    if (i >= 3) return finish();
    draw(false);
  }

  function finish(): void {
    field.working = false;
    patch({ pMist: mist });
    const stars = loss <= 1 ? 3 : loss <= 3 ? 2 : 1;
    show((p) =>
      resultPanel(p, {
        stars,
        mistakes: mist,
        note: fb?.text,
        btn: T().common.continue,
        onNext: next,
      }),
    );
  }
}
