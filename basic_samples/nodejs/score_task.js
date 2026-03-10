/**
 * Speechace API — Task Achievement Scoring
 * =========================================
 * Submits an audio file and an image description for task achievement scoring.
 * Returns a task score (0-5) plus pronunciation, fluency, grammar, vocabulary,
 * and coherence metrics across multiple scoring frameworks.
 *
 * Usage:
 *   node score_task.js --audio ../../audio_samples/apple.wav \
 *       --context "A photo of a red apple on a white table"
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
  const params = new URLSearchParams({ key, dialect, user_id: userId, task_type: "describe-image" });
  return `${base}/api/scoring/task/v9/json?${params}`;
}

export async function scoreTask(audioPath, context, dialect = "en-us") {
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
  form.append("task_context", context);
  form.append("include_speech_score", "1");
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

  const taskInfo  = result.task_score ?? {};
  const scoreInfo = result.speech_score ?? {};
  const speechace = scoreInfo.speechace_score ?? {};
  const cefr      = scoreInfo.cefr_score ?? {};
  const ielts     = scoreInfo.ielts_score ?? {};

  const transcript = taskInfo.transcript;
  if (transcript) console.log(`\nTranscript: ${transcript}`);

  const taskScore = taskInfo.score;
  if (taskScore !== undefined && taskScore !== null) {
    console.log(`Task Score: ${taskScore} / 5`);
  }

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
    context: { type: "string" },
    dialect: { type: "string", default: "en-us" },
    raw:     { type: "boolean", default: false },
  },
});

if (!args.audio || !args.context) {
  console.error("Usage: node score_task.js --audio <path> --context <image description>");
  process.exit(1);
}

try {
  const result = await scoreTask(args.audio, args.context, args.dialect);
  if (args.raw) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printSummary(result);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
