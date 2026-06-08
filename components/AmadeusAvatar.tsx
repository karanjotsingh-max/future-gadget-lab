"use client";

/**
 * AmadeusAvatar — React Three Fiber canvas with kurisu.png as a 3D plane.
 *
 * Technique: "paper cutout" — the PNG is loaded as a Three.js texture and
 * mapped onto a flat plane. useFrame drives idle float + speaking animations
 * (scale pulse, head sway) to make the still image feel alive.
 *
 * Emotion system (step 1.3d): each of the 20 canonical emotions maps to an
 * EmotionConfig that controls float speed/amplitude, sway, X-shake, Y offset,
 * Z-rotation offset, and opacity. Transitions are lerped in useFrame.
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
import type { AmadeusEmotion } from "@/lib/prompts/amadeus";

// ── Emotion animation config ───────────────────────────────────────
type EmotionConfig = {
  floatAmp: number;    // Y float amplitude
  floatFreq: number;   // Y float frequency (Hz)
  swayAmp: number;     // Z rotation sway amplitude (radians)
  swayFreq: number;    // Z rotation sway frequency (Hz)
  xShakeAmp: number;   // X position shake amplitude (Angry)
  xShakeFreq: number;  // X position shake frequency
  yOffset: number;     // constant Y position offset
  zRotOffset: number;  // constant Z rotation offset
  opacity: number;     // material opacity [0–1]
};

const D: EmotionConfig = {
  floatAmp: 0.025, floatFreq: 0.6,
  swayAmp: 0.005, swayFreq: 0.4,
  xShakeAmp: 0, xShakeFreq: 0,
  yOffset: 0, zRotOffset: 0, opacity: 1,
};

const EMOTION_CONFIGS: Record<string, EmotionConfig> = {
  "Default":          { ...D },
  "Very Default":     { ...D },
  "Calm":             { ...D, floatAmp: 0.012, floatFreq: 0.35, swayAmp: 0.003, swayFreq: 0.25 },
  "Serious":          { ...D, floatAmp: 0.010, floatFreq: 0.30, swayAmp: 0.002, swayFreq: 0.20 },
  "Very Serious":     { ...D, floatAmp: 0.008, floatFreq: 0.25, swayAmp: 0.001, swayFreq: 0.15 },
  "Interest":         { ...D, floatAmp: 0.030, floatFreq: 0.70, swayAmp: 0.008, swayFreq: 0.55, yOffset: 0.04, zRotOffset: -0.03 },
  "Not Interest":     { ...D, floatAmp: 0.015, floatFreq: 0.40, swayAmp: 0.004, swayFreq: 0.30, yOffset: -0.03, zRotOffset: 0.02 },
  "Very Not Interest":{ ...D, floatAmp: 0.012, floatFreq: 0.35, swayAmp: 0.003, swayFreq: 0.25, yOffset: -0.04, zRotOffset: 0.03 },
  "Fun":              { ...D, floatAmp: 0.045, floatFreq: 1.00, swayAmp: 0.012, swayFreq: 0.85, yOffset: 0.05 },
  "Angry":            { ...D, floatAmp: 0.010, floatFreq: 0.50, xShakeAmp: 0.030, xShakeFreq: 9.0 },
  "Sad":              { ...D, floatAmp: 0.010, floatFreq: 0.25, swayAmp: 0.003, swayFreq: 0.20, yOffset: -0.06, zRotOffset: 0.03, opacity: 0.85 },
  "Disappoint":       { ...D, floatAmp: 0.012, floatFreq: 0.30, swayAmp: 0.003, swayFreq: 0.22, yOffset: -0.04, zRotOffset: 0.025, opacity: 0.90 },
  "Tired":            { ...D, floatAmp: 0.007, floatFreq: 0.18, swayAmp: 0.002, swayFreq: 0.14, yOffset: -0.03, zRotOffset: 0.018, opacity: 0.80 },
  "Embrassed":        { ...D, floatAmp: 0.020, floatFreq: 0.60, swayAmp: 0.025, swayFreq: 3.50 },
  "Very Embrassed":   { ...D, floatAmp: 0.022, floatFreq: 0.65, swayAmp: 0.035, swayFreq: 4.50 },
  "Surprise":         { ...D, floatAmp: 0.018, floatFreq: 0.55, swayAmp: 0.006, swayFreq: 0.45, yOffset: 0.06, zRotOffset: -0.02 },
  "Wink":             { ...D, floatAmp: 0.025, floatFreq: 0.55, swayAmp: 0.010, swayFreq: 0.50, yOffset: 0.02, zRotOffset: -0.025 },
  "Sleep":            { ...D, floatAmp: 0.005, floatFreq: 0.18, swayAmp: 0.001, swayFreq: 0.12, yOffset: -0.05, zRotOffset: 0.02, opacity: 0.65 },
  "Closed Sleep":     { ...D, floatAmp: 0.003, floatFreq: 0.14, swayAmp: 0.001, swayFreq: 0.10, yOffset: -0.07, zRotOffset: 0.025, opacity: 0.50 },
  // "Back" — she turns away: extreme tilt + low opacity
  "Back":             { ...D, floatAmp: 0.020, floatFreq: 0.55, swayAmp: 0.004, swayFreq: 0.35, zRotOffset: 1.5, opacity: 0.35 },
};

// ── 3D PNG scene ───────────────────────────────────────────────────
type SceneProps = { isSpeaking: boolean; emotion: AmadeusEmotion };

function PNGScene({ isSpeaking, emotion }: SceneProps) {
  // useTexture suspends until the PNG is loaded; R3F/drei cache it.
  const texture = useTexture("/kurisu.png");

  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = state.clock.elapsedTime;
    const cfg = EMOTION_CONFIGS[emotion] ?? EMOTION_CONFIGS["Default"];

    // Target values driven by the current emotion config
    const targetY   = Math.sin(t * cfg.floatFreq) * cfg.floatAmp + cfg.yOffset;
    const targetZ   = Math.sin(t * cfg.swayFreq)  * cfg.swayAmp  + cfg.zRotOffset;
    const targetX   = cfg.xShakeAmp > 0
      ? Math.sin(t * cfg.xShakeFreq) * cfg.xShakeAmp
      : 0;

    if (isSpeaking) {
      // Micro-sway is additive on top of the emotion base position.
      mesh.position.y = targetY + Math.sin(t * 14) * 0.008;
      mesh.rotation.z = targetZ + Math.sin(t * 11) * 0.012;
      mesh.position.x = targetX;
      mesh.scale.y = 1 + Math.sin(t * 18) * 0.006;
      mesh.scale.x = 1 - Math.sin(t * 18) * 0.003;
    } else {
      mesh.position.y += (targetY - mesh.position.y) * Math.min(delta * 4, 1);
      mesh.rotation.z += (targetZ - mesh.rotation.z) * Math.min(delta * 3, 1);
      mesh.position.x += (targetX - mesh.position.x) * Math.min(delta * 8, 1);
      mesh.scale.y    += (1 - mesh.scale.y)           * Math.min(delta * 6, 1);
      mesh.scale.x    += (1 - mesh.scale.x)           * Math.min(delta * 6, 1);
    }

    // Lerp material opacity for dim/fade emotions (Sad, Sleep, Back…)
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity += (cfg.opacity - mat.opacity) * Math.min(delta * 3, 1);
  });

  const planeH = 2.8;
  const planeW = planeH * 0.72;

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[planeW, planeH]} />
      {/*
       * meshBasicMaterial — unlit, so the PNG colours show exactly as-is.
       * transparent + alphaTest cuts out the PNG background.
       * opacity is driven in useFrame via mat.opacity.
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
type Props = { isSpeaking: boolean; isOnline: boolean; emotion: AmadeusEmotion };

export function AmadeusAvatar({ isSpeaking, isOnline, emotion }: Props) {
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
          <PNGScene isSpeaking={isSpeaking} emotion={emotion} />
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
