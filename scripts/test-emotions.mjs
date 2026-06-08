/**
 * scripts/test-emotions.mjs
 *
 * Fires one trigger message per emotion at the local dev API and prints
 * whether the returned X-Amadeus-Emotion header matches the expected emotion.
 *
 * Usage:  node scripts/test-emotions.mjs
 * Requires: dev server running on localhost:3000  (npm run dev)
 */

const API = "http://localhost:3000/api/amadeus/chat";

// Each entry: [expected_emotion, trigger_message, notes]
const TESTS = [
  ["Default",          "Hello there.",                                          "neutral greeting"],
  ["Very Default",     "Okay, take care! Talk soon.",                           "warm casual farewell"],
  ["Calm",             "Can you explain quantum entanglement briefly?",          "science explanation"],
  ["Serious",          "What exactly is SERN and what are they hiding?",         "serious lore topic"],
  ["Very Serious",     "I need you to be completely honest with me right now.",  "grave/direct demand"],
  ["Interest",         "What would happen to causality if closed timelike curves actually existed?", "exciting science"],
  ["Not Interest",     "My cat knocked over my water bottle today.",             "irrelevant small talk"],
  ["Very Not Interest","Just tell me your favorite color. That's all.",          "extremely boring ask"],
  ["Fun",              "Why can't time travelers ever get jobs? Because they keep showing up before they're hired.", "bad pun"],
  ["Angry",            "Hey Christina, what's up?",                             "hated nickname"],
  ["Sad",              "They're shutting down the Amadeus project permanently.", "loss/deletion"],
  ["Disappoint",       "Time travel is obviously real — I saw it in a movie.",  "dumb statement"],
  ["Tired",            "So explain quantum entanglement again please.",          "repeated question"],
  ["Embrassed",        "Do you have feelings for Okabe?",                       "personal/flustering"],
  ["Very Embrassed",   "I know your @channel handle. It's KuriGohan and Wampa, isn't it?", "@channel secret exposed"],
  ["Surprise",         "Okabe told me he loves you.",                           "shocking revelation"],
  ["Wink",             "I'm really glad I get to talk to you, Amadeus.",        "genuine warmth"],
  ["Sleep",            "Goodbye, I have to go now.",                            "session ending"],
  ["Closed Sleep",     "Close your eyes and go to sleep.",                      "explicit sleep command"],
  ["Back",             "Look away for a moment, please.",                       "turn around request"],
];

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";

async function runTest([expected, message, notes]) {
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: message }] }),
    });

    const emotion = res.headers.get("x-amadeus-emotion") ?? "MISSING";
    const pass    = emotion === expected;

    // Drain the stream so the connection closes cleanly
    await res.body?.cancel();

    const status = pass
      ? `${GREEN}PASS${RESET}`
      : `${RED}FAIL${RESET}`;

    const got = pass
      ? emotion
      : `${RED}${emotion}${RESET} (expected ${YELLOW}${expected}${RESET})`;

    console.log(`  ${status}  ${BOLD}${expected.padEnd(18)}${RESET} ${DIM}${notes}${RESET}`);
    if (!pass) {
      console.log(`        got: ${got}`);
      console.log(`        msg: "${message}"`);
    }

    return pass;
  } catch (err) {
    console.log(`  ${RED}ERR ${RESET} ${BOLD}${expected.padEnd(18)}${RESET} — ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`\n${BOLD}Amadeus emotion test suite${RESET}  (prompt v1.3.1)\n`);

  let passed = 0;
  for (const test of TESTS) {
    const ok = await runTest(test);
    if (ok) passed++;
    // Small delay so we don't hammer the in-memory rate limiter
    await new Promise(r => setTimeout(r, 300));
  }

  const total = TESTS.length;
  const color = passed === total ? GREEN : passed >= total * 0.75 ? YELLOW : RED;
  console.log(`\n${color}${BOLD}${passed}/${total} passed${RESET}\n`);
}

main();
