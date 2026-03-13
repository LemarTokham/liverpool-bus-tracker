from datetime import datetime, timezone
from app.models.schemas import BusPosition
import logging

logger = logging.getLogger(__name__)


class BusCache:
    """Simple in-memory cache for bus positions."""

    def __init__(self):
        self._buses: list[BusPosition] = []
        self._last_updated: datetime = datetime.now(timezone.utc)

    def update(self, buses: list[BusPosition]) -> None:
        self._buses = buses
        self._last_updated = datetime.now(timezone.utc)
        logger.info(f"Cache updated: {len(buses)} buses")

    def get_all(self) -> list[BusPosition]:
        return self._buses

    def get_by_line(self, line_ref: str) -> list[BusPosition]:
        return [b for b in self._buses if b.line_ref.upper() == line_ref.upper()]

    @property
    def last_updated(self) -> datetime:
        return self._last_updated

    @property
    def count(self) -> int:
        return len(self._buses)


bus_cache = BusCache()
