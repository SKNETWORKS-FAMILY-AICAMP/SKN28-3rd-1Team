from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


def request_json(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    json_body: dict[str, Any] | None = None,
    method: str = "GET",
    query: dict[str, Any] | None = None,
    timeout_ms: int = 5000,
) -> dict[str, Any]:
    target_url = _url_with_query(url, query)
    body = None
    request_headers = {"Accept": "application/json", **(headers or {})}

    if json_body is not None:
        body = json.dumps(json_body, ensure_ascii=False).encode("utf-8")
        request_headers["Content-Type"] = "application/json"

    request = urllib.request.Request(
        target_url,
        data=body,
        headers=request_headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_ms / 1000) as response:
            payload = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        return {
            "ok": False,
            "code": "provider_http_error",
            "status": exc.code,
            "message": "Provider API returned an error.",
        }
    except (TimeoutError, urllib.error.URLError) as exc:
        return {
            "ok": False,
            "code": "provider_network_error",
            "message": str(exc.reason if isinstance(exc, urllib.error.URLError) else exc),
        }

    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return {
            "ok": False,
            "code": "provider_invalid_json",
            "message": "Provider API returned invalid JSON.",
        }

    return {"ok": True, "data": data}


def join_url(base_url: str, path: str) -> str:
    normalized_base = base_url.rstrip("/")
    normalized_path = path if path.startswith("/") else f"/{path}"
    return f"{normalized_base}{normalized_path}"


def _url_with_query(url: str, query: dict[str, Any] | None) -> str:
    cleaned_query = {
        key: value
        for key, value in (query or {}).items()
        if value is not None and value != ""
    }
    if not cleaned_query:
        return url

    separator = "&" if "?" in url else "?"
    return f"{url}{separator}{urllib.parse.urlencode(cleaned_query, doseq=True)}"
