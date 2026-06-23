from __future__ import annotations

import json

from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parents[1]
CASES_DIR = BASE_DIR / "cases"
FIXTURES_DIR = BASE_DIR / "fixtures"
RUN_LOGS_DIR = BASE_DIR / "run_logs"
RESULTS_DIR = BASE_DIR / "results"

CASE_FILES = [
    "naver_search_cases.json",
    "web_search_cases.json",
    "tmap_search_poi_cases.json",
    "tmap_route_pedestrian_cases.json",
]

FIXTURE_FILES = [
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


def load_fixture_map() -> dict[str, dict[str, Any]]:
    fixtures: dict[str, dict[str, Any]] = {}
    for filename in FIXTURE_FILES:
        fixtures.update(read_json(FIXTURES_DIR / filename))
    return fixtures
