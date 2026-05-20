import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { engine } from "@/audio/engine";
import { ROOM_META } from "@/audio/rooms";
import type { RoomId } from "@/audio/engine";
import type { SceneOptions } from "@/scene/RoomScene";
import { useIsMobile } from "@/hooks/use-mobile";

interface HUDProps {
  roomId: RoomId;
  onRoomChange: (id: RoomId) => void;
  options: SceneOptions;
  onOptionsChange: (patch: Partial<SceneOptions>) => void;
}

export function HUD({
  roomId,
  onRoomChange,
  options,
  onOptionsChange,
}: HUDProps) {
  const isMobile = useIsMobile();
  const [master, setMaster] = useState(0.85);
  const [reverb, setReverb] = useState(0.6);
  const [level, setLevel] = useState(0);
  const [mode, setMode] = useState<"hrtf" | "stereo">(engine.getSpatialMode());
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      setLevel(engine.getLevel());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    engine.setMasterVolume(master);
  }, [master]);
  useEffect(() => {
    engine.setReverbMix(reverb);
  }, [reverb]);
  useEffect(() => {
    engine.setSpatialMode(mode);
  }, [mode]);

  return (
    <>
      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 sm:p-7">
        <Link
          to="/"
          className="glass pointer-events-auto rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-foreground/80 transition hover:text-foreground sm:px-4 sm:text-xs"
        >
          ← Echo Rooms
        </Link>
        <div className="glass pointer-events-auto rounded-full px-3 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/60 sm:px-4 sm:text-[10px] sm:tracking-[0.25em]">
          <span className="mr-2 inline-block size-1.5 animate-pulse rounded-full bg-primary align-middle" />
          {mode === "hrtf" ? "hrtf · spatial" : "stereo · speaker"}
        </div>
      </header>

      {/* DESKTOP: room switcher rail (left) */}
      {!isMobile && (
        <nav className="pointer-events-auto absolute left-7 top-1/2 z-20 -translate-y-1/2">
          <div className="glass-strong flex flex-col gap-1 rounded-2xl p-1.5">
            {(Object.keys(ROOM_META) as RoomId[]).map((id) => {
              const meta = ROOM_META[id];
              const active = id === roomId;
              return (
                <button
                  key={id}
                  onClick={() => onRoomChange(id)}
                  className={`group relative w-44 rounded-xl px-4 py-3 text-left transition ${
                    active ? "bg-foreground/5" : "hover:bg-foreground/3"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="size-2.5 rounded-full transition"
                      style={{
                        background: meta.color,
                        boxShadow: active ? `0 0 16px ${meta.color}` : "none",
                      }}
                    />
                    <div className="flex-1">
                      <div
                        className="font-display text-base leading-tight"
                        style={{ color: active ? meta.color : undefined }}
                      >
                        {meta.name}
                      </div>
                      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                        {id}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* DESKTOP: now playing + controls */}
      {!isMobile && (
        <>
          <div className="pointer-events-none absolute bottom-7 left-7 z-20 max-w-xs">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Now playing
            </div>
            <h2 className="mt-1 font-display text-3xl leading-none">
              {ROOM_META[roomId].name}
            </h2>
            <p className="mt-2 text-sm text-foreground/70">
              {ROOM_META[roomId].tagline}
            </p>
          </div>

          <div className="pointer-events-auto absolute bottom-7 right-7 z-20">
            <div className="glass-strong w-72 rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Output
                </span>
                <LevelMeter level={level} />
              </div>
              <Slider label="Volume" value={master} onChange={setMaster} />
              <div className="mt-3" />
              <Slider label="Reverb" value={reverb} onChange={setReverb} />
              <div className="mt-3" />
              <Slider
                label="Visual intensity"
                value={options.intensity}
                onChange={(v) => onOptionsChange({ intensity: v })}
              />
              <div className="mt-4">
                <ModeToggle mode={mode} onChange={setMode} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-1.5">
                <Toggle
                  label="Orbit"
                  active={options.autoRotate}
                  onChange={(v) => onOptionsChange({ autoRotate: v })}
                />
                <Toggle
                  label="Bolts"
                  active={options.lightning}
                  onChange={(v) => onOptionsChange({ lightning: v })}
                />
                <Toggle
                  label="Motes"
                  active={options.particles}
                  onChange={(v) => onOptionsChange({ particles: v })}
                />
              </div>
              <div className="mt-4 border-t border-border pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                drag · scroll · explore
              </div>
            </div>
          </div>
        </>
      )}

      {/* MOBILE: bottom sheet */}
      {isMobile && (
        <>
          {/* Floating mini-bar (always visible) */}
          <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-20">
            <div className="glass-strong flex items-center gap-3 rounded-2xl p-3">
              <button
                onClick={() => setSheetOpen((v) => !v)}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-foreground/15 bg-foreground/4"
                aria-label="Toggle controls"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5 text-foreground/80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M4 8h12M4 16h8" strokeLinecap="round" />
                  <circle cx="18" cy="8" r="2.2" />
                  <circle cx="14" cy="16" r="2.2" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg leading-none">
                  {ROOM_META[roomId].name}
                </div>
                <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  {mode === "hrtf" ? "headphones" : "speaker"} · tap ⚙ for
                  controls
                </div>
              </div>
              <LevelMeter level={level} />
            </div>

            {sheetOpen && (
              <div className="glass-strong mt-2 rounded-2xl p-4">
                {/* Room pills */}
                <div className="mb-4 grid grid-cols-3 gap-1.5">
                  {(Object.keys(ROOM_META) as RoomId[]).map((id) => {
                    const meta = ROOM_META[id];
                    const active = id === roomId;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          onRoomChange(id);
                          setSheetOpen(false);
                        }}
                        className={`rounded-xl px-2 py-2.5 text-center transition ${
                          active ? "bg-foreground/8" : "bg-foreground/2"
                        }`}
                      >
                        <span
                          className="mx-auto block size-2 rounded-full"
                          style={{
                            background: meta.color,
                            boxShadow: active
                              ? `0 0 12px ${meta.color}`
                              : "none",
                          }}
                        />
                        <span
                          className="mt-1.5 block font-display text-sm leading-none"
                          style={{ color: active ? meta.color : undefined }}
                        >
                          {meta.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Slider label="Volume" value={master} onChange={setMaster} />
                <div className="mt-3" />
                <Slider label="Reverb" value={reverb} onChange={setReverb} />
                <div className="mt-3" />
                <Slider
                  label="Visual intensity"
                  value={options.intensity}
                  onChange={(v) => onOptionsChange({ intensity: v })}
                />
                <div className="mt-4">
                  <ModeToggle mode={mode} onChange={setMode} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <Toggle
                    label="Orbit"
                    active={options.autoRotate}
                    onChange={(v) => onOptionsChange({ autoRotate: v })}
                  />
                  <Toggle
                    label="Bolts"
                    active={options.lightning}
                    onChange={(v) => onOptionsChange({ lightning: v })}
                  />
                  <Toggle
                    label="Motes"
                    active={options.particles}
                    onChange={(v) => onOptionsChange({ particles: v })}
                  />
                </div>
                <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  drag to orbit · pinch to zoom
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-foreground/70">
          {Math.round(value * 100)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-foreground/10 accent-primary outline-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_12px_var(--primary)]"
      />
    </label>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: "hrtf" | "stereo";
  onChange: (m: "hrtf" | "stereo") => void;
}) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Listening on
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-foreground/6 p-1">
        <button
          onClick={() => onChange("stereo")}
          className={`rounded-full px-3 py-1.5 text-xs transition ${
            mode === "stereo"
              ? "bg-foreground text-background"
              : "text-foreground/70"
          }`}
        >
          Speakers
        </button>
        <button
          onClick={() => onChange("hrtf")}
          className={`rounded-full px-3 py-1.5 text-xs transition ${
            mode === "hrtf"
              ? "bg-foreground text-background"
              : "text-foreground/70"
          }`}
        >
          Headphones
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  active,
  onChange,
}: {
  label: string;
  active: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`rounded-lg px-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] transition ${
        active
          ? "bg-foreground/12 text-foreground"
          : "bg-foreground/3 text-foreground/50"
      }`}
    >
      <span
        className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${active ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-foreground/30"}`}
      />
      {label}
    </button>
  );
}

function LevelMeter({ level }: { level: number }) {
  const bars = 12;
  const lit = Math.round(level * bars * 1.6);
  return (
    <div className="flex items-end gap-0.5">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-0.75 rounded-sm transition-[height,background-color] duration-75"
          style={{
            height: `${6 + i * 1.2}px`,
            background:
              i < lit
                ? i > bars - 4
                  ? "oklch(0.78 0.22 25)"
                  : "var(--primary)"
                : "oklch(0.96 0.01 280 / 0.12)",
          }}
        />
      ))}
    </div>
  );
}
