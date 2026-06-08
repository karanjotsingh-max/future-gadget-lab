"use client";

/**
 * AmadeusAvatar — React Three Fiber canvas with kurisu.png as a 3D plane.
 *
 * Technique: "paper cutout" — the PNG is loaded as a Three.js texture and
 * mapped onto a flat plane. useFrame drives idle float + speaking animations
 * (scale pulse, head sway) to make the still image feel alive.
 *
 * Upgrade path: when a proper Kurisu .vrm is available, replace PNGScene
 * with the VRMScene implementation (see git history) and swap the camera.
 *
 * Dynamically imported with ssr:false in amadeus/page.tsx because
 * Three.js / WebGL only exist in the browser.
 */

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

// ── 3D PNG scene ───────────────────────────────────────────────────
type SceneProps = { isSpeaking: boolean };

function PNGScene({ isSpeaking }: SceneProps) {
  // useTexture suspends until the PNG is loaded; R3F/drei cache it.
  const texture = useTexture("/kurisu.png");

  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = state.clock.elapsedTime;

    // Idle animation — gentle vertical float + very subtle side sway.
    const idleY = Math.sin(t * 0.6) * 0.025;
    const idleZ = Math.sin(t * 0.4) * 0.005;

    if (isSpeaking) {
      // Speaking — faster head micro-sway + slight scale pulse on Y.
      mesh.position.y = idleY + Math.sin(t * 14) * 0.008;
      mesh.rotation.z = idleZ + Math.sin(t * 11) * 0.012;
      mesh.scale.y = 1 + Math.sin(t * 18) * 0.006;
      mesh.scale.x = 1 - Math.sin(t * 18) * 0.003; // subtle squeeze
    } else {
      mesh.position.y += (idleY - mesh.position.y) * Math.min(delta * 4, 1);
      mesh.rotation.z += (idleZ - mesh.rotation.z) * Math.min(delta * 3, 1);
      mesh.scale.y += (1 - mesh.scale.y) * Math.min(delta * 6, 1);
      mesh.scale.x += (1 - mesh.scale.x) * Math.min(delta * 6, 1);
    }
  });

  // Size the plane to match the PNG's aspect ratio.
  // kurisu.png is portrait; we fill most of the 320×420 canvas.
  const planeH = 2.8;
  const planeW = planeH * 0.72; // approximate portrait aspect

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[planeW, planeH]} />
      {/*
       * meshBasicMaterial — unlit, so the PNG colours show exactly as-is.
       * transparent + alphaTest cuts out the PNG background.
       */}
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.1}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// ── Exported component ─────────────────────────────────────────────
type Props = { isSpeaking: boolean; isOnline: boolean };

export function AmadeusAvatar({ isSpeaking, isOnline }: Props) {
  return (
    <div className="relative" style={{ width: "320px", height: "420px" }}>
      {/* Speaking glow ring */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            key="glow"
            className="pointer-events-none absolute inset-0 z-10 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.1, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ boxShadow: "0 0 40px 12px rgba(123,47,190,0.45)" }}
          />
        )}
      </AnimatePresence>

      {/*
       * Camera sits at z=2 looking at the origin. The PNG plane is centred
       * there, so no lookAt override is needed.
       * gl.alpha:true lets the dark CRT panel show around the plane edges.
       */}
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, 2], fov: 60 }}
        style={{
          filter: isOnline
            ? "drop-shadow(0 0 18px rgba(123,47,190,0.5))"
            : "drop-shadow(0 0 6px rgba(123,47,190,0.2)) grayscale(0.6)",
          opacity: isOnline ? 1 : 0.25,
          transition: "opacity 0.8s",
        }}
      >
        <Suspense fallback={null}>
          <PNGScene isSpeaking={isSpeaking} />
        </Suspense>
      </Canvas>

      {/* CRT vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-20 rounded-lg"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(10,10,15,0.55) 100%)",
        }}
      />
    </div>
  );
}
