---
name: fgl-new-prompt
description: Template and checklist for creating a new LLM prompt file in Future Gadget Lab. Use whenever adding a prompt for a new feature.
---

# FGL New Prompt — Template

Every new prompt file in `lib/prompts/<feature>.ts` must follow this exact structure.

## Template

```ts
// lib/prompts/<feature>.ts
import { z } from "zod";

export const <FEATURE>_PROMPT_VERSION = "1.0.0";

export const <FEATURE>_SYSTEM_PROMPT = `
You are ...

CANON SPELLINGS — use these exact forms, no variations:
- Reading Steiner
- El Psy Kongroo
- world line (two words, lowercase unless in a title)
- Hououin Kyouma
- Future Gadget Lab
- D-Mail
`;

// Only needed for structured (JSON) output — omit for streaming prose
export const <Feature>ResponseSchema = z.object({
  // define fields here
});

export type <Feature>Response = z.infer<typeof <Feature>ResponseSchema>;
```

## Checklist

- [ ] File is in `lib/prompts/` — never inline in a route or component
- [ ] `PROMPT_VERSION` constant is exported
- [ ] Canon spellings list is included verbatim in the system prompt
- [ ] Zod schema exported for any structured (JSON) output
- [ ] `response_format: { type: "json_object" }` used in the route when schema is present
- [ ] Streaming routes (`ReadableStream`) do NOT use `response_format`
- [ ] Version bumped in commit message when prompt changes

## When to bump the version

Bump the patch version (e.g. `1.0.0` → `1.0.1`) whenever the prompt text changes.
Bump the minor version (`1.0.0` → `1.1.0`) when the Zod schema shape changes.
