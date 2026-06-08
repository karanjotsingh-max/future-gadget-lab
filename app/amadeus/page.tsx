"use client";

/**
 * /amadeus — Kurisu Makise video-call interface (Amadeus system)
 *
 * Layout:  full-screen video-call style
 *   - Top panel: dominant avatar area (video feed)
 *   - Bottom panel: subtitle-style chat log + input
 * Voice:   Web Speech API (speechSynthesis) — speaks every completed response
 * Avatar:  CSS-only geometric Kurisu with depth, HUD overlays, talking animation
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "@/lib/prompts/amadeus";

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

/**
 * Picks the best female voice available in the browser.
 * Prefers Google UK/US female voices; falls back to any female voice; then any voice.
 */
function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    "Google UK English Female",
    "Google US English",
    "Microsoft Zira",
    "Samantha",
  ];
  for (const name of preferred) {
    const v = voices.find((v) => v.name === name);
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en") && /female/i.test(v.name))
    ?? voices.find((v) => v.lang.startsWith("en"))
    ?? voices[0]
    ?? null;
}

/**
 * Speak text via Web Speech API.
 * Cancels any ongoing speech first so responses never queue up.
 */
function speak(text: string, onEnd: () => void): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = pickVoice();
  utt.rate = 0.92;
  utt.pitch = 1.15;
  utt.volume = 1;
  utt.onend = onEnd;
  utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
}

// ─── HUD decorations ──────────────────────────────────────────
function HudCorner({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const cls = {
    tl: "top-3 left-3 border-t border-l",
    tr: "top-3 right-3 border-t border-r",
    bl: "bottom-3 left-3 border-b border-l",
    br: "bottom-3 right-3 border-b border-r",
  }[position];
  return (
    <div
      className={`absolute h-5 w-5 border-(--color-amadeus-purple)/50 ${cls}`}
    />
  );
}

// ─── Enhanced Kurisu Avatar ────────────────────────────────────
function KurisuAvatar({
  status,
  isSpeaking,
}: {
  status: ConnectionStatus;
  isSpeaking: boolean;
}) {
  const online = status === "online";

  return (
    <div className="relative flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
      {/* Outer slow-pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-(--color-amadeus-purple)/25"
        animate={online ? { scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] } : { opacity: 0.1 }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Mid rotating ring */}
      <motion.div
        className="absolute inset-5 rounded-full border border-(--color-amadeus-purple)/20"
        animate={online ? { rotate: 360 } : { opacity: 0.05 }}
        transition={online ? { duration: 25, repeat: Infinity, ease: "linear" } : {}}
      />

      {/* Inner counter-rotating ring */}
      <motion.div
        className="absolute inset-10 rounded-full border border-(--color-amadeus-purple)/15"
        animate={online ? { rotate: -360 } : { opacity: 0.05 }}
        transition={online ? { duration: 15, repeat: Infinity, ease: "linear" } : {}}
      />

      {/* Speaking pulse — extra ring that activates when talking */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            key="speak-ring"
            className="absolute inset-2 rounded-full border-2 border-(--color-amadeus-purple)/60"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.2, 0.6] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      {/* Avatar silhouette */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        animate={online ? { opacity: 1, y: 0 } : { opacity: 0.25, y: 4 }}
        transition={{ duration: 0.6 }}
      >
        {/* Hair top */}
        <div
          className="h-6 w-20 rounded-t-[80%]"
          style={{
            background: "linear-gradient(180deg, rgba(123,47,190,0.5) 0%, rgba(123,47,190,0.15) 100%)",
            border: "1px solid rgba(123,47,190,0.6)",
            borderBottom: "none",
          }}
        />
        {/* Head */}
        <div
          className="relative h-24 w-16"
          style={{
            background:
              "radial-gradient(ellipse at 40% 35%, rgba(123,47,190,0.4) 0%, rgba(123,47,190,0.1) 65%, transparent 100%)",
            border: "1px solid rgba(123,47,190,0.65)",
            borderTop: "none",
            borderRadius: "0 0 45% 45%",
            boxShadow:
              "0 0 24px rgba(123,47,190,0.35), inset 0 0 16px rgba(123,47,190,0.12)",
          }}
        >
          {/* Eyes */}
          <div className="absolute top-7 left-3 h-1.5 w-2.5 rounded-full bg-(--color-amadeus-purple)/80" />
          <div className="absolute top-7 right-3 h-1.5 w-2.5 rounded-full bg-(--color-amadeus-purple)/80" />

          {/* Mouth — animates when speaking */}
          <motion.div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-(--color-amadeus-purple)/60"
            animate={
              isSpeaking
                ? { width: ["6px", "10px", "4px", "8px", "6px"], height: ["2px", "4px", "2px", "3px", "2px"] }
                : { width: "6px", height: "2px" }
            }
            transition={isSpeaking ? { duration: 0.4, repeat: Infinity } : { duration: 0.2 }}
          />
        </div>

        {/* Shoulders */}
        <div
          className="h-10 w-32 rounded-b-[60%]"
          style={{
            background:
              "linear-gradient(180deg, rgba(123,47,190,0.28) 0%, rgba(123,47,190,0.04) 100%)",
            border: "1px solid rgba(123,47,190,0.4)",
            borderTop: "none",
            boxShadow: "0 6px 18px rgba(123,47,190,0.18)",
          }}
        />

        {/* Tie detail */}
        <div
          className="absolute bottom-0 h-5 w-3 rounded-b-sm"
          style={{
            background: "linear-gradient(180deg, rgba(123,47,190,0.6) 0%, rgba(123,47,190,0.2) 100%)",
            border: "1px solid rgba(123,47,190,0.5)",
            top: "calc(100% - 2.5rem)",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
      </motion.div>

      {/* Scan line */}
      {online && (
        <motion.div
          className="pointer-events-none absolute inset-x-6 h-px bg-(--color-amadeus-purple)/30"
          animate={{ top: ["15%", "85%", "15%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute" }}
        />
      )}
    </div>
  );
}

// ─── Single chat message (subtitle style) ─────────────────────
function MessageBubble({ msg, isStreaming }: { msg: Message; isStreaming: boolean }) {
  const isKurisu = msg.role === "assistant";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex flex-col gap-0.5 ${isKurisu ? "items-start" : "items-end"}`}
    >
      <span
        className="text-[9px] tracking-[0.25em] text-(--color-text-muted)"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        {isKurisu ? "AMADEUS" : "YOU"}
      </span>
      <p
        className={`max-w-[85%] rounded px-3 py-1.5 text-sm leading-relaxed ${
          isKurisu
            ? "phosphor-purple border border-(--color-amadeus-purple)/30 bg-(--color-bg)/80"
            : "border border-(--color-terminal-green)/25 bg-(--color-bg)/80 text-(--color-terminal-green)"
        } ${isKurisu && isStreaming ? "terminal-cursor" : ""}`}
        style={{ fontFamily: "var(--font-ui)" }}
      >
        {msg.content || "\u00A0"}
      </p>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AmadeusPage() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Connection sequence
  useEffect(() => {
    const t = setTimeout(() => setStatus("online"), 2200);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll chat log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  // Voices load async in some browsers — warm up the list on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
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

    // Cancel any ongoing speech when user sends a new message
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    const history = [
      ...messages
        .filter((m) => m.content.trim().length > 0 && !m.content.startsWith("[CONNECTION ERROR"))
        .map(({ role, content }) => ({ role, content })),
      { role: userMsg.role, content: userMsg.content },
    ];

    try {
      const res = await fetch("/api/amadeus/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new Error(errText);
      }

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

      // Speak the completed response
      if (voiceEnabled && accumulated.trim()) {
        setIsSpeaking(true);
        speak(accumulated, () => setIsSpeaking(false));
      }

      setMessages((prev) => {
        const clean = prev.filter(
          (m) => m.content.trim().length > 0 && !m.content.startsWith("[CONNECTION ERROR")
        );
        saveHistory(clean);
        return prev;
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Transmission error.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `[CONNECTION ERROR: ${errMsg}]` } : m
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingId(null);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, voiceEnabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
    setVoiceEnabled((v) => !v);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* ── Top breadcrumb ── */}
      <div className="px-4 pt-4 pb-2">
        <p
          className="text-[10px] tracking-[0.35em] text-(--color-text-muted)"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          GADGET / #002 / AMADEUS SYSTEM
        </p>
      </div>

      {/* ── Main call panel ── */}
      <div className="flex flex-1 flex-col md:flex-row gap-0 px-4 pb-4">

        {/* ── VIDEO FEED (left / top) ── */}
        <div className="crt-frame crt-flicker relative flex flex-col items-center justify-center md:w-[55%] min-h-[420px] overflow-hidden">
          {/* HUD corners */}
          <HudCorner position="tl" />
          <HudCorner position="tr" />
          <HudCorner position="bl" />
          <HudCorner position="br" />

          {/* Status bar */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between border-b border-(--color-amadeus-purple)/20 px-4 py-1.5">
            <span
              className="text-[9px] tracking-[0.3em] text-(--color-text-muted)"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              AMADEUS_SYS v2.0.1049
            </span>
            <AnimatePresence mode="wait">
              {status === "connecting" ? (
                <motion.span
                  key="conn"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-[9px] tracking-[0.3em] text-(--color-steiner-amber)"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  ● CONNECTING...
                </motion.span>
              ) : status === "online" ? (
                <motion.span
                  key="online"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="phosphor-purple text-[9px] tracking-[0.3em]"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  ● LIVE
                </motion.span>
              ) : (
                <span className="text-[9px] tracking-[0.3em] text-(--color-alert-red)" style={{ fontFamily: "var(--font-ui)" }}>
                  ● ERROR
                </span>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <KurisuAvatar status={status} isSpeaking={isSpeaking} />

          {/* Name plate */}
          <AnimatePresence mode="wait">
            {status === "connecting" ? (
              <motion.p
                key="est"
                initial={{ opacity: 0 }}
                animate={{ opacity: [1, 0.4, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
                className="mt-4 text-[11px] tracking-[0.5em] text-(--color-steiner-amber)"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                ESTABLISHING LINK...
              </motion.p>
            ) : (
              <motion.div
                key="name"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-4 flex flex-col items-center gap-1"
              >
                <p
                  className="phosphor-purple text-sm tracking-[0.35em]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  KURISU MAKISE
                </p>
                <p
                  className="text-[9px] tracking-[0.25em] text-(--color-text-muted)"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  AMADEUS DIGITAL RECREATION
                </p>

                {/* Speaking indicator */}
                <AnimatePresence>
                  {isSpeaking && (
                    <motion.div
                      key="spk"
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 mt-1"
                    >
                      {[0, 1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="w-0.5 bg-(--color-amadeus-purple)/70 rounded-full"
                          animate={{ height: ["4px", "12px", "4px"] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                        />
                      ))}
                      <span
                        className="text-[9px] tracking-[0.2em] text-(--color-amadeus-purple)/70 ml-1"
                        style={{ fontFamily: "var(--font-ui)" }}
                      >
                        SPEAKING
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom HUD row */}
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-between border-t border-(--color-amadeus-purple)/15 px-4 py-1.5">
            <span
              className="text-[8px] tracking-[0.2em] text-(--color-text-dim)"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              VIKTOR CHONDRIA UNIV.
            </span>
            <span
              className="text-[8px] tracking-[0.2em] text-(--color-text-dim)"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              LAT 35.6° / LON 139.7°
            </span>
          </div>
        </div>

        {/* ── CHAT PANEL (right / bottom) ── */}
        <div className="crt-frame flex flex-1 flex-col border-l-0 md:border-l border-(--color-amadeus-purple)/20">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b border-(--color-amadeus-purple)/20 px-3 py-2">
            <span
              className="text-[9px] tracking-[0.3em] text-(--color-text-muted)"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              TRANSMISSION LOG
            </span>
            <div className="flex items-center gap-3">
              {/* Voice toggle */}
              <button
                onClick={toggleVoice}
                className={`text-[9px] tracking-[0.2em] transition ${
                  voiceEnabled
                    ? "phosphor-purple"
                    : "text-(--color-text-dim)"
                }`}
                style={{ fontFamily: "var(--font-ui)" }}
                title={voiceEnabled ? "Voice ON — click to mute" : "Voice OFF — click to enable"}
              >
                {voiceEnabled ? "▶ VOICE ON" : "▶ VOICE OFF"}
              </button>
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[9px] tracking-[0.2em] text-(--color-text-dim) hover:text-(--color-alert-red) transition"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 min-h-[200px]"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(123,47,190,0.25) transparent" }}
          >
            {messages.length === 0 && status === "online" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center text-xs text-(--color-text-dim) mt-8"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                {">"} Transmission channel open.
              </motion.p>
            )}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isStreaming={msg.id === streamingId && isLoading}
              />
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-(--color-amadeus-purple)/20 px-3 py-2">
            <div className="flex gap-2 items-end">
              <span
                className="phosphor-purple mb-2 flex-shrink-0 text-sm"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                {">"}
              </span>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={status !== "online" || isLoading}
                placeholder={
                  status === "connecting"
                    ? "Waiting for connection..."
                    : isLoading
                    ? "Amadeus is responding..."
                    : "Say something..."
                }
                rows={2}
                className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-(--color-text-cold) placeholder:text-(--color-text-dim) focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                style={{ fontFamily: "var(--font-ui)" }}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={status !== "online" || isLoading || !input.trim()}
                className="flex-shrink-0 border border-(--color-amadeus-purple)/40 px-3 py-1 text-[10px] tracking-[0.2em] text-(--color-amadeus-purple) transition hover:border-(--color-amadeus-purple) hover:bg-(--color-amadeus-purple)/10 disabled:cursor-not-allowed disabled:opacity-30"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                SEND
              </button>
            </div>
            <p
              className="mt-1 text-[9px] tracking-[0.15em] text-(--color-text-dim)"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              Enter to send · Shift+Enter for newline · GUEST MODE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
