import { addMorale, patch } from "../state";
import { setScene } from "../art";
import { T, h, setLabel, show } from "../ui";

export function title(next: () => void): void {
  setScene("home");
  patch({ monthsLeft: 5 });
  setLabel(() => "");
  show((p) => {
    const t = T();
    p.appendChild(h("h2", undefined, t.start.h));
    p.appendChild(h("p", undefined, t.start.p));
    p.appendChild(h("p", "note", t.start.note));
    const b = h("button", "btn", t.start.begin);
    b.addEventListener("click", next);
    p.appendChild(b);
  });
}

export function prologue(next: () => void): void {
  setScene("home");
  setLabel(() => T().prologue.tag);
  show((p) => {
    const t = T().prologue;
    p.appendChild(h("div", "tag", t.tag));
    p.appendChild(h("h2", undefined, t.h));
    p.appendChild(h("p", undefined, t.p));
    const cards = h("div", "cards");

    const help = h("button", "card", `<span class="kind">${t.helpTag}</span><b>${t.help[0]}</b><small>${t.help[1]}</small>`);
    help.addEventListener("click", () => {
      addMorale(10);
      next();
    });
    const explore = h("button", "card", `<span class="kind ex">${t.exploreTag}</span><b>${t.explore[0]}</b><small>${t.explore[1]}</small><small><b>${t.soon}</b></small>`);
    (explore as HTMLButtonElement).disabled = true;

    cards.appendChild(help);
    cards.appendChild(explore);
    p.appendChild(cards);
  });
}
