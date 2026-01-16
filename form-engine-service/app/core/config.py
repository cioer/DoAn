from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App info
    app_name: str = "Form Engine Service"
    app_version: str = "1.0.0"
    debug: bool = False

    # Paths
    template_dir: str = "/app/templates"
    output_dir: str = "/app/output"
    log_dir: str = "/app/logs"

    # Server
    host: str = "0.0.0.0"
    port: int = 8080

    # File serving
    base_url: str = "http://localhost:8080"

    class Config:
        env_prefix = "FORM_ENGINE_"
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
