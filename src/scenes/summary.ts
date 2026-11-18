import { GOAL, START_MONEY, peso, state } from "../state";
import { setScene, view } from "../art";
import { T, h, setLabel, show } from "../ui";

function table(rows: [string, string, boolean?][]): HTMLElement {
  const el = h("table", "ledger");
  rows.forEach(([k, v, total]) => el.appendChild(h("tr", total ? "total" : undefined, `<td>${k}</td><td>${v}</td>`)));
  return el;
}

export function summary(next: () => void): void {
  setScene("market");
  view.sacks = 0;
  setLabel(() => T().summary.tag);

  show((p) => {
    const t = T().summary;
    p.appendChild(h("div", "tag", t.tag));
    p.appendChild(h("h2", undefined, t.h));

    p.appendChild(h("h3", undefined, t.how));
    p.appendChild(
      table([
        [t.lines.week1, String(Math.min(3, state.wMist))],
        [t.lines.week2, String(state.pMist)],
        [t.lines.week4, String(state.hMist)],
        [t.lines.sacks, `${state.sacks} / 5`],
      ]),
    );

    // Combine ledger entries by key so each line appears once.
    const sums = new Map<string, number>();
    state.ledger.forEach((e) => sums.set(e.key, (sums.get(e.key) ?? 0) + e.amount));
    const rows: [string, string, boolean?][] = [[t.lines.start, peso(START_MONEY)]];
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
