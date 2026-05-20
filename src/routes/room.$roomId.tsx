import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { engine, type RoomId } from "@/audio/engine";
import { startRoom, type RoomInstance } from "@/audio/rooms";
import { HUD } from "@/components/HUD";
import { AudioGate } from "@/components/AudioGate";
import type { SceneOptions } from "@/scene/RoomScene";

const RoomScene = lazy(() =>
  import("@/scene/RoomScene").then((m) => ({ default: m.RoomScene })),
);

const VALID: RoomId[] = ["cathedral", "tide", "forge"];

const DEFAULT_OPTIONS: SceneOptions = {
  autoRotate: true,
  intensity: 0.55,
  lightning: true,
  particles: true,
};

export const Route = createFileRoute("/room/$roomId")({
  head: ({ params }) => {
    const id = params.roomId;
    const name = id.charAt(0).toUpperCase() + id.slice(1);
    return {
      meta: [
        { title: `${name} — Echo Rooms` },
        {
          name: "description",
          content: `Step inside the ${name} — a spatial audio room with generative soundscape.`,
        },
        { property: "og:title", content: `${name} — Echo Rooms` },
        {
          property: "og:description",
          content: `Spatial audio room. Use headphones.`,
        },
      ],
    };
  },
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const safeId = (
    VALID.includes(roomId as RoomId) ? roomId : "cathedral"
  ) as RoomId;

  const [unlocked, setUnlocked] = useState(false);
  const [instance, setInstance] = useState<RoomInstance | null>(null);
  const [options, setOptions] = useState<SceneOptions>(DEFAULT_OPTIONS);

  useEffect(() => {
    if (!unlocked) return;
    const room = startRoom(safeId);
    setInstance(room);
    return () => room.stop();
  }, [unlocked, safeId]);

  const switchRoom = (next: RoomId) => {
    if (next === safeId) return;
    navigate({ to: "/room/$roomId", params: { roomId: next } });
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      {!unlocked && (
        <AudioGate
          onEnter={async () => {
            await engine.resume();
            setUnlocked(true);
          }}
        />
      )}

      {unlocked && instance && (
        <Suspense fallback={<SceneFallback />}>
          <RoomScene
            roomId={safeId}
            emitters={instance.emitters}
            options={options}
          />
        </Suspense>
      )}

      {unlocked && instance && (
        <HUD
          roomId={safeId}
          onRoomChange={switchRoom}
          options={options}
          onOptionsChange={(patch) => setOptions((o) => ({ ...o, ...patch }))}
        />
      )}
    </main>
  );
}

function SceneFallback() {
  return (
    <div className="grid h-full place-items-center">
      <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground anim-pulse-soft">
        Weaving the room…
      </div>
    </div>
  );
}
