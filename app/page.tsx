import GadgetCard from "@/components/GadgetCard";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <section className="mb-16 max-w-2xl">
        <p
          className="mb-3 text-[11px] tracking-[0.4em] text-(--color-text-muted)"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          {">"} FGL_TERMINAL_v1.048
        </p>
        <h1
          className="phosphor-green mb-4 text-4xl leading-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-terminal)" }}
        >
          <span
            className="glitch-text"
            data-text="WELCOME TO THE LAB"
          >
            WELCOME TO THE LAB
          </span>
          <span className="terminal-cursor" aria-hidden />
        </h1>
        <p
          className="text-sm leading-relaxed text-(--color-text-muted) sm:text-base"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          Three gadgets, one worldline. Send a D-Mail to your past self,
          consult Amadeus, or tune into the lab radio. The choice — like the
          worldline — is yours.
        </p>
      </section>

      <section
        aria-label="Available gadgets"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <GadgetCard
          id="#001"
          name="D-Mail Terminal"
          description="Compose a 36-character message to your past self. The AI worldline computer generates three divergent timelines and an updated Divergence Meter value."
          href="/d-mail"
          status="in-development"
          flavor="PHASE 1"
        />
        <GadgetCard
          id="#002"
          name="Amadeus"
          description="Chat with an AI reconstruction of Kurisu Makise. Personality-locked, lore-aware, with persistent memory across sessions."
          href="/amadeus"
          status="offline"
          flavor="PHASE 2"
        />
        <GadgetCard
          id="#003"
          name="Lab Radio"
          description="Curated audio for late-night experiments. Lofi, OST, and rainy Akihabara ambient — chosen by the lab members."
          href="/lab-radio"
          status="offline"
          flavor="PHASE 3"
        />
      </section>

      <section className="mt-20 border-t border-(--color-border) pt-8">
        <p
          className="text-[11px] tracking-[0.3em] text-(--color-text-dim)"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          {">"} STATUS: FOUNDATION COMPLETE / PHASE 1 IN PROGRESS
          <br />
          {">"} WARNING: Tampering with the past has consequences. Reading
          Steiner not guaranteed.
        </p>
      </section>
    </div>
  );
}
