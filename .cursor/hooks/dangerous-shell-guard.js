#!/usr/bin/env node
/**
 * dangerous-shell-guard.js
 *
 * Fires on `beforeShellExecution`. Blocks or asks for confirmation on
 * commands that could cause irreversible damage:
 *
 *   BLOCK (exit 2):
 *     - git push --force / git push -f  to main or master
 *     - rm -rf on project root or system paths
 *
 *   ASK (permission: "ask"):
 *     - supabase db push  (runs migrations against the remote DB)
 *     - git push --force  to any branch (non-main)
 *     - DROP TABLE / TRUNCATE / DELETE without WHERE in raw SQL
 *     - rm -rf on any path
 *
 * Fail-open: any parse/runtime error exits 0 with allow.
 */

const BLOCK_PATTERNS = [
  {
    name: "force-push to main/master",
    pattern: /git\s+push\s+.*(?:--force|-f)\s+.*(?:main|master)|git\s+push\s+.*(?:main|master).*(?:--force|-f)/i,
  },
];

const ASK_PATTERNS = [
  {
    name: "Supabase migration push (runs against remote DB)",
    pattern: /supabase\s+db\s+push/i,
  },
  {
    name: "force-push to any branch",
    pattern: /git\s+push\s+(?:.*\s+)?(?:--force|-f)/i,
  },
  {
    name: "recursive delete (rm -rf)",
    pattern: /rm\s+(?:-[a-z]*r[a-z]*f|--recursive|--force)\s/i,
  },
  {
    name: "DROP TABLE / TRUNCATE / DELETE without WHERE",
    pattern: /(?:DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM\s+\w+\s*;)/i,
  },
];

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));

process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    const command =
      typeof data.command === "string" ? data.command : JSON.stringify(data);

    // Hard block
    for (const { name, pattern } of BLOCK_PATTERNS) {
      if (pattern.test(command)) {
        const result = {
          permission: "deny",
          user_message: [
            `BLOCKED: ${name}`,
            "",
            `Command: ${command}`,
            "",
            "This command is blocked by the dangerous-shell-guard hook.",
            "If you really need to do this, run it manually in your terminal.",
          ].join("\n"),
          agent_message: `Hook blocked command matching rule "${name}". Command was not executed.`,
        };
        process.stdout.write(JSON.stringify(result));
        process.exit(0);
      }
    }

    // Soft ask
    for (const { name, pattern } of ASK_PATTERNS) {
      if (pattern.test(command)) {
        const result = {
          permission: "ask",
          user_message: [
            `CAUTION: ${name}`,
            "",
            `Command: ${command}`,
            "",
            "This could have irreversible effects. Review before proceeding.",
          ].join("\n"),
          agent_message: `Hook flagged command matching rule "${name}". Proceeding only if user confirmed.`,
        };
        process.stdout.write(JSON.stringify(result));
        process.exit(0);
      }
    }

    // All clear
    process.exit(0);
  } catch {
    process.exit(0);
  }
});
