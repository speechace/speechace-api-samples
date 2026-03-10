"""
Speechace API — Text-Constrained Pronunciation Scoring
=======================================================
Submits an audio file alongside reference text and prints a structured
summary of the pronunciation quality scores returned by the API.

Usage:
    python score_text.py --audio ../../audio_samples/apple.wav --text "apple"

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

# Load .env from the project root (two levels up from this file)
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def build_url(endpoint: str, key: str, dialect: str, user_id: str) -> str:
    base = endpoint.rstrip("/")
    params = urlencode({"key": key, "dialect": dialect, "user_id": user_id})
    return f"{base}/api/scoring/text/v9/json?{params}"


def score_text(audio_path: str, text: str, dialect: str = "en-us") -> dict:
    """Send an audio file + reference text to Speechace and return the parsed response."""
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
            data={"text": text, "question_info": "u1/q1"},
            files={"user_audio_file": audio_file},
            timeout=30,
        )

    response.raise_for_status()
    return response.json()


def print_summary(result: dict) -> None:
    """Print a human-readable summary of the API response."""
    status = result.get("status")
    if status != "success":
        print(f"API returned status: {status}")
        print(json.dumps(result, indent=2))
        return

    score_info = result.get("text_score", {})
    pronunciation = score_info.get("speechace_score", {}).get("pronunciation", "N/A")
    print(f"\n{'=' * 50}")
    print(f"Overall quality score : {pronunciation}")
    print(f"{'=' * 50}")

    words = score_info.get("word_score_list", [])
    if words:
        print(f"\n{'Word':<20} {'Quality':>8} {'Phones'}")
        print("-" * 50)
        for word in words:
            phones = " ".join(
                f"{p['phone']}({p.get('quality_score', '?')})"
                for p in word.get("phone_score_list", [])
            )
            print(f"{word.get('word', ''):<20} {word.get('quality_score', 'N/A'):>8}  {phones}")

    fluency = score_info.get("fluency", {})
    if fluency:
        print(f"\nFluency metrics:")
        for k, v in fluency.items():
            print(f"  {k}: {v}")


def main():
    parser = argparse.ArgumentParser(description="Speechace text-scoring sample")
    parser.add_argument("--audio", required=True, help="Path to audio file (WAV or MP3)")
    parser.add_argument("--text", required=True, help="Reference text to score against")
    parser.add_argument("--dialect", default="en-us", help="Dialect code (default: en-us)")
    parser.add_argument("--raw", action="store_true", help="Print full raw JSON response")
    args = parser.parse_args()

    try:
        result = score_text(args.audio, args.text, args.dialect)
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
