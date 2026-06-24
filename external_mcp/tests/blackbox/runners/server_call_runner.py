from __future__ import annotations

import json
import logging
import socket
import threading
import time
import warnings

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

warnings.simplefilter("ignore", DeprecationWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning, module=r"websockets\..*")
warnings.filterwarnings("ignore", category=DeprecationWarning, module=r"uvicorn\..*")
warnings.filterwarnings("ignore", message=r".*websockets.*deprecated.*", category=DeprecationWarning)
warnings.filterwarnings(
    "ignore",
    message=r".*WebSocketServerProtocol is deprecated.*",
    category=DeprecationWarning,
)

import uvicorn

from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from blackbox.support.artifact_writer import (
    append_jsonl,
    input_value,
    json_cell,
    write_csv,
    write_summary,
)
from blackbox.support.fake_api import (
    MutableFakeHttpx,
    runtime_patches as build_runtime_patches,
)
from blackbox.support.response_summary import actual_summary
from blackbox.support.result_check import (
    diagnostics,
    provider_group,
    validate_server_actual,
)
from server import create_external_mcp

ServerCallMode = Literal["fake", "live"]

EXPECTED_TOOL_NAMES = [
    "naver.search",
    "tmap.route_pedestrian",
    "tmap.search_poi",
    "web.search",
]

logging.getLogger("mcp").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)


@dataclass
class ServerCallRunResult:
    mode: ServerCallMode
    total: int
    passed: int
    failed: int
    csv_path: Path
    summary_path: Path
    rows: list[dict[str, Any]]

    @property
    def error_messages(self) -> list[str]:
        messages: list[str] = []
        for row in self.rows:
            if not row["passed"]:
                messages.append(f"{row['case_id']} {row['tool']}: {row['error_count']} error(s)")
        return messages


async def run_server_call_cases(
    *,
    mode: ServerCallMode,
    cases: list[dict[str, Any]],
    log_dir: Path,
    result_csv: Path,
    summary_path: Path,
    summary_scope: str,
    fake_api_responses: dict[str, dict[str, Any]] | None = None,
    verbose: bool = False,
) -> ServerCallRunResult:
    log_dir.mkdir(parents=True, exist_ok=True)
    result_csv.parent.mkdir(parents=True, exist_ok=True)

    requests_artifact = log_dir / "mcp_requests.jsonl"
    responses_artifact = log_dir / "mcp_responses.jsonl"
    requests_artifact.write_text("", encoding="utf-8")
    responses_artifact.write_text("", encoding="utf-8")

    fake_httpx = MutableFakeHttpx() if mode == "fake" else None
    active_patches = build_runtime_patches(fake_httpx) if mode == "fake" else []
    for runtime_patch in active_patches:
        runtime_patch.start()

    rows: list[dict[str, Any]] = []
    csv_rows: list[dict[str, Any]] = []
    started_at = datetime.now(UTC).isoformat()
    server: uvicorn.Server | None = None
    thread: threading.Thread | None = None
    url = ""

    try:
        server, thread, url = _start_server()
        async with streamable_http_client(url) as (read_stream, write_stream, _):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                tools = await session.list_tools()
                tool_names = sorted(tool.name for tool in tools.tools)
                if tool_names != EXPECTED_TOOL_NAMES:
                    raise RuntimeError(
                        f"Unexpected MCP tools. expected={EXPECTED_TOOL_NAMES} actual={tool_names}"
                    )

                for case in cases:
                    row, csv_row = await _call_case(
                        session=session,
                        case=case,
                        mode=mode,
                        listed_tools=tool_names,
                        mcp_url=url,
                        fake_httpx=fake_httpx,
                        fake_api_responses=fake_api_responses or {},
                        requests_artifact=requests_artifact,
                        responses_artifact=responses_artifact,
                    )
                    rows.append(row)
                    csv_rows.append(csv_row)

                    if verbose:
                        status = "PASS" if row["passed"] else "FAIL"
                        print(f"{status} {case['id']} {case['tool']}")
                        errors = json.loads(csv_row["errors_json"])
                        for error in errors:
                            print(f"  - {error}")

    finally:
        if server is not None:
            server.should_exit = True
        if thread is not None:
            thread.join(timeout=5)
        for runtime_patch in reversed(active_patches):
            runtime_patch.stop()

    write_summary(
        rows,
        mcp_url=url,
        started_at=started_at,
        summary_path=summary_path,
        summary_scope=summary_scope,
        result_csv=result_csv,
        requests_artifact=requests_artifact,
        responses_artifact=responses_artifact,
        mode=mode,
        expected_tool_names=EXPECTED_TOOL_NAMES,
    )
    write_csv(csv_rows, result_csv)

    failed = [row for row in rows if not row["passed"]]
    return ServerCallRunResult(
        mode=mode,
        total=len(rows),
        passed=len(rows) - len(failed),
        failed=len(failed),
        csv_path=result_csv,
        summary_path=summary_path,
        rows=rows,
    )


async def _call_case(
    *,
    session: ClientSession,
    case: dict[str, Any],
    mode: ServerCallMode,
    listed_tools: list[str],
    mcp_url: str,
    fake_httpx: MutableFakeHttpx | None,
    fake_api_responses: dict[str, dict[str, Any]],
    requests_artifact: Path,
    responses_artifact: Path,
) -> tuple[dict[str, Any], dict[str, Any]]:
    request_extra: dict[str, Any]

    if mode == "fake":
        if fake_httpx is None:
            raise RuntimeError("fake_httpx is required when mode='fake'.")
        fake_api = case.get("fake_api") or {}
        response_name = fake_api.get("response")
        payload = fake_api_responses.get(response_name, {}) if response_name else {}
        status_code = int(fake_api.get("status_code", 200))
        fake_api_requests: list[dict[str, Any]] = []
        fake_httpx.set_response(
            payload=payload,
            status_code=status_code,
            requests=fake_api_requests,
        )
        request_extra = {
            "fake_api": {
                "response": response_name,
                "status_code": status_code,
                "requests": fake_api_requests,
            }
        }

    if mode == "live":
        request_extra = {
            "external_api": {
                "mode": "live",
                "secret_source": "infisical",
                "secrets_recorded": False,
            }
        }

    result = await session.call_tool(case["tool"], case["arguments"])
    actual = _structured_content(result)
    case_diagnostics = diagnostics(actual, case["expected"]) if mode == "live" else {}
    errors = validate_server_actual(actual, case["expected"], mode=mode)
    passed = not errors
    case_provider_group = provider_group(case["tool"])
    execution_mode = f"{mode}_server_call"

    request_record = {
        "record_type": "mcp_request",
        "execution_mode": execution_mode,
        "case_id": case["id"],
        "provider_group": case_provider_group,
        "tool": case["tool"],
        "description": case["description"],
        "mcp_url": mcp_url,
        "listed_tools": listed_tools,
        "mcp": {
            "name": case["tool"],
            "arguments": case["arguments"],
        },
        **request_extra,
    }
    response_record = {
        "record_type": "mcp_response",
        "execution_mode": execution_mode,
        "case_id": case["id"],
        "provider_group": case_provider_group,
        "tool": case["tool"],
        "passed": passed,
        "errors": errors,
        "expected": case["expected"],
        "actual_summary": actual_summary(actual),
        "diagnostics": case_diagnostics,
        "actual_response": actual,
    }
    row = {
        "case_id": case["id"],
        "execution_mode": execution_mode,
        "provider_group": case_provider_group,
        "tool": case["tool"],
        "description": case["description"],
        "passed": passed,
        "error_count": len(errors),
    }
    csv_row = {
        "case_id": case["id"],
        "execution_mode": execution_mode,
        "provider_group": case_provider_group,
        "tool": case["tool"],
        "input_value": input_value(case["arguments"]),
        "input_arguments_json": json_cell(case["arguments"]),
        "expected_result_json": json_cell(case["expected"]),
        "actual_summary_json": json_cell(actual_summary(actual)),
        "diagnostics_json": json_cell(case_diagnostics),
        "actual_response_json": json_cell(actual),
        "passed": passed,
        "errors_json": json_cell(errors),
    }

    append_jsonl(requests_artifact, request_record)
    append_jsonl(responses_artifact, response_record)
    return row, csv_row


def _structured_content(result: Any) -> dict[str, Any]:
    if isinstance(result.structuredContent, dict):
        return result.structuredContent

    for content in result.content or []:
        text = getattr(content, "text", None)
        if isinstance(text, str):
            return json.loads(text)

    raise RuntimeError("MCP call_tool returned no structured JSON content.")


def _start_server() -> tuple[uvicorn.Server, threading.Thread, str]:
    port = _free_port()
    server = uvicorn.Server(
        uvicorn.Config(
            create_external_mcp().streamable_http_app(),
            host="127.0.0.1",
            port=port,
            log_level="warning",
            access_log=False,
            ws="none",
        )
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    _wait_for_port(port)
    return server, thread, f"http://127.0.0.1:{port}/"


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _wait_for_port(port: int) -> None:
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.1):
                return
        except OSError:
            time.sleep(0.05)
    raise RuntimeError(f"MCP test server did not open port {port}.")
