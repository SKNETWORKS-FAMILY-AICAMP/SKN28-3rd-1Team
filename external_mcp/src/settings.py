from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parents[1]


# External MCP 서버가 환경 변수에서 읽어야 하는 설정값을 정의한다.
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVICE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = Field(default="local", validation_alias="APP_ENV")

    host: str = Field(default="127.0.0.1", validation_alias="EXTERNAL_MCP_HOST")
    port: int = Field(default=8020, validation_alias="EXTERNAL_MCP_PORT")
    path: str = Field(default="/", validation_alias="EXTERNAL_MCP_PATH")

    naver_client_id: SecretStr | None = Field(
        default=None,
        validation_alias="EXTERNAL_MCP_NAVER_CLIENT_ID",
    )

    naver_client_secret: SecretStr | None = Field(
        default=None,
        validation_alias="EXTERNAL_MCP_NAVER_CLIENT_SECRET",
    )

    firecrawl_api_key: SecretStr | None = Field(
        default=None,
        validation_alias="EXTERNAL_MCP_FIRECRAWL_API_KEY",
    )

    tmap_app_key: SecretStr | None = Field(
        default=None,
        validation_alias="EXTERNAL_MCP_TMAP_APP_KEY",
    )

    request_timeout_ms: int = Field(
        default=15_000,
        gt=0,
        validation_alias="EXTERNAL_MCP_REQUEST_TIMEOUT_MS",
    )

    search_default_limit: int = Field(
        default=5,
        ge=1,
        validation_alias="EXTERNAL_MCP_SEARCH_DEFAULT_LIMIT",
    )

    search_max_limit: int = Field(
        default=10,
        ge=1,
        validation_alias="EXTERNAL_MCP_SEARCH_MAX_LIMIT",
    )


# Settings 객체를 한 번만 만들고 재사용해서 설정 읽기를 일정하게 유지한다.
@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
