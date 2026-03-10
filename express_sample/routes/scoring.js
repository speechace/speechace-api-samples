/**
 * Scoring Routes
 * POST /api/score/text    — text-constrained pronunciation scoring
 * POST /api/score/free    — free speech scoring
 * POST /api/score/task    — task achievement scoring
 * POST /api/score/writing — writing quality scoring
 */

import express from "express";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function getSpeechaceConfig() {
  const key = process.env.SPEECHACE_API_KEY ?? "";
  const endpoint = (process.env.SPEECHACE_API_ENDPOINT ?? "https://api.speechace.co").replace(/\/$/, "");
  const userId = process.env.SPEECHACE_USER_ID ?? "express-sample-user";
  return { key, endpoint, userId };
}

function buildUrl(endpoint, apiPath, key, dialect, userId) {
  const params = new URLSearchParams({ key, dialect, user_id: userId });
  return `${endpoint}${apiPath}?${params}`;
}

async function callSpeechace(apiUrl, buffer, filename, extra = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(extra)) {
    form.append(k, v);
  }
  form.append("user_audio_file", buffer, { filename });

  const response = await fetch(apiUrl, { method: "POST", body: form });
  if (!response.ok) {
    const body = await response.text();
    const err = new Error(`Speechace API error ${response.status}: ${body}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

async function callSpeechaceText(apiUrl, fields) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    form.append(k, v);
  }
  const response = await fetch(apiUrl, { method: "POST", body: form });
  if (!response.ok) {
    const body = await response.text();
    const err = new Error(`Speechace API error ${response.status}: ${body}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

router.post("/text", upload.single("audio"), async (req, res, next) => {
  try {
    const { key, endpoint, userId } = getSpeechaceConfig();
    if (!key) return res.status(500).json({ error: "Server misconfiguration: API key not set." });
    if (!req.file) return res.status(400).json({ error: "Missing required field: audio" });
    if (!req.body.text) return res.status(400).json({ error: "Missing required field: text" });

    const dialect = req.body.dialect ?? "en-us";
    const url = buildUrl(endpoint, "/api/scoring/text/v9/json", key, dialect, userId);
    const result = await callSpeechace(url, req.file.buffer, req.file.originalname, {
      text: req.body.text,
      question_info: "u1/q1",
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.post("/free", upload.single("audio"), async (req, res, next) => {
  try {
    const { key, endpoint, userId } = getSpeechaceConfig();
    if (!key) return res.status(500).json({ error: "Server misconfiguration: API key not set." });
    if (!req.file) return res.status(400).json({ error: "Missing required field: audio" });

    const dialect = req.body.dialect ?? "en-us";
    const url = buildUrl(endpoint, "/api/scoring/speech/v9/json", key, dialect, userId);
    const result = await callSpeechace(url, req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (err) { next(err); }
});

router.post("/task", upload.single("audio"), async (req, res, next) => {
  try {
    const { key, endpoint, userId } = getSpeechaceConfig();
    if (!key) return res.status(500).json({ error: "Server misconfiguration: API key not set." });
    if (!req.file) return res.status(400).json({ error: "Missing required field: audio" });
    if (!req.body.task_context) return res.status(400).json({ error: "Missing required field: task_context" });

    const dialect = req.body.dialect ?? "en-us";
    const params = new URLSearchParams({ key, dialect, user_id: userId, task_type: "describe-image" });
    const url = `${endpoint}/api/scoring/task/v9/json?${params}`;
    const result = await callSpeechace(url, req.file.buffer, req.file.originalname, {
      task_context: req.body.task_context,
      include_speech_score: "1",
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.post("/writing", upload.none(), async (req, res, next) => {
  try {
    const { key, endpoint, userId } = getSpeechaceConfig();
    if (!key) return res.status(500).json({ error: "Server misconfiguration: API key not set." });
    if (!req.body.prompt) return res.status(400).json({ error: "Missing required field: prompt" });
    if (!req.body.answer) return res.status(400).json({ error: "Missing required field: answer" });

    const dialect = req.body.dialect ?? "en-us";
    const params = new URLSearchParams({ key, dialect, user_id: userId, task_type: "essay-writing" });
    const url = `${endpoint}/api/scoring/writing/v9/json?${params}`;
    const result = await callSpeechaceText(url, {
      prompt: req.body.prompt,
      answer: req.body.answer,
    });
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
