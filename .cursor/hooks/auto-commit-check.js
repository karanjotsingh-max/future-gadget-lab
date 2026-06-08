#!/usr/bin/env node
/**
 * auto-commit-check.js
 *
 * Fires on the `stop` event (after every agent response).
 * If there are uncommitted git changes, injects a followup_message
 * asking the agent to commit and give next-step recommendations.
 *
 * Fail-open: any error (git not found, parse failure) exits 0
 * with no output so the agent stops normally.
 */

const { execSync } = require("child_process");

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));

process.stdin.on("end", () => {
  try {
    const status = execSync("git status --porcelain", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (!status) {
      // Nothing to commit — let the agent stop normally
      process.exit(0);
    }

    // Count how many files changed for context
    const changedFiles = status.split("\n").filter(Boolean).length;

    const followup = {
      followup_message: [
        `There are ${changedFiles} uncommitted file(s) from this subtask.`,
        `Please create a git commit now using this exact format from AGENTS.md:`,
        `  - Imperative mood (e.g. "feat:", "fix:", "chore:", "docs:", "refactor:")`,
        `  - Lowercase prefix`,
        `  - Short, specific summary`,
        `  - Example: feat: add Amadeus streaming chat route and Kurisu system prompt`,
        ``,
        `After committing, give 1-2 brief recommendations for what to tackle next`,
        `based on the current phase in CLAUDE.md.`,
      ].join("\n"),
    };

    process.stdout.write(JSON.stringify(followup));
    process.exit(0);
  } catch {
    // Git unavailable or any other error — fail open, agent stops normally
    process.exit(0);
  }
});
