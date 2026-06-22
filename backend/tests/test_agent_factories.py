from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, patch

import agents.main_agent.agent as main_agent
import agents.screen_control_agent.agent as screen_control_agent
import agents.speech_text_agent.agent as speech_text_agent


class AgentFactoryTest(unittest.IsolatedAsyncioTestCase):
    async def test_main_agent_factory_does_not_cache_agent_instance(self) -> None:
        with (
            patch.object(main_agent, "get_main", return_value=object()),
            patch.object(main_agent, "get_tools", new=AsyncMock(return_value=[])),
            patch.object(main_agent, "get_checkpointer", return_value=object()),
            patch.object(main_agent, "create_agent", side_effect=["main-1", "main-2"]) as create_agent,
        ):
            first = await main_agent.create_main_agent()
            second = await main_agent.create_main_agent()

        self.assertEqual(first, "main-1")
        self.assertEqual(second, "main-2")
        self.assertEqual(create_agent.call_count, 2)

    async def test_screen_control_agent_factory_does_not_cache_agent_instance(self) -> None:
        with (
            patch.object(screen_control_agent, "get_window", return_value=object()),
            patch.object(screen_control_agent, "get_tools", new=AsyncMock(return_value=[])),
            patch.object(
                screen_control_agent,
                "create_agent",
                side_effect=["screen-1", "screen-2"],
            ) as create_agent,
        ):
            first = await screen_control_agent.create_screen_control_agent()
            second = await screen_control_agent.create_screen_control_agent()

        self.assertEqual(first, "screen-1")
        self.assertEqual(second, "screen-2")
        self.assertEqual(create_agent.call_count, 2)

    async def test_speech_text_agent_factory_does_not_cache_agent_instance(self) -> None:
        with (
            patch.object(speech_text_agent, "get_sanitize", return_value=object()),
            patch.object(
                speech_text_agent,
                "create_agent",
                side_effect=["speech-1", "speech-2"],
            ) as create_agent,
        ):
            first = await speech_text_agent.create_speech_text_agent()
            second = await speech_text_agent.create_speech_text_agent()

        self.assertEqual(first, "speech-1")
        self.assertEqual(second, "speech-2")
        self.assertEqual(create_agent.call_count, 2)


if __name__ == "__main__":
    unittest.main()
