from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVICE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = Field(default="local", validation_alias="APP_ENV")
    mcp_host: str = Field(default="127.0.0.1", validation_alias="MAPS_MCP_HOST")
    mcp_port: int = Field(default=8020, validation_alias="MAPS_MCP_PORT")
    external_mcp_path: str = Field(default="/mcp", validation_alias="MAPS_EXTERNAL_MCP_PATH")
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"],
        validation_alias="MAPS_CORS_ALLOWED_ORIGINS",
    )
    api_request_timeout_ms: int = Field(
        default=5000,
        gt=0,
        validation_alias="MAPS_API_REQUEST_TIMEOUT_MS",
    )

    naver_search_client_id: SecretStr | None = Field(
        default=None,
        validation_alias="NAVER_SEARCH_CLIENT_ID",
    )
    naver_search_client_secret: SecretStr | None = Field(
        default=None,
        validation_alias="NAVER_SEARCH_CLIENT_SECRET",
    )
    naver_local_base_url: str = Field(
        default="https://openapi.naver.com/v1/search/local.json",
        validation_alias="NAVER_LOCAL_BASE_URL",
    )

    tmap_app_key: SecretStr | None = Field(default=None, validation_alias="TMAP_APP_KEY")
    tmap_base_url: str = Field(
        default="https://apis.openapi.sk.com",
        validation_alias="TMAP_BASE_URL",
    )
    tmap_poi_search_path: str = Field(
        default="/tmap/pois",
        validation_alias="TMAP_POI_SEARCH_PATH",
    )
    tmap_pedestrian_route_path: str = Field(
        default="/tmap/routes/pedestrian",
        validation_alias="TMAP_PEDESTRIAN_ROUTE_PATH",
    )
    tmap_car_route_path: str = Field(
        default="/tmap/routes",
        validation_alias="TMAP_CAR_ROUTE_PATH",
    )

    @property
    def naver_search_configured(self) -> bool:
        return bool(self.naver_search_client_id and self.naver_search_client_secret)

    @property
    def tmap_configured(self) -> bool:
        return bool(self.tmap_app_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
