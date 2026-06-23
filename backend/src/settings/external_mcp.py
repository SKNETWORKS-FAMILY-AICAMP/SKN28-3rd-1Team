from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# Backend가 External MCP 서버에 접속할 때 필요한 설정을 환경 변수에서 읽는다.
class ExternalMcpToolSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="EXTERNAL_MCP_", extra="ignore")

    url: str = "http://127.0.0.1:8020/"

    tools_enabled: bool = True

    tool_timeout_ms: int = Field(default=30_000, gt=0)
