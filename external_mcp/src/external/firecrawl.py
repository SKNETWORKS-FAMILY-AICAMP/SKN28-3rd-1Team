from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

import httpx
from pydantic import SecretStr

from settings import settings

FirecrawlSource = Literal["web", "news"]
FirecrawlTimeRange = Literal["any", "hour", "day", "week", "month", "year"]

_FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v2/search"
_TEXT_LIMIT = 500
_MARKDOWN_LIMIT = 1_200
_MAX_DOMAIN_FILTER_COUNT = 10
_TIME_RANGE_TO_TBS = {
    "hour": "qdr:h",
    "day": "qdr:d",
    "week": "qdr:w",
    "month": "qdr:m",
    "year": "qdr:y",
}


# Firecrawl Search API를 호출하고 웹 근거 후보를 공통 결과 형태로 반환한다.
def search_firecrawl(
    query: str,
    limit: int | None = None,
    sources: list[FirecrawlSource] | None = None,
    include_markdown: bool = False,
    include_domains: list[str] | None = None,
    exclude_domains: list[str] | None = None,
    location: str | None = None,
    country: str = "KR",
    time_range: FirecrawlTimeRange = "any",
) -> dict[str, Any]:
    """Firecrawl Search API를 호출해서 웹 근거 후보를 반환한다."""

    normalized_query = query.strip()
    searched_at = datetime.now(UTC).isoformat()

    if not normalized_query:
        return _failure(
            query=normalized_query,
            searched_at=searched_at,
            warning="query must not be empty.",
        )

    api_key = _secret_value(settings.firecrawl_api_key)
    if not api_key:
        return _failure(
            query=normalized_query,
            searched_at=searched_at,
            warning="Firecrawl API key is missing.",
        )

    safe_limit = _bounded_limit(limit)
    safe_sources = _sources(sources)
    include_filter = _domain_filter(include_domains)
    exclude_filter = _domain_filter(exclude_domains)
    if include_filter and exclude_filter:
        return _failure(
            query=normalized_query,
            searched_at=searched_at,
            warning="include_domains and exclude_domains cannot be used together.",
        )

    payload: dict[str, Any] = {
        "query": normalized_query,
        "limit": safe_limit,
        "sources": safe_sources,
        "country": _optional_string(country) or "KR",
        "timeout": settings.request_timeout_ms,
        "ignoreInvalidURLs": True,
    }

    tbs = _TIME_RANGE_TO_TBS.get(time_range)
    if tbs:
        payload["tbs"] = tbs
    if include_filter:
        payload["includeDomains"] = include_filter
    if exclude_filter:
        payload["excludeDomains"] = exclude_filter
    if _optional_string(location):
        payload["location"] = _optional_string(location)
    if include_markdown:
        payload["scrapeOptions"] = {
            "formats": [{"type": "markdown"}],
            "onlyMainContent": True,
            "removeBase64Images": True,
            "timeout": settings.request_timeout_ms,
        }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        timeout_seconds = settings.request_timeout_ms / 1000
        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.post(_FIRECRAWL_SEARCH_URL, json=payload, headers=headers)

        response.raise_for_status()
        data = response.json()

    except Exception as exc:  # noqa: BLE001
        return _failure(
            query=normalized_query,
            searched_at=searched_at,
            warning=f"Firecrawl search failed: {exc}",
        )

    results = _normalize_results(
        data.get("data") if isinstance(data, dict) else {},
        include_markdown=include_markdown,
        query=normalized_query,
    )
    warnings = _warnings(data)
    if not results:
        warnings.append("No Firecrawl search results found.")

    return {
        "provider": "firecrawl",
        "success": True,
        "query": normalized_query,
        "count": len(results),
        "searched_at": searched_at,
        "results": results,
        "warnings": warnings,
    }


# Firecrawl의 source별 결과 배열을 하나의 results 배열로 합친다.
def _normalize_results(
    data: Any,
    *,
    include_markdown: bool,
    query: str,
) -> list[dict[str, Any]]:
    """Firecrawl의 web/news 배열을 하나의 results 배열로 합친다."""

    if not isinstance(data, dict):
        return []

    rows: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for source in ("web", "news"):
        items = data.get(source) or []
        if not isinstance(items, list):
            continue

        for position, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                continue

            normalized = _normalize_item(
                item,
                source=source,
                position=position,
                include_markdown=include_markdown,
                query=query,
            )
            url = normalized.get("url")
            if not isinstance(url, str) or not url or url in seen_urls:
                continue

            seen_urls.add(url)
            rows.append(normalized)

    return rows


# Firecrawl 결과 item 하나를 agent와 frontend가 쓰기 쉬운 dict로 바꾼다.
def _normalize_item(
    item: dict[str, Any],
    *,
    source: str,
    position: int,
    include_markdown: bool,
    query: str,
) -> dict[str, Any]:
    metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
    url = _first_text(item.get("url"), metadata.get("sourceURL"), metadata.get("url"))
    title = _first_text(item.get("title"), metadata.get("title"), url)
    description = _first_text(
        item.get("description"),
        item.get("snippet"),
        metadata.get("description"),
    )

    result: dict[str, Any] = {
        "provider": "firecrawl",
        "source": source,
        "query": query,
        "position": _int_or(position, item.get("position")),
        "title": _truncate(title, _TEXT_LIMIT),
        "url": url,
        "description": _truncate(description, _TEXT_LIMIT),
    }

    published_at = _first_text(item.get("date"), metadata.get("publishedAt"))
    if published_at:
        result["published_at"] = published_at

    category = _first_text(item.get("category"), metadata.get("category"))
    if category:
        result["category"] = category

    markdown = _first_text(item.get("markdown"))
    if include_markdown and markdown:
        result["markdown_preview"] = _truncate(markdown, _MARKDOWN_LIMIT)

    return result


# Firecrawl 응답에 warning이 있으면 목록 형태로 꺼낸다.
def _warnings(data: Any) -> list[str]:
    if not isinstance(data, dict):
        return []

    warning = _first_text(data.get("warning"))
    return [warning] if warning else []


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


# 요청할 Firecrawl source 목록을 허용된 값으로만 정리한다.
def _sources(sources: list[FirecrawlSource] | None) -> list[str]:
    if not sources:
        return ["web"]

    safe_sources: list[str] = []
    for source in sources:
        if source in ("web", "news") and source not in safe_sources:
            safe_sources.append(source)

    return safe_sources or ["web"]


# include/exclude domain 필터를 중복 없이 안전한 개수로 정리한다.
def _domain_filter(domains: list[str] | None) -> list[str]:
    if not domains:
        return []

    safe_domains: list[str] = []
    for domain in domains:
        normalized = domain.strip().lower()
        if normalized and normalized not in safe_domains:
            safe_domains.append(normalized)
        if len(safe_domains) >= _MAX_DOMAIN_FILTER_COUNT:
            break

    return safe_domains


# 선택 입력 문자열을 trim하고 비어 있으면 None으로 바꾼다.
def _optional_string(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


# 여러 후보 값 중 비어 있지 않은 첫 번째 문자열을 선택한다.
def _first_text(*values: Any) -> str:
    for value in values:
        if value is None:
            continue

        text = " ".join(str(value).split())
        if text:
            return text

    return ""


# 너무 긴 텍스트를 tool 응답에 넣지 않도록 잘라낸다.
def _truncate(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value

    return f"{value[:limit]}..."


# 외부 API 값을 int로 바꾸되 실패하면 기본값을 유지한다.
def _int_or(default: int, value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# 실패 상황도 항상 같은 응답 구조로 반환한다.
def _failure(*, query: str, searched_at: str, warning: str) -> dict[str, Any]:
    return {
        "provider": "firecrawl",
        "success": False,
        "query": query,
        "count": 0,
        "searched_at": searched_at,
        "results": [],
        "warnings": [warning],
    }
