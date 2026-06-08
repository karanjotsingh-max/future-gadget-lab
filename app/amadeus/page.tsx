"use client";

/**
 * /amadeus — Kurisu Makise video-call interface (Amadeus system)
 *
 * Layout:
 *   - Full-screen CRT-framed "call" panel
 *   - CSS geometric avatar (no copyrighted art — AGENTS.md §8)
 *   - Framer Motion: CONNECTING → AMADEUS SYSTEM ONLINE entrance sequence
 *   - Streaming chat with blinking cursor
 *   - Guest: localStorage. Logged-in: Supabase (Phase 1.5)
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(messages.slice(-MAX_STORED))
    );
  } catch {
    // localStorage unavailable (private browsing quota, etc.) — silently skip
  }
}

// ─── Sub-components ───────────────────────────────────────────

/** Animated CSS geometric Kurisu avatar — no external images */
function KurisuAvatar({ status }: { status: ConnectionStatus }) {
  return (
    <div className="relative flex h-52 w-52 items-center justify-center sm:h-64 sm:w-64">
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-(--color-amadeus-purple)/40"
        animate={
          status === "online"
            ? { scale: [1, 1.04, 1], opacity: [0.4, 0.7, 0.4] }
            : { opacity: 0.2 }
        }
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Middle ring */}
      <motion.div
        className="absolute inset-4 rounded-full border border-(--color-amadeus-purple)/30"
        animate={
          status === "online"
            ? { rotate: 360 }
            : { opacity: 0.1 }
        }
        transition={
          status === "online"
            ? { duration: 20, repeat: Infinity, ease: "linear" }
            : {}
        }
      />
      {/* Avatar silhouette — geometric head + shoulders via clip-path */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-0"
        animate={
          status === "online" ? { opacity: 1 } : { opacity: 0.3 }
        }
        transition={{ duration: 0.6 }}
      >
        {/* Head */}
        <div
          className="phosphor-purple h-20 w-16 rounded-t-[50%] rounded-b-[30%]"
          style={{
            background:
              "radial-gradient(ellipse at 40% 35%, rgba(123,47,190,0.35) 0%, rgba(123,47,190,0.08) 70%)",
            border: "1px solid rgba(123,47,190,0.6)",
            boxShadow:
              "0 0 18px rgba(123,47,190,0.4), inset 0 0 12px rgba(123,47,190,0.15)",
          }}
        />
        {/* Shoulders */}
        <div
          className="h-10 w-28 rounded-b-[60%] rounded-t-[20%]"
          style={{
            background:
              "linear-gradient(180deg, rgba(123,47,190,0.25) 0%, rgba(123,47,190,0.04) 100%)",
            border: "1px solid rgba(123,47,190,0.4)",
            borderTop: "none",
            boxShadow: "0 4px 14px rgba(123,47,190,0.2)",
          }}
        />
      </motion.div>

      {/* Scanning line — only when online */}
      {status === "online" && (
        <motion.div
          className="pointer-events-none absolute inset-x-4 h-px bg-(--color-amadeus-purple)/50"
          animate={{ top: ["20%", "80%", "20%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute" }}
        />
      )}
    </div>
  );
}

/** A single chat message bubble */
function MessageBubble({
  msg,
  isStreaming,
}: {
  msg: Message;
  isStreaming: boolean;
}) {
  const isKurisu = msg.role === "assistant";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col gap-1 ${isKurisu ? "items-start" : "items-end"}`}
    >
      <span
        className="text-[10px] tracking-[0.25em] text-(--color-text-muted)"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        {isKurisu ? "AMADEUS / KURISU" : "YOU"}
      </span>
      <p
        className={`max-w-[80%] rounded px-4 py-2 text-sm leading-relaxed ${
          isKurisu
            ? "phosphor-purple border border-(--color-amadeus-purple)/30 bg-(--color-panel)"
            : "border border-(--color-terminal-green)/30 bg-(--color-panel) text-(--color-terminal-green)"
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
  // Lazy initializer reads localStorage once on first render — no effect needed
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Simulated connection sequence on mount
  useEffect(() => {
    const timer = setTimeout(() => setStatus("online"), 2200);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: uid(), role: "user", content: text };
    const assistantId = uid();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);
    setStreamingId(assistantId);

    // Build history to send — exclude blank placeholders and error messages
    const history = [
      ...messages
        .filter(
          (m) =>
            m.content.trim().length > 0 &&
            !m.content.startsWith("[CONNECTION ERROR")
        )
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
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          )
        );
      }

      // Persist only clean messages (no blank placeholders or errors)
      setMessages((prev) => {
        const clean = prev.filter(
          (m) =>
            m.content.trim().length > 0 &&
            !m.content.startsWith("[CONNECTION ERROR")
        );
        saveHistory(clean);
        return prev;
      });
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "Transmission error.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `[CONNECTION ERROR: ${errMsg}]` }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingId(null);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-8">
      {/* Page header */}
      <div className="mb-6 w-full max-w-2xl">
        <p
          className="text-[10px] tracking-[0.35em] text-(--color-text-muted)"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          GADGET / #002 / AMADEUS SYSTEM
        </p>
        <h1
          className="phosphor-purple mt-1 text-3xl tracking-widest"
          style={{ fontFamily: "var(--font-display)" }}
        >
          AMADEUS
        </h1>
      </div>

      {/* Main call panel */}
      <div className="crt-frame crt-flicker w-full max-w-2xl overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between border-b border-(--color-amadeus-purple)/20 px-4 py-2">
          <span
            className="text-[10px] tracking-[0.3em] text-(--color-text-muted)"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            AMADEUS_SYSTEM v2.0.1049
          </span>
          <AnimatePresence mode="wait">
            {status === "connecting" ? (
              <motion.span
                key="connecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: [1, 0.3, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-[10px] tracking-[0.3em] text-(--color-steiner-amber)"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                ● CONNECTING...
              </motion.span>
            ) : status === "online" ? (
              <motion.span
                key="online"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="phosphor-purple text-[10px] tracking-[0.3em]"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                ● CONNECTED
              </motion.span>
            ) : (
              <motion.span
                key="error"
                className="text-[10px] tracking-[0.3em] text-(--color-alert-red)"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                ● ERROR
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar section */}
        <div className="flex flex-col items-center gap-3 border-b border-(--color-amadeus-purple)/20 bg-(--color-bg) py-6">
          <KurisuAvatar status={status} />
          <AnimatePresence mode="wait">
            {status === "connecting" ? (
              <motion.p
                key="connecting-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[11px] tracking-[0.4em] text-(--color-steiner-amber)"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                ESTABLISHING LINK...
              </motion.p>
            ) : (
              <motion.div
                key="online-label"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-1"
              >
                <p
                  className="phosphor-purple text-[11px] tracking-[0.4em]"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  KURISU MAKISE
                </p>
                <p
                  className="text-[10px] tracking-[0.25em] text-(--color-text-muted)"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  AMADEUS DIGITAL RECREATION / ACTIVE
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat log */}
        <div
          ref={scrollRef}
          className="flex h-72 flex-col gap-4 overflow-y-auto px-4 py-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(123,47,190,0.3) transparent" }}
        >
          {messages.length === 0 && status === "online" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-sm text-(--color-text-dim)"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              {">"} Transmission channel open. Say something.
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

        {/* Input area */}
        <div className="border-t border-(--color-amadeus-purple)/20 px-4 py-3">
          <div className="flex gap-2">
            <span
              className="phosphor-purple mt-2.5 flex-shrink-0 text-sm"
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
                  : "Type a message..."
              }
              rows={2}
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-(--color-text-cold) placeholder:text-(--color-text-dim) focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              style={{ fontFamily: "var(--font-ui)" }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={status !== "online" || isLoading || !input.trim()}
              className="flex-shrink-0 self-end border border-(--color-amadeus-purple)/40 px-3 py-1 text-[11px] tracking-[0.25em] text-(--color-amadeus-purple) transition hover:border-(--color-amadeus-purple) hover:bg-(--color-amadeus-purple)/10 disabled:cursor-not-allowed disabled:opacity-30"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              SEND
            </button>
          </div>
          <p
            className="mt-1.5 text-[10px] tracking-[0.15em] text-(--color-text-dim)"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            Enter to send &nbsp;·&nbsp; Shift+Enter for newline
          </p>
        </div>
      </div>

      {/* Footer controls */}
      <div className="mt-4 flex w-full max-w-2xl items-center justify-between">
        <p
          className="text-[10px] tracking-[0.25em] text-(--color-text-dim)"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          GUEST MODE — history saved locally
        </p>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-[10px] tracking-[0.25em] text-(--color-text-dim) hover:text-(--color-alert-red) transition"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            CLEAR SESSION
          </button>
        )}
      </div>
    </div>
  );
}
