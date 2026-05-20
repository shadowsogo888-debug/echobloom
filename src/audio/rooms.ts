// Per-room generative synthesis. Each room exposes start/stop and a small set
// of sources arranged around the scene so spatial panning is audible.

import { engine, type RoomId, type SoundSource } from "./engine";
import { generateIR, generateNoiseBuffer } from "./spatial";

export interface RoomInstance {
  id: RoomId;
  /** World-space positions of the room's sound emitters. */
  emitters: { x: number; y: number; z: number; color: string }[];
  stop: () => void;
}

type EmitterPos = { x: number; y: number; z: number; color: string };

interface RoomSpec {
  ir: { decay: number; preDelay?: number; brightness?: number };
  build: (ctx: AudioContext, positions: EmitterPos[]) => { sources: SoundSource[]; nodes: AudioNode[] };
  positions: EmitterPos[];
}

/* ----------------------------- CATHEDRAL ----------------------------- */
function buildCathedral(ctx: AudioContext, positions: RoomSpec["positions"]) {
  const sources: SoundSource[] = [];
  const nodes: AudioNode[] = [];
  const baseFreqs = [110, 138.59, 164.81, 220]; // A2, C#3, E3, A3 — A major triad pad
  positions.forEach((p, i) => {
    const src = engine.createSource(p);
    sources.push(src);

    // Two detuned sines per emitter — slow chorus from beating.
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = "sine";
    o2.type = "sine";
    const f = baseFreqs[i % baseFreqs.length];
    o1.frequency.value = f;
    o2.frequency.value = f * 1.003;

    // Slow LFO on filter cutoff for breathing.
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 700;
    lpf.Q.value = 1.2;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05 + Math.random() * 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(lpf.frequency);

    const mix = ctx.createGain();
    mix.gain.value = 0.35;
    o1.connect(mix);
    o2.connect(mix);
    mix.connect(lpf).connect(src.gain);

    o1.start();
    o2.start();
    lfo.start();
    nodes.push(o1, o2, lfo, lfoGain, lpf, mix);

    src.gain.gain.setTargetAtTime(0.7, ctx.currentTime, 1.5);
  });
  return { sources, nodes };
}

/* -------------------------------- TIDE ------------------------------- */
function buildTide(ctx: AudioContext, positions: RoomSpec["positions"]) {
  const sources: SoundSource[] = [];
  const nodes: AudioNode[] = [];
  const noiseBuf = generateNoiseBuffer(ctx, 6, "pink");

  positions.forEach((p, i) => {
    const src = engine.createSource(p);
    sources.push(src);

    // Filtered noise → "tide" wash.
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 600 + i * 200;
    bp.Q.value = 0.7;

    // Slow amplitude swell.
    const ampLfo = ctx.createOscillator();
    ampLfo.frequency.value = 0.08 + Math.random() * 0.05;
    const ampGain = ctx.createGain();
    ampGain.gain.value = 0.25;
    const dc = ctx.createGain();
    dc.gain.value = 0.35;
    ampLfo.connect(ampGain).connect(dc.gain);

    noise.connect(bp).connect(dc).connect(src.gain);
    noise.start();
    ampLfo.start();
    nodes.push(noise, bp, ampLfo, ampGain, dc);

    // Occasional bell partials.
    const bellTimer = scheduleBells(ctx, src, i);
    nodes.push(bellTimer.gain);

    src.gain.gain.setTargetAtTime(0.75, ctx.currentTime, 1.5);
  });
  return { sources, nodes };
}

function scheduleBells(ctx: AudioContext, src: SoundSource, seed: number) {
  const out = ctx.createGain();
  out.gain.value = 1;
  out.connect(src.gain);

  const tick = () => {
    if (ctx.state === "closed") return;
    const now = ctx.currentTime;
    const fundamentals = [523.25, 659.25, 783.99, 880];
    const f = fundamentals[(seed + Math.floor(Math.random() * 4)) % 4];
    // Three FM-ish partials decaying
    [1, 2.76, 5.4].forEach((mult, idx) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * mult;
      const g = ctx.createGain();
      g.gain.value = 0;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.12 / (idx + 1), now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
      o.connect(g).connect(out);
      o.start(now);
      o.stop(now + 2.6);
    });
    const next = 3 + Math.random() * 6;
    setTimeout(tick, next * 1000);
  };
  setTimeout(tick, 1000 + Math.random() * 3000);
  return { gain: out };
}

/* -------------------------------- FORGE ------------------------------ */
function buildForge(ctx: AudioContext, positions: RoomSpec["positions"]) {
  const sources: SoundSource[] = [];
  const nodes: AudioNode[] = [];

  positions.forEach((p, i) => {
    const src = engine.createSource(p);
    sources.push(src);

    // Sub drone.
    const sub = ctx.createOscillator();
    sub.type = "triangle";
    sub.frequency.value = 55 * (i === 0 ? 1 : i === 1 ? 1.5 : 1.25);
    const subGain = ctx.createGain();
    subGain.gain.value = 0.18;
    sub.connect(subGain).connect(src.gain);
    sub.start();
    nodes.push(sub, subGain);

    // Generative metallic hits (FM).
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(src.gain);
    const hit = () => {
      if (ctx.state === "closed") return;
      const now = ctx.currentTime;
      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      carrier.type = "sine";
      mod.type = "square";
      const cf = 140 + Math.random() * 380;
      carrier.frequency.value = cf;
      mod.frequency.value = cf * (1 + Math.random() * 4);
      modGain.gain.value = 1200;
      mod.connect(modGain).connect(carrier.frequency);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.22, now + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 220;
      carrier.connect(env).connect(hp).connect(out);
      mod.start(now);
      carrier.start(now);
      mod.stop(now + 1);
      carrier.stop(now + 1);

      const next = 0.7 + Math.random() * 1.6;
      setTimeout(hit, next * 1000);
    };
    setTimeout(hit, 500 + i * 700);
    nodes.push(out);

    src.gain.gain.setTargetAtTime(0.65, ctx.currentTime, 1.2);
  });
  return { sources, nodes };
}

/* -------------------------------- SPECS ------------------------------ */
const SPECS: Record<RoomId, RoomSpec> = {
  cathedral: {
    ir: { decay: 5.5, preDelay: 0.04, brightness: 0.35 },
    build: buildCathedral,
    positions: [
      { x: -6, y: 2, z: -4, color: "#a78bfa" },
      { x: 6, y: 2.5, z: -3, color: "#c084fc" },
      { x: 0, y: 4, z: -8, color: "#8b5cf6" },
      { x: 0, y: 1.5, z: 6, color: "#a78bfa" },
    ],
  },
  tide: {
    ir: { decay: 3.2, preDelay: 0.02, brightness: 0.65 },
    build: buildTide,
    positions: [
      { x: -7, y: 0.6, z: -2, color: "#38bdf8" },
      { x: 7, y: 0.8, z: -2, color: "#22d3ee" },
      { x: 0, y: 1.2, z: -7, color: "#67e8f9" },
      { x: 0, y: 0.4, z: 5, color: "#0ea5e9" },
    ],
  },
  forge: {
    ir: { decay: 1.6, preDelay: 0.01, brightness: 0.55 },
    build: buildForge,
    positions: [
      { x: -5, y: 1.5, z: -3, color: "#fb923c" },
      { x: 5, y: 1.5, z: -3, color: "#f97316" },
      { x: 0, y: 2, z: -7, color: "#ea580c" },
    ],
  },
};

/** Start a room: load its IR into the convolver and build its synth. */
export function startRoom(id: RoomId): RoomInstance {
  const ctx = engine.init();
  const spec = SPECS[id];
  engine.convolver.buffer = generateIR(ctx, spec.ir);
  const { sources, nodes } = spec.build(ctx, spec.positions);

  return {
    id,
    emitters: spec.positions,
    stop: () => {
      const now = ctx.currentTime;
      sources.forEach((s) => s.gain.gain.linearRampToValueAtTime(0, now + 0.4));
      setTimeout(() => {
        sources.forEach((s) => s.dispose());
        nodes.forEach((n) => {
          try { n.disconnect(); } catch { /* ignore */ }
        });
      }, 500);
    },
  };
}

export const ROOM_META: Record<RoomId, { name: string; tagline: string; color: string }> = {
  cathedral: { name: "Cathedral", tagline: "Granular drones beneath vaulted air.", color: "var(--cathedral)" },
  tide: { name: "Tide", tagline: "Ocean wash with distant bell partials.", color: "var(--tide)" },
  forge: { name: "Forge", tagline: "Subterranean pulse and metallic decay.", color: "var(--forge)" },
};
