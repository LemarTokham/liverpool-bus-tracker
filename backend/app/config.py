from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    bus_feed_api_key: str = ""
    bus_feeds: list[dict] = [
        {"id": "709", "provider": "arriva"},
        {"id": "1695", "provider": "stagecoach"},
    ]
    bus_feed_base_url: str = "https://data.bus-data.dft.gov.uk/api/v1/datafeed"
    poll_interval: int = 10
    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
