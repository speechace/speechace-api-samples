/**
 * Speechace API — Text-Constrained Pronunciation Scoring
 * =======================================================
 * Submits an audio file alongside reference text and prints a structured
 * summary of the pronunciation quality scores returned by the API.
 *
 * Usage:
 *   node score_text.js --audio ../../audio_samples/apple.wav --text "apple"
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

export function buildUrl(endpoint, key, dialect, userId) {
  const base = endpoint.replace(/\/$/, "");
  const params = new URLSearchParams({ key, dialect, user_id: userId });
  return `${base}/api/scoring/text/v9/json?${params}`;
}

export async function scoreText(audioPath, text, dialect = "en-us") {
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
  form.append("text", text);
  form.append("question_info", "u1/q1");
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

  const scoreInfo = result.text_score ?? {};
  console.log("\n" + "=".repeat(50));
  console.log(`Overall quality score : ${scoreInfo.quality_score ?? "N/A"}`);
  console.log("=".repeat(50));

  const words = scoreInfo.word_score_list ?? [];
  if (words.length > 0) {
    console.log(`\n${"Word".padEnd(20)} ${"Quality".padStart(8)}  Phones`);
    console.log("-".repeat(50));
    for (const word of words) {
      const phones = (word.phone_score_list ?? [])
        .map((p) => `${p.phone}(${p.quality_score ?? "?"})`)
        .join(" ");
      console.log(
        `${(word.word ?? "").padEnd(20)} ${String(word.quality_score ?? "N/A").padStart(8)}  ${phones}`
      );
    }
  }

  const fluency = scoreInfo.fluency;
  if (fluency) {
    console.log("\nFluency metrics:");
    for (const [k, v] of Object.entries(fluency)) {
      console.log(`  ${k}: ${v}`);
    }
  }
}

const { values: args } = parseArgs({
  options: {
    audio:   { type: "string" },
    text:    { type: "string" },
    dialect: { type: "string", default: "en-us" },
    raw:     { type: "boolean", default: false },
  },
});

if (!args.audio || !args.text) {
  console.error("Usage: node score_text.js --audio <path> --text <reference>");
  process.exit(1);
}

try {
  const result = await scoreText(args.audio, args.text, args.dialect);
  if (args.raw) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printSummary(result);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
