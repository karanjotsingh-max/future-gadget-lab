import { WORLD_LINES } from "@/constants/theme";

type Props = {
  /** Divergence value, e.g. 1.048596. Defaults to Steins Gate worldline. */
  value?: number;
  /** Optional label shown above the digits. */
  label?: string;
};

/**
 * WorldLineMeter — a 7-segment-style readout of the current divergence value.
 *
 * Renders as a server component (no interaction). For animated/glitchy
 * variants used inside the D-Mail terminal, see DivergenceMeter (Phase 1.1c).
 */
export default function WorldLineMeter({
  value = WORLD_LINES.steinsGate,
  label = "WORLD LINE DIVERGENCE",
}: Props) {
  const formatted = value.toFixed(6);

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className="text-[10px] tracking-[0.3em] text-(--color-text-muted)"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        {label}
      </span>
      <span
        className="phosphor-cyan text-2xl leading-none tabular-nums"
        style={{ fontFamily: "var(--font-terminal)" }}
        aria-label={`Divergence ${formatted}`}
      >
        {formatted}
      </span>
    </div>
  );
}
