from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from external import firecrawl


class FirecrawlClientTest(unittest.TestCase):
    # API key가 없을 때 서버가 죽지 않고 warning result를 반환하는지 확인한다.
    def test_search_returns_warning_without_api_key(self) -> None:
        fake_settings = SimpleNamespace(firecrawl_api_key=None)

        with patch.object(firecrawl, "settings", fake_settings):
            result = firecrawl.search_firecrawl("복지센터")

        self.assertFalse(result["success"])
        self.assertEqual(result["provider"], "firecrawl")
        self.assertEqual(result["count"], 0)
        self.assertIn("API key", result["warnings"][0])

    # Firecrawl web/news 응답을 중복 URL 없이 하나의 results 배열로 합치는지 확인한다.
    def test_normalize_results_deduplicates_urls(self) -> None:
        data = {
            "web": [
                {
                    "url": "https://example.com/a",
                    "title": "A",
                    "description": "first",
                }
            ],
            "news": [
                {
                    "url": "https://example.com/a",
                    "title": "A duplicate",
                    "description": "duplicate",
                },
                {
                    "url": "https://example.com/b",
                    "title": "B",
                    "description": "second",
                },
            ],
        }

        results = firecrawl._normalize_results(  # noqa: SLF001
            data,
            include_markdown=False,
            query="복지센터",
        )

        self.assertEqual([row["url"] for row in results], [
            "https://example.com/a",
            "https://example.com/b",
        ])
