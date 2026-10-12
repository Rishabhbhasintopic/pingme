import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "PINGME"
    API_V1_PREFIX: str = "/api/v1"
    
    # Storage and paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = Field(default_factory=lambda: Path(os.getenv("PINGME_DATA_DIR", "./data")).resolve())
    DATABASE_URL: str = "sqlite:///./data/pingme.db"
    
    # Security
    SECRET_KEY: str = Field(default="pingme-super-secret-dev-key-change-in-production-32bytes!")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    INITIAL_ADMIN_TOKEN: str = Field(default="pm_init_admin_token_please_change")
    
    # VAPID / Web Push
    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_CLAIMS_SUB: str = "mailto:admin@pingme.local"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://pingme.local",
        "http://pms.rishabhslab.in",
        "https://pms.rishabhslab.in",
        "http://pms.rishabhslab.in:8000",
        "https://pms.rishabhslab.in:8000",
    ]
    
    # Rate Limiting & Message Constraints
    MAX_MESSAGE_LENGTH: int = 4000
    MAX_TITLE_LENGTH: int = 150
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 100
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def ensure_directories(self) -> None:
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        if self.DATABASE_URL.startswith("sqlite:///./"):
            db_path = Path(self.DATABASE_URL.replace("sqlite:///", "")).resolve()
            db_path.parent.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_directories()
