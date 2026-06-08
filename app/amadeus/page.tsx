"use client";

/**
 * /amadeus — Kurisu Makise video-call interface (Amadeus system)
 *
 * Layout (true video-call):
 *   - Top ~75 vh : video feed panel — avatar centred, full-width
 *   - Bottom ~25 vh : compact chat strip — messages + input
 * Voice:  Edge TTS via /api/amadeus/tts — audio/mpeg played via Web Audio API
 * Avatar: React Three Fiber + VRM 3D model (mouth/eye animation)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage, AmadeusEmotion } from "@/lib/prompts/amadeus";

// Dynamically imported with ssr:false — Three.js/WebGL is browser-only.
// The fallback renders nothing while the JS bundle loads.
const AmadeusAvatar = dynamic(
  () => import("@/components/AmadeusAvatar").then((m) => m.AmadeusAvatar),
  { ssr: false, loading: () => null }
);

// ─── Types ────────────────────────────────────────────────────
type ConnectionStatus = "connecting" | "online" | "error";
type Message = ChatMessage & { id: string };

// ─── Constants ────────────────────────────────────────────────
const STORAGE_KEY = "amadeus_history_v1";
const MAX_STORED = 40;

// ─── Helpers ──────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadHistory(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
  } catch {
    // localStorage unavailable — silently skip
  }
}

// ─── HUD corner brackets ──────────────────────────────────────
function HudCorner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = "absolute h-6 w-6 border-(--color-amadeus-purple)/40";
  const sides = {
    tl: "top-4 left-4 border-t border-l",
    tr: "top-4 right-4 border-t border-r",
    bl: "bottom-4 left-4 border-b border-l",
    br: "bottom-4 right-4 border-b border-r",
  }[pos];
  return <div className={`${base} ${sides}`} />;
}


// ─── Single message row ───────────────────────────────────────
function MessageBubble({ msg, isStreaming }: { msg: Message; isStreaming: boolean }) {
  const isKurisu = msg.role === "assistant";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex flex-col gap-0.5 ${isKurisu ? "items-start" : "items-end"}`}
    >
      <span className="text-[9px] tracking-[0.25em] text-(--color-text-muted)" style={{ fontFamily: "var(--font-ui)" }}>
        {isKurisu ? "AMADEUS" : "YOU"}
      </span>
      <p
        className={`max-w-[88%] rounded px-3 py-1.5 text-sm leading-relaxed ${
          isKurisu
            ? `phosphor-purple border border-(--color-amadeus-purple)/30 bg-(--color-bg)/90 ${isStreaming ? "terminal-cursor" : ""}`
            : "border border-(--color-terminal-green)/25 bg-(--color-bg)/90 text-(--color-terminal-green)"
        }`}
        style={{ fontFamily: "var(--font-ui)" }}
      >
        {msg.content || "\u00A0"}
      </p>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function AmadeusPage() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  // Start empty to match the server render (avoids hydration mismatch).
  // History is loaded from localStorage after mount in the useEffect below.
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [emotion, setEmotion] = useState<AmadeusEmotion>("Default");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load localStorage history after mount (not during render — avoids SSR mismatch).
  useEffect(() => {
    const history = loadHistory();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (history.length > 0) setMessages(history);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setStatus("online"), 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
    audioRef.current = null;
  }, []);

  const speakEdgeTTS = useCallback(async (text: string, onEnd: () => void) => {
    try {
      const res = await fetch("/api/amadeus/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { onEnd(); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); onEnd(); };
      audio.onerror = () => { URL.revokeObjectURL(url); onEnd(); };
      await audio.play();
    } catch {
      onEnd();
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: uid(), role: "user", content: text };
    const assistantId = uid();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);
    setStreamingId(assistantId);
    setEmotion("Default");
    stopAudio();
    setIsSpeaking(false);

    const history = [
      ...messages
        .filter((m) => m.content.trim().length > 0 && !m.content.startsWith("...[ TRANSMISSION INTERRUPTED ]"))
        .map(({ role, content }) => ({ role, content })),
      { role: userMsg.role, content: userMsg.content },
    ];

    try {
      const res = await fetch("/api/amadeus/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) throw new Error(await res.text().catch(() => "Unknown error"));

      // Read emotion from header before consuming the stream body.
      const rawEmotion = res.headers.get("X-Amadeus-Emotion");
      if (rawEmotion) setEmotion(rawEmotion as AmadeusEmotion);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
        );
      }

      if (voiceEnabled && accumulated.trim()) {
        setIsSpeaking(true);
        void speakEdgeTTS(accumulated, () => setIsSpeaking(false));
      }

      setMessages((prev) => {
        const clean = prev.filter(
          (m) => m.content.trim().length > 0 && !m.content.startsWith("...[ TRANSMISSION INTERRUPTED ]")
        );
        saveHistory(clean);
        return prev;
      });
    } catch (err) {
      console.error("[amadeus] transmission error:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "...[ TRANSMISSION INTERRUPTED ]" } : m
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingId(null);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, voiceEnabled, speakEdgeTTS, stopAudio]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    stopAudio();
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    if (voiceEnabled) { stopAudio(); setIsSpeaking(false); }
    setVoiceEnabled((v) => !v);
  };

  return (
    // Fill the viewport below the nav bar
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>

      {/* ═══════════════════════════════════════════════════════
          VIDEO FEED — 75 % of height
      ═══════════════════════════════════════════════════════ */}
      <div
        className="crt-frame crt-flicker relative flex flex-col items-center justify-center overflow-hidden"
        style={{ flex: "0 0 75%" }}
      >
        <HudCorner pos="tl" />
        <HudCorner pos="tr" />
        <HudCorner pos="bl" />
        <HudCorner pos="br" />

        {/* Top status bar */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between border-b border-(--color-amadeus-purple)/20 px-5 py-2 bg-(--color-bg)/60 backdrop-blur-sm">
          <span className="text-[9px] tracking-[0.35em] text-(--color-text-muted)" style={{ fontFamily: "var(--font-ui)" }}>
            AMADEUS_SYS v2.0.1049
          </span>

          <AnimatePresence mode="wait">
            {status === "connecting" ? (
              <motion.span key="conn" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                className="text-[9px] tracking-[0.3em] text-(--color-steiner-amber)" style={{ fontFamily: "var(--font-ui)" }}>
                ● CONNECTING...
              </motion.span>
            ) : status === "online" ? (
              <motion.span key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="phosphor-purple text-[9px] tracking-[0.3em]" style={{ fontFamily: "var(--font-ui)" }}>
                ● LIVE
              </motion.span>
            ) : (
              <span className="text-[9px] tracking-[0.3em] text-(--color-alert-red)" style={{ fontFamily: "var(--font-ui)" }}>● ERROR</span>
            )}
          </AnimatePresence>

          {/* Voice toggle */}
          <button onClick={toggleVoice}
            className={`text-[9px] tracking-[0.25em] transition ${voiceEnabled ? "phosphor-purple" : "text-(--color-text-dim)"}`}
            style={{ fontFamily: "var(--font-ui)" }}>
            {voiceEnabled ? "▶ VOICE ON" : "▶ VOICE OFF"}
          </button>
        </div>

        {/* 3D Avatar */}
        <AmadeusAvatar isOnline={status === "online"} isSpeaking={isSpeaking} emotion={emotion} />

        {/* Name plate */}
        <AnimatePresence mode="wait">
          {status === "connecting" ? (
            <motion.p key="est" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
              className="mt-5 text-[11px] tracking-[0.55em] text-(--color-steiner-amber)" style={{ fontFamily: "var(--font-ui)" }}>
              ESTABLISHING LINK...
            </motion.p>
          ) : (
            <motion.div key="id" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="mt-5 flex flex-col items-center gap-1">
              <p className="phosphor-purple text-base tracking-[0.4em]" style={{ fontFamily: "var(--font-display)" }}>
                KURISU MAKISE
              </p>
              <p className="text-[9px] tracking-[0.3em] text-(--color-text-muted)" style={{ fontFamily: "var(--font-ui)" }}>
                AMADEUS DIGITAL RECREATION · ACTIVE
              </p>

              {/* Speaking bars */}
              <AnimatePresence>
                {isSpeaking && (
                  <motion.div key="bars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="mt-1 flex items-center gap-1.5">
                    {[0, 1, 2, 3, 2, 1].map((delay, i) => (
                      <motion.div key={i} className="w-0.5 rounded-full bg-(--color-amadeus-purple)/70"
                        animate={{ height: ["3px", "14px", "3px"] }}
                        transition={{ duration: 0.45, repeat: Infinity, delay: delay * 0.1 }} />
                    ))}
                    <span className="ml-1 text-[8px] tracking-[0.2em] text-(--color-amadeus-purple)/60" style={{ fontFamily: "var(--font-ui)" }}>
                      SPEAKING
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom HUD strip */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between border-t border-(--color-amadeus-purple)/15 px-5 py-1.5 bg-(--color-bg)/50">
          <span className="text-[8px] tracking-[0.2em] text-(--color-text-dim)" style={{ fontFamily: "var(--font-ui)" }}>
            VIKTOR CHONDRIA UNIV.
          </span>
          <span className="text-[8px] tracking-[0.2em] text-(--color-text-dim)" style={{ fontFamily: "var(--font-ui)" }}>
            LAT 35.6° / LON 139.7°
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          CHAT STRIP — 25 % of height
      ═══════════════════════════════════════════════════════ */}
      <div
        className="crt-frame flex flex-col border-t-0 overflow-hidden"
        style={{ flex: "0 0 25%" }}
      >
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-(--color-amadeus-purple)/20 px-4 py-1.5 shrink-0">
          <span className="text-[9px] tracking-[0.3em] text-(--color-text-muted)" style={{ fontFamily: "var(--font-ui)" }}>
            TRANSMISSION LOG
          </span>
          {messages.length > 0 && (
            <button onClick={clearHistory}
              className="text-[9px] tracking-[0.2em] text-(--color-text-dim) hover:text-(--color-alert-red) transition"
              style={{ fontFamily: "var(--font-ui)" }}>
              CLEAR SESSION
            </button>
          )}
        </div>

        {/* Messages — scrollable */}
        <div ref={scrollRef} className="flex flex-col gap-2 overflow-y-auto px-4 py-2 flex-1"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(123,47,190,0.2) transparent" }}>
          {messages.length === 0 && status === "online" && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-center text-xs text-(--color-text-dim) my-auto" style={{ fontFamily: "var(--font-ui)" }}>
              {">"} Transmission channel open.
            </motion.p>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isStreaming={msg.id === streamingId && isLoading} />
          ))}
        </div>

        {/* Input row */}
        <div className="border-t border-(--color-amadeus-purple)/20 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="phosphor-purple flex-shrink-0 text-sm" style={{ fontFamily: "var(--font-ui)" }}>{">"}</span>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={status !== "online" || isLoading}
              placeholder={
                status === "connecting" ? "Waiting for connection..."
                  : isLoading ? "Amadeus is responding..."
                  : "Say something..."
              }
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-(--color-text-cold) placeholder:text-(--color-text-dim) focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              style={{ fontFamily: "var(--font-ui)" }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={status !== "online" || isLoading || !input.trim()}
              className="flex-shrink-0 border border-(--color-amadeus-purple)/40 px-3 py-1 text-[10px] tracking-[0.2em] text-(--color-amadeus-purple) transition hover:border-(--color-amadeus-purple) hover:bg-(--color-amadeus-purple)/10 disabled:cursor-not-allowed disabled:opacity-30"
              style={{ fontFamily: "var(--font-ui)" }}>
              SEND
            </button>
          </div>
          <p className="mt-0.5 text-[8px] tracking-[0.15em] text-(--color-text-dim)" style={{ fontFamily: "var(--font-ui)" }}>
            Enter · Shift+Enter newline · GUEST MODE
          </p>
        </div>
      </div>
    </div>
  );
}
