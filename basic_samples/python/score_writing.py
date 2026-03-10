"""
Speechace API — Writing Quality Scoring
========================================
Submits a writing prompt and answer for quality scoring.
No audio file is required — only text is sent.
Returns overall, task_response, vocab, grammar, and coherence metrics.

Usage:
    python score_writing.py \
        --prompt "Describe your favourite city" \
        --answer "My city has many parks and tall buildings."

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
_ROWS = ["overall", "task_response", "vocab", "grammar", "coherence"]


def build_url(endpoint: str, key: str, dialect: str, user_id: str) -> str:
    base = endpoint.rstrip("/")
    params = urlencode({
        "key": key,
        "dialect": dialect,
        "user_id": user_id,
        "task_type": "essay-writing",
    })
    return f"{base}/api/scoring/writing/v9/json?{params}"


def score_writing(prompt: str, answer: str, dialect: str = "en-us") -> dict:
    """Send a writing prompt and answer to Speechace for writing quality scoring."""
    key = os.environ.get("SPEECHACE_API_KEY", "")
    endpoint = os.environ.get("SPEECHACE_API_ENDPOINT", "https://api.speechace.co")
    user_id = os.environ.get("SPEECHACE_USER_ID", "sample-user-001")

    if not key:
        raise ValueError(
            "SPEECHACE_API_KEY is not set. "
            "Export it as an environment variable or add it to a .env file."
        )

    url = build_url(endpoint, key, dialect, user_id)

    response = requests.post(
        url,
        data={"prompt": prompt, "answer": answer},
        timeout=30,
    )

    response.raise_for_status()
    return response.json()


def print_summary(result: dict) -> None:
    """Print a human-readable summary of the writing scoring response."""
    status = result.get("status")
    if status != "success":
        print(f"API returned status: {status}")
        print(json.dumps(result, indent=2))
        return

    writing_info = result.get("writing_score", {})
    speechace = writing_info.get("speechace", {})
    cefr      = writing_info.get("cefr", {})
    ielts     = writing_info.get("ielts", {})

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
    parser = argparse.ArgumentParser(description="Speechace writing quality scoring sample")
    parser.add_argument("--prompt", required=True, help="Writing prompt / question")
    parser.add_argument("--answer", required=True, help="Candidate's written answer")
    parser.add_argument("--dialect", default="en-us", help="Dialect code (default: en-us)")
    parser.add_argument("--raw", action="store_true", help="Print full raw JSON response")
    args = parser.parse_args()

    try:
        result = score_writing(args.prompt, args.answer, args.dialect)
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
