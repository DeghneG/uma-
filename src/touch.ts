/**
 * On-screen controls for phones and tablets: a joystick for W A S D and two buttons for E and Space.
 * They send ordinary key events, so every scene and close-up works unchanged.
 */
const KEYS: Record<string, { key: string; code: string }> = {
  w: { key: "w", code: "KeyW" },
  a: { key: "a", code: "KeyA" },
  s: { key: "s", code: "KeyS" },
  d: { key: "d", code: "KeyD" },
  e: { key: "e", code: "KeyE" },
  space: { key: " ", code: "Space" },
};
const send = (name: string, type: "keydown" | "keyup", repeat = false): void => {
  const k = KEYS[name];
  document.dispatchEvent(new KeyboardEvent(type, { key: k.key, code: k.code, repeat, bubbles: true, cancelable: true }));
};

export function initTouch(): void {
  const touchy = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  if (!touchy) return;
  document.documentElement.classList.add("is-touch");
  const game = document.getElementById("game");
  if (!game) return;

  const root = document.createElement("div");
  root.id = "touch";
  root.innerHTML = `<div class="joy" aria-label="Move"><i></i></div><button class="tb tb-e" aria-label="Interact (E)">E</button><button class="tb tb-a" aria-label="Action (Space)">OK</button>`;
  game.appendChild(root);

  // ---- joystick: eight directions from the thumb's offset, held keys repeat like a real keyboard
  const joy = root.querySelector<HTMLElement>(".joy") as HTMLElement;
  const knob = joy.querySelector("i") as HTMLElement;
  const down = new Set<string>();
  let timer = 0;
  let pid = -1;
  const press = (name: string, on: boolean): void => {
    if (on && !down.has(name)) {
      down.add(name);
      send(name, "keydown");
    } else if (!on && down.has(name)) {
      down.delete(name);
      send(name, "keyup");
    }
  };
  const aim = (e: PointerEvent): void => {
    const r = joy.getBoundingClientRect();
    const rad = r.width / 2;
    let nx = (e.clientX - (r.left + rad)) / rad;
    let ny = (e.clientY - (r.top + rad)) / rad;
    const len = Math.hypot(nx, ny);
    if (len > 1) {
      nx /= len;
      ny /= len;
    }
    knob.style.transform = `translate(${nx * 46}px, ${ny * 46}px)`;
    press("a", nx < -0.35);
    press("d", nx > 0.35);
    press("w", ny < -0.35);
    press("s", ny > 0.35);
  };
  const release = (): void => {
    pid = -1;
    knob.style.transform = "";
    for (const n of [...down]) press(n, false);
    window.clearInterval(timer);
    timer = 0;
  };
  joy.addEventListener("pointerdown", (e) => {
    pid = e.pointerId;
    joy.setPointerCapture(pid);
    aim(e);
    if (!timer) timer = window.setInterval(() => down.forEach((n) => send(n, "keydown", true)), 70);
    e.preventDefault();
  });
  joy.addEventListener("pointermove", (e) => {
    if (e.pointerId === pid) aim(e);
  });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) joy.addEventListener(ev, release);

  // ---- action buttons: hold E to keep spraying or fertilizing, tap OK to confirm
  const bind = (el: HTMLElement, name: string): void => {
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      el.classList.add("on");
      send(name, "keydown");
      e.preventDefault();
    });
    const up = (): void => {
      el.classList.remove("on");
      send(name, "keyup");
    };
    for (const ev of ["pointerup", "pointercancel"]) el.addEventListener(ev, up);
  };
  bind(root.querySelector(".tb-e") as HTMLElement, "e");
  bind(root.querySelector(".tb-a") as HTMLElement, "space");

  // ---- a gentle hint in portrait
  const rot = document.createElement("div");
  rot.id = "rotate";
  rot.innerHTML = "<b>↻</b><span>Turn your device sideways to play</span><small>Ikiling ang device para maglaro</small>";
  rot.addEventListener("pointerdown", () => rot.classList.add("gone"));
  document.body.appendChild(rot);
}
