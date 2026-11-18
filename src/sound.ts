/** Tiny procedural sound effects (no audio files). Starts only after a user gesture. */
type Name = "click" | "good" | "bad" | "cut" | "coin" | "star";

let ctx: AudioContext | null = null;
let enabled = true;

try {
  enabled = localStorage.getItem("uma-sound") !== "off";
} catch {
  /* storage blocked: stay on */
}

export const soundOn = (): boolean => enabled;

export function toggleSound(): boolean {
  enabled = !enabled;
  try {
    localStorage.setItem("uma-sound", enabled ? "on" : "off");
  } catch {
    /* ignore */
  }
  return enabled;
}

export function audioCtx(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, endFreq?: number): void {
  const a = audioCtx();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function sfx(name: Name): void {
  if (!enabled) return;
  switch (name) {
    case "click":
      tone(520, 0.05, "square", 0.04);
      break;
    case "good":
      tone(523, 0.09, "square", 0.05);
      tone(784, 0.14, "square", 0.05, 0.08);
      break;
    case "bad":
      tone(220, 0.22, "sawtooth", 0.05, 0, 110);
      break;
    case "cut":
      tone(900, 0.08, "triangle", 0.06, 0, 300);
      break;
    case "coin":
      tone(988, 0.07, "square", 0.05);
      tone(1319, 0.2, "square", 0.05, 0.07);
      break;
    case "star":
      tone(660, 0.1, "triangle", 0.06);
      tone(880, 0.1, "triangle", 0.06, 0.1);
      tone(1175, 0.18, "triangle", 0.06, 0.2);
      break;
  }
}
