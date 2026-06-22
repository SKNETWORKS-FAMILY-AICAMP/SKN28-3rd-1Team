from __future__ import annotations

from functools import lru_cache

from .external_mcp import ExternalMcpToolSettings
from .elevenlabs import ElevenLabsSettings
from .llm import LlmSettings
from .metadata import MetadataSettings
from .rag import RagToolSettings
from .runtime import RuntimeSettings


class Settings:
    def __init__(
        self,
        *,
        metadata: MetadataSettings | None = None,
        llm: LlmSettings | None = None,
        elevenlabs: ElevenLabsSettings | None = None,
        rag: RagToolSettings | None = None,
        runtime: RuntimeSettings | None = None,
        external_mcp: ExternalMcpToolSettings | None = None,
    ) -> None:
        self.metadata = metadata or MetadataSettings()
        self.llm = llm or LlmSettings()
        self.elevenlabs = elevenlabs or ElevenLabsSettings()
        self.rag = rag or RagToolSettings()
        self.runtime = runtime or RuntimeSettings()
        self.external_mcp = external_mcp or ExternalMcpToolSettings()

    @property
    def tts_configured(self) -> bool:
        return self.elevenlabs.configured


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
