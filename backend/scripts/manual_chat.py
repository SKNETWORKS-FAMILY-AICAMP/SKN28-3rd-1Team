from __future__ import annotations

import argparse
import json
import sys
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


# 사용자가 터미널 테스트 종료를 요청했을 때 쓰는 예외다.
class QuitRequested(Exception):
    pass


# 입력값이 종료 명령인지 확인한다.
def _is_quit_command(value: str) -> bool:
    return value.lower() in {"q", "/q", "quit", "exit"}


# 일반 입력을 받고 종료 명령이면 예외를 발생시킨다.
def _input(prompt: str) -> str:
    value = input(prompt).strip()
    if _is_quit_command(value):
        raise QuitRequested
    return value


# backend /chat에 요청을 보내고 JSON 응답을 받는다.
def post_chat(base_url: str, payload: dict[str, Any], timeout: int) -> dict[str, Any] | None:
    url = f"{base_url.rstrip('/')}/chat"
    request = Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
        },
        method="POST",
    )

    print("\n답변 생성 중...", flush=True)

    try:
        with urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print_http_error(exc.code, body)
        return None
    except TimeoutError:
        print(f"요청 시간이 {timeout}초를 넘었습니다. 서버 로그를 확인하세요.")
        return None
    except URLError as exc:
        print("\n백엔드 서버에 연결할 수 없습니다.")
        print(f"- 원인: {exc.reason}")
        print("- backend 서버가 켜져 있는지, 포트가 맞는지 확인하세요.")
        return None

    try:
        return json.loads(body)
    except json.JSONDecodeError:
        print("\n백엔드가 JSON이 아닌 응답을 반환했습니다.")
        print(body)
        return None


# backend HTTP 오류 응답을 사용자에게 읽기 쉬운 형태로 출력한다.
def print_http_error(status_code: int, body: str) -> None:
    print(f"\n백엔드 오류가 발생했습니다. HTTP {status_code}")
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        print(body)
        return

    print(data.get("detail", data))


# backend 응답 JSON을 터미널에 출력한다.
def render_response(response: dict[str, Any]) -> None:
    print("\n" + "=" * 72)
    print(response.get("answer", ""))

    tool_calls = response.get("tool_calls") or []
    if tool_calls:
        print("\n[도구 호출]")
        for tool_call in tool_calls:
            name = tool_call.get("name", "-")
            status = tool_call.get("status", "-")
            print(f"- {name}: {status}")

    sources = response.get("sources") or []
    if sources:
        print("\n[출처]")
        for source in sources:
            title = source.get("title") or "-"
            url = source.get("url")
            print(f"- {title}" + (f" ({url})" if url else ""))

    print("=" * 72)


# 수동 대화 테스트의 전체 입력/요청/출력 루프를 실행한다.
def run(base_url: str, timeout: int, session_id: str | None) -> int:
    print("백엔드 수동 대화 테스트")
    print(f"API: {base_url.rstrip('/')}/chat")
    print("종료하려면 입력 위치에서 q 를 입력하세요. /q, quit, exit도 가능합니다.")

    while True:
        message = _input("\n질문: ")
        if not message:
            print("질문은 비워둘 수 없습니다.")
            continue

        payload: dict[str, Any] = {
            "message": message,
            "metadata": {"client": "manual_chat"},
        }
        if session_id:
            payload["session_id"] = session_id

        response = post_chat(base_url, payload, timeout)
        if response is not None:
            render_response(response)


# 터미널 실행 옵션을 파싱한다.
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backend /chat manual terminal tester")
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:8000",
        help="Backend base URL. Default: http://127.0.0.1:8000",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=90,
        help="Request timeout seconds. Default: 90",
    )
    parser.add_argument(
        "--session-id",
        default=None,
        help="Optional session id to include in requests.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    exit_code = 0
    try:
        exit_code = run(**vars(args))
    except QuitRequested:
        print("\n종료합니다.")
    except KeyboardInterrupt:
        print("\n종료합니다.")
        exit_code = 130

    sys.exit(exit_code)
