/**
 * Speechace API — Speech Scoring
 * ================================
 * Submits an audio file for open-ended speech scoring — no reference
 * text required. Returns pronunciation, fluency, grammar, vocabulary,
 * and coherence metrics across multiple scoring frameworks.
 *
 * Usage:
 *   node score_speech.js --audio ../../audio_samples/apple.wav
 *
 * Environment variables (can also be placed in a .env file at the project root):
 *   SPEECHACE_API_KEY       Your Speechace API key (required)
 *   SPEECHACE_API_ENDPOINT  Base URL, defaults to https://api.speechace.co
 *   SPEECHACE_USER_ID       Arbitrary user identifier sent to the API
 */

import { createReadStream } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";
import FormData from "form-data";
import fetch from "node-fetch";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

const ROWS = ["overall", "pronunciation", "fluency", "grammar", "vocab", "coherence"];

export function buildUrl(endpoint, key, dialect, userId) {
  const base = endpoint.replace(/\/$/, "");
  const params = new URLSearchParams({ key, dialect, user_id: userId });
  return `${base}/api/scoring/speech/v9/json?${params}`;
}

export async function scoreSpeech(audioPath, dialect = "en-us") {
  const key = process.env.SPEECHACE_API_KEY ?? "";
  const endpoint = process.env.SPEECHACE_API_ENDPOINT ?? "https://api.speechace.co";
  const userId = process.env.SPEECHACE_USER_ID ?? "sample-user-001";

  if (!key) {
    throw new Error(
      "SPEECHACE_API_KEY is not set. " +
      "Export it as an environment variable or add it to a .env file."
    );
  }

  const url = buildUrl(endpoint, key, dialect, userId);
  const form = new FormData();
  form.append("user_audio_file", createReadStream(audioPath));

  const response = await fetch(url, { method: "POST", body: form });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
  return response.json();
}

export function printSummary(result) {
  if (result.status !== "success") {
    console.log(`API returned status: ${result.status}`);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const scoreInfo = result.speech_score ?? {};
  const speechace = scoreInfo.speechace_score ?? {};
  const cefr      = scoreInfo.cefr_score ?? {};
  const ielts     = scoreInfo.ielts_score ?? {};

  const transcript = scoreInfo.transcript;
  if (transcript) console.log(`\nTranscript: ${transcript}`);

  const [C1, C2, C3, C4] = [15, 15, 10, 11];
  const SEP = "=".repeat(C1 + C2 + C3 + C4 + 6);

  console.log("\n" + SEP);
  console.log(
    `${"Category".padEnd(C1)}  ${"speechace_score".padStart(C2)}  ${"cefr_score".padStart(C3)}  ${"ielts_score".padStart(C4)}`
  );
  console.log("-".repeat(SEP.length));
  for (const row of ROWS) {
    const s = String(speechace[row] ?? "N/A");
    const c = String(cefr[row] ?? "N/A");
    const i = String(ielts[row] ?? "N/A");
    console.log(
      `${row.padEnd(C1)}  ${s.padStart(C2)}  ${c.padStart(C3)}  ${i.padStart(C4)}`
    );
  }
  console.log(SEP);
}

const { values: args } = parseArgs({
  options: {
    audio:   { type: "string" },
    dialect: { type: "string", default: "en-us" },
    raw:     { type: "boolean", default: false },
  },
});

if (!args.audio) {
  console.error("Usage: node score_speech.js --audio <path>");
  process.exit(1);
}

try {
  const result = await scoreSpeech(args.audio, args.dialect);
  if (args.raw) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printSummary(result);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
