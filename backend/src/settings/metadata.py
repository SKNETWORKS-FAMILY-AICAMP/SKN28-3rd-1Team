from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class MetadataSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="METADATA_", extra="ignore")

    name: str = "SKN28 Backend"
    version: str = "0.1.0"
