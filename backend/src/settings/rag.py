from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class RagToolSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RAG_", extra="ignore")

    mcp_url: str = "http://127.0.0.1:8010/mcp"
    tools_enabled: bool = True
    tool_timeout_ms: int = Field(default=30_000, gt=0)
