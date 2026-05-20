// 3D scene rendered with react-three-fiber. Camera position drives the
// Web Audio listener every frame, so what you see and what you hear stay
// locked together.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Float, Sphere } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { engine, type RoomId } from "@/audio/engine";
import { ROOM_META } from "@/audio/rooms";
import { RoomSignature, LightningArcs } from "@/scene/RoomExtras";

export interface SceneOptions {
  autoRotate: boolean;
  intensity: number; // 0..1 — drives bloom + chromatic aberration
  lightning: boolean;
  particles: boolean;
}

interface EmitterProps {
  position: [number, number, number];
  color: string;
}

function Emitter({ position, color }: EmitterProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const baseScale = useRef(0.6 + Math.random() * 0.4);

  useFrame((state) => {
    const level = engine.getLevel();
    const t = state.clock.elapsedTime;
    const pulse = 1 + level * 1.4 + Math.sin(t * 1.2 + position[0]) * 0.08;
    if (meshRef.current) {
      meshRef.current.scale.setScalar(baseScale.current * pulse);
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.5 + level * 6;
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.6}>
      <group position={position}>
        <Sphere ref={meshRef} args={[1, 32, 32]}>
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2.6}
            toneMapped={false}
            roughness={0.2}
            metalness={0.4}
          />
        </Sphere>
        {/* Halo */}
        <Sphere args={[1.4, 24, 24]}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.06}
            toneMapped={false}
          />
        </Sphere>
        <pointLight
          ref={lightRef}
          color={color}
          intensity={2}
          distance={18}
          decay={1.8}
        />
      </group>
    </Float>
  );
}

function ListenerSync() {
  const { camera } = useThree();
  const tmpDir = useMemo(() => new THREE.Vector3(), []);
  const tmpUp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    camera.getWorldDirection(tmpDir);
    tmpUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    engine.syncListener(
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      { x: tmpDir.x, y: tmpDir.y, z: tmpDir.z },
      { x: tmpUp.x, y: tmpUp.y, z: tmpUp.z },
    );
  });
  return null;
}

function FogPlane({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = t * 0.03;
    (ref.current.material as THREE.MeshBasicMaterial).opacity =
      0.08 + Math.sin(t * 0.4) * 0.02 + engine.getLevel() * 0.06;
  });
  return (
    <mesh ref={ref} position={[0, 0, -14]}>
      <planeGeometry args={[80, 60]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.08}
        toneMapped={false}
      />
    </mesh>
  );
}

function Particles({ color, count = 600 }: { color: string; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 8 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi) * 0.5;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.size = 0.04 + engine.getLevel() * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={color}
        transparent
        opacity={0.8}
        toneMapped={false}
        sizeAttenuation
      />
    </points>
  );
}

interface SceneProps {
  roomId: RoomId;
  emitters: { x: number; y: number; z: number; color: string }[];
  options: SceneOptions;
}

const ROOM_BG: Record<RoomId, string> = {
  cathedral: "#1a0f2e",
  tide: "#03192c",
  forge: "#1f0a06",
};
const ROOM_ACCENT: Record<RoomId, string> = {
  cathedral: "#a78bfa",
  tide: "#22d3ee",
  forge: "#fb923c",
};

export function RoomScene({ roomId, emitters, options }: SceneProps) {
  const bg = ROOM_BG[roomId];
  const accent = ROOM_ACCENT[roomId];

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.6, 8], fov: 60 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ background: bg, touchAction: "none" }}
    >
      <fog attach="fog" args={[bg, 6, 40]} />
      <ambientLight intensity={0.15} />
      <ListenerSync />

      <Stars radius={120} depth={60} count={3000} factor={3} fade speed={0.4} />
      <FogPlane color={accent} />
      {options.particles && (
        <Particles color={accent} count={roomId === "forge" ? 350 : 600} />
      )}

      <RoomSignature roomId={roomId} color={accent} />

      {emitters.map((e, i) => (
        <Emitter key={i} position={[e.x, e.y, e.z]} color={e.color} />
      ))}

      {options.lightning && (
        <LightningArcs emitters={emitters} color={accent} />
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color={bg} metalness={0.9} roughness={0.45} />
      </mesh>

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        minDistance={3}
        maxDistance={22}
        maxPolarAngle={Math.PI / 1.8}
        autoRotate={options.autoRotate}
        autoRotateSpeed={0.35}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />

      <EffectComposer>
        <Bloom
          intensity={0.6 + options.intensity * 2.2}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.6}
          mipmapBlur
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={
            new THREE.Vector2(
              0.0004 + options.intensity * 0.0015,
              0.0006 + options.intensity * 0.002,
            )
          }
          radialModulation={false}
          modulationOffset={0}
        />
        <Vignette eskil={false} offset={0.2} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}

export const ROOM_DISPLAY_META = ROOM_META;
