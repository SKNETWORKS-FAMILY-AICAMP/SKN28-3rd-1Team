from __future__ import annotations

from time import perf_counter
from typing import Any

from mcp.server.fastmcp import FastMCP

from external.firecrawl import search_firecrawl
from external.naver import NaverSearchCategory, search_naver
from external.tmap import route_tmap_pedestrian, search_tmap_poi

from logger import get_logger
from settings import settings

logger = get_logger(__name__)

MCP_INSTRUCTIONS = (
    "복지 상담 agent가 외부 정보를 확인하기 위한 MCP 도구 서버입니다. "
    "네이버 검색, Firecrawl 웹 검색, TMAP 장소 검색, TMAP 보행자 길찾기 도구를 제공합니다."
)


def _query_summary(query: str) -> dict[str, Any]:
    return {"query_chars": len(query)}


def _keyword_summary(keyword: str) -> dict[str, Any]:
    return {"keyword_chars": len(keyword)}


def _result_summary(result: Any) -> dict[str, Any]:
    summary: dict[str, Any] = {"result_type": type(result).__name__}

    if isinstance(result, dict):
        if "success" in result:
            summary["tool_success"] = bool(result.get("success"))
        if isinstance(result.get("count"), int):
            summary["result_count"] = result.get("count")
        if isinstance(result.get("results"), list):
            summary["result_items"] = len(result["results"])
        if isinstance(result.get("warnings"), list):
            summary["warning_count"] = len(result["warnings"])
        if isinstance(result.get("provider"), str):
            summary["provider"] = result.get("provider")
        return summary

    if isinstance(result, str):
        summary["result_chars"] = len(result)
        return summary

    if isinstance(result, (list, tuple)):
        summary["result_items"] = len(result)
        return summary

    return summary


def _returned_failure(result: Any) -> bool:
    if not isinstance(result, dict):
        return False

    if result.get("success") is False:
        return True

    status = result.get("status")
    if isinstance(status, str) and status.lower() in {"error", "failed", "failure"}:
        return True

    return False


def _duration_ms(started_at: float) -> int:
    return round((perf_counter() - started_at) * 1000)


def _log_tool_started(tool_name: str, **fields: Any) -> float:
    logger.info(
        "external MCP tool invocation started",
        extra={
            "event": "external_mcp.tool_invocation.started",
            "source": "external_mcp",
            "tool_name": tool_name,
            **fields,
        },
    )
    return perf_counter()


def _log_tool_completed(tool_name: str, started_at: float, result: Any) -> None:
    returned_failure = _returned_failure(result)
    event = (
        "external_mcp.tool_invocation.failed"
        if returned_failure
        else "external_mcp.tool_invocation.succeeded"
    )
    message = (
        "external MCP tool invocation failed"
        if returned_failure
        else "external MCP tool invocation succeeded"
    )
    extra = {
        "event": event,
        "source": "external_mcp",
        "tool_name": tool_name,
        "duration_ms": _duration_ms(started_at),
        **_result_summary(result),
    }
    if returned_failure:
        extra["failure_kind"] = "returned_failure"

    logger.info(message, extra=extra)


def _log_tool_exception(tool_name: str, started_at: float) -> None:
    logger.exception(
        "external MCP tool invocation failed",
        extra={
            "event": "external_mcp.tool_invocation.failed",
            "source": "external_mcp",
            "tool_name": tool_name,
            "duration_ms": _duration_ms(started_at),
            "failure_kind": "exception",
        },
    )


# External API MCP 서버를 만들고 tool 등록까지 끝낸다.
def create_external_mcp() -> FastMCP:
    """External API MCP 서버를 만들고 tool을 등록한다."""

    mcp = FastMCP(
        "SKN28 External API Tools",
        instructions=MCP_INSTRUCTIONS,
        host=settings.host,
        port=settings.port,
        json_response=True,
        stateless_http=True,
        streamable_http_path=settings.path,
    )

    _register_tools(mcp)

    return mcp


# FastMCP 서버에 실제로 노출할 외부 API tool들을 연결한다.
def _register_tools(mcp: FastMCP) -> None:
    """FastMCP 서버에 외부 API tool들을 등록한다."""

    @mcp.tool(
        name="naver.search",
        description=(
            "네이버 검색 API로 한국어 웹문서, 뉴스, 블로그, 지역 정보를 검색합니다. "
            "복지기관 공식 페이지, 지자체 안내, 복지센터 정보, 지역 공고, 관련 뉴스나 블로그 근거를 찾을 때 사용합니다."
        ),
    )
    # 네이버 검색 API를 MCP tool 형태로 감싼다.
    def naver_search(
        query: str,
        category: NaverSearchCategory = "webkr",
        limit: int | None = None,
        start: int = 1,
        sort: str | None = None,
    ) -> dict[str, Any]:
        started_at = _log_tool_started(
            "naver.search",
            category=category,
            limit=limit,
            start=start,
            has_sort=sort is not None,
            **_query_summary(query),
        )
        try:
            result = search_naver(
                query=query,
                category=category,
                limit=limit,
                start=start,
                sort=sort,
            )
        except Exception:
            _log_tool_exception("naver.search", started_at)
            raise

        _log_tool_completed("naver.search", started_at, result)
        return result

    @mcp.tool(
        name="web.search",
        description=(
            "Firecrawl로 공개 웹을 검색합니다. "
            "최신 웹 근거, 공식 URL, 기관 안내 페이지, 복지 정책 페이지, 검색 결과 요약이 필요할 때 사용합니다. "
            "긴 원문 미리보기가 필요할 때만 include_markdown을 true로 설정합니다."
        ),
    )
    # Firecrawl 검색 API를 MCP tool 형태로 감싼다.
    def web_search(
        query: str,
        limit: int | None = None,
        include_markdown: bool = False,
        location: str | None = None,
        time_range: str = "any",
    ) -> dict[str, Any]:
        started_at = _log_tool_started(
            "web.search",
            limit=limit,
            include_markdown=include_markdown,
            has_location=location is not None,
            time_range=time_range,
            **_query_summary(query),
        )
        try:
            result = search_firecrawl(
                query=query,
                limit=limit,
                include_markdown=include_markdown,
                location=location,
                time_range=time_range,
            )
        except Exception:
            _log_tool_exception("web.search", started_at)
            raise

        _log_tool_completed("web.search", started_at, result)
        return result

    @mcp.tool(
        name="tmap.search_poi",
        description=(
            "TMAP 장소 검색 API로 복지센터, 노인복지관, 주민센터, 병원 등 장소 후보를 찾습니다. "
            "결과에는 장소명, 주소, 전화번호, 카테고리, 경도(lon), 위도(lat)가 포함됩니다. "
            "길찾기 전에 목적지 좌표를 찾을 때 먼저 사용합니다."
        ),
    )
    # TMAP 장소 검색 API를 MCP tool 형태로 감싼다.
    def tmap_search_poi(
        keyword: str,
        limit: int | None = None,
        center_lon: float | None = None,
        center_lat: float | None = None,
        radius_km: int | None = None,
    ) -> dict[str, Any]:
        started_at = _log_tool_started(
            "tmap.search_poi",
            limit=limit,
            has_center=center_lon is not None and center_lat is not None,
            has_radius=radius_km is not None,
            **_keyword_summary(keyword),
        )
        try:
            result = search_tmap_poi(
                keyword=keyword,
                limit=limit,
                center_lon=center_lon,
                center_lat=center_lat,
                radius_km=radius_km,
            )
        except Exception:
            _log_tool_exception("tmap.search_poi", started_at)
            raise

        _log_tool_completed("tmap.search_poi", started_at, result)
        return result

    @mcp.tool(
        name="tmap.route_pedestrian",
        description=(
            "TMAP 보행자 길찾기 API로 출발 좌표에서 도착 좌표까지의 도보 경로를 조회합니다. "
            "거리, 예상 시간, 길 안내 단계가 필요할 때 사용합니다. "
            "먼저 tmap.search_poi로 목적지 좌표를 찾은 뒤 사용하는 것을 권장합니다."
        ),
    )
    # TMAP 보행자 길찾기 API를 MCP tool 형태로 감싼다.
    def tmap_route_pedestrian(
        start_lon: float,
        start_lat: float,
        end_lon: float,
        end_lat: float,
        start_name: str = "출발지",
        end_name: str = "도착지",
    ) -> dict[str, Any]:
        started_at = _log_tool_started(
            "tmap.route_pedestrian",
            start_name_chars=len(start_name),
            end_name_chars=len(end_name),
        )
        try:
            result = route_tmap_pedestrian(
                start_lon=start_lon,
                start_lat=start_lat,
                end_lon=end_lon,
                end_lat=end_lat,
                start_name=start_name,
                end_name=end_name,
            )
        except Exception:
            _log_tool_exception("tmap.route_pedestrian", started_at)
            raise

        _log_tool_completed("tmap.route_pedestrian", started_at, result)
        return result
