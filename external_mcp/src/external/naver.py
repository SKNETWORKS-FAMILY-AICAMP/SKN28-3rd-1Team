from __future__ import annotations

import html
import re

from datetime import UTC, datetime
from typing import Any, Literal

import httpx

from pydantic import SecretStr
from settings import settings

NaverSearchCategory = Literal["webkr", "news", "blog", "local"]

_NAVER_SEARCH_BASE_URL = "https://openapi.naver.com/v1/search"
_HTML_TAG_PATTERN = re.compile(r"<[^>]+>")


# 네이버 검색 API를 호출하고 agent가 쓰기 쉬운 결과 형태로 정리한다.
def search_naver(
    query: str,
    category: NaverSearchCategory = "webkr",
    limit: int | None = None,
    start: int = 1,
    sort: str | None = None,
) -> dict[str, Any]:
    """네이버 검색 API를 호출하고 agent가 쓰기 쉬운 dict로 정리한다."""

    normalized_query = query.strip()
    queried_at = datetime.now(UTC).isoformat()

    if not normalized_query:
        return _failure(
            query=normalized_query,
            category=category,
            queried_at=queried_at,
            warning="query must not be empty.",
        )

    client_id = _secret_value(settings.naver_client_id)
    client_secret = _secret_value(settings.naver_client_secret)

    if not client_id or not client_secret:
        return _failure(
            query=normalized_query,
            category=category,
            queried_at=queried_at,
            warning="Naver API credentials are missing.",
        )

    safe_limit = _bounded_limit(limit)
    safe_start = max(int(start), 1)
    url = f"{_NAVER_SEARCH_BASE_URL}/{category}.json"

    params: dict[str, Any] = {
        "query": normalized_query,
        "display": safe_limit,
        "start": safe_start,
    }

    if sort:
        params["sort"] = sort

    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
    }

    try:
        timeout_seconds = settings.request_timeout_ms / 1000

        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.get(url, params=params, headers=headers)

        response.raise_for_status()

        payload = response.json()

    except Exception as exc:  # noqa: BLE001
        return _failure(
            query=normalized_query,
            category=category,
            queried_at=queried_at,
            warning=f"Naver search failed: {exc}",
        )

    results = [
        _normalize_item(item, category=category, position=index)
        for index, item in enumerate(payload.get("items") or [], start=1)
        if isinstance(item, dict)
    ]

    return {
        "provider": "naver",
        "success": True,
        "category": category,
        "query": normalized_query,
        "count": len(results),
        "queried_at": queried_at,
        "results": results,
        "warnings": [],
    }


# Pydantic SecretStr에서 실제 문자열 값을 꺼내되 빈 값은 None으로 처리한다.
def _secret_value(value: SecretStr | None) -> str | None:
    if value is None:
        return None

    secret = value.get_secret_value().strip()
    return secret or None


# 요청 결과 개수를 기본값과 최대값 범위 안으로 맞춘다.
def _bounded_limit(limit: int | None) -> int:
    default_limit = min(settings.search_default_limit, settings.search_max_limit)

    if limit is None:
        return default_limit

    return min(max(int(limit), 1), settings.search_max_limit)


# 네이버 API item 하나를 공통 검색 결과 dict로 변환한다.
def _normalize_item(
    item: dict[str, Any],
    *,
    category: NaverSearchCategory,
    position: int,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "provider": "naver",
        "category": category,
        "position": position,
        "title": _clean_text(item.get("title")),
        "url": _first_text(item.get("link"), item.get("originallink")),
        "description": _clean_text(item.get("description")),
    }

    if item.get("originallink"):
        result["original_url"] = _first_text(item.get("originallink"))

    if item.get("bloggername"):
        result["blog_name"] = _clean_text(item.get("bloggername"))
    if item.get("bloggerlink"):
        result["blog_url"] = _first_text(item.get("bloggerlink"))

    if item.get("pubDate"):
        result["published_at"] = _clean_text(item.get("pubDate"))
    if item.get("postdate"):
        result["post_date"] = _clean_text(item.get("postdate"))

    if category == "local":
        if item.get("category"):
            result["place_category"] = _clean_text(item.get("category"))
        if item.get("telephone"):
            result["telephone"] = _clean_text(item.get("telephone"))
        if item.get("address"):
            result["address"] = _clean_text(item.get("address"))
        if item.get("roadAddress"):
            result["road_address"] = _clean_text(item.get("roadAddress"))
        if item.get("mapx"):
            result["naver_mapx"] = _clean_text(item.get("mapx"))
        if item.get("mapy"):
            result["naver_mapy"] = _clean_text(item.get("mapy"))

    return result


# HTML 태그와 엔티티가 섞인 네이버 텍스트를 일반 문자열로 정리한다.
def _clean_text(value: Any) -> str:
    if value is None:
        return ""

    text = str(value)

    text = html.unescape(text)

    text = _HTML_TAG_PATTERN.sub("", text)

    return " ".join(text.split())


# 여러 후보 값 중 비어 있지 않은 첫 번째 문자열을 선택한다.
def _first_text(*values: Any) -> str:
    for value in values:
        cleaned = _clean_text(value)
        if cleaned:
            return cleaned
    return ""


# 실패 상황도 항상 같은 응답 구조로 반환한다.
def _failure(
    *,
    query: str,
    category: NaverSearchCategory,
    queried_at: str,
    warning: str,
) -> dict[str, Any]:
    return {
        "provider": "naver",
        "success": False,
        "category": category,
        "query": query,
        "count": 0,
        "queried_at": queried_at,
        "results": [],
        "warnings": [warning],
    }
