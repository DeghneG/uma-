import { COOP_FEE, COOP_MULT, SACK_PRICE, addMoney, addMorale, patch, peso, state } from "../state";
import { setScene, view } from "../art";
import { sfx } from "../sound";
import { T, h, setLabel, show } from "../ui";

export function market(next: () => void): void {
  setScene("market");
  view.sacks = state.sacks;
  setLabel(() => `${T().hud.month1} · ${T().market.tag}`);

  const sell = (amount: number, morale: number): void => {
    addMoney(amount, "sale");
    addMorale(morale);
    patch({ sold: amount, monthsLeft: 4 });
    if (amount > 0) sfx("coin");
    next();
  };

  show((p) => {
    const t = T().market;
    p.appendChild(h("div", "tag", t.tag));
    p.appendChild(h("h2", undefined, t.h));

    if (state.sacks <= 0) {
      p.appendChild(h("p", undefined, t.none));
      const b = h("button", "btn", T().common.continue);
      b.addEventListener("click", () => sell(0, -6));
      p.appendChild(b);
      return;
    }

    const trader = state.sacks * SACK_PRICE;
    const coop = Math.round(state.sacks * SACK_PRICE * COOP_MULT) - COOP_FEE;
    p.appendChild(h("p", undefined, t.p(state.sacks)));
    p.appendChild(h("div", "quote", `<b>Mang Ben:</b> “${t.ben}”`));
    const grid = h("div", "cards");
    const a = t.trader(peso(trader));
    const c = t.coop(peso(coop), peso(COOP_FEE));
    const b1 = h("button", "card", `<b>${a[0]}</b><small>${a[1]}</small>`);
    const b2 = h("button", "card", `<b>${c[0]}</b><small>${c[1]}</small>`);
    b1.addEventListener("click", () => sell(trader, -3));
    b2.addEventListener("click", () => sell(coop, 3));
    grid.append(b1, b2);
    p.appendChild(grid);
  });
}
