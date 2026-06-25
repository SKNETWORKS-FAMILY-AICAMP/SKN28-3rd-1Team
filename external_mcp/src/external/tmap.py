from __future__ import annotations

import logging
import math
import re

from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote

import httpx

from external._utils import bounded_limit, secret_value
from settings import settings

_TMAP_BASE_URL = "https://apis.openapi.sk.com/tmap"
_NAVER_MAP_WEB_BASE_URL = "https://map.naver.com"
_REGION_TERM_PATTERN = re.compile(r"[가-힣]{2,}(?:특별시|광역시|자치시|자치도|도|시|군|구)")
_FACILITY_REGION_HINT_PATTERN = re.compile(r"([가-힣]{2,}?)(?:노인|복지|요양|치매|구청|보건소)")
logger = logging.getLogger(__name__)


# TMAP POI 검색 API를 호출해서 장소 후보와 좌표를 반환한다.
def search_tmap_poi(
    keyword: str,
    limit: int | None = None,
    center_lon: float | None = None,
    center_lat: float | None = None,
    radius_km: int | None = None,
) -> dict[str, Any]:
    """TMAP POI 검색 API를 호출해서 장소 후보와 좌표를 반환한다."""

    normalized_keyword = keyword.strip()
    searched_at = datetime.now(UTC).isoformat()

    if not normalized_keyword:
        return _failure(
            keyword=normalized_keyword,
            searched_at=searched_at,
            warning="keyword must not be empty.",
        )

    app_key = secret_value(settings.tmap_app_key)

    if not app_key:
        return _failure(
            keyword=normalized_keyword,
            searched_at=searched_at,
            warning="TMAP app key is missing.",
        )

    safe_limit = bounded_limit(
        limit,
        default_limit=settings.search_default_limit,
        max_limit=settings.search_max_limit,
    )
    url = f"{_TMAP_BASE_URL}/pois"

    params: dict[str, Any] = {
        "version": "1",
        "searchKeyword": normalized_keyword,
        "searchType": "all",
        "searchtypCd": "A",
        "resCoordType": "WGS84GEO",
        "reqCoordType": "WGS84GEO",
        "count": safe_limit,
        "page": 1,
    }

    if center_lon is not None and center_lat is not None:
        params["centerLon"] = center_lon
        params["centerLat"] = center_lat

    if radius_km is not None:
        params["radius"] = min(max(int(radius_km), 1), 33)

    headers = {"appKey": app_key}

    try:
        timeout_seconds = settings.request_timeout_ms / 1000

        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.get(url, params=params, headers=headers)

        response.raise_for_status()
        payload = response.json()

    except httpx.HTTPError as exc:
        logger.warning("TMAP POI search failed: %s", exc)
        return _failure(
            keyword=normalized_keyword,
            searched_at=searched_at,
            warning=f"TMAP POI search failed: {exc}",
        )

    poi_items = (
        payload.get("searchPoiInfo", {})
        .get("pois", {})
        .get("poi", [])
    )
    if isinstance(poi_items, dict):
        pois = [poi_items]
    elif isinstance(poi_items, list):
        pois = poi_items
    else:
        pois = []

    results = [
        _normalize_poi(item, position=index)
        for index, item in enumerate(pois, start=1)
        if isinstance(item, dict)
    ]
    region_terms = _poi_region_terms(normalized_keyword)
    results, dropped_results = _filter_poi_by_region(
        results,
        region_terms=region_terms,
    )
    warnings = [] if results else ["No TMAP POI results found."]
    if dropped_results:
        warnings.append(_filtered_poi_warning(dropped_results))

    return {
        "provider": "tmap",
        "success": True,
        "query": normalized_keyword,
        "count": len(results),
        "searched_at": searched_at,
        "results": results,
        "warnings": warnings,
    }


# 검색어에 지역명이 들어간 경우, 다른 구/군 POI가 섞이지 않도록 응답 후처리에 쓸 지역 단서를 만든다.
def _poi_region_terms(keyword: str) -> list[str]:
    """검색어에서 TMAP POI 지역 필터에 쓸 단어를 추출한다."""

    terms: list[str] = []
    normalized = "".join(keyword.split())

    for pattern in (_REGION_TERM_PATTERN, _FACILITY_REGION_HINT_PATTERN):
        for match in pattern.finditer(normalized):
            term = match.group(1) if match.lastindex else match.group(0)
            _append_region_term(terms, term)

    return terms


def _append_region_term(terms: list[str], term: str) -> None:
    normalized = term.strip()
    if not normalized:
        return

    if normalized not in terms:
        terms.append(normalized)

    for suffix in ("특별시", "광역시", "자치시", "자치도", "도", "시", "군", "구"):
        if normalized.endswith(suffix):
            alias = normalized[: -len(suffix)]
            if len(alias) >= 2 and alias not in terms:
                terms.append(alias)
            break


def _filter_poi_by_region(
    results: list[dict[str, Any]],
    *,
    region_terms: list[str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not results or not region_terms:
        return results, []

    matched: list[dict[str, Any]] = []
    dropped: list[dict[str, Any]] = []

    for result in results:
        text = " ".join(
            str(result.get(key) or "")
            for key in ("name", "address", "category")
        )
        if any(term in text for term in region_terms):
            matched.append(result)
        else:
            dropped.append(result)

    if not matched:
        return results, []

    return _renumber_poi_results(matched), dropped


def _renumber_poi_results(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    renumbered: list[dict[str, Any]] = []
    for index, result in enumerate(results, start=1):
        row = dict(result)
        row["position"] = index
        renumbered.append(row)
    return renumbered


def _filtered_poi_warning(dropped_results: list[dict[str, Any]]) -> str:
    names = [
        str(result.get("name") or result.get("address") or "").strip()
        for result in dropped_results[:3]
    ]
    visible_names = ", ".join(name for name in names if name)
    suffix = f": {visible_names}" if visible_names else ""
    return (
        f"Filtered out {len(dropped_results)} TMAP POI result(s) "
        f"outside requested region terms{suffix}"
    )


# TMAP POI item 하나를 frontend와 agent가 쓰기 쉬운 형태로 바꾼다.
def _normalize_poi(item: dict[str, Any], *, position: int) -> dict[str, Any]:
    """TMAP POI 한 개를 frontend와 agent가 쓰기 쉬운 형태로 바꾼다."""

    name = _text(item.get("name"))
    address = _join_address(item)
    lon = _float_or_none(item.get("frontLon") or item.get("noorLon"))
    lat = _float_or_none(item.get("frontLat") or item.get("noorLat"))

    place_url = _naver_map_place_url(_map_query(name=name, address=address))

    return {
        "provider": "tmap",
        "position": position,
        "name": name,
        "address": address,
        "phone": _text(item.get("telNo")),
        "category": _text(item.get("upperBizName")),
        "lon": lon,
        "lat": lat,
        "poi_id": _text(item.get("id")),
        "naver_map_place_url": place_url,
        "naver_map_search_url": place_url,
    }


# TMAP이 나눠서 주는 주소 조각을 한 줄 주소로 합친다.
def _join_address(item: dict[str, Any]) -> str:
    """TMAP이 나눠서 주는 주소 조각을 한 줄 주소로 합친다."""

    parts = [
        item.get("upperAddrName"),
        item.get("middleAddrName"),
        item.get("lowerAddrName"),
        item.get("detailAddrName"),
    ]
    clean_parts = [_text(part) for part in parts]
    return " ".join(part for part in clean_parts if part)


# 외부 API 값을 공백 정리된 문자열로 바꾼다.
def _text(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).split())


# 외부 API 값을 float로 바꾸되 실패하면 None을 반환한다.
def _float_or_none(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


# 장소 검색 실패도 항상 같은 응답 구조로 반환한다.
def _failure(*, keyword: str, searched_at: str, warning: str) -> dict[str, Any]:
    return {
        "provider": "tmap",
        "success": False,
        "query": keyword,
        "count": 0,
        "searched_at": searched_at,
        "results": [],
        "warnings": [warning],
    }


# TMAP 보행자 길찾기 API를 호출해서 거리, 시간, 안내 단계를 반환한다.
def route_tmap_pedestrian(
    start_lon: float,
    start_lat: float,
    end_lon: float,
    end_lat: float,
    start_name: str = "출발지",
    end_name: str = "도착지",
) -> dict[str, Any]:
    """TMAP 보행자 길찾기 API를 호출해서 거리, 시간, 안내 단계를 반환한다."""

    routed_at = datetime.now(UTC).isoformat()
    start = _route_point(name=start_name, lon=start_lon, lat=start_lat)
    end = _route_point(name=end_name, lon=end_lon, lat=end_lat)

    invalid_coordinate_warning = _route_coordinate_warning(
        start_lon=start_lon,
        start_lat=start_lat,
        end_lon=end_lon,
        end_lat=end_lat,
    )
    if invalid_coordinate_warning:
        return _route_failure(
            routed_at=routed_at,
            warning=invalid_coordinate_warning,
            start=start,
            end=end,
        )

    app_key = secret_value(settings.tmap_app_key)

    if not app_key:
        return _route_failure(
            routed_at=routed_at,
            warning="TMAP app key is missing.",
            start=start,
            end=end,
        )

    url = f"{_TMAP_BASE_URL}/routes/pedestrian"
    payload: dict[str, Any] = {
        "startX": start_lon,
        "startY": start_lat,
        "endX": end_lon,
        "endY": end_lat,
        "startName": start_name,
        "endName": end_name,
        "reqCoordType": "WGS84GEO",
        "resCoordType": "WGS84GEO",
    }
    headers = {
        "appKey": app_key,
        "Content-Type": "application/json",
    }

    try:
        timeout_seconds = settings.request_timeout_ms / 1000

        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.post(url, json=payload, headers=headers)

        response.raise_for_status()
        data = response.json()

    except httpx.HTTPError as exc:
        logger.warning("TMAP pedestrian route failed: %s", exc)
        return _route_failure(
            routed_at=routed_at,
            warning=f"TMAP pedestrian route failed: {exc}",
            start=start,
            end=end,
        )

    features = data.get("features") or []
    summary = _route_summary(features)
    steps = _route_steps(features)
    warnings = [] if features else ["No TMAP pedestrian route features found."]

    return {
        "provider": "tmap",
        "success": True,
        "mode": "pedestrian",
        "routed_at": routed_at,
        "start": start,
        "end": end,
        "naver_map_route_url": _naver_map_route_url(
            dest_name=end_name,
            lon=end_lon,
            lat=end_lat,
            start_name=start_name,
            start_lon=start_lon,
            start_lat=start_lat,
        ),
        "distance_meters": summary.get("distance_meters"),
        "duration_seconds": summary.get("duration_seconds"),
        "steps": steps,
        "warnings": warnings,
    }


# TMAP features에서 전체 거리와 시간을 찾는다.
def _route_summary(features: list[Any]) -> dict[str, Any]:
    """TMAP features에서 전체 거리와 시간을 찾는다."""

    for feature in features:
        if not isinstance(feature, dict):
            continue

        properties = feature.get("properties")
        if not isinstance(properties, dict):
            continue

        distance = _int_or_none(properties.get("totalDistance"))
        duration = _int_or_none(properties.get("totalTime"))

        if distance is not None or duration is not None:
            return {
                "distance_meters": distance,
                "duration_seconds": duration,
            }
    return {
        "distance_meters": None,
        "duration_seconds": None,
    }


# TMAP features에서 길 안내 문장들을 순서대로 뽑는다.
def _route_steps(features: list[Any]) -> list[dict[str, Any]]:
    """TMAP features에서 길 안내 문장들을 뽑는다."""

    steps: list[dict[str, Any]] = []

    for feature in features:
        if not isinstance(feature, dict):
            continue

        properties = feature.get("properties")
        if not isinstance(properties, dict):
            continue

        description = _text(
            properties.get("description")
            or properties.get("name")
        )

        if not description:
            continue

        steps.append(
            {
                "position": len(steps) + 1,
                "description": description,
                "distance_meters": _int_or_none(properties.get("distance")),
                "duration_seconds": _int_or_none(properties.get("time")),
                "road_name": _text(properties.get("roadName")),
                "turn_type": _text(properties.get("turnType")),
            }
        )
    return steps


# 외부 API 값을 int로 바꾸되 실패하면 None을 반환한다.
def _int_or_none(value: Any) -> int | None:
    """외부 API 값을 int로 바꾸되, 실패하면 None을 반환한다."""

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


# 길찾기 실패도 항상 같은 응답 구조로 반환한다.
def _route_failure(
    *,
    routed_at: str,
    warning: str,
    start: dict[str, Any] | None = None,
    end: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """길찾기 실패도 항상 같은 형태로 반환한다."""

    return {
        "provider": "tmap",
        "success": False,
        "mode": "pedestrian",
        "routed_at": routed_at,
        "start": start,
        "end": end,
        "distance_meters": None,
        "duration_seconds": None,
        "steps": [],
        "warnings": [warning],
    }


def _route_point(*, name: str, lon: float, lat: float) -> dict[str, Any]:
    return {
        "name": name,
        "lon": lon,
        "lat": lat,
    }


def _route_coordinate_warning(
    *,
    start_lon: float,
    start_lat: float,
    end_lon: float,
    end_lat: float,
) -> str | None:
    invalid_names: list[str] = []
    for name, value, low, high in (
        ("start_lon", start_lon, -180, 180),
        ("start_lat", start_lat, -90, 90),
        ("end_lon", end_lon, -180, 180),
        ("end_lat", end_lat, -90, 90),
    ):
        if (
            not isinstance(value, int | float)
            or not math.isfinite(value)
            or value < low
            or value > high
        ):
            invalid_names.append(name)

    if invalid_names:
        return "invalid route coordinate range: " + ", ".join(invalid_names)

    if start_lon == start_lat == end_lon == end_lat == 0:
        return "invalid route coordinate value: all route coordinates are zero"

    return None


def _map_query(*, name: str, address: str) -> str:
    return " ".join(part for part in (name, address) if part).strip()


def _naver_map_search_url(query: str) -> str | None:
    return _naver_map_place_url(query)


def _naver_map_place_url(query: str) -> str | None:
    if not query:
        return None

    return f"{_NAVER_MAP_WEB_BASE_URL}/p/search/{quote(query, safe='')}"


def _naver_map_route_url(
    *,
    dest_name: str,
    lon: float | None,
    lat: float | None,
    start_name: str | None = None,
    start_lon: float | None = None,
    start_lat: float | None = None,
) -> str | None:
    if lon is None or lat is None:
        return None

    destination = _naver_map_place_segment(
        name=dest_name or "도착지",
        lon=lon,
        lat=lat,
    )
    if start_lon is not None and start_lat is not None:
        start = _naver_map_place_segment(
            name=start_name or "출발지",
            lon=start_lon,
            lat=start_lat,
        )
    else:
        start = "-"

    return f"{_NAVER_MAP_WEB_BASE_URL}/p/directions/{start}/{destination}/-/walk"


def _naver_map_place_segment(*, name: str, lon: float, lat: float) -> str:
    return f"{lon},{lat},{quote(name, safe='')},,"
