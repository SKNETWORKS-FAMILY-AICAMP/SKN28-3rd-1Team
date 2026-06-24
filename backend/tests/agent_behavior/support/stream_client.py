from __future__ import annotations

import json
import urllib.error
import urllib.request

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class StreamResponse:
    status_code: int
    body: str


def post_chat_stream(
    *,
    url: str,
    payload: dict[str, Any],
    timeout_seconds: float,
) -> StreamResponse:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            body = response.read().decode("utf-8", errors="replace")
            return StreamResponse(status_code=response.status, body=body)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return StreamResponse(status_code=exc.code, body=body)

