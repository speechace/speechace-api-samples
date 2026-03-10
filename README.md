# Speechace API Samples

Reviewed, improved, and extended samples for the [Speechace pronunciation scoring API](https://api-docs.speechace.com).

## Repository Map

```
.
├── .env.example                 # Credential template — copy to .env
├── audio_samples/               # Sample WAV/MP3 files for testing
│   ├── apple.wav
│   ├── someparents.wav
│   ├── taylorhad.wav
│   ├── traveltoday.wav
│   └── aredapple.mp3
│
├── basic_samples/
│   ├── python/                  # Python CLI scripts
│   │   ├── score_text.py        # Text-constrained scoring
│   │   ├── score_speech.py      # Speech scoring
│   │   ├── score_task.py        # Task achievement scoring
│   │   ├── score_writing.py     # Writing quality scoring
│   │   └── requirements.txt
│   └── nodejs/                  # Node.js CLI scripts
│       ├── score_text.js
│       ├── score_speech.js
│       ├── score_task.js
│       ├── score_writing.js
│       └── package.json
│
├── express_sample/              # Full Node.js/Express server with UI
│   ├── server.js
│   ├── routes/scoring.js
│   ├── public/
│   └── README.md
│
├── django_sample/               # Django sample (v0.5 and v9)
└── php_sample/                  # PHP sample (v0.5 and v9)
```

## Setup

### 1. Credentials

```bash
cp .env.example .env
# Edit .env and set SPEECHACE_API_KEY
```

Get an API key at [speechace.com/api-plans](https://www.speechace.com/api-plans).

### 2. Python basic samples

```bash
cd basic_samples/python
pip install -r requirements.txt

# Text-constrained scoring
python score_text.py --audio ../../audio_samples/apple.wav --text "apple"

# Speech scoring
python score_speech.py --audio ../../audio_samples/traveltoday.wav

# Task achievement scoring
python score_task.py --audio ../../audio_samples/aredapple.mp3 \
    --context "There is a red apple on a white table."

# Writing quality scoring (text only, no audio)
python score_writing.py \
    --prompt "Describe your favourite city" \
    --answer "My city has many parks and tall buildings."

# Show raw JSON
python score_text.py --audio ../../audio_samples/apple.wav --text "apple" --raw
```

### 3. Node.js basic samples

Requires Node.js 18+.

```bash
cd basic_samples/nodejs
npm install

# Text-constrained scoring
node score_text.js --audio ../../audio_samples/apple.wav --text "apple"

# Speech scoring
node score_speech.js --audio ../../audio_samples/traveltoday.wav

# Task achievement scoring
node score_task.js --audio ../../audio_samples/aredapple.mp3 \
    --context "There is a red apple on a white table."

# Writing quality scoring
node score_writing.js \
    --prompt "Describe your favourite city" \
    --answer "My city has many parks and tall buildings."
```

### 4. Express server sample

See [express_sample/README.md](express_sample/README.md) for full setup instructions.

```bash
cd express_sample
npm install
cp .env.example .env   # set SPEECHACE_API_KEY
node server.js
# Open http://localhost:3000
```

The UI has four tabs: **Score Text**, **Score Speech**, **Score Task**, and **Score Writing**.

<img width="732" height="934" alt="localhost" src="https://github.com/user-attachments/assets/6304afed-74de-4fb5-bb3f-bbe6d1f3a322" />

## API Overview

| Endpoint | Mode | Required fields |
|----------|------|-----------------|
| `POST /api/scoring/text/v9/json` | Text-constrained pronunciation | `user_audio_file`, `text` |
| `POST /api/scoring/speech/v9/json` | Free speech | `user_audio_file` |
| `POST /api/scoring/task/v9/json` | Task achievement | `user_audio_file`, `task_context` |
| `POST /api/scoring/writing/v9/json` | Writing quality | `prompt`, `answer` |

Full documentation: [api-docs.speechace.com](https://api-docs.speechace.com)
