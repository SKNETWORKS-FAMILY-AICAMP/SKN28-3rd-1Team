from __future__ import annotations

from typing import Any

from external.http import join_url, request_json
from settings import Settings, settings

_REQUEST_COORD_TYPE = "WGS84GEO"
_RESPONSE_COORD_TYPE = "WGS84GEO"


def search_poi(
    keyword: str,
    *,
    center_lat: float | None = None,
    center_lng: float | None = None,
    count: int = 5,
    page: int = 1,
    radius: int | None = None,
    config: Settings = settings,
) -> dict[str, Any]:
    if not config.tmap_configured:
        return _not_configured("tmap_search_not_configured", [])

    response = request_json(
        join_url(config.tmap_base_url, config.tmap_poi_search_path),
        headers=_headers(config),
        query={
            "version": "1",
            "format": "json",
            "searchKeyword": keyword,
            "resCoordType": _RESPONSE_COORD_TYPE,
            "reqCoordType": _REQUEST_COORD_TYPE,
            "centerLat": center_lat,
            "centerLon": center_lng,
            "radius": radius,
            "count": count,
            "page": page,
        },
        timeout_ms=config.api_request_timeout_ms,
    )
    if not response.get("ok"):
        return {**response, "items": []}

    data = response.get("data") if isinstance(response.get("data"), dict) else {}
    pois = _read_nested(data, ("searchPoiInfo", "pois", "poi"))
    return {
        "ok": True,
        "provider": "tmap",
        "query": keyword,
        "items": [_sanitize_poi(item) for item in _as_list(pois) if isinstance(item, dict)],
    }


def request_pedestrian_route(
    *,
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    start_name: str = "출발지",
    end_name: str = "도착지",
    config: Settings = settings,
) -> dict[str, Any]:
    if not config.tmap_configured:
        return _not_configured("tmap_route_not_configured", {})

    return _request_route(
        join_url(config.tmap_base_url, config.tmap_pedestrian_route_path),
        {
            "startX": start_lng,
            "startY": start_lat,
            "endX": end_lng,
            "endY": end_lat,
            "startName": start_name,
            "endName": end_name,
            "reqCoordType": _REQUEST_COORD_TYPE,
            "resCoordType": _RESPONSE_COORD_TYPE,
        },
        config=config,
        provider_route_type="pedestrian",
    )


def request_car_route(
    *,
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    search_option: int = 0,
    config: Settings = settings,
) -> dict[str, Any]:
    if not config.tmap_configured:
        return _not_configured("tmap_route_not_configured", {})

    return _request_route(
        join_url(config.tmap_base_url, config.tmap_car_route_path),
        {
            "startX": start_lng,
            "startY": start_lat,
            "endX": end_lng,
            "endY": end_lat,
            "reqCoordType": _REQUEST_COORD_TYPE,
            "resCoordType": _RESPONSE_COORD_TYPE,
            "searchOption": search_option,
        },
        config=config,
        provider_route_type="car",
    )


def _request_route(
    url: str,
    body: dict[str, Any],
    *,
    config: Settings,
    provider_route_type: str,
) -> dict[str, Any]:
    response = request_json(
        url,
        headers=_headers(config),
        json_body=body,
        method="POST",
        query={"version": "1", "format": "json"},
        timeout_ms=config.api_request_timeout_ms,
    )
    if not response.get("ok"):
        return {**response, "route": {}}

    data = response.get("data") if isinstance(response.get("data"), dict) else {}
    return {
        "ok": True,
        "provider": "tmap",
        "routeType": provider_route_type,
        "route": _summarize_route(data),
    }


def _headers(config: Settings) -> dict[str, str]:
    return {"appKey": config.tmap_app_key.get_secret_value() if config.tmap_app_key else ""}


def _not_configured(code: str, default_items: Any) -> dict[str, Any]:
    payload_key = "items" if isinstance(default_items, list) else "route"
    return {
        "ok": False,
        "code": code,
        "message": "TMAP credentials are required.",
        payload_key: default_items,
    }


def _sanitize_poi(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(item.get("id") or item.get("pkey") or ""),
        "name": str(item.get("name") or item.get("upperAddrName") or ""),
        "category": str(item.get("middleBizName") or item.get("lowerBizName") or ""),
        "address": " ".join(
            part
            for part in [
                str(item.get("upperAddrName") or ""),
                str(item.get("middleAddrName") or ""),
                str(item.get("lowerAddrName") or ""),
                str(item.get("detailAddrName") or ""),
            ]
            if part
        ),
        "phone": str(item.get("telNo") or ""),
        "coordinate": _coordinate(item.get("frontLat"), item.get("frontLon")),
    }


def _summarize_route(data: dict[str, Any]) -> dict[str, Any]:
    features = _as_list(data.get("features"))
    properties = [
        feature.get("properties")
        for feature in features
        if isinstance(feature, dict) and isinstance(feature.get("properties"), dict)
    ]
    summary = next(
        (
            item
            for item in properties
            if "totalDistance" in item or "totalTime" in item
        ),
        {},
    )

    return {
        "summary": {
            "distanceMeters": _number(summary.get("totalDistance")),
            "durationSeconds": _number(summary.get("totalTime")),
            "fareKrw": _number(summary.get("totalFare") or summary.get("taxiFare")),
        },
        "path": _route_path(features),
        "steps": [_route_step(feature) for feature in features if isinstance(feature, dict)],
    }


def _route_path(features: list[Any]) -> list[dict[str, float]]:
    points: list[dict[str, float]] = []
    for feature in features:
        if not isinstance(feature, dict):
            continue
        geometry = feature.get("geometry")
        if not isinstance(geometry, dict):
            continue
        coordinates = geometry.get("coordinates")
        if geometry.get("type") == "LineString":
            for coordinate in _as_list(coordinates):
                point = _coordinate_from_lng_lat_pair(coordinate)
                if point:
                    points.append(point)
    return points[:240]


def _route_step(feature: dict[str, Any]) -> dict[str, Any]:
    properties = feature.get("properties") if isinstance(feature.get("properties"), dict) else {}
    return {
        "name": str(properties.get("name") or ""),
        "description": str(properties.get("description") or properties.get("turnType") or ""),
        "distanceMeters": _number(properties.get("distance")),
        "durationSeconds": _number(properties.get("time")),
    }


def _coordinate(lat: Any, lng: Any) -> dict[str, float] | None:
    latitude = _number(lat)
    longitude = _number(lng)
    if latitude is None or longitude is None:
        return None
    return {"lat": latitude, "lng": longitude}


def _coordinate_from_lng_lat_pair(value: Any) -> dict[str, float] | None:
    if not isinstance(value, list | tuple) or len(value) < 2:
        return None
    return _coordinate(value[1], value[0])


def _number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _read_nested(data: dict[str, Any], path: tuple[str, ...]) -> Any:
    current: Any = data
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value is None:
        return []
    return [value]
