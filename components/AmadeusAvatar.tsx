"use client";

/**
 * AmadeusAvatar — emotion-driven sprite avatar, same architecture as
 * the Habr/CodeDroidX Amadeus implementation.
 *
 * Texture strategy (article equivalent of sprite-picker):
 *   1. Look for /sprites/kurisu-{slug}.png       ← expression image
 *      and /sprites/kurisu-{slug}-open.png       ← talking variant
 *   2. If a file is missing → silently fall back to /kurisu.png
 *   3. While speaking + open variant exists: toggle base ↔ open at 5 Hz
 *      (same effect as the GIF mouth-cycle in the article)
 *   4. While speaking + no open variant: body micro-sway only
 *
 * Sprite naming (drop files in /public/sprites/):
 *   kurisu-default.png / kurisu-default-open.png
 *   kurisu-angry.png   / kurisu-angry-open.png
 *   kurisu-calm.png    / kurisu-calm-open.png
 *   … (see EMOTION_SLUG map below for every slug)
 *
 * Body animation:
 *   Each emotion maps to an EmotionConfig that controls float speed,
 *   sway amplitude, X-shake (Angry), Y offset, Z-rotation offset, and
 *   opacity. All values lerp smoothly in useFrame.
 *
 * Upgrade path:
 *   Replace PNGScene with VRMScene (see git history) to switch from
 *   sprites to a full 3D VRM avatar — Canvas/props stay identical.
 */

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import type { AmadeusEmotion } from "@/lib/prompts/amadeus";

// ── Emotion → sprite slug ──────────────────────────────────────────
// Files live in /public/sprites/kurisu-{slug}.png
// and /public/sprites/kurisu-{slug}-open.png (talking variant).
const EMOTION_SLUG: Record<string, string> = {
  "Default":           "default",
  "Very Default":      "very-default",
  "Calm":              "calm",
  "Serious":           "serious",
  "Very Serious":      "very-serious",
  "Interest":          "interest",
  "Not Interest":      "not-interest",
  "Very Not Interest": "very-not-interest",
  "Fun":               "fun",
  "Angry":             "angry",
  "Sad":               "sad",
  "Disappoint":        "disappoint",
  "Tired":             "tired",
  "Embrassed":         "embrassed",
  "Very Embrassed":    "very-embrassed",
  "Surprise":          "surprise",
  "Wink":              "wink",
  "Sleep":             "sleep",
  "Closed Sleep":      "closed-sleep",
  "Back":              "back",
};

// ── Emotion animation config ───────────────────────────────────────
// Calibrated for 320×420 canvas at z=2, fov=60 (1 unit ≈ 182 px).
type EmotionConfig = {
  floatAmp: number;    // Y float amplitude
  floatFreq: number;   // Y float frequency (Hz)
  swayAmp: number;     // Z rotation sway amplitude (radians)
  swayFreq: number;    // Z rotation sway frequency
  xShakeAmp: number;   // X shake amplitude — Angry only
  xShakeFreq: number;
  yOffset: number;     // constant Y position offset
  zRotOffset: number;  // constant Z rotation offset
  opacity: number;     // material opacity [0–1]
};

const D: EmotionConfig = {
  floatAmp: 0.070, floatFreq: 0.55,
  swayAmp: 0.018,  swayFreq: 0.38,
  xShakeAmp: 0, xShakeFreq: 0,
  yOffset: 0, zRotOffset: 0, opacity: 1,
};

const EMOTION_CONFIGS: Record<string, EmotionConfig> = {
  "Default":           { ...D },
  "Very Default":      { ...D },
  "Calm":              { ...D, floatAmp: 0.035, floatFreq: 0.35, swayAmp: 0.008, swayFreq: 0.25 },
  "Serious":           { ...D, floatAmp: 0.028, floatFreq: 0.30, swayAmp: 0.006, swayFreq: 0.20 },
  "Very Serious":      { ...D, floatAmp: 0.022, floatFreq: 0.25, swayAmp: 0.004, swayFreq: 0.15 },
  "Interest":          { ...D, floatAmp: 0.085, floatFreq: 0.70, swayAmp: 0.022, swayFreq: 0.55, yOffset:  0.10, zRotOffset: -0.06 },
  "Not Interest":      { ...D, floatAmp: 0.042, floatFreq: 0.40, swayAmp: 0.012, swayFreq: 0.30, yOffset: -0.08, zRotOffset:  0.045 },
  "Very Not Interest": { ...D, floatAmp: 0.035, floatFreq: 0.35, swayAmp: 0.008, swayFreq: 0.25, yOffset: -0.10, zRotOffset:  0.060 },
  "Fun":               { ...D, floatAmp: 0.120, floatFreq: 1.00, swayAmp: 0.032, swayFreq: 0.85, yOffset:  0.12 },
  "Angry":             { ...D, floatAmp: 0.025, floatFreq: 0.50, swayAmp: 0.012, xShakeAmp: 0.080, xShakeFreq: 9.0 },
  "Sad":               { ...D, floatAmp: 0.025, floatFreq: 0.25, swayAmp: 0.008, swayFreq: 0.20, yOffset: -0.15, zRotOffset: 0.06, opacity: 0.85 },
  "Disappoint":        { ...D, floatAmp: 0.032, floatFreq: 0.30, swayAmp: 0.008, swayFreq: 0.22, yOffset: -0.10, zRotOffset: 0.050, opacity: 0.90 },
  "Tired":             { ...D, floatAmp: 0.018, floatFreq: 0.18, swayAmp: 0.006, swayFreq: 0.14, yOffset: -0.08, zRotOffset: 0.040, opacity: 0.80 },
  "Embrassed":         { ...D, floatAmp: 0.055, floatFreq: 0.60, swayAmp: 0.065, swayFreq: 3.50 },
  "Very Embrassed":    { ...D, floatAmp: 0.060, floatFreq: 0.65, swayAmp: 0.090, swayFreq: 4.50 },
  "Surprise":          { ...D, floatAmp: 0.050, floatFreq: 0.55, swayAmp: 0.016, swayFreq: 0.45, yOffset:  0.14, zRotOffset: -0.04 },
  "Wink":              { ...D, floatAmp: 0.068, floatFreq: 0.55, swayAmp: 0.028, swayFreq: 0.50, yOffset:  0.05, zRotOffset: -0.05 },
  "Sleep":             { ...D, floatAmp: 0.014, floatFreq: 0.18, swayAmp: 0.003, swayFreq: 0.12, yOffset: -0.12, zRotOffset:  0.04, opacity: 0.65 },
  "Closed Sleep":      { ...D, floatAmp: 0.008, floatFreq: 0.14, swayAmp: 0.003, swayFreq: 0.10, yOffset: -0.16, zRotOffset:  0.05, opacity: 0.50 },
  "Back":              { ...D, floatAmp: 0.055, floatFreq: 0.55, swayAmp: 0.011, swayFreq: 0.35, zRotOffset: 1.5, opacity: 0.35 },
};

// ── 3D sprite scene ────────────────────────────────────────────────
type SceneProps = { isSpeaking: boolean; emotion: AmadeusEmotion };

function PNGScene({ isSpeaking, emotion }: SceneProps) {
  // Fallback texture — always loaded via Suspense; used when sprite is missing.
  const fallback = useTexture("/kurisu.png");

  const meshRef  = useRef<THREE.Mesh>(null);
  // Refs (not state) so texture swaps happen inside useFrame without re-renders.
  const baseTexRef = useRef<THREE.Texture | null>(null);
  const openTexRef = useRef<THREE.Texture | null>(null);
  const hasOpenRef = useRef(false);

  const slug = EMOTION_SLUG[emotion] ?? "default";

  // Load base + open-mouth textures whenever the emotion changes.
  // THREE.TextureLoader silently calls onError on 404 — no crash.
  useEffect(() => {
    baseTexRef.current = null;
    openTexRef.current = null;
    hasOpenRef.current = false;

    const loader = new THREE.TextureLoader();

    loader.load(
      `/sprites/kurisu-${slug}.png`,
      (t) => { baseTexRef.current = t; },
      undefined,
      () => { /* 404 — falls back to /kurisu.png in useFrame */ }
    );

    loader.load(
      `/sprites/kurisu-${slug}-open.png`,
      (t) => { openTexRef.current = t; hasOpenRef.current = true; },
      undefined,
      () => { /* no open variant — body sway used instead */ }
    );
  }, [slug]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t   = state.clock.elapsedTime;
    const cfg = EMOTION_CONFIGS[emotion] ?? EMOTION_CONFIGS["Default"];
    const mat = mesh.material as THREE.MeshBasicMaterial;

    // ── Texture swap (article equivalent of sprite-picker) ────────
    const baseTex = baseTexRef.current ?? fallback;
    let nextTex: THREE.Texture;

    if (isSpeaking && hasOpenRef.current && openTexRef.current) {
      // 5 Hz toggle: base ↔ open — replicates GIF mouth animation
      nextTex = Math.sin(t * Math.PI * 10) > 0 ? openTexRef.current : baseTex;
    } else {
      nextTex = baseTex;
    }

    if (mat.map !== nextTex) {
      mat.map = nextTex;
      mat.needsUpdate = true;
    }

    // ── Body animation ────────────────────────────────────────────
    const targetY = Math.sin(t * cfg.floatFreq) * cfg.floatAmp + cfg.yOffset;
    const targetZ = Math.sin(t * cfg.swayFreq)  * cfg.swayAmp  + cfg.zRotOffset;
    const targetX = cfg.xShakeAmp > 0
      ? Math.sin(t * cfg.xShakeFreq) * cfg.xShakeAmp
      : 0;

    if (isSpeaking) {
      // When mouth sprites handle the talking, dial back body sway so
      // it doesn't fight the texture toggle visually.
      const f = hasOpenRef.current ? 0.25 : 1.0;
      mesh.position.y = targetY + Math.sin(t * 14) * 0.022 * f;
      mesh.rotation.z = targetZ + Math.sin(t * 11) * 0.030 * f;
      mesh.position.x = targetX;
      mesh.scale.y    = 1 + Math.sin(t * 18) * 0.014 * f;
      mesh.scale.x    = 1 - Math.sin(t * 18) * 0.007 * f;
    } else {
      mesh.position.y += (targetY - mesh.position.y) * Math.min(delta * 4, 1);
      mesh.rotation.z += (targetZ - mesh.rotation.z) * Math.min(delta * 3, 1);
      mesh.position.x += (targetX - mesh.position.x) * Math.min(delta * 8, 1);
      mesh.scale.y    += (1 - mesh.scale.y)           * Math.min(delta * 6, 1);
      mesh.scale.x    += (1 - mesh.scale.x)           * Math.min(delta * 6, 1);
    }

    // Opacity (Sad, Sleep, Back, etc.)
    mat.opacity += (cfg.opacity - mat.opacity) * Math.min(delta * 3, 1);
  });

  const planeH = 2.8;
  const planeW = planeH * 0.72;

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[planeW, planeH]} />
      {/*
       * Initial map is fallback; useFrame swaps to sprite texture once loaded.
       * transparent + alphaTest cut out the PNG background.
       */}
      <meshBasicMaterial
        map={fallback}
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
       * gl.alpha:true keeps the CRT panel background visible around the sprite.
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
