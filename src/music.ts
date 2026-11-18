/**
 * Generative background music, composed in code (no audio files). Visayan rural sound:
 * a plucked ukulele-style arpeggio in 3/4 (the time of the kuratsa and the harana), a soft bamboo-flute
 * melody, quiet shakers, and low gongs and a drone for the tense scenes. The mood follows the story.
 * Starts only after a user gesture, obeys the Sound toggle plus its own Music setting, and pauses in a hidden tab.
 */
import { audioCtx, soundOn } from "./sound";

export type Mood = "home" | "work" | "tense" | "harvest" | "market" | "reflect";

interface Chord {
  root: number;
  minor: boolean;
}
interface MoodCfg {
  bpm: number;
  chords: Chord[];
  scale: number[];
  /** chance per bar of a flute phrase */
  flute: number;
  /** shaker loudness, 0 = none */
  shaker: number;
  /** drone loudness, 0 = none */
  drone: number;
  gong: boolean;
  /** reverb amount */
  wet: number;
  strum: boolean;
}
const mi = (root: number): Chord => ({ root, minor: true });
const ma = (root: number): Chord => ({ root, minor: false });
const DMIN = [62, 65, 67, 69, 72, 74, 77, 79, 81];

const MOODS: Record<Mood, MoodCfg> = {
  home: { bpm: 78, chords: [mi(50), ma(46), ma(53), ma(48)], scale: DMIN, flute: 0.55, shaker: 0, drone: 0, gong: false, wet: 0.32, strum: false },
  work: { bpm: 92, chords: [mi(50), ma(48), ma(46), ma(48)], scale: DMIN, flute: 0.4, shaker: 0.5, drone: 0, gong: false, wet: 0.26, strum: false },
  tense: { bpm: 64, chords: [mi(50), mi(55), mi(50), ma(57)], scale: [62, 63, 65, 67, 69, 74, 75, 77, 79], flute: 0.25, shaker: 0, drone: 0.05, gong: true, wet: 0.4, strum: false },
  harvest: { bpm: 114, chords: [ma(50), ma(55), ma(57), ma(50)], scale: [62, 64, 66, 69, 71, 74, 76, 78, 81, 83], flute: 0.72, shaker: 1, drone: 0, gong: false, wet: 0.2, strum: true },
  market: { bpm: 102, chords: [ma(48), ma(53), ma(55), ma(48)], scale: [60, 62, 64, 67, 69, 72, 74, 76, 79, 81], flute: 0.62, shaker: 0.8, drone: 0, gong: false, wet: 0.22, strum: true },
  reflect: { bpm: 60, chords: [mi(57), ma(53), ma(48), ma(55)], scale: [57, 60, 62, 64, 67, 69, 72, 74, 76], flute: 0.3, shaker: 0, drone: 0.04, gong: false, wet: 0.45, strum: false },
};

const MUSIC_VOLUME = 0.5;
const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

interface Chain {
  a: AudioContext;
  out: GainNode;
  wet: GainNode;
  noise: AudioBuffer;
}
let chain: Chain | null = null;
let wantMusic = true;
let unlocked = false;
let running = false;
let timer: number | null = null;
let nextTime = 0;
let step = 0;
let bar = 0;
let cur: Mood = "home";
let pending: Mood = "home";
let lastNote = 74;
let drone: { g: GainNode; stop: () => void } | null = null;

try {
  wantMusic = localStorage.getItem("uma-music") !== "off";
} catch {
  /* storage blocked: stay on */
}
export const musicOn = (): boolean => wantMusic;

function build(a: AudioContext): Chain {
  const out = a.createGain();
  out.gain.value = 0;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 5200;
  lp.Q.value = 0.4;
  const dry = a.createGain();
  dry.gain.value = 0.85;
  const wet = a.createGain();
  wet.gain.value = 0.3;
  const conv = a.createConvolver();
  const n = Math.floor(a.sampleRate * 2.2);
  const ir = a.createBuffer(2, n, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4);
  }
  conv.buffer = ir;
  out.connect(lp);
  lp.connect(dry).connect(a.destination);
  lp.connect(conv).connect(wet).connect(a.destination);
  const noise = a.createBuffer(1, a.sampleRate, a.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return { a, out, wet, noise };
}

/* ---------- voices ---------- */
function noiseBurst(c: Chain, t: number, dur: number, vol: number, hp: number): void {
  const s = c.a.createBufferSource();
  s.buffer = c.noise;
  const f = c.a.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = c.a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.out);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}
/** Plucked string: a few decaying harmonics plus a tiny pick click. */
function pluck(c: Chain, freq: number, t: number, vol: number, len = 1.1): void {
  [1, 2, 3, 4].forEach((k, i) => {
    const o = c.a.createOscillator();
    const g = c.a.createGain();
    o.type = "sine";
    o.frequency.value = freq * k * (1 + (k - 1) * 0.0009);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol / Math.pow(k, 1.25), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len / (1 + i * 0.7));
    o.connect(g).connect(c.out);
    o.start(t);
    o.stop(t + len + 0.05);
  });
  noiseBurst(c, t, 0.012, vol * 0.18, 2500);
}
/** Bamboo flute: sine with a little vibrato and breath. */
function flute(c: Chain, freq: number, t: number, dur: number, vol: number): void {
  const o = c.a.createOscillator();
  const o2 = c.a.createOscillator();
  const lfo = c.a.createOscillator();
  const lg = c.a.createGain();
  const g = c.a.createGain();
  const g2 = c.a.createGain();
  o.type = "sine";
  o2.type = "sine";
  o.frequency.value = freq;
  o2.frequency.value = freq * 2;
  g2.gain.value = 0.1;
  lfo.frequency.value = 5.2;
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(freq * 0.006, t + 0.35);
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.09);
  g.gain.setValueAtTime(vol, t + Math.max(0.1, dur - 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(c.out);
  [o, o2, lfo].forEach((x) => {
    x.start(t);
    x.stop(t + dur + 0.3);
  });
  const s = c.a.createBufferSource();
  s.buffer = c.noise;
  const bp = c.a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq * 2;
  bp.Q.value = 2;
  const bg = c.a.createGain();
  bg.gain.setValueAtTime(vol * 0.1, t);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bp).connect(bg).connect(c.out);
  s.start(t);
  s.stop(t + dur + 0.05);
}
/** Kulintang-style gong: inharmonic partials with a long tail. */
function gong(c: Chain, freq: number, t: number, vol: number): void {
  [1, 2.76, 5.4, 8.93].forEach((r, i) => {
    const o = c.a.createOscillator();
    const g = c.a.createGain();
    o.type = "sine";
    o.frequency.value = freq * r;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol / (1 + i * 1.6), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3 - i * 0.5);
    o.connect(g).connect(c.out);
    o.start(t);
    o.stop(t + 3.1);
  });
}
function startDrone(c: Chain, vol: number): void {
  stopDrone();
  const g = c.a.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(vol, c.a.currentTime, 1.5);
  const lfo = c.a.createOscillator();
  const lg = c.a.createGain();
  lfo.frequency.value = 0.12;
  lg.gain.value = vol * 0.4;
  lfo.connect(lg).connect(g.gain);
  const os = [38, 45].map((m) => {
    const o = c.a.createOscillator();
    o.type = "sine";
    o.frequency.value = mtof(m);
    o.connect(g);
    o.start();
    return o;
  });
  lfo.start();
  g.connect(c.out);
  drone = {
    g,
    stop: () => {
      g.gain.setTargetAtTime(0, c.a.currentTime, 0.8);
      window.setTimeout(() => {
        os.forEach((o) => o.stop());
        lfo.stop();
        g.disconnect();
      }, 4000);
    },
  };
}
function stopDrone(): void {
  drone?.stop();
  drone = null;
}

/* ---------- the score ---------- */
function triad(ch: Chord): [number, number, number] {
  return [ch.root, ch.root + (ch.minor ? 3 : 4), ch.root + 7];
}

/** One eighth note of 3/4 (six per bar). */
function schedule(c: Chain, t: number): void {
  const pos = step % 6;
  if (pos === 0) {
    if (pending !== cur) {
      cur = pending;
      bar = 0;
      const m = MOODS[cur];
      c.wet.gain.setTargetAtTime(m.wet, c.a.currentTime, 0.6);
      if (m.drone > 0) startDrone(c, m.drone);
      else stopDrone();
    }
  }
  const m = MOODS[cur];
  const eighth = 60 / m.bpm / 2;
  const ch = m.chords[bar % m.chords.length];
  const [r, th, fi] = triad(ch);
  const hum = (): number => (Math.random() - 0.5) * 0.012;
  const loud = pos === 0 ? 1 : pos === 3 ? 0.8 : 0.62;
  if (m.strum) {
    // strummed kuratsa feel: a full strum on one, short upstrokes on two and three
    if (pos === 0) [r - 12, r, th, fi, r + 12].forEach((n, i) => pluck(c, mtof(n), t + i * 0.014, 0.09 * loud, 0.9));
    if (pos === 2 || pos === 4) [th + 12, fi + 12].forEach((n, i) => pluck(c, mtof(n), t + i * 0.01 + hum(), 0.05, 0.6));
  } else {
    const notes = [r - 12, fi, th + 12, fi + 12, th + 12, fi];
    pluck(c, mtof(notes[pos]), t + hum(), 0.085 * loud, pos === 0 ? 1.5 : 1.0);
  }
  if (m.shaker > 0 && (pos === 0 || pos === 2 || pos === 4)) noiseBurst(c, t, 0.045, 0.03 * m.shaker * (pos === 0 ? 1.3 : 0.8), 6000);
  if (pos === 0) {
    if (m.gong && bar % 4 === 0) gong(c, mtof(r - 24), t, 0.05);
    // a flute phrase begins on some bars
    if (Math.random() < m.flute) {
      const n = 2 + Math.floor(Math.random() * 3);
      let when = Math.floor(Math.random() * 3) * eighth * 2;
      const tones = m.scale;
      for (let k = 0; k < n; k++) {
        const idx = Math.max(0, Math.min(tones.length - 1, tones.indexOf(lastNote) + Math.floor(Math.random() * 5) - 2));
        let note = tones[idx];
        if (k === n - 1) {
          // resolve on a chord tone when one is near
          const chordTones = [r + 12, th + 12, fi + 12, r + 24];
          note = chordTones.reduce((best, x) => (Math.abs(x - note) < Math.abs(best - note) ? x : best), chordTones[0]);
        }
        lastNote = note;
        const len = eighth * (k === n - 1 ? 4 : 2 + Math.floor(Math.random() * 2));
        if (when + len < eighth * 6 + 0.6) flute(c, mtof(note), t + when, len, 0.05);
        when += len;
      }
    }
  }
  if (pos === 5) bar++;
  step++;
  nextTime = t + eighth;
}

function tick(): void {
  if (!chain) return;
  while (nextTime < chain.a.currentTime + 0.3) schedule(chain, nextTime);
}

function start(): void {
  const a = audioCtx();
  if (!a) return;
  if (!chain) chain = build(a);
  if (running) return;
  running = true;
  step = 0;
  bar = 0;
  cur = pending;
  const m = MOODS[cur];
  chain.wet.gain.value = m.wet;
  if (m.drone > 0) startDrone(chain, m.drone);
  nextTime = a.currentTime + 0.15;
  chain.out.gain.setTargetAtTime(MUSIC_VOLUME, a.currentTime, 0.9);
  timer = window.setInterval(tick, 40);
}
function stop(): void {
  if (!running || !chain) return;
  running = false;
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  chain.out.gain.setTargetAtTime(0, chain.a.currentTime, 0.25);
  stopDrone();
}

/** Start or stop to match the settings, the first user gesture and tab visibility. */
export function refreshMusic(): void {
  if (soundOn() && wantMusic && unlocked && !document.hidden) start();
  else stop();
}
export function toggleMusic(): boolean {
  wantMusic = !wantMusic;
  try {
    localStorage.setItem("uma-music", wantMusic ? "on" : "off");
  } catch {
    /* ignore */
  }
  refreshMusic();
  return wantMusic;
}
/** The story's mood; the music changes at the next bar. */
export function setMood(m: Mood): void {
  pending = m;
}
/** Browsers only allow sound after a gesture: begin on the first click or key press. */
export function armMusic(): void {
  const go = (): void => {
    unlocked = true;
    refreshMusic();
  };
  window.addEventListener("pointerdown", go, { once: true });
  window.addEventListener("keydown", go, { once: true });
  document.addEventListener("visibilitychange", refreshMusic);
}
