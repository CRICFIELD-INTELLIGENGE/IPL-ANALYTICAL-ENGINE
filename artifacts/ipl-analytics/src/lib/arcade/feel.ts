// Arcade game feel: sound and motion settings shared by every game.
// Sounds are synthesised with Web Audio (original, no licensed samples) and only start after a user gesture.

import { useEffect, useState, useSyncExternalStore } from "react";

export interface FeelSettings { sound: boolean; volume: number; reducedMotion: "system" | "on" | "off" }
const KEY = "cricfield-arcade-feel";
const listeners = new Set<() => void>();
let settings: FeelSettings = load();
function load(): FeelSettings {
  try { const raw = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (raw) return { sound: raw.sound !== false, volume: Math.min(1, Math.max(0, Number(raw.volume ?? 0.6))), reducedMotion: raw.reducedMotion ?? "system" }; } catch { /* storage blocked */ }
  return { sound: true, volume: 0.6, reducedMotion: "system" };
}
export function setFeel(patch: Partial<FeelSettings>) {
  settings = { ...settings, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}
export function useFeel(): FeelSettings {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => settings, () => settings);
}
export function useReducedMotion(): boolean {
  const feel = useFeel();
  const [system, setSystem] = useState(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setSystem(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return feel.reducedMotion === "on" || (feel.reducedMotion === "system" && system);
}

export type Sfx = "bat" | "crowd" | "wicket" | "reveal" | "hammer" | "correct" | "wrong" | "achievement" | "tick" | "click";
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
function tone(a: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(a.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}
function noise(a: AudioContext, start: number, dur: number, gain: number, filterFreq: number) {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = "bandpass"; f.frequency.value = filterFreq; g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(start);
}
/** Play a short effect. Silently does nothing when sound is off or audio is unavailable. */
export function play(sfx: Sfx) {
  if (!settings.sound || settings.volume <= 0) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime, v = settings.volume * 0.25;
  switch (sfx) {
    case "bat": noise(a, t, 0.08, v * 2.2, 1800); tone(a, 220, t, 0.09, "triangle", v); break;
    case "crowd": noise(a, t, 1.4, v * 0.9, 900); noise(a, t + 0.2, 1.2, v * 0.6, 1400); break;
    case "wicket": noise(a, t, 0.12, v * 2, 3000); tone(a, 520, t + 0.05, 0.4, "square", v * 0.5, 130); break;
    case "reveal": tone(a, 392, t, 0.12, "sine", v); tone(a, 587, t + 0.1, 0.22, "sine", v); break;
    case "hammer": noise(a, t, 0.06, v * 3, 600); tone(a, 140, t, 0.25, "triangle", v * 1.4, 70); break;
    case "correct": tone(a, 523, t, 0.1, "sine", v); tone(a, 784, t + 0.09, 0.18, "sine", v); break;
    case "wrong": tone(a, 300, t, 0.25, "sawtooth", v * 0.5, 160); break;
    case "achievement": [523, 659, 784, 1047].forEach((f, i) => tone(a, f, t + i * 0.09, 0.25, "triangle", v)); break;
    case "tick": tone(a, 1200, t, 0.03, "square", v * 0.3); break;
    case "click": tone(a, 800, t, 0.04, "sine", v * 0.4); break;
  }
}
