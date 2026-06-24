from __future__ import annotations

import unittest

from support.sse_parser import parse_sse_text, summarize_events


class SseParserTest(unittest.TestCase):
    def test_main_agent_final_answer_is_not_overwritten_by_screen_control(self) -> None:
        events = parse_sse_text(
            "\n".join(
                [
                    "event: agent.text.final",
                    'data: {"type":"agent.text.final","source_agent":"main_agent","node":"main_agent_result","answer":"강남구 노인복지관 답변","session_id":"s1","turn_id":"t1"}',
                    "",
                    "event: agent.text.final",
                    'data: {"type":"agent.text.final","source_agent":"screen_control_agent","node":"screen_control_agent","text":"```json\\n{}\\n```","session_id":"s1","turn_id":"t1"}',
                    "",
                ]
            )
        )

        summary = summarize_events(events)

        self.assertEqual(summary["final_answer"], "강남구 노인복지관 답변")
        self.assertEqual(summary["session_id"], "s1")
        self.assertEqual(summary["turn_id"], "t1")


if __name__ == "__main__":
    unittest.main()
