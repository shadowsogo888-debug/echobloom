// Per-room signature visuals + audio-reactive lightning arcs between emitters.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { engine, type RoomId } from "@/audio/engine";

type Emitter = { x: number; y: number; z: number; color: string };

/* ----------------------- CATHEDRAL: light shafts + rings ----------------------- */
export function CathedralExtras({ color }: { color: string }) {
  const shaftsRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<THREE.Mesh[]>([]);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (shaftsRef.current) {
      shaftsRef.current.rotation.y = t * 0.05;
      shaftsRef.current.children.forEach((c, i) => {
        const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity =
          0.07 + Math.sin(t * 0.6 + i) * 0.04 + engine.getLevel() * 0.12;
      });
    }
    ringRefs.current.forEach((r, i) => {
      if (!r) return;
      r.rotation.z = t * (0.08 + i * 0.03) * (i % 2 ? -1 : 1);
      r.rotation.x = Math.PI / 2 + Math.sin(t * 0.2 + i) * 0.1;
    });
  });

  const shafts = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        angle: (i / 7) * Math.PI * 2,
        h: 22 + Math.random() * 6,
      })),
    [],
  );

  return (
    <group>
      <group ref={shaftsRef} position={[0, 4, -2]}>
        {shafts.map((sh, i) => (
          <mesh
            key={i}
            position={[Math.cos(sh.angle) * 9, 0, Math.sin(sh.angle) * 9]}
            rotation={[0, -sh.angle, 0.05]}
          >
            <cylinderGeometry args={[0.05, 1.6, sh.h, 8, 1, true]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.1}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
      {/* Orbital rings */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ringRefs.current[i] = el;
          }}
          position={[0, 1.5, 0]}
        >
          <torusGeometry args={[5 + i * 1.4, 0.015, 8, 128]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.35}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ----------------------- TIDE: wavy water + rising bubbles --------------------- */
export function TideExtras({ color }: { color: string }) {
  const waterRef = useRef<THREE.Mesh>(null);
  const bubblesRef = useRef<THREE.Points>(null);
  const baseY = useMemo(() => {
    const n = 220;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 4 + Math.random() * 10;
      const a = Math.random() * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = -1.9 + Math.random() * 0.3;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, []);
  const speeds = useMemo(
    () => Array.from({ length: 220 }, () => 0.4 + Math.random() * 0.8),
    [],
  );
  const positions = useRef<Float32Array>(baseY.slice());

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const level = engine.getLevel();

    // Animate water plane via shader-free vertex displacement
    if (waterRef.current) {
      const geom = waterRef.current.geometry as THREE.PlaneGeometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const wave =
          Math.sin(x * 0.4 + t * 1.1) * 0.18 +
          Math.cos(y * 0.5 + t * 0.8) * 0.14 +
          level * 0.4;
        posAttr.setZ(i, wave);
      }
      posAttr.needsUpdate = true;
      geom.computeVertexNormals();
    }

    // Rising bubbles loop
    if (bubblesRef.current) {
      const arr = positions.current;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] += 0.02 * speeds[i] * (1 + level * 2);
        if (arr[i * 3 + 1] > 4) {
          arr[i * 3 + 1] = -2;
          const r = 4 + Math.random() * 10;
          const a = Math.random() * Math.PI * 2;
          arr[i * 3] = Math.cos(a) * r;
          arr[i * 3 + 2] = Math.sin(a) * r;
        }
      }
      const attr = bubblesRef.current.geometry.attributes
        .position as THREE.BufferAttribute;
      attr.array = arr;
      attr.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh
        ref={waterRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.7, 0]}
      >
        <planeGeometry args={[40, 40, 60, 60]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.35}
          metalness={0.85}
          roughness={0.25}
          emissive={color}
          emissiveIntensity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <points ref={bubblesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions.current, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color={color}
          transparent
          opacity={0.8}
          toneMapped={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

/* ----------------------- FORGE: embers + molten cracks ------------------------- */
export function ForgeExtras({ color }: { color: string }) {
  const emberRef = useRef<THREE.Points>(null);
  const crackRefs = useRef<THREE.Mesh[]>([]);

  const ember = useMemo(() => {
    const n = 400;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = -1.5 + Math.random() * 8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    return arr;
  }, []);
  const emberSpeeds = useMemo(
    () => Array.from({ length: 400 }, () => 0.3 + Math.random() * 0.9),
    [],
  );
  const positions = useRef(ember.slice());

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const level = engine.getLevel();

    if (emberRef.current) {
      const arr = positions.current;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] += 0.03 * emberSpeeds[i] * (1 + level * 3);
        arr[i * 3] += Math.sin(t * 0.5 + i) * 0.005;
        if (arr[i * 3 + 1] > 8) {
          arr[i * 3 + 1] = -1.5;
          arr[i * 3] = (Math.random() - 0.5) * 24;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 24;
        }
      }
      const attr = emberRef.current.geometry.attributes
        .position as THREE.BufferAttribute;
      attr.array = arr;
      attr.needsUpdate = true;
      const mat = emberRef.current.material as THREE.PointsMaterial;
      mat.size = 0.06 + level * 0.18;
    }

    crackRefs.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + Math.sin(t * 1.2 + i) * 0.2 + level * 0.4;
      m.rotation.z = t * (0.04 + i * 0.02);
    });
  });

  return (
    <group>
      {/* Molten cracks: pulsing torus rings on the floor */}
      {[2, 3.4, 4.8, 6.2].map((r, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) crackRefs.current[i] = el;
          }}
          position={[0, -1.95, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[r, 0.04, 6, 96]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.4}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* Rising embers */}
      <points ref={emberRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions.current, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color={color}
          transparent
          opacity={0.95}
          toneMapped={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

/* ----------------------- LIGHTNING ARCS between emitters ---------------------- */
export function LightningArcs({
  emitters,
  color,
}: {
  emitters: Emitter[];
  color: string;
}) {
  // Build pairs of emitters to connect
  const pairs = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < emitters.length; i++) {
      for (let j = i + 1; j < emitters.length; j++) out.push([i, j]);
    }
    return out;
  }, [emitters]);

  return (
    <group>
      {pairs.map((p, i) => (
        <Arc
          key={i}
          a={emitters[p[0]]}
          b={emitters[p[1]]}
          color={color}
          seed={i}
        />
      ))}
    </group>
  );
}

function Arc({
  a,
  b,
  color,
  seed,
}: {
  a: Emitter;
  b: Emitter;
  color: string;
  seed: number;
}) {
  const lineRef = useRef<THREE.Line>(null);
  const SEGMENTS = 22;
  const positions = useMemo(() => new Float32Array(SEGMENTS * 3), []);

  useFrame((s) => {
    if (!lineRef.current) return;
    const level = engine.getLevel();
    const t = s.clock.elapsedTime;
    const ax = a.x,
      ay = a.y,
      az = a.z;
    const bx = b.x,
      by = b.y,
      bz = b.z;
    const jitter = 0.25 + level * 1.4;
    for (let i = 0; i < SEGMENTS; i++) {
      const u = i / (SEGMENTS - 1);
      const cx = ax + (bx - ax) * u;
      const cy = ay + (by - ay) * u;
      const cz = az + (bz - az) * u;
      const taper = Math.sin(u * Math.PI); // 0 at ends, 1 in middle
      const phase = t * 6 + seed * 1.3 + i * 0.9;
      positions[i * 3] = cx + Math.sin(phase) * jitter * taper;
      positions[i * 3 + 1] = cy + Math.cos(phase * 1.3) * jitter * taper * 0.7;
      positions[i * 3 + 2] = cz + Math.sin(phase * 0.8 + 1.5) * jitter * taper;
    }
    const geom = lineRef.current.geometry as THREE.BufferGeometry;
    const attr = geom.attributes.position as THREE.BufferAttribute;
    attr.array = positions;
    attr.needsUpdate = true;
    const mat = lineRef.current.material as THREE.LineBasicMaterial;
    mat.opacity = 0.08 + level * 0.9;
  });

  return (
    // @ts-expect-error — three.js Line primitive via R3F
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.2}
        toneMapped={false}
      />
    </line>
  );
}

/* ----------------------- Per-room dispatcher ---------------------------------- */
export function RoomSignature({
  roomId,
  color,
}: {
  roomId: RoomId;
  color: string;
}) {
  if (roomId === "cathedral") return <CathedralExtras color={color} />;
  if (roomId === "tide") return <TideExtras color={color} />;
  return <ForgeExtras color={color} />;
}
