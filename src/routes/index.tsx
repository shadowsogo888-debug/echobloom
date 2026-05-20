import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Echo Rooms — Spatial audio worlds" },
      {
        name: "description",
        content:
          "Step into living rooms of sound. HRTF spatial audio, generative ambient soundscapes, rendered in WebGL. Use headphones.",
      },
      { property: "og:title", content: "Echo Rooms" },
      {
        property: "og:description",
        content: "Living rooms of sound. Spatial. Generative. Use headphones.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

const ROOMS = [
  {
    id: "cathedral",
    name: "Cathedral",
    hue: "var(--cathedral)",
    line: "Granular drones beneath vaulted air.",
  },
  {
    id: "tide",
    name: "Tide",
    hue: "var(--tide)",
    line: "Ocean wash with distant bell partials.",
  },
  {
    id: "forge",
    name: "Forge",
    hue: "var(--forge)",
    line: "Subterranean pulse and metallic decay.",
  },
] as const;

function Landing() {
  return (
    <main className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[10%] top-[15%] size-105 rounded-full bg-cathedral opacity-30 blur-[140px] anim-drift" />
        <div
          className="absolute right-[5%] top-[40%] size-130 rounded-full bg-tide opacity-25 blur-[160px] anim-drift"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute bottom-[5%] left-[35%] size-90 rounded-full bg-forge opacity-25 blur-[140px] anim-drift"
          style={{ animationDelay: "3s" }}
        />
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 sm:px-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full border border-foreground/15 ring-glow">
              <span className="size-2 rounded-full bg-primary anim-pulse-soft" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/70">
              Echo Rooms
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            v1 · spatial audio · 2026
          </span>
        </header>

        {/* Hero */}
        <section className="mt-20 flex-1 sm:mt-28">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-foreground/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/70">
              <span className="size-1.5 rounded-full bg-primary" /> Living rooms
              of sound
            </div>
            <h1 className="font-display text-[clamp(3rem,9vw,7rem)] leading-[0.95] tracking-tight text-balance">
              <span className="text-shimmer">Step inside</span>
              <br />
              <span className="text-foreground/90">a room you can</span>
              <br />
              <em className="italic text-foreground">hear around you.</em>
            </h1>
            <p className="mt-8 max-w-xl text-balance text-lg leading-relaxed text-foreground/70">
              HRTF spatial audio. Generative ambient synthesis. Convolved
              modelled per room. Move the camera and the world re-mixes itself
              around your ears in real time.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/room/$roomId"
                params={{ roomId: "cathedral" }}
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-foreground px-7 py-4 text-sm font-medium text-background transition hover:gap-4"
              >
                <span className="relative">Enter Cathedral</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                works on any speaker · headphones for full 3D
              </div>
            </div>
          </div>
        </section>

        {/* Rooms grid */}
        <section className="mt-24 grid gap-4 pb-14 sm:grid-cols-3">
          {ROOMS.map((r) => (
            <Link
              key={r.id}
              to="/room/$roomId"
              params={{ roomId: r.id }}
              className="glass group relative overflow-hidden rounded-3xl p-7 transition hover:bg-foreground/4"
            >
              <div
                className="absolute -right-10 -top-10 size-44 rounded-full opacity-50 blur-3xl transition-all group-hover:opacity-80 group-hover:blur-2xl"
                style={{ background: r.hue }}
              />
              <div className="relative">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: r.hue }}
                  />
                  Room
                </div>
                <h3
                  className="mt-3 font-display text-4xl leading-tight"
                  style={{ color: r.hue }}
                >
                  {r.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                  {r.line}
                </p>
                <div className="mt-8 flex items-center justify-between border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  <span>Enter →</span>
                  <span>HRTF · generative</span>
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span>Web Audio · WebGL · TanStack Start</span>
          <span>Made with care · 2026</span>
        </footer>
      </div>
    </main>
  );
}
