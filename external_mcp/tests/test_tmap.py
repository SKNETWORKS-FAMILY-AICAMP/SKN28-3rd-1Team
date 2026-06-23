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
        self.assertIn("app key", result["warnings"][0])
