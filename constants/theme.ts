/**
 * Theme tokens for Future Gadget Lab.
 *
 * Per AGENTS.md §7.1 — NEVER inline hex codes in JSX. Always import from here.
 * These tokens are mirrored as CSS variables in `app/globals.css` so Tailwind
 * utilities (e.g. `bg-bg`, `text-terminal-green`) resolve correctly.
 */

export const theme = {
  /** Near-black workspace background */
  bg: "#0A0A0F",
  /** Slightly raised panel background */
  panel: "#12121A",
  /** Subtle border on dark panels */
  border: "#22222C",

  /** D-Mail terminal phosphor green */
  terminalGreen: "#00FF41",
  /** Amadeus / Kurisu signature purple */
  amadeusPurple: "#7B2FBE",
  /** World line divergence meter cyan */
  divergenceCyan: "#4F9EFF",
  /** Alerts, "world line shift" moments */
  alertRed: "#FF003C",
  /** Caution / Reading Steiner amber */
  steinerAmber: "#FFB454",

  /** Primary cold-white text */
  textCold: "#E8EAFF",
  /** Muted secondary text */
  textMuted: "#8A8A9E",
  /** Dim placeholder / disabled */
  textDim: "#4A4A5C",
} as const;

export type ThemeToken = keyof typeof theme;

/**
 * Motion durations (ms). Keep short except for "world line shift" moments.
 * See AGENTS.md §7.4.
 */
export const motion = {
  /** Hover, focus, small state changes */
  fast: 150,
  /** Default interactive transitions */
  base: 250,
  /** Modal/panel transitions */
  slow: 400,
  /** Dramatic divergence/level-up sequences */
  dramatic: 1200,
} as const;

/**
 * Standard world line divergence values referenced in the show.
 * Used as seeds / fallbacks for the divergence meter.
 */
export const WORLD_LINES = {
  alpha: 1.130426,
  beta: 1.048596,
  gamma: 0.571046,
  steinsGate: 1.048596,
} as const;
