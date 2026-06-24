from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from external import tmap


class TmapClientTest(unittest.TestCase):
    # API key가 없을 때 장소 검색이 warning result를 반환하는지 확인한다.
    def test_search_poi_returns_warning_without_app_key(self) -> None:
        fake_settings = SimpleNamespace(tmap_app_key=None)

        with patch.object(tmap, "settings", fake_settings):
            result = tmap.search_tmap_poi("복지센터")

        self.assertFalse(result["success"])
        self.assertEqual(result["provider"], "tmap")
        self.assertEqual(result["count"], 0)
        self.assertIn("app key", result["warnings"][0])

    # TMAP POI item을 지도 표시가 가능한 좌표 포함 dict로 바꾸는지 확인한다.
    def test_normalize_poi_returns_coordinates(self) -> None:
        item = {
            "name": "강남노인복지관",
            "upperAddrName": "서울",
            "middleAddrName": "강남구",
            "lowerAddrName": "삼성동",
            "detailAddrName": "1",
            "telNo": "02-000-0000",
            "upperBizName": "복지",
            "frontLon": "127.063",
            "frontLat": "37.514",
            "id": "poi-1",
        }

        result = tmap._normalize_poi(item, position=1)  # noqa: SLF001

        self.assertEqual(result["name"], "강남노인복지관")
        self.assertEqual(result["address"], "서울 강남구 삼성동 1")
        self.assertEqual(result["lon"], 127.063)
        self.assertEqual(result["lat"], 37.514)
        self.assertIn("https://map.naver.com/p/search/", result["naver_map_place_url"])
        self.assertIn("https://map.naver.com/p/search/", result["naver_map_search_url"])
        self.assertIn("%EA%B0%95%EB%82%A8%EB%85%B8%EC%9D%B8%EB%B3%B5%EC%A7%80%EA%B4%80", result["naver_map_search_url"])
        self.assertNotIn("naver_map_route_url", result)

    # 검색어의 지역 단서와 다른 구 POI가 섞이면 응답에서 제외하는지 확인한다.
    def test_filter_poi_by_region_removes_other_district_results(self) -> None:
        results = [
            {
                "position": 1,
                "name": "어진샘노인종합복지관",
                "address": "부산 해운대구 재송동",
                "category": "복지",
            },
            {
                "position": 2,
                "name": "수영구노인복지관",
                "address": "부산 수영구 남천동",
                "category": "복지",
            },
            {
                "position": 3,
                "name": "장산노인복지관",
                "address": "부산 해운대구 좌동",
                "category": "복지",
            },
        ]

        terms = tmap._poi_region_terms("해운대구노인복지관")  # noqa: SLF001
        filtered, dropped = tmap._filter_poi_by_region(  # noqa: SLF001
            results,
            region_terms=terms,
        )

        self.assertEqual([row["name"] for row in filtered], ["어진샘노인종합복지관", "장산노인복지관"])
        self.assertEqual([row["position"] for row in filtered], [1, 2])
        self.assertEqual([row["name"] for row in dropped], ["수영구노인복지관"])

    # API key가 없을 때 길찾기도 warning result를 반환하는지 확인한다.
    def test_route_returns_warning_without_app_key(self) -> None:
        fake_settings = SimpleNamespace(tmap_app_key=None)

        with patch.object(tmap, "settings", fake_settings):
            result = tmap.route_tmap_pedestrian(
                start_lon=127.0,
                start_lat=37.0,
                end_lon=127.1,
                end_lat=37.1,
            )

        self.assertFalse(result["success"])
        self.assertEqual(result["mode"], "pedestrian")
        self.assertEqual(result["start"], {"name": "출발지", "lon": 127.0, "lat": 37.0})
        self.assertEqual(result["end"], {"name": "도착지", "lon": 127.1, "lat": 37.1})
        self.assertIn("app key", result["warnings"][0])

    # 좌표 범위를 벗어난 길찾기는 외부 API를 호출하기 전에 실패 응답을 반환한다.
    def test_route_rejects_invalid_coordinate_range(self) -> None:
        result = tmap.route_tmap_pedestrian(
            start_lon=181.0,
            start_lat=37.0,
            end_lon=127.1,
            end_lat=37.1,
            start_name="잘못된 출발지",
            end_name="도착지",
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["start"], {"name": "잘못된 출발지", "lon": 181.0, "lat": 37.0})
        self.assertEqual(result["end"], {"name": "도착지", "lon": 127.1, "lat": 37.1})
        self.assertIn("invalid route coordinate range", result["warnings"][0])
        self.assertIn("start_lon", result["warnings"][0])

    # 모두 0인 좌표는 TMAP 길찾기 요청으로 보내지 않는다.
    def test_route_rejects_all_zero_coordinates(self) -> None:
        result = tmap.route_tmap_pedestrian(
            start_lon=0,
            start_lat=0,
            end_lon=0,
            end_lat=0,
        )

        self.assertFalse(result["success"])
        self.assertIn("all route coordinates are zero", result["warnings"][0])
