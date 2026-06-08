"use client";

/**
 * /amadeus — Kurisu Makise video-call interface (Amadeus system)
 *
 * Layout (true video-call):
 *   - Top ~75 vh : video feed panel — avatar centred, full-width
 *   - Bottom ~25 vh : compact chat strip — messages + input
 * Voice:  Web Speech API speaks every completed response
 * Avatar: CSS-only geometric Kurisu with depth, HUD, talking animation
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
  return (
    voices.find((v) => v.lang.startsWith("en") && /female/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    voices[0] ??
    null
  );
}

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

// ─── Kurisu avatar ────────────────────────────────────────────
function KurisuAvatar({
  status,
  isSpeaking,
}: {
  status: ConnectionStatus;
  isSpeaking: boolean;
}) {
  const online = status === "online";

  return (
    <div className="relative flex items-center justify-center" style={{ width: "320px", height: "420px" }}>
      {/* Speaking glow ring behind the image */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            key="spk-glow"
            className="absolute inset-0 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.1, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ boxShadow: "0 0 40px 12px rgba(123,47,190,0.45)" }}
          />
        )}
      </AnimatePresence>

      {/* Actual Kurisu image */}
      <motion.img
        src="/kurisu.png"
        alt="Kurisu Makise — Amadeus"
        className="relative z-10 h-full w-full object-contain"
        animate={online ? { opacity: 1 } : { opacity: 0.25 }}
        transition={{ duration: 0.8 }}
        style={{
          filter: online
            ? "drop-shadow(0 0 18px rgba(123,47,190,0.5))"
            : "drop-shadow(0 0 6px rgba(123,47,190,0.2)) grayscale(0.6)",
        }}
      />

      {/* Scan line overlay */}
      {online && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 z-20 h-px bg-(--color-amadeus-purple)/30"
          animate={{ top: ["5%", "95%", "5%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute" }}
        />
      )}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setStatus("online"), 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

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
    window.speechSynthesis?.cancel();
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

      if (!res.ok || !res.body) throw new Error(await res.text().catch(() => "Unknown error"));

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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    if (voiceEnabled) { window.speechSynthesis?.cancel(); setIsSpeaking(false); }
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

        {/* Avatar */}
        <KurisuAvatar status={status} isSpeaking={isSpeaking} />

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
