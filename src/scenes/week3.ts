import { fieldAtWeek, setScene } from "../art";
import { sfx } from "../sound";
import { addMoney, addMorale, patch } from "../state";
import { T, h, setLabel, show, storyPanel } from "../ui";

export function week3(next: () => void): void {
  setScene("field");
  fieldAtWeek(2);
  setLabel(() => T().hud.week(3));

  show((p) =>
    storyPanel(p, {
      tag: T().hud.week(3),
      h: T().w3.h,
      p: T().w3.p,
      s: T().w3.s,
      quote: T().w3.ben,
      go: T().w3.go,
      onGo: choose,
    }),
  );

  function choose(): void {
    show((p) => {
      const t = T().w3;
      p.appendChild(h("h2", undefined, t.go));
      const grid = h("div", "cards");
      t.choices.forEach((c, idx) => {
        const b = h("button", "card", `<b>${c[0]}</b><small>${c[1]}</small>`);
        b.addEventListener("click", () => apply(idx));
        grid.appendChild(b);
      });
      p.appendChild(grid);
    });
  }

  function apply(idx: number): void {
    if (idx === 0) {
      addMoney(-800, "fuel");
      patch({ rbuf: 1 });
    } else if (idx === 1) {
      addMorale(5);
      patch({ nb: true });
    } else {
      addMoney(300, "fewer");
      addMorale(-3);
      patch({ rcap: 4 });
    }
    sfx("good");
    next();
  }
}
