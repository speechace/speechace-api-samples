"""
Speechace API — Task Achievement Scoring
=========================================
Submits an audio file and an image description for task achievement scoring.
Returns a task score (0–5) plus pronunciation, fluency, grammar, vocabulary,
and coherence metrics across multiple scoring frameworks.

Usage:
    python score_task.py --audio ../../audio_samples/apple.wav \
        --context "A photo of a red apple on a white table"

Environment variables (can also be placed in a .env file at the project root):
    SPEECHACE_API_KEY       Your Speechace API key (required)
    SPEECHACE_API_ENDPOINT  Base URL, defaults to https://api.speechace.co
    SPEECHACE_USER_ID       Arbitrary user identifier sent to the API
"""

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# Score categories returned by the API, in display order
_ROWS = ["overall", "pronunciation", "fluency", "grammar", "vocab", "coherence"]


def build_url(endpoint: str, key: str, dialect: str, user_id: str) -> str:
    base = endpoint.rstrip("/")
    params = urlencode({
        "key": key,
        "dialect": dialect,
        "user_id": user_id,
        "task_type": "describe-image",
    })
    return f"{base}/api/scoring/task/v9/json?{params}"


def score_task(audio_path: str, context: str, dialect: str = "en-us") -> dict:
    """Send an audio file and image description to Speechace for task scoring."""
    key = os.environ.get("SPEECHACE_API_KEY", "")
    endpoint = os.environ.get("SPEECHACE_API_ENDPOINT", "https://api.speechace.co")
    user_id = os.environ.get("SPEECHACE_USER_ID", "sample-user-001")

    if not key:
        raise ValueError(
            "SPEECHACE_API_KEY is not set. "
            "Export it as an environment variable or add it to a .env file."
        )

    url = build_url(endpoint, key, dialect, user_id)

    with open(audio_path, "rb") as audio_file:
        response = requests.post(
            url,
            files={"user_audio_file": audio_file},
            data={"task_context": context, "include_speech_score": "1"},
            timeout=30,
        )

    response.raise_for_status()
    return response.json()


def print_summary(result: dict) -> None:
    """Print a human-readable summary of the task scoring response."""
    status = result.get("status")
    if status != "success":
        print(f"API returned status: {status}")
        print(json.dumps(result, indent=2))
        return

    task_info = result.get("task_score", {})
    transcript = task_info.get("transcript")
    if transcript:
        print(f"\nTranscript: {transcript}")

    task_score = task_info.get("score")
    if task_score is not None:
        print(f"Task Score: {task_score} / 5")

    score_info = result.get("speech_score", {})
    speechace = score_info.get("speechace_score", {})
    cefr      = score_info.get("cefr_score", {})
    ielts     = score_info.get("ielts_score", {})

    C1, C2, C3, C4 = 15, 15, 10, 11
    SEP = "=" * (C1 + C2 + C3 + C4 + 6)

    print(f"\n{SEP}")
    print(f"{'Category':<{C1}}  {'speechace_score':>{C2}}  {'cefr_score':>{C3}}  {'ielts_score':>{C4}}")
    print("-" * len(SEP))
    for row in _ROWS:
        s = speechace.get(row, "N/A")
        c = cefr.get(row, "N/A")
        i = ielts.get(row, "N/A")
        print(f"{row:<{C1}}  {str(s):>{C2}}  {str(c):>{C3}}  {str(i):>{C4}}")
    print(SEP)


def main():
    parser = argparse.ArgumentParser(description="Speechace task achievement scoring sample")
    parser.add_argument("--audio",   required=True, help="Path to audio file (WAV or MP3)")
    parser.add_argument("--context", required=True, help="Image description (task context)")
    parser.add_argument("--dialect", default="en-us", help="Dialect code (default: en-us)")
    parser.add_argument("--raw", action="store_true", help="Print full raw JSON response")
    args = parser.parse_args()

    try:
        result = score_task(args.audio, args.context, args.dialect)
    except ValueError as e:
        print(f"Configuration error: {e}", file=sys.stderr)
        sys.exit(1)
    except requests.HTTPError as e:
        print(f"HTTP error {e.response.status_code}: {e.response.text}", file=sys.stderr)
        sys.exit(1)
    except requests.RequestException as e:
        print(f"Request failed: {e}", file=sys.stderr)
        sys.exit(1)

    if args.raw:
        print(json.dumps(result, indent=2))
    else:
        print_summary(result)


if __name__ == "__main__":
    main()
