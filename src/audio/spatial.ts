// Procedural impulse-response generator for ConvolverNode reverb.
// Generates exponentially-decaying filtered noise — zero network cost.

export interface IRSpec {
  /** Reverb time in seconds (RT60-ish). */
  decay: number;
  /** Pre-delay in seconds. */
  preDelay?: number;
  /** Brightness 0..1 (lowpass filter weight). */
  brightness?: number;
}

export function generateIR(ctx: BaseAudioContext, spec: IRSpec): AudioBuffer {
  const { decay, preDelay = 0.02, brightness = 0.5 } = spec;
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * (decay + preDelay));
  const buf = ctx.createBuffer(2, length, sampleRate);
  const preSamples = Math.floor(sampleRate * preDelay);

  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let prev = 0;
    // One-pole lowpass coefficient — higher brightness = less filtering.
    const lpAlpha = 0.05 + brightness * 0.85;
    for (let i = preSamples; i < length; i++) {
      const t = (i - preSamples) / sampleRate;
      const envelope = Math.pow(1 - t / decay, 2.2);
      const noise = (Math.random() * 2 - 1) * envelope;
      // simple one-pole lowpass
      prev = prev + lpAlpha * (noise - prev);
      // stereo decorrelation
      data[i] = prev * (ch === 0 ? 1 : 0.92);
    }
  }
  return buf;
}

/** Quick utility: white noise buffer (looped) for granular pads & tide. */
export function generateNoiseBuffer(
  ctx: BaseAudioContext,
  seconds: number,
  filter: "white" | "pink" | "brown" = "white",
): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  if (filter === "white") {
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  } else if (filter === "pink") {
    // Voss-McCartney approximation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buf;
}
