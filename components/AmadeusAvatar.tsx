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
// Calibrated for 320×420 canvas, camera at z=3, fov=60 (sprite 852×1411 px).
// No Z-rotation — flat 2D sprites look unnatural when tilted.
// Only Y-float, subtle X-shake for Angry, and yOffset for mood height.
type EmotionConfig = {
  floatAmp: number;    // Y float amplitude
  floatFreq: number;   // Y float frequency (Hz)
  swayAmp: number;     // Z rotation amplitude — only for Embrassed head-wiggle
  swayFreq: number;    // Z rotation frequency
  xShakeAmp: number;   // X shake amplitude — Angry only
  xShakeFreq: number;
  yOffset: number;     // constant Y position offset
  opacity: number;     // material opacity [0–1]
};

const D: EmotionConfig = {
  floatAmp: 0.040, floatFreq: 0.50,
  swayAmp: 0,      swayFreq: 0,
  xShakeAmp: 0, xShakeFreq: 0,
  yOffset: 0, opacity: 1,
};

const EMOTION_CONFIGS: Record<string, EmotionConfig> = {
  "Default":           { ...D },
  "Very Default":      { ...D },
  "Calm":              { ...D, floatAmp: 0.020, floatFreq: 0.35 },
  "Serious":           { ...D, floatAmp: 0.015, floatFreq: 0.30 },
  "Very Serious":      { ...D, floatAmp: 0.012, floatFreq: 0.25 },
  "Interest":          { ...D, floatAmp: 0.050, floatFreq: 0.65, yOffset:  0.06 },
  "Not Interest":      { ...D, floatAmp: 0.025, floatFreq: 0.40, yOffset: -0.05 },
  "Very Not Interest": { ...D, floatAmp: 0.020, floatFreq: 0.35, yOffset: -0.07 },
  "Fun":               { ...D, floatAmp: 0.065, floatFreq: 0.90, yOffset:  0.08 },
  "Angry":             { ...D, floatAmp: 0.015, floatFreq: 0.50, xShakeAmp: 0.055, xShakeFreq: 9.0 },
  "Sad":               { ...D, floatAmp: 0.015, floatFreq: 0.25, yOffset: -0.08, opacity: 0.85 },
  "Disappoint":        { ...D, floatAmp: 0.020, floatFreq: 0.30, yOffset: -0.06, opacity: 0.90 },
  "Tired":             { ...D, floatAmp: 0.010, floatFreq: 0.18, yOffset: -0.05, opacity: 0.80 },
  // Embrassed: fast Z-sway only — looks like a nervous head-wiggle on 2D sprite
  "Embrassed":         { ...D, floatAmp: 0.028, floatFreq: 0.60, swayAmp: 0.018, swayFreq: 3.50 },
  "Very Embrassed":    { ...D, floatAmp: 0.032, floatFreq: 0.65, swayAmp: 0.025, swayFreq: 4.50 },
  "Surprise":          { ...D, floatAmp: 0.035, floatFreq: 0.55, yOffset:  0.08 },
  "Wink":              { ...D, floatAmp: 0.040, floatFreq: 0.55, yOffset:  0.03 },
  "Sleep":             { ...D, floatAmp: 0.008, floatFreq: 0.18, yOffset: -0.08, opacity: 0.65 },
  "Closed Sleep":      { ...D, floatAmp: 0.005, floatFreq: 0.14, yOffset: -0.10, opacity: 0.50 },
  // Back sprite already shows her turned — no rotation needed, slight dim only
  "Back":              { ...D, floatAmp: 0.025, floatFreq: 0.45, opacity: 0.90 },
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
      (t) => { t.colorSpace = THREE.SRGBColorSpace; baseTexRef.current = t; },
      undefined,
      () => { /* 404 — falls back to /kurisu.png in useFrame */ }
    );

    loader.load(
      `/sprites/kurisu-${slug}-open.png`,
      (t) => { t.colorSpace = THREE.SRGBColorSpace; openTexRef.current = t; hasOpenRef.current = true; },
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
    // Z sway only for Embrassed head-wiggle; 0 for all other emotions
    const targetZ = Math.sin(t * cfg.swayFreq) * cfg.swayAmp;
    const targetX = cfg.xShakeAmp > 0
      ? Math.sin(t * cfg.xShakeFreq) * cfg.xShakeAmp
      : 0;

    if (isSpeaking && !hasOpenRef.current) {
      // No mouth sprites: show speaking via subtle scale pulse only
      mesh.position.y = targetY;
      mesh.rotation.z = targetZ;
      mesh.position.x = targetX;
      mesh.scale.y    = 1 + Math.sin(t * 18) * 0.010;
      mesh.scale.x    = 1 - Math.sin(t * 18) * 0.005;
    } else {
      // Mouth sprites active (or idle): smooth lerp — no jitter
      mesh.position.y += (targetY - mesh.position.y) * Math.min(delta * 4, 1);
      mesh.rotation.z += (targetZ - mesh.rotation.z) * Math.min(delta * 3, 1);
      mesh.position.x += (targetX - mesh.position.x) * Math.min(delta * 8, 1);
      mesh.scale.y    += (1 - mesh.scale.y)           * Math.min(delta * 6, 1);
      mesh.scale.x    += (1 - mesh.scale.x)           * Math.min(delta * 6, 1);
    }

    // Opacity (Sad, Sleep, etc.)
    mat.opacity += (cfg.opacity - mat.opacity) * Math.min(delta * 3, 1);
  });

  // Sprite is 852×1411 px → aspect 0.6038
  // Camera at z=3, fov=60 → visible height = 3.46 units
  // planeH=3.0 fills ~87% of visible height — full sprite fits with margin
  const planeH = 3.0;
  const planeW = planeH * (852 / 1411); // ≈ 1.81 — preserves true aspect ratio

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
  // zIndex:10 — lifts avatar above .crt-frame::after scanline overlay
  return (
    <div className="relative" style={{ width: "320px", height: "420px", zIndex: 10 }}>
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
        camera={{ position: [0, 0, 3], fov: 60 }}
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
