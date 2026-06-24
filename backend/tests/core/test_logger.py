from __future__ import annotations

import logging
import sys
import unittest

from logger import StructuredLogFormatter, _configure_third_party_loggers


class StructuredLogFormatterTest(unittest.TestCase):
    def test_extra_fields_are_rendered_as_readable_structured_text(self) -> None:
        record = logging.LogRecord(
            "backend.test",
            logging.INFO,
            __file__,
            10,
            "chat graph invocation completed",
            (),
            None,
        )
        record.event = "chat.invocation.completed"
        record.conversation_id = "conversation-1"
        record.turn_id = "turn-1"
        record.tool_count = 3

        line = StructuredLogFormatter().format(record)

        self.assertFalse(line.startswith("{"))
        self.assertIn("INFO [backend.test] chat graph invocation completed", line)
        self.assertIn("event=chat.invocation.completed", line)
        self.assertIn("conversation_id=conversation-1", line)
        self.assertIn("turn_id=turn-1", line)
        self.assertIn("tool_count=3", line)

    def test_color_output_can_be_enabled_for_terminal_logs(self) -> None:
        record = logging.LogRecord(
            "backend.test",
            logging.INFO,
            __file__,
            10,
            "backend service starting",
            (),
            None,
        )
        record.event = "service.starting"

        line = StructuredLogFormatter(use_color=True).format(record)

        self.assertFalse(line.startswith("{"))
        self.assertIn("\033[32mINFO\033[0m", line)
        self.assertIn("\033[35m[backend.test]\033[0m", line)
        self.assertIn("\033[34mevent\033[0m=service.starting", line)

    def test_exception_logs_keep_traceback_and_error_type(self) -> None:
        try:
            raise ValueError("boom")
        except ValueError:
            record = logging.LogRecord(
                "backend.test",
                logging.ERROR,
                __file__,
                20,
                "chat agent execution failed",
                (),
                sys.exc_info(),
            )
        record.event = "chat.invocation.failed"

        line = StructuredLogFormatter().format(record)

        self.assertIn("event=chat.invocation.failed", line)
        self.assertIn("error_type=ValueError", line)
        self.assertIn("Traceback", line)
        self.assertIn("ValueError: boom", line)

    def test_sensitive_values_are_masked(self) -> None:
        record = logging.LogRecord(
            "backend.test",
            logging.INFO,
            __file__,
            30,
            "loaded RAG MCP tools",
            (),
            None,
        )
        record.event = "rag_mcp.tools_loaded"
        record.api_key = "should-not-leak"
        record.mcp_url = "https://user:pass@example.com/mcp?token=should-not-leak"

        line = StructuredLogFormatter().format(record)

        self.assertIn("api_key=[MASKED]", line)
        self.assertIn("mcp_url=https://example.com/mcp", line)
        self.assertNotIn("should-not-leak", line)

    def test_configure_logging_quiets_third_party_info_logs(self) -> None:
        daphne_cli_logger = logging.getLogger("daphne.cli")
        daphne_server_logger = logging.getLogger("daphne.server")
        httpx_logger = logging.getLogger("httpx")
        httpcore_logger = logging.getLogger("httpcore")
        original_daphne_cli_level = daphne_cli_logger.level
        original_daphne_server_level = daphne_server_logger.level
        original_httpx_level = httpx_logger.level
        original_httpcore_level = httpcore_logger.level
        try:
            daphne_cli_logger.setLevel(logging.INFO)
            daphne_server_logger.setLevel(logging.INFO)
            httpx_logger.setLevel(logging.INFO)
            httpcore_logger.setLevel(logging.INFO)

            _configure_third_party_loggers()

            self.assertEqual(daphne_cli_logger.level, logging.WARNING)
            self.assertEqual(daphne_server_logger.level, logging.WARNING)
            self.assertEqual(httpx_logger.level, logging.WARNING)
            self.assertEqual(httpcore_logger.level, logging.WARNING)
        finally:
            daphne_cli_logger.setLevel(original_daphne_cli_level)
            daphne_server_logger.setLevel(original_daphne_server_level)
            httpx_logger.setLevel(original_httpx_level)
            httpcore_logger.setLevel(original_httpcore_level)


if __name__ == "__main__":
    unittest.main()
