from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any


def user_input_state(state: Mapping[str, Any]) -> dict[str, Any]:
    metadata = _mapping(state.get("metadata"))
    return _mapping(state.get("user_input_state")) or _first_mapping(
        metadata,
        ("user_input_state", "input_state", "form_state"),
    )


def application_state(state: Mapping[str, Any]) -> dict[str, Any]:
    metadata = _mapping(state.get("metadata"))
    return _mapping(state.get("application_state")) or _first_mapping(
        metadata,
        ("application_state", "app_state", "screen_state", "state"),
    )


def state_json(value: object) -> str:
    if not value:
        return "{}"
    try:
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    except TypeError:
        return str(value)


def _mapping(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _first_mapping(mapping: Mapping[str, Any], keys: tuple[str, ...]) -> dict[str, Any]:
    for key in keys:
        value = mapping.get(key)
        if isinstance(value, dict):
            return value
    return {}
