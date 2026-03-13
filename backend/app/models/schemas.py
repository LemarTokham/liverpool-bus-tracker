from pydantic import BaseModel
from datetime import datetime


class BusPosition(BaseModel):
    vehicle_ref: str
    line_ref: str
    published_line_name: str
    direction: str
    latitude: float
    longitude: float
    bearing: float | None = None
    origin_name: str
    destination_name: str
    operator_ref: str
    recorded_at: datetime
    provider: str


class BusPositionsResponse(BaseModel):
    buses: list[BusPosition]
    last_updated: datetime
    count: int
