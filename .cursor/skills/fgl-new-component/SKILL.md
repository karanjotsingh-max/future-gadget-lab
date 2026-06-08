---
name: fgl-new-component
description: Template and checklist for creating a new React component in Future Gadget Lab. Use whenever building any new UI element.
---

# FGL New Component

Every component lives in `components/` (reusable) or colocated in `app/<feature>/`
(feature-specific, not reused elsewhere).

## Decision: server component or client component?

Ask: does this component need **state**, **effects**, or **browser APIs** (scroll, localStorage, etc.)?

- **No** → server component (default, no directive needed)
- **Yes** → add `"use client"` at the very top

Rule of thumb: push `"use client"` as far down the tree as possible.
A page can be a server component even if one small button inside it is a client component.

## Template (client component with animation)

```tsx
"use client";

import { motion } from "framer-motion";
import { theme } from "@/constants/theme";

type Props = {
  // define props here — no `any`
};

export default function ComponentName({ }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="crt-frame font-mono"
      style={{ color: theme.terminalGreen }}
    >
      {/* content */}
    </motion.div>
  );
}
```

## Template (server component, no animation)

```tsx
import { theme } from "@/constants/theme";

type Props = {
  // define props here
};

export default function ComponentName({ }: Props) {
  return (
    <div
      className="font-mono"
      style={{ color: theme.textCold }}
    >
      {/* content */}
    </div>
  );
}
```

## Theme tokens (use these — never hardcode hex)

```ts
theme.bg            // #0A0A0F  — page background
theme.terminalGreen // #00FF41  — main green text
theme.amadeusPurple // #7B2FBE  — Amadeus accent
theme.alertRed      // #FF003C  — errors / alerts
theme.textCold      // #E8EAFF  — secondary text
```

## CRT CSS classes (from `styles/crt.css`)

| Class | When to use |
|---|---|
| `.crt-frame` | Outer container of any terminal/gadget panel |
| `.crt-scanlines` | Overlay scanline effect on a panel |
| `.crt-flicker` | Subtle flicker on static elements |
| `.glitch-text` | Text with a glitch animation (use sparingly) |

## Animation guidelines (Framer Motion only)

- Normal transitions: `duration: 0.15` – `0.4`
- Entrance: `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}`
- World line shift / dramatic moment: up to 1.5s, stagger children
- Never use CSS `transition` or `animation` — use Framer Motion

## Checklist before committing

- [ ] File is `PascalCase.tsx` with a default export of the same name
- [ ] No hex codes — all colors from `theme.*`
- [ ] No emojis — monospace symbols only (`>`, `█`, `▓`, `░`, `■`)
- [ ] `"use client"` added only if state / effects / browser APIs are needed
- [ ] CRT classes applied to the outer container where appropriate
- [ ] Animation uses Framer Motion (`framer-motion`), not CSS keyframes
- [ ] Props typed with `type Props = { ... }` — no `any`
- [ ] Import order: react/next → framer-motion → `@/constants` → `@/lib` → relative
