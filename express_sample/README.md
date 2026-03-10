# Speechace Express Sample

A full-stack Node.js/Express application demonstrating Speechace API integration.

## Features

- In-browser audio recording via HTML5 `MediaRecorder` (desktop and mobile)
- File upload as alternative to recording
- Text-constrained scoring, free speech scoring, task achievement scoring, and writing scoring
- Word-level quality display with phoneme and syllable breakdown
- Fluency metrics table
- API key kept server-side — never exposed to the browser

## Prerequisites

- Node.js 18+
- A Speechace API key ([speechace.com](https://www.speechace.com))

## Setup

```bash
cd express_sample
npm install
cp .env.example .env
# Edit .env and set SPEECHACE_API_KEY
node server.js
# Open http://localhost:3000
```

## API Routes

| Method | Path                | Description                          |
|--------|---------------------|--------------------------------------|
| `POST` | `/api/score/text`   | Text-constrained pronunciation score |
| `POST` | `/api/score/free`   | Free-speech score                    |
| `POST` | `/api/score/task`   | Task achievement score               |
| `POST` | `/api/score/writing`| Writing quality score                |

## Architecture

```
server.js             Entry point, Express setup, static file serving
routes/scoring.js     Scoring route handlers
public/index.html     Single-page UI
public/recorder.js    MediaRecorder, form submission, results rendering
public/styles.css     Stylesheet
```
