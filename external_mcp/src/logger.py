from __future__ import annotations

import logging
import os
import sys
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlsplit, urlunsplit


_RESERVED_LOG_RECORD_ATTRS = frozenset(
    set(logging.makeLogRecord({}).__dict__)
    | {
        "asctime",
        "message",
    }
)
_SENSITIVE_FIELD_NAMES = (
    "api_key",
    "apikey",
    "authorization",
    "cookie",
    "credential",
    "dsn",
    "password",
    "secret",
    "set_cookie",
    "token",
)
_MASKED_VALUE = "[MASKED]"
_RESET = "\033[0m"
_DIM = "\033[2m"
_LEVEL_COLORS = {
    "DEBUG": "\033[36m",
    "INFO": "\033[32m",
    "WARNING": "\033[33m",
    "ERROR": "\033[31m",
    "CRITICAL": "\033[1;31m",
}
_LOGGER_COLOR = "\033[35m"
_FIELD_KEY_COLOR = "\033[34m"


class StructuredLogFormatter(logging.Formatter):
    def __init__(self, *, use_color: bool = False) -> None:
        super().__init__()
        self._use_color = use_color

    def format(self, record: logging.LogRecord) -> str:
        fields = _extra_fields(record)
        event = fields.pop("event", None) or "log.message"
        timestamp = _color(_format_timestamp(record.created), _DIM, self._use_color)
        level = _color(
            record.levelname,
            _LEVEL_COLORS.get(record.levelname, ""),
            self._use_color,
        )
        logger_name = _color(f"[{record.name}]", _LOGGER_COLOR, self._use_color)
        message = record.getMessage()
        structured_fields: dict[str, Any] = {"event": event}
        structured_fields.update(fields)
        masked_fields = _mask_log_fields(structured_fields)

        if record.exc_info:
            exc_type = record.exc_info[0]
            masked_fields.setdefault("error_type", exc_type.__name__ if exc_type else None)

        rendered_fields = _format_log_fields(masked_fields, use_color=self._use_color)
        line = f"{timestamp} {level} {logger_name} {message}"
        if rendered_fields:
            line = f"{line} {_color('|', _DIM, self._use_color)} {rendered_fields}"
        if record.exc_info:
            line = f"{line}\n{self.formatException(record.exc_info)}"

        return line


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredLogFormatter(use_color=_supports_color(sys.stdout)))
    logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def _extra_fields(record: logging.LogRecord) -> dict[str, Any]:
    return {
        key: value
        for key, value in record.__dict__.items()
        if key not in _RESERVED_LOG_RECORD_ATTRS and not key.startswith("_")
    }


def _format_timestamp(created: float) -> str:
    return (
        datetime.fromtimestamp(created, UTC)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def _supports_color(stream: Any) -> bool:
    return bool(
        hasattr(stream, "isatty")
        and stream.isatty()
        and not os.environ.get("NO_COLOR")
    )


def _mask_log_fields(fields: dict[str, Any]) -> dict[str, Any]:
    return {key: _mask_log_value(key, value) for key, value in fields.items()}


def _mask_log_value(key: str, value: Any) -> Any:
    normalized_key = key.lower().replace("-", "_")
    if any(name in normalized_key for name in _SENSITIVE_FIELD_NAMES):
        return _MASKED_VALUE
    if isinstance(value, dict):
        return _mask_log_fields(value)
    if isinstance(value, list):
        return [_mask_log_value(key, item) for item in value]
    if isinstance(value, tuple):
        return tuple(_mask_log_value(key, item) for item in value)
    if isinstance(value, str) and _looks_like_url_field(normalized_key):
        return _mask_url(value)
    return value


def _looks_like_url_field(key: str) -> bool:
    return key.endswith("url") or key.endswith("uri") or "url_" in key or "uri_" in key


def _mask_url(value: str) -> str:
    try:
        parsed = urlsplit(value)
    except ValueError:
        return _MASKED_VALUE

    if not parsed.scheme or not parsed.netloc:
        return value

    hostname = parsed.hostname or ""
    if not hostname:
        return _MASKED_VALUE

    netloc = hostname
    if parsed.port is not None:
        netloc = f"{netloc}:{parsed.port}"

    return urlunsplit((parsed.scheme, netloc, parsed.path, "", ""))


def _format_log_fields(fields: dict[str, Any], *, use_color: bool) -> str:
    return " ".join(
        f"{_color(key, _FIELD_KEY_COLOR, use_color)}={_format_log_value(value)}"
        for key, value in sorted(fields.items())
        if value is not None
    )


def _format_log_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(_format_log_value(item) for item in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(
            f"{key}:{_format_log_value(item)}" for key, item in sorted(value.items())
        ) + "}"

    text = str(value)
    if text == _MASKED_VALUE:
        return text
    if not text:
        return '""'
    if any(char.isspace() for char in text) or any(char in text for char in '"=[]{}|'):
        escaped = text.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    return text


def _color(value: str, color: str, enabled: bool) -> str:
    if not enabled or not color:
        return value
    return f"{color}{value}{_RESET}"
