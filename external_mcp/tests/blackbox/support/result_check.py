from __future__ import annotations

from typing import Any


def validate_actual(actual: dict[str, Any], expected: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    if "success" in expected and actual.get("success") != expected["success"]:
        errors.append(
            f"success mismatch: expected={expected['success']} actual={actual.get('success')}"
        )

    if "count" in expected and actual.get("count") != expected["count"]:
        errors.append(f"count mismatch: expected={expected['count']} actual={actual.get('count')}")

    if "min_count" in expected and int(actual.get("count") or 0) < expected["min_count"]:
        errors.append(
            f"count too small: expected>={expected['min_count']} actual={actual.get('count')}"
        )

    if "distance_meters" in expected and actual.get("distance_meters") != expected["distance_meters"]:
        errors.append(
            "distance_meters mismatch: "
            f"expected={expected['distance_meters']} actual={actual.get('distance_meters')}"
        )

    if "duration_seconds" in expected and actual.get("duration_seconds") != expected["duration_seconds"]:
        errors.append(
            "duration_seconds mismatch: "
            f"expected={expected['duration_seconds']} actual={actual.get('duration_seconds')}"
        )

    if "min_steps" in expected:
        steps = actual.get("steps") if isinstance(actual.get("steps"), list) else []
        if len(steps) < expected["min_steps"]:
            errors.append(f"steps too few: expected>={expected['min_steps']} actual={len(steps)}")

    for path in expected.get("required_paths", []):
        value = get_path(actual, path)
        if value in (None, ""):
            errors.append(f"required path is empty: {path}")

    warnings_text = " | ".join(str(warning) for warning in actual.get("warnings") or [])
    for expected_warning in expected.get("warnings_contain", []):
        if expected_warning not in warnings_text:
            errors.append(
                f"warning not found: expected_substring={expected_warning!r} actual={warnings_text!r}"
            )

    for assertion in expected.get("contains", []):
        path = assertion["path"]
        expected_text = assertion["text"]
        actual_value = get_path(actual, path)
        if expected_text not in str(actual_value):
            errors.append(
                f"text not found at {path}: expected_substring={expected_text!r} "
                f"actual={actual_value!r}"
            )

    return errors


def validate_server_actual(
    actual: dict[str, Any],
    expected: dict[str, Any],
    *,
    mode: str,
) -> list[str]:
    if mode == "fake":
        return validate_actual(actual, expected)

    errors = validate_actual(actual, expected)

    for path in expected.get("positive_number_paths", []):
        value = get_path(actual, path)
        if not isinstance(value, int | float) or value <= 0:
            errors.append(f"positive number expected at {path}: actual={value!r}")

    result_text = _result_text(actual)
    for expected_text in expected.get("results_contain_all", []):
        if expected_text not in result_text:
            errors.append(
                f"result text missing required substring: expected={expected_text!r}"
            )

    any_terms = expected.get("results_contain_any", [])
    if any_terms and not any(term in result_text for term in any_terms):
        errors.append(
            "result text missing all acceptable substrings: "
            f"expected_any={any_terms!r}"
        )

    results = actual.get("results") if isinstance(actual.get("results"), list) else []
    each_terms = expected.get("each_result_contain_all", [])
    for index, result in enumerate(results, start=1):
        if not isinstance(result, dict):
            continue
        text = _item_text(result)
        missing = [term for term in each_terms if term not in text]
        if missing:
            title = result.get("title") or result.get("name") or result.get("url") or ""
            errors.append(
                "result region mismatch: "
                f"position={index} title={title!r} missing_terms={missing!r}"
            )

    return errors


def diagnostics(actual: dict[str, Any], expected: dict[str, Any]) -> dict[str, Any]:
    each_terms = expected.get("each_result_contain_all", [])
    results = actual.get("results") if isinstance(actual.get("results"), list) else []
    result_region_checks: list[dict[str, Any]] = []

    if each_terms:
        for index, result in enumerate(results, start=1):
            if not isinstance(result, dict):
                continue
            text = _item_text(result)
            missing = [term for term in each_terms if term not in text]
            result_region_checks.append(
                {
                    "position": index,
                    "title_or_name": result.get("title")
                    or result.get("name")
                    or result.get("url"),
                    "address": result.get("address") or result.get("road_address"),
                    "required_terms": each_terms,
                    "missing_terms": missing,
                    "passed": not missing,
                }
            )

    return {
        "result_region_checks": result_region_checks,
    }


def provider_group(tool_name: str) -> str:
    if tool_name.startswith("naver."):
        return "naver"
    if tool_name.startswith("web."):
        return "web"
    if tool_name.startswith("tmap."):
        return "tmap"
    return "unknown"


def get_path(data: Any, path: str) -> Any:
    current = data
    for part in path.split("."):
        if isinstance(current, list):
            try:
                current = current[int(part)]
            except (IndexError, ValueError):
                return None
            continue
        if isinstance(current, dict):
            current = current.get(part)
            continue
        return None
    return current


def _result_text(actual: dict[str, Any]) -> str:
    pieces: list[str] = []
    results = actual.get("results")
    if isinstance(results, list):
        for result in results:
            if isinstance(result, dict):
                pieces.append(_item_text(result))
    steps = actual.get("steps")
    if isinstance(steps, list):
        for step in steps:
            if isinstance(step, dict):
                for key in ("description", "road_name"):
                    value = step.get(key)
                    if value is not None:
                        pieces.append(str(value))
    return " ".join(pieces)


def _item_text(result: dict[str, Any]) -> str:
    pieces: list[str] = []
    for key in (
        "title",
        "name",
        "description",
        "address",
        "road_address",
        "place_category",
        "category",
        "url",
    ):
        value = result.get(key)
        if value is not None:
            pieces.append(str(value))
    return " ".join(pieces)
