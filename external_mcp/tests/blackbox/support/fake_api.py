from __future__ import annotations

from collections.abc import Callable
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

from pydantic import SecretStr

from external import firecrawl, naver, tmap


class FakeResponse:
    def __init__(self, payload: dict[str, Any], *, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"Fake HTTP {self.status_code}")

    def json(self) -> dict[str, Any]:
        return self._payload


class RecordingFakeClient:
    def __init__(
        self,
        *,
        state: Callable[[], tuple[dict[str, Any], int, list[dict[str, Any]]]],
    ) -> None:
        self._state = state

    def __enter__(self) -> RecordingFakeClient:
        return self

    def __exit__(self, *_: Any) -> None:
        return None

    def get(
        self,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        headers: dict[str, Any] | None = None,
    ) -> FakeResponse:
        payload, status_code, requests = self._state()
        requests.append(
            {
                "method": "GET",
                "url": url,
                "params": params or {},
                "headers": redact_headers(headers or {}),
            }
        )
        return FakeResponse(payload, status_code=status_code)

    def post(
        self,
        url: str,
        *,
        json: dict[str, Any] | None = None,
        headers: dict[str, Any] | None = None,
    ) -> FakeResponse:
        payload, status_code, requests = self._state()
        requests.append(
            {
                "method": "POST",
                "url": url,
                "json": json or {},
                "headers": redact_headers(headers or {}),
            }
        )
        return FakeResponse(payload, status_code=status_code)


class MutableFakeHttpx:
    def __init__(self) -> None:
        self.payload: dict[str, Any] = {}
        self.status_code = 200
        self.requests: list[dict[str, Any]] = []

    def set_response(
        self,
        *,
        payload: dict[str, Any],
        status_code: int,
        requests: list[dict[str, Any]],
    ) -> None:
        self.payload = payload
        self.status_code = status_code
        self.requests = requests

    def Client(self, timeout: float) -> RecordingFakeClient:  # noqa: N802, ARG002
        return RecordingFakeClient(
            state=lambda: (self.payload, self.status_code, self.requests),
        )


def runtime_patches(fake_httpx: MutableFakeHttpx | None) -> list[Any]:
    if fake_httpx is None:
        return []

    return [
        patch.object(naver, "settings", _naver_fake_settings()),
        patch.object(naver, "httpx", fake_httpx),
        patch.object(firecrawl, "settings", _firecrawl_fake_settings()),
        patch.object(firecrawl, "httpx", fake_httpx),
        patch.object(tmap, "settings", _tmap_fake_settings()),
        patch.object(tmap, "httpx", fake_httpx),
    ]


def redact_headers(headers: dict[str, Any]) -> dict[str, Any]:
    redacted: dict[str, Any] = {}
    for key, value in headers.items():
        if key.lower() in {
            "authorization",
            "appkey",
            "x-naver-client-id",
            "x-naver-client-secret",
        }:
            redacted[key] = "<redacted>"
        else:
            redacted[key] = value
    return redacted


def _naver_fake_settings() -> SimpleNamespace:
    return SimpleNamespace(
        naver_client_id=SecretStr("fake-naver-client-id"),
        naver_client_secret=SecretStr("fake-naver-client-secret"),
        request_timeout_ms=15_000,
        search_default_limit=5,
        search_max_limit=10,
    )


def _firecrawl_fake_settings() -> SimpleNamespace:
    return SimpleNamespace(
        firecrawl_api_key=SecretStr("fake-firecrawl-api-key"),
        request_timeout_ms=15_000,
        search_default_limit=5,
        search_max_limit=10,
    )


def _tmap_fake_settings() -> SimpleNamespace:
    return SimpleNamespace(
        tmap_app_key=SecretStr("fake-tmap-app-key"),
        request_timeout_ms=15_000,
        search_default_limit=5,
        search_max_limit=10,
    )
