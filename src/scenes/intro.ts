import gsap from "gsap";
import { addMorale, patch, state } from "../state";
import { setScene, view as artView } from "../art";
import { soundOn, sfx } from "../sound";
import { $, T, h, reduce, rerender, setLabel, show } from "../ui";

type Item = { label: string; run: () => void };

/** Dev shortcut /#intro plays the intro once; the Back button must not re-trigger it. */
let devIntro = location.hash === "#intro";

/** Title screen: logo and a two-item menu drawn over the scene, then the intro caption cards. */
export function title(next: () => void): void {
  setScene("title");
  artView.logoA = 1;
  patch({ monthsLeft: 5 });
  setLabel(() => "");
  let view: "main" | "settings" = "main";
  let sel = 0;
  let items: Item[] = [];

  const go = (v: "main" | "settings", pick = 0): void => {
    view = v;
    sel = pick;
    rerender();
  };

  const startGame = (): void => {
    leave();
    playIntro(next, () => title(next));
  };

  const build = (menu: HTMLElement): void => {
    const t = T();
    items =
      view === "main"
        ? [
            { label: t.start.menu.play, run: startGame },
            { label: t.start.menu.settings, run: () => go("settings") },
          ]
        : [
            {
              label: soundOn() ? t.hud.soundOn : t.hud.soundOff,
              run: () => {
                $("snd").click();
                rerender();
              },
            },
            {
              label: `${t.start.menu.language}: ${state.lang === "en" ? "English" : "Filipino"}`,
              run: () => $(state.lang === "en" ? "l-fil" : "l-en").click(),
            },
            { label: t.start.menu.back, run: () => go("main", 1) },
          ];
    items.forEach((it, k) => {
      const b = h("button", undefined, it.label);
      b.setAttribute("role", "menuitem");
      b.setAttribute("aria-selected", String(k === sel));
      b.addEventListener("mouseenter", () => {
        if (sel === k) return;
        sel = k;
        menu.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-selected", String(j === sel)));
      });
      b.addEventListener("click", () => {
        sfx("click");
        it.run();
      });
      menu.appendChild(b);
    });
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "ArrowDown" || e.key === "s") sel = (sel + 1) % items.length;
    else if (e.key === "ArrowUp" || e.key === "w") sel = (sel + items.length - 1) % items.length;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      sfx("click");
      items[sel].run();
      return;
    } else if (/^[1-9]$/.test(e.key) && items[Number(e.key) - 1]) {
      sel = Number(e.key) - 1;
      sfx("click");
      items[sel].run();
      return;
    } else return;
    e.preventDefault();
    $("menu")
      .querySelectorAll("button")
      .forEach((x, j) => x.setAttribute("aria-selected", String(j === sel)));
  };
  document.addEventListener("keydown", onKey);

  function leave(): void {
    document.removeEventListener("keydown", onKey);
    $("menu").innerHTML = "";
  }

  show(build, true, $("menu"));
  // dev shortcut: /#intro plays the intro cards straight away
  if (devIntro) {
    devIntro = false;
    queueMicrotask(startGame);
  }
}

/** Story intro as full-screen caption cards over a darkened scene. Click or Space advances, Esc skips. */
function playIntro(done: () => void, back: () => void): void {
  const game = $("game");
  const box = $("intro");
  const t = T().start;
  let k = -1;
  let timer: gsap.core.Tween | null = null;
  let finished = false;

  const card = (n: number): void => {
    box.innerHTML = "";
    const last = n >= t.beats.length;
    const el = h("div", last ? "head" : "line", last ? t.h : t.beats[n]);
    box.appendChild(el);
    box.appendChild(h("div", "skip", t.skip));
    const bk = h("button", "back", t.menu.back);
    bk.addEventListener("click", (e) => {
      e.stopPropagation();
      goBack();
    });
    box.appendChild(bk);
    if (last) box.appendChild(h("div", "hint", t.press));
    gsap.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: reduce ? 0 : 0.7 });
    if (!last) timer = gsap.delayedCall(4, advance);
  };

  function advance(): void {
    if (finished) return;
    timer?.kill();
    k++;
    if (k > t.beats.length) finish();
    else card(k);
  }

  function goBack(): void {
    if (finished) return;
    gsap.to(artView, { logoA: 1, duration: reduce ? 0 : 0.6 });
    finish(back);
  }

  function finish(then: () => void = done): void {
    if (finished) return;
    finished = true;
    timer?.kill();
    document.removeEventListener("click", advance);
    document.removeEventListener("keydown", onKey);
    gsap.to(box, {
      backgroundColor: "rgba(5,9,7,0)",
      duration: reduce ? 0 : 0.6,
      onComplete: () => {
        game.classList.remove("intro-on");
        box.innerHTML = "";
        box.style.backgroundColor = "";
        then();
      },
    });
    gsap.to(box.children, { autoAlpha: 0, duration: reduce ? 0 : 0.4 });
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") finish();
    else if (e.key === "Backspace" || e.key === "ArrowLeft") {
      e.preventDefault();
      goBack();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      advance();
    }
  }

  game.classList.add("intro-on");
  gsap.to(artView, { logoA: 0, duration: reduce ? 0 : 0.8 });
  gsap.fromTo(box, { backgroundColor: "rgba(5,9,7,0)" }, { backgroundColor: "rgba(5,9,7,0.84)", duration: reduce ? 0 : 0.9, onComplete: advance });
  // attach input a beat later so the click or Enter that started the game does not skip a card
  setTimeout(() => {
    if (finished) return;
    document.addEventListener("click", advance);
    document.addEventListener("keydown", onKey);
  }, 400);
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
