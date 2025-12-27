from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./drift.db"
    secret_key: str = "dev-secret-key-change-in-production"
    google_places_api_key: str = ""
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week
    
    class Config:
        env_file = ".env"


@lru_cache
def get_settings():
    return Settings()
