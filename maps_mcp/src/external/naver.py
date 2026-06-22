from __future__ import annotations

import html
import re
from typing import Any

from external.http import request_json
from settings import Settings, settings

_HTML_TAG_PATTERN = re.compile(r"<[^>]+>")


def search_local(
    query: str,
    *,
    display: int = 5,
    start: int = 1,
    sort: str = "random",
    config: Settings = settings,
) -> dict[str, Any]:
    if not config.naver_search_configured:
        return {
            "ok": False,
            "code": "naver_search_not_configured",
            "message": "Naver Search credentials are required.",
            "items": [],
        }

    response = request_json(
        config.naver_local_base_url,
        headers={
            "X-Naver-Client-Id": config.naver_search_client_id.get_secret_value(),
            "X-Naver-Client-Secret": config.naver_search_client_secret.get_secret_value(),
        },
        query={
            "query": query,
            "display": display,
            "start": start,
            "sort": sort,
        },
        timeout_ms=config.api_request_timeout_ms,
    )
    if not response.get("ok"):
        return {**response, "items": []}

    data = response.get("data") if isinstance(response.get("data"), dict) else {}
    raw_items = data.get("items") if isinstance(data, dict) else []
    return {
        "ok": True,
        "provider": "naver",
        "query": query,
        "total": data.get("total"),
        "start": data.get("start"),
        "display": data.get("display"),
        "items": [_sanitize_local_item(item) for item in raw_items if isinstance(item, dict)],
    }


def _sanitize_local_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": _strip_html(str(item.get("title") or "")),
        "category": _strip_html(str(item.get("category") or "")),
        "description": _strip_html(str(item.get("description") or "")),
        "telephone": str(item.get("telephone") or ""),
        "address": _strip_html(str(item.get("address") or "")),
        "roadAddress": _strip_html(str(item.get("roadAddress") or "")),
        "link": str(item.get("link") or ""),
        "providerCoordinates": {
            "mapx": str(item.get("mapx") or ""),
            "mapy": str(item.get("mapy") or ""),
        },
    }


def _strip_html(value: str) -> str:
    return html.unescape(_HTML_TAG_PATTERN.sub("", value)).strip()
