"use client";

/**
 * AmadeusAvatar — React Three Fiber canvas with a VRM 3D model.
 *
 * Model: VRM1_Constraint_Twist_Sample.vrm (CC BY 4.0, Pixiv/three-vrm)
 * Animations driven by isSpeaking / isOnline props:
 *   - Mouth: "aa" expression oscillates while speaking
 *   - Eyes:  periodic blink in idle (every 4-6 s)
 *   - Spring bones + look-at updated every frame via vrm.update(delta)
 *
 * Dynamically imported with ssr:false in amadeus/page.tsx because
 * Three.js / WebGL only exist in the browser.
 */

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, type VRM } from "@pixiv/three-vrm";
import { motion, AnimatePresence } from "framer-motion";

// ── Camera helper ──────────────────────────────────────────────────
// Runs inside Canvas; aims the default camera at head height once.
// Model is NOT offset — head is at world y ≈ 1.4 (natural VRM height).
function CameraLookAt() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 1.4, 0);
  }, [camera]);
  return null;
}

// ── VRM scene ──────────────────────────────────────────────────────
type SceneProps = { isSpeaking: boolean };

function VRMScene({ isSpeaking }: SceneProps) {
  // useLoader suspends until the file is loaded; R3F caches by URL.
  const gltf = useLoader(GLTFLoader, "/kurisu.vrm", (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  const vrm = gltf.userData.vrm as VRM | undefined;

  // Blink state — all in refs so they don't cause re-renders.
  const blinkTimer = useRef(0);
  const nextBlink = useRef(4); // randomised after mount in useEffect below
  const isBlinking = useRef(false);
  const blinkProgress = useRef(0);

  useEffect(() => {
    // Randomise the first blink interval client-side (avoids impure render call).
    nextBlink.current = 3.5 + Math.random() * 2.5;
  }, []);

  useEffect(() => {
    if (!vrm) return;
    // Keep model at y=0 (feet on floor). Camera aimed at y=1.4 (head height).
    vrm.scene.position.set(0, 0, 0);
  }, [vrm]);

  // useFrame receives (state, delta) — delta is seconds since last frame.
  useFrame((state, delta) => {
    if (!vrm) return;

    const em = vrm.expressionManager;
    if (em) {
      // ── Mouth ──────────────────────────────────────────────────
      if (isSpeaking) {
        // Sinusoidal open/close at ~5 Hz to mimic talking.
        const mouthOpen = (Math.sin(state.clock.elapsedTime * 32) * 0.5 + 0.5) * 0.75;
        em.setValue("aa", mouthOpen);
      } else {
        em.setValue("aa", 0);
      }

      // ── Blink ──────────────────────────────────────────────────
      blinkTimer.current += delta;

      if (!isBlinking.current && blinkTimer.current >= nextBlink.current) {
        isBlinking.current = true;
        blinkProgress.current = 0;
      }

      if (isBlinking.current) {
        blinkProgress.current += delta;
        const BLINK_DURATION = 0.18; // seconds for a full blink cycle
        const t = blinkProgress.current / BLINK_DURATION;
        // t: 0→1 closes eye, 1→2 opens eye
        em.setValue("blink", t < 1 ? t : Math.max(0, 2 - t));

        if (blinkProgress.current >= BLINK_DURATION) {
          em.setValue("blink", 0);
          isBlinking.current = false;
          blinkTimer.current = 0;
          nextBlink.current = 3.5 + Math.random() * 2.5;
        }
      }
    }

    // Spring bones, look-at, constraints — must be called every frame.
    vrm.update(delta);
  });

  if (!vrm) return null;

  // <primitive> inserts any Three.js Object3D directly into the R3F scene.
  return <primitive object={vrm.scene} dispose={null} />;
}

// ── Exported component ─────────────────────────────────────────────
type Props = { isSpeaking: boolean; isOnline: boolean };

export function AmadeusAvatar({ isSpeaking, isOnline }: Props) {
  return (
    <div className="relative" style={{ width: "320px", height: "420px" }}>
      {/* PNG fallback — visible behind the canvas while VRM is loading
          or if no VRM model is present yet. Canvas is transparent so
          once the VRM loads it renders on top of this image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/kurisu.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-contain"
        style={{
          filter: isOnline
            ? "drop-shadow(0 0 14px rgba(123,47,190,0.4))"
            : "grayscale(0.7) opacity(0.25)",
        }}
      />

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
       * gl={{ alpha: true }} → transparent canvas so the PNG fallback
       * behind shows through until the VRM finishes loading.
       */}
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 1.6, 1.0], fov: 35 }}
        style={{
          filter: isOnline
            ? "drop-shadow(0 0 18px rgba(123,47,190,0.5))"
            : "drop-shadow(0 0 6px rgba(123,47,190,0.2)) grayscale(0.6)",
          opacity: isOnline ? 1 : 0.25,
          transition: "opacity 0.8s",
        }}
      >
        <CameraLookAt />
        {/* Soft blue-white key light + subtle purple fill from below */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[1, 2, 2]} intensity={1.0} color="#b8c5ff" />
        <directionalLight position={[-1, 0, 1]} intensity={0.3} color="#7b2fbe" />

        <Suspense fallback={null}>
          <VRMScene isSpeaking={isSpeaking} />
        </Suspense>
      </Canvas>

      {/* CRT vignette overlay (matching the rest of the UI) */}
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
