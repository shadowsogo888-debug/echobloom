// Web Audio engine: single AudioContext, master bus, room bus, listener sync.

export type RoomId = "cathedral" | "tide" | "forge";

export interface SoundSource {
  /** Audible source feeding into a PannerNode at (x,y,z). */
  panner: PannerNode;
  /** Per-source gain (use to fade in/out). */
  gain: GainNode;
  /** Update spatial position. */
  setPosition: (x: number, y: number, z: number) => void;
  /** Tear everything down. */
  dispose: () => void;
}

class EngineImpl {
  ctx: AudioContext | null = null;
  masterGain!: GainNode;
  roomBus!: GainNode;
  dryBus!: GainNode;
  convolver!: ConvolverNode;
  reverbWet!: GainNode;
  analyser!: AnalyserNode;
  private resumeListeners = new Set<() => void>();
  private modeListeners = new Set<(m: "hrtf" | "stereo") => void>();
  private panners = new Set<PannerNode>();
  private spatialMode: "hrtf" | "stereo" = "stereo";

  /** Lazy-init on first user gesture (browsers require it). */
  init() {
    if (this.ctx) return this.ctx;
    const Ctx =
      (window.AudioContext as typeof AudioContext) ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx({ latencyHint: "interactive" });
    this.ctx = ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.85;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.85;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // Room bus → split into dry + convolved wet.
    this.roomBus = ctx.createGain();
    this.dryBus = ctx.createGain();
    this.reverbWet = ctx.createGain();
    this.dryBus.gain.value = 0.7;
    this.reverbWet.gain.value = 0.6;

    this.convolver = ctx.createConvolver();

    this.roomBus.connect(this.dryBus).connect(this.masterGain);
    this.roomBus.connect(this.convolver).connect(this.reverbWet).connect(this.masterGain);

    return ctx;
  }

  async resume() {
    const ctx = this.init();
    if (ctx.state !== "running") await ctx.resume();
    this.resumeListeners.forEach((cb) => cb());
  }

  onResume(cb: () => void) {
    this.resumeListeners.add(cb);
    return () => this.resumeListeners.delete(cb);
  }

  setMasterVolume(v: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.linearRampToValueAtTime(v, t + 0.05);
  }

  setReverbMix(v: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.reverbWet.gain.linearRampToValueAtTime(v, t + 0.1);
    this.dryBus.gain.linearRampToValueAtTime(1 - v * 0.4, t + 0.1);
  }

  /** Update the WebAudio listener position/orientation from a 3D camera. */
  syncListener(
    pos: { x: number; y: number; z: number },
    forward: { x: number; y: number; z: number },
    up: { x: number; y: number; z: number },
  ) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(pos.x, t, 0.02);
      l.positionY.setTargetAtTime(pos.y, t, 0.02);
      l.positionZ.setTargetAtTime(pos.z, t, 0.02);
      l.forwardX.setTargetAtTime(forward.x, t, 0.02);
      l.forwardY.setTargetAtTime(forward.y, t, 0.02);
      l.forwardZ.setTargetAtTime(forward.z, t, 0.02);
      l.upX.setTargetAtTime(up.x, t, 0.02);
      l.upY.setTargetAtTime(up.y, t, 0.02);
      l.upZ.setTargetAtTime(up.z, t, 0.02);
    } else {
      // Safari fallback
      (l as unknown as { setPosition: (x: number, y: number, z: number) => void })
        .setPosition(pos.x, pos.y, pos.z);
      (l as unknown as {
        setOrientation: (fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) => void;
      }).setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  /** Get instantaneous loudness (0..1) for visual reactivity. */
  getLevel(): number {
    if (!this.analyser) return 0;
    const arr = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(arr);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i];
    return sum / (arr.length * 255);
  }

  setSpatialMode(mode: "hrtf" | "stereo") {
    this.spatialMode = mode;
    const pm: PanningModelType = mode === "hrtf" ? "HRTF" : "equalpower";
    this.panners.forEach((p) => { p.panningModel = pm; });
    this.modeListeners.forEach((cb) => cb(mode));
  }
  getSpatialMode() { return this.spatialMode; }
  onSpatialMode(cb: (m: "hrtf" | "stereo") => void) {
    this.modeListeners.add(cb);
    return () => this.modeListeners.delete(cb);
  }

  /** Create a positioned source ready to receive an audio node into `gain`. */
  createSource(initial: { x: number; y: number; z: number }): SoundSource {
    const ctx = this.init();
    const panner = ctx.createPanner();
    panner.panningModel = this.spatialMode === "hrtf" ? "HRTF" : "equalpower";
    panner.distanceModel = "inverse";
    // Tuned so sources stay audible on laptop/phone speakers (less aggressive
    // rolloff than HRTF-on-headphones defaults).
    panner.refDistance = 2.2;
    panner.maxDistance = 80;
    panner.rolloffFactor = 0.9;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;
    this.panners.add(panner);

    const setPos = (x: number, y: number, z: number) => {
      const t = ctx.currentTime;
      if (panner.positionX) {
        panner.positionX.setTargetAtTime(x, t, 0.05);
        panner.positionY.setTargetAtTime(y, t, 0.05);
        panner.positionZ.setTargetAtTime(z, t, 0.05);
      } else {
        (panner as unknown as { setPosition: (x: number, y: number, z: number) => void })
          .setPosition(x, y, z);
      }
    };
    setPos(initial.x, initial.y, initial.z);

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(panner).connect(this.roomBus);

    return {
      panner,
      gain,
      setPosition: setPos,
      dispose: () => {
        this.panners.delete(panner);
        try { gain.disconnect(); panner.disconnect(); } catch { /* ignore */ }
      },
    };
  }
}

export const engine = new EngineImpl();
