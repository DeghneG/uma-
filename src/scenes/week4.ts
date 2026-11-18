import gsap from "gsap";
import { field, fieldAtWeek, setScene } from "../art";
import { sfx } from "../sound";
import { computeSacks, patch, state } from "../state";
import { T, h, reduce, resultPanel, setLabel, shake, show, storyPanel, tweenField } from "../ui";

export function week4(next: () => void): void {
  setScene("field");
  fieldAtWeek(3);
  field.ben = state.nb;
  setLabel(() => T().hud.week(4));

  show((p) =>
    storyPanel(p, {
      tag: T().hud.week(4),
      h: T().w4.h,
      p: T().w4.p + (state.nb ? T().w4.nbYes : T().w4.nbNo),
      s: T().w4.s,
      quote: state.nb ? T().w4.benYes : T().w4.benNo,
      go: T().w4.go,
      onGo: game,
    }),
  );

  function game(): void {
    const zoneW = 20.5 + (state.nb ? 8 : 0);
    const zones = [28, 52, 40];
    let round = 0;
    let hits = 0;
    let pos = 0;
    let dir = 1;
    let last = 0;
    let raf = 0;
    let onKey: ((e: KeyboardEvent) => void) | null = null;
    field.working = true;

    const cleanup = (): void => {
      cancelAnimationFrame(raf);
      if (onKey) document.removeEventListener("keydown", onKey);
      onKey = null;
    };

    show((p) => {
      // The panel is rebuilt on language change: stop the old loop and key handler first.
      cleanup();
      last = 0;
      const t = T().w4;
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
        const inZone = pos >= zones[round] && pos <= zones[round] + zoneW;
        if (inZone) {
          hits++;
          sfx("cut");
        } else {
          sfx("bad");
          shake();
        }
        if (!reduce) gsap.fromTo(zone, { opacity: 0.4 }, { opacity: 1, duration: 0.25 });
        round++;
        tweenField({ cut: round }, 0.6);
        if (round >= 3) {
          cleanup();
          finish(3 - hits);
        } else {
          upd();
        }
      };
      onKey = (e: KeyboardEvent): void => {
        if (e.repeat) return; // holding Space must not cut every round
        if (e.code === "Space") {
          e.preventDefault();
          onHit();
        }
      };
      btn.addEventListener("click", onHit);
      document.addEventListener("keydown", onKey);
    });
  }

  function finish(hMist: number): void {
    field.working = false;
    patch({ hMist });
    const { sacks, mistakes } = computeSacks();
    patch({ sacks });
    const stars = hMist === 0 ? 3 : hMist === 1 ? 2 : 1;
    show((p) =>
      resultPanel(p, {
        stars,
        mistakes: hMist,
        extra: { text: T().res.sacksLine(sacks, mistakes), bad: sacks < 3 },
        btn: T().res.toMarket,
        onNext: next,
      }),
    );
  }
}
