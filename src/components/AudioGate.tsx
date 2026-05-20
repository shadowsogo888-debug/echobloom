import { useEffect, useState } from "react";

interface Props {
  onEnter: () => void;
}

/**
 * Browsers require a user gesture before AudioContext can produce sound.
 * Full-screen veil that blocks the scene until the user taps to enter.
 */
export function AudioGate({ onEnter }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    const t = setTimeout(onEnter, 700);
    return () => clearTimeout(t);
  }, [unlocked, onEnter]);

  if (unlocked) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-50 bg-background transition-opacity duration-700"
        style={{ opacity: pressed ? 0 : 1 }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
      <button
        onClick={() => {
          setPressed(true);
          setTimeout(() => setUnlocked(true), 50);
        }}
        className="group relative flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl anim-pulse-soft" />
          <div className="relative grid size-32 place-items-center rounded-full border border-foreground/20 ring-glow transition group-hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              className="size-10 text-primary"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M3 12c0-1 .5-2 1.5-2.5L9 7v10l-4.5-2.5C3.5 14 3 13 3 12Z"
                strokeLinejoin="round"
              />
              <path
                d="M14 8c1.5 1 2.5 2.4 2.5 4s-1 3-2.5 4"
                strokeLinecap="round"
              />
              <path
                d="M17 5c2.5 1.6 4 4.2 4 7s-1.5 5.4-4 7"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            Tap to enter
          </div>
          <div className="mt-2 font-display text-2xl text-foreground/90">
            Enable spatial audio
          </div>
          <div className="mx-auto mt-3 max-w-65 text-sm text-foreground/60">
            Works on any speakers — headphones recommended for full 3D effect.
          </div>
        </div>
      </button>
    </div>
  );
}
