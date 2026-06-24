from __future__ import annotations

from typing import Any


def validate_case(case: dict[str, Any], summary: dict[str, Any]) -> list[str]:
    expected = case.get("expected") or {}
    errors: list[str] = []

    expected_tool_use = expected.get("tool_use")
    actual_tool_use = bool(summary.get("actual_tool_use"))
    if expected_tool_use is not None and bool(expected_tool_use) != actual_tool_use:
        errors.append(
            f"expected tool_use={bool(expected_tool_use)} but actual_tool_use={actual_tool_use}"
        )

    actual_tools = [str(tool) for tool in summary.get("actual_tools", [])]
    actual_tools_lower = [tool.lower() for tool in actual_tools]

    required_any_tools = [str(tool) for tool in expected.get("required_any_tools", [])]
    if required_any_tools and not _contains_any(actual_tools_lower, required_any_tools):
        errors.append(
            "expected at least one tool from "
            f"{required_any_tools}, but actual_tools={actual_tools}"
        )

    missing_required_tools = [
        expected_tool
        for expected_tool in expected.get("required_all_tools", [])
        if not _contains_any(actual_tools_lower, [str(expected_tool)])
    ]
    if missing_required_tools:
        errors.append(
            f"expected all tools {missing_required_tools}, but actual_tools={actual_tools}"
        )

    forbidden_fragments = [
        str(fragment).lower()
        for fragment in expected.get("forbidden_tool_fragments", [])
    ]
    forbidden_hits = [
        tool
        for tool in actual_tools
        if any(fragment in tool.lower() for fragment in forbidden_fragments)
    ]
    if forbidden_hits:
        errors.append(f"forbidden tool was used: {forbidden_hits}")

    error_expected = expected.get("error")
    error_events = summary.get("error_events", [])
    if error_expected is not None and bool(error_expected) != bool(error_events):
        errors.append(
            f"expected error={bool(error_expected)} but error_events={len(error_events)}"
        )

    final_answer = str(summary.get("final_answer") or "")
    if not final_answer.strip():
        errors.append("final answer was not found")

    missing_all_keywords = [
        keyword
        for keyword in expected.get("answer_keywords_all", [])
        if str(keyword) not in final_answer
    ]
    if missing_all_keywords:
        errors.append(f"final answer missed required keywords: {missing_all_keywords}")

    forbidden_answer_keywords = [
        keyword
        for keyword in expected.get("answer_keywords_none", [])
        if str(keyword) in final_answer
    ]
    if forbidden_answer_keywords:
        errors.append(f"final answer contained forbidden keywords: {forbidden_answer_keywords}")

    any_keywords = [str(keyword) for keyword in expected.get("answer_keywords_any", [])]
    if any_keywords and not any(keyword in final_answer for keyword in any_keywords):
        errors.append(f"final answer did not contain any keyword from: {any_keywords}")

    return errors


def _contains_any(actual_tools_lower: list[str], expected_tools: list[str]) -> bool:
    for expected_tool in expected_tools:
        expected_lower = expected_tool.lower()
        for actual_tool in actual_tools_lower:
            if expected_lower == actual_tool or expected_lower in actual_tool:
                return True
    return False
