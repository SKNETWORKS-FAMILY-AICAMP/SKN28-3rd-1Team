from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from external import naver


class NaverClientTest(unittest.TestCase):
    # API key가 없을 때 서버가 죽지 않고 warning result를 반환하는지 확인한다.
    def test_search_returns_warning_without_credentials(self) -> None:
        fake_settings = SimpleNamespace(
            naver_client_id=None,
            naver_client_secret=None,
        )

        with patch.object(naver, "settings", fake_settings):
            result = naver.search_naver("복지센터")

        self.assertFalse(result["success"])
        self.assertEqual(result["provider"], "naver")
        self.assertEqual(result["count"], 0)
        self.assertIn("credentials", result["warnings"][0])

    # 네이버가 주는 HTML 섞인 문자열을 일반 텍스트로 정리하는지 확인한다.
    def test_normalize_item_cleans_html_text(self) -> None:
        item = {
            "title": "<b>강남</b> 복지센터",
            "link": "https://example.com",
            "description": "어르신&nbsp;복지 안내",
        }

        result = naver._normalize_item(item, category="webkr", position=1)  # noqa: SLF001

        self.assertEqual(result["title"], "강남 복지센터")
        self.assertEqual(result["url"], "https://example.com")
        self.assertEqual(result["description"], "어르신 복지 안내")
