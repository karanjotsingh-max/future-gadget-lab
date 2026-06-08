#!/usr/bin/env node
/**
 * secret-leak-guard.js
 *
 * Fires on `beforeSubmitPrompt`. Scans the prompt text for patterns that
 * look like real secrets (Groq API keys, Supabase JWTs, Postgres URIs,
 * generic high-entropy tokens).
 *
 * Returns a "ask" permission so Cursor surfaces a warning before sending.
 * Fail-open: any parse/runtime error exits 0 with no output.
 */

const SECRET_PATTERNS = [
  { name: "Groq API key", pattern: /gsk_[a-zA-Z0-9]{20,}/g },
  {
    name: "Supabase JWT (anon or service_role)",
    pattern: /eyJ[a-zA-Z0-9+/=]{80,}/g,
  },
  {
    name: "Postgres connection string",
    pattern: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/g,
  },
  {
    name: "Generic secret token",
    pattern: /(?:secret|token|password|api[_-]?key)\s*[:=]\s*['""]?[a-zA-Z0-9/_\-+]{20,}/gi,
  },
];

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));

process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    // The prompt text is in data.prompt or data.message depending on event shape
    const text =
      typeof data.prompt === "string"
        ? data.prompt
        : typeof data.message === "string"
          ? data.message
          : JSON.stringify(data);

    const hits = [];
    for (const { name, pattern } of SECRET_PATTERNS) {
      if (pattern.test(text)) {
        hits.push(name);
      }
    }

    if (hits.length === 0) {
      process.exit(0);
    }

    const result = {
      permission: "ask",
      user_message: [
        "SECRET LEAK WARNING",
        "",
        `Possible secret(s) detected in your prompt:`,
        hits.map((h) => `  - ${h}`).join("\n"),
        "",
        "Double-check you haven't pasted a real API key or connection string.",
        "If this is a false positive, you can proceed.",
      ].join("\n"),
      agent_message: `Hook flagged possible secret(s) in the prompt: ${hits.join(", ")}. Proceeding only if user confirmed.`,
    };

    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  } catch {
    process.exit(0);
  }
});
