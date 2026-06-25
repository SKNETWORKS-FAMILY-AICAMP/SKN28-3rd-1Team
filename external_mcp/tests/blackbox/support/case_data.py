from __future__ import annotations

import json

from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parents[1]
CASES_DIR = BASE_DIR / "cases"
FAKE_API_RESPONSES_DIR = BASE_DIR / "fake_api_responses"
RUN_LOGS_DIR = BASE_DIR / "run_logs"
RESULTS_DIR = BASE_DIR / "results"

CASE_FILES = [
    "naver_search_cases.json",
    "web_search_cases.json",
    "tmap_search_poi_cases.json",
    "tmap_route_pedestrian_cases.json",
]

FAKE_API_RESPONSE_FILES = [
    "naver_fake_api.json",
    "firecrawl_fake_api.json",
    "tmap_fake_api.json",
]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_cases() -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for filename in CASE_FILES:
        cases.extend(read_json(CASES_DIR / filename))
    return cases


def load_fake_api_response_map() -> dict[str, dict[str, Any]]:
    fake_api_responses: dict[str, dict[str, Any]] = {}
    for filename in FAKE_API_RESPONSE_FILES:
        fake_api_responses.update(read_json(FAKE_API_RESPONSES_DIR / filename))
    return fake_api_responses
