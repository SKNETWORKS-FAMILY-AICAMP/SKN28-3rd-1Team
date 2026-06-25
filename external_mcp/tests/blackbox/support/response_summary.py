from __future__ import annotations

from typing import Any


def actual_summary(actual: dict[str, Any]) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "provider": actual.get("provider"),
        "success": actual.get("success"),
        "warnings": actual.get("warnings") or [],
    }

    if "query" in actual:
        summary["query"] = actual.get("query")
    if "category" in actual:
        summary["category"] = actual.get("category")
    if "count" in actual:
        summary["count"] = actual.get("count")
    if "mode" in actual:
        summary["mode"] = actual.get("mode")
    if "distance_meters" in actual:
        summary["distance_meters"] = actual.get("distance_meters")
    if "duration_seconds" in actual:
        summary["duration_seconds"] = actual.get("duration_seconds")

    results = actual.get("results")
    if isinstance(results, list):
        summary["result_count"] = len(results)
        summary["result_titles"] = [
            str(row.get("title") or row.get("name") or row.get("url") or "")
            for row in results[:3]
            if isinstance(row, dict)
        ]
        summary["first_result"] = results[0] if results else None

    steps = actual.get("steps")
    if isinstance(steps, list):
        summary["step_count"] = len(steps)
        summary["first_step"] = steps[0] if steps else None

    return summary
