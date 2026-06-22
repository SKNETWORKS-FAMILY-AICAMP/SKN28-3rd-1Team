from __future__ import annotations

import logging
import math
import time
from collections.abc import Callable
from typing import Any

from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

from external import naver, tmap
from settings import settings

MCP_INSTRUCTIONS = (
    "Maps provider tools for Korean local search, institution lookup, and route planning. "
    "Provider secrets are server-side only and must never be returned."
)
logger = logging.getLogger(__name__)


class Coordinate(BaseModel):
    lat: float
    lng: float


class NearbyInstitution(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    coordinate: Coordinate | None = None
    address: str | None = None


def create_maps_mcp() -> FastMCP:
    mcp = FastMCP(
        "SKN28 Maps MCP Tools",
        instructions=MCP_INSTRUCTIONS,
        host=settings.mcp_host,
        port=settings.mcp_port,
        json_response=True,
        stateless_http=True,
        streamable_http_path="/",
    )
    _register_tools(mcp)
    return mcp


def _register_tools(mcp: FastMCP) -> None:
    @mcp.tool(
        name="maps.search_naver_local",
        description=(
            "Search Naver Local for Korean places and institutions. Use for place names, "
            "addresses, local agencies, senior clubs, welfare centers, and public office candidates."
        ),
    )
    def maps_search_naver_local(
        query: str,
        display: int = 5,
        start: int = 1,
        sort: str = "random",
    ) -> dict[str, Any]:
        return _run_logged(
            "maps.search_naver_local",
            {"query": _preview(query), "display": display, "start": start, "sort": sort},
            lambda: naver.search_local(
                query,
                display=_bounded(display, 1, 20),
                start=_bounded(start, 1, 1000),
                sort=sort,
            ),
        )

    @mcp.tool(
        name="maps.search_tmap_poi",
        description="Search TMAP POI candidates. Use for provider-backed POI lookup around a coordinate or region keyword.",
    )
    def maps_search_tmap_poi(
        keyword: str,
        center_lat: float | None = None,
        center_lng: float | None = None,
        radius: int | None = None,
        count: int = 5,
        page: int = 1,
    ) -> dict[str, Any]:
        return _run_logged(
            "maps.search_tmap_poi",
            {
                "keyword": _preview(keyword),
                "has_center": center_lat is not None and center_lng is not None,
                "radius": radius,
                "count": count,
                "page": page,
            },
            lambda: tmap.search_poi(
                keyword,
                center_lat=center_lat,
                center_lng=center_lng,
                radius=radius,
                count=_bounded(count, 1, 20),
                page=_bounded(page, 1, 100),
            ),
        )

    @mcp.tool(
        name="maps.request_tmap_pedestrian_route",
        description=(
            "Request a TMAP pedestrian route between WGS84 coordinates. Use provider output for route duration, "
            "distance, and polyline; do not invent walking minutes."
        ),
    )
    def maps_request_tmap_pedestrian_route(
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float,
        start_name: str = "출발지",
        end_name: str = "도착지",
    ) -> dict[str, Any]:
        return _run_logged(
            "maps.request_tmap_pedestrian_route",
            {"start_name": _preview(start_name), "end_name": _preview(end_name)},
            lambda: tmap.request_pedestrian_route(
                start_lat=start_lat,
                start_lng=start_lng,
                end_lat=end_lat,
                end_lng=end_lng,
                start_name=start_name,
                end_name=end_name,
            ),
        )

    @mcp.tool(
        name="maps.request_tmap_car_route",
        description="Request a TMAP car route between WGS84 coordinates.",
    )
    def maps_request_tmap_car_route(
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float,
        search_option: int = 0,
    ) -> dict[str, Any]:
        return _run_logged(
            "maps.request_tmap_car_route",
            {"search_option": search_option},
            lambda: tmap.request_car_route(
                start_lat=start_lat,
                start_lng=start_lng,
                end_lat=end_lat,
                end_lng=end_lng,
                search_option=search_option,
            ),
        )

    @mcp.tool(
        name="institution.search_by_region",
        description=(
            "Search institution candidates by Korean region and optional category. "
            "Aggregates configured provider lookups without exposing provider secrets."
        ),
    )
    def institution_search_by_region(
        region: str,
        category: str | None = None,
        display: int = 5,
    ) -> dict[str, Any]:
        query = " ".join(
            part
            for part in [
                region.strip(),
                category.strip() if category else "노인일자리 수행기관 시니어클럽 노인복지관",
            ]
            if part
        )
        return _run_logged(
            "institution.search_by_region",
            {"region": _preview(region), "category": category, "display": display},
            lambda: {
                "ok": True,
                "query": query,
                "providers": {
                    "naver": naver.search_local(query, display=_bounded(display, 1, 20)),
                    "tmap": tmap.search_poi(query, count=_bounded(display, 1, 20)),
                },
            },
        )

    @mcp.tool(
        name="institution.rank_nearby",
        description="Rank institutions with known WGS84 coordinates by distance from the user's WGS84 location.",
    )
    def institution_rank_nearby(
        user_location: Coordinate,
        institutions: list[NearbyInstitution],
    ) -> dict[str, Any]:
        return _run_logged(
            "institution.rank_nearby",
            {"institution_count": len(institutions)},
            lambda: _rank_nearby(user_location, institutions),
        )

    @mcp.tool(
        name="institution.geocode",
        description=(
            "Best-effort provider lookup for institution addresses. This is not a dedicated geocoding API; "
            "prefer official provider coordinates when available."
        ),
    )
    def institution_geocode(addresses: list[str], display: int = 1) -> dict[str, Any]:
        cleaned_addresses = [address.strip() for address in addresses if address.strip()]
        return _run_logged(
            "institution.geocode",
            {"address_count": len(cleaned_addresses), "display": display},
            lambda: {
                "ok": True,
                "lookups": [
                    {
                        "address": address,
                        "naver": naver.search_local(address, display=_bounded(display, 1, 5)),
                        "tmap": tmap.search_poi(address, count=_bounded(display, 1, 5)),
                    }
                    for address in cleaned_addresses[:20]
                ],
            },
        )


def _run_logged(
    tool_name: str,
    input_summary: dict[str, Any],
    call: Callable[[], dict[str, Any]],
) -> dict[str, Any]:
    started_at = time.perf_counter()
    logger.info("MCP tool started tool=%s input=%s", tool_name, input_summary)
    try:
        result = call()
    except Exception:
        logger.exception("MCP tool failed tool=%s duration_ms=%s", tool_name, _elapsed_ms(started_at))
        raise
    logger.info(
        "MCP tool completed tool=%s duration_ms=%s ok=%s",
        tool_name,
        _elapsed_ms(started_at),
        result.get("ok"),
    )
    return result


def _rank_nearby(
    user_location: Coordinate,
    institutions: list[NearbyInstitution],
) -> dict[str, Any]:
    ranked: list[dict[str, Any]] = []
    missing_coordinates: list[dict[str, Any]] = []

    for institution in institutions:
        item = institution.model_dump(exclude_none=True)
        if institution.coordinate is None:
            missing_coordinates.append(item)
            continue

        distance_meters = _haversine_distance_meters(
            user_location.lat,
            user_location.lng,
            institution.coordinate.lat,
            institution.coordinate.lng,
        )
        item["distanceMeters"] = round(distance_meters)
        ranked.append(item)

    ranked.sort(key=lambda item: item["distanceMeters"])
    return {"ok": True, "ranked": ranked, "missingCoordinates": missing_coordinates}


def _haversine_distance_meters(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    radius_meters = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    value = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return radius_meters * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def _bounded(value: int, minimum: int, maximum: int) -> int:
    return min(max(value, minimum), maximum)


def _preview(value: str, limit: int = 160) -> str:
    compact = " ".join(value.split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit]}...<truncated chars={len(compact) - limit}>"


def _elapsed_ms(started_at: float) -> float:
    return round((time.perf_counter() - started_at) * 1000, 2)
