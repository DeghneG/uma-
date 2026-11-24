/** Tiny procedural sound effects (no audio files). Starts only after a user gesture. */
type Name = "click" | "good" | "bad" | "cut" | "coin" | "star" | "snip" | "rustle" | "plant";

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

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(a: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
/** A burst of filtered noise: crisp for scissors, soft for grass and mud. */
function noise(dur: number, vol: number, delay = 0, filter: BiquadFilterType = "lowpass", freq = 2000): void {
  const a = audioCtx();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const s = a.createBufferSource();
  s.buffer = noiseBuffer(a);
  const f = a.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(a.destination);
  s.start(t0);
  s.stop(t0 + dur + 0.02);
}

/** The water pump's engine: a low chugging rumble with a rattle, until it is switched off. */
let motor: { stop: () => void } | null = null;
export function setMotor(on: boolean): void {
  if (!on) {
    motor?.stop();
    motor = null;
    return;
  }
  if (motor || !enabled) return;
  const a = audioCtx();
  if (!a) return;
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, a.currentTime);
  out.gain.exponentialRampToValueAtTime(0.035, a.currentTime + 0.3);
  out.connect(a.destination);
  const chug = a.createGain();
  chug.gain.value = 0.55;
  chug.connect(out);
  const lfo = a.createOscillator();
  lfo.type = "square";
  lfo.frequency.value = 11;
  const lg = a.createGain();
  lg.gain.value = 0.42;
  lfo.connect(lg).connect(chug.gain);
  const low = a.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 460;
  low.connect(chug);
  const o1 = a.createOscillator();
  o1.type = "sawtooth";
  o1.frequency.value = 46;
  const o2 = a.createOscillator();
  o2.type = "square";
  o2.frequency.value = 23;
  o1.connect(low);
  o2.connect(low);
  // the rattle and the sound of water moving
  const n = a.createBufferSource();
  n.buffer = noiseBuffer(a);
  n.loop = true;
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 900;
  const ng = a.createGain();
  ng.gain.value = 0.16;
  n.connect(bp).connect(ng).connect(chug);
  for (const node of [o1, o2, lfo, n]) node.start();
  motor = {
    stop: () => {
      const t = a.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      for (const node of [o1, o2, lfo, n]) node.stop(t + 0.4);
    },
  };
  // the starter coughs once
  tone(90, 0.12, "sawtooth", 0.07, 0, 50);
  tone(120, 0.1, "square", 0.05, 0.14, 60);
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
    case "snip":
      // the blades close: two quick metallic ticks
      tone(2600, 0.035, "square", 0.035, 0, 1700);
      noise(0.05, 0.07, 0, "highpass", 3500);
      tone(2000, 0.03, "square", 0.025, 0.05, 1400);
      break;
    case "rustle":
      // grass tearing and falling
      noise(0.2, 0.1, 0.02, "lowpass", 2600);
      noise(0.12, 0.06, 0.12, "bandpass", 1200);
      tone(320, 0.07, "triangle", 0.035, 0.02, 120);
      break;
    case "plant":
      // a seedling pressed into soft mud: a squelch and a small pop
      noise(0.14, 0.11, 0, "lowpass", 650);
      tone(230, 0.12, "sine", 0.07, 0, 90);
      tone(560, 0.05, "sine", 0.04, 0.1, 320);
      break;
    case "star":
      tone(660, 0.1, "triangle", 0.06);
      tone(880, 0.1, "triangle", 0.06, 0.1);
      tone(1175, 0.18, "triangle", 0.06, 0.2);
      break;
  }
}
