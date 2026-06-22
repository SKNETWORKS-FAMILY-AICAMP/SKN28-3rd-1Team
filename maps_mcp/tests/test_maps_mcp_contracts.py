from __future__ import annotations

import unittest

from api.mcp import create_maps_mcp
from api.mcp.server import Coordinate, NearbyInstitution, _rank_nearby
from external.naver import search_local
from external.tmap import search_poi
from settings import Settings


class MapsMcpContractsTest(unittest.TestCase):
    def test_mcp_exposes_expected_tools(self) -> None:
        tool_manager = create_maps_mcp()._tool_manager
        tool_names = set(tool_manager._tools)

        self.assertEqual(
            {
                "maps.search_naver_local",
                "maps.search_tmap_poi",
                "maps.request_tmap_pedestrian_route",
                "maps.request_tmap_car_route",
                "institution.search_by_region",
                "institution.rank_nearby",
                "institution.geocode",
            },
            tool_names,
        )

    def test_provider_tools_return_config_errors_without_secrets(self) -> None:
        config = Settings(
            NAVER_SEARCH_CLIENT_ID=None,
            NAVER_SEARCH_CLIENT_SECRET=None,
            TMAP_APP_KEY=None,
        )

        naver_result = search_local("강남 시니어클럽", config=config)
        tmap_result = search_poi("강남 시니어클럽", config=config)

        self.assertFalse(naver_result["ok"])
        self.assertEqual("naver_search_not_configured", naver_result["code"])
        self.assertNotIn("client_secret", str(naver_result).lower())
        self.assertFalse(tmap_result["ok"])
        self.assertEqual("tmap_search_not_configured", tmap_result["code"])
        self.assertNotIn("app_key", str(tmap_result).lower())

    def test_rank_nearby_orders_coordinate_backed_institutions(self) -> None:
        result = _rank_nearby(
            Coordinate(lat=37.5000, lng=127.0000),
            [
                NearbyInstitution(
                    id="far",
                    name="먼 기관",
                    coordinate=Coordinate(lat=37.6000, lng=127.1000),
                ),
                NearbyInstitution(
                    id="near",
                    name="가까운 기관",
                    coordinate=Coordinate(lat=37.5010, lng=127.0010),
                ),
                NearbyInstitution(id="missing", name="좌표 없는 기관"),
            ],
        )

        self.assertEqual(["near", "far"], [item["id"] for item in result["ranked"]])
        self.assertEqual(["missing"], [item["id"] for item in result["missingCoordinates"]])


if __name__ == "__main__":
    unittest.main()
