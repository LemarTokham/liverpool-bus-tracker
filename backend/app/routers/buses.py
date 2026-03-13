from fastapi import APIRouter, Query
from app.models.schemas import BusPositionsResponse
from app.services.cache import bus_cache

router = APIRouter(prefix="/api/buses", tags=["buses"])


@router.get("/positions", response_model=BusPositionsResponse)
async def get_bus_positions(
    line: str | None = Query(None, description="Filter by bus line (e.g. X4, 82)"),
):
    """Get current bus positions. Optionally filter by line."""
    if line:
        buses = bus_cache.get_by_line(line)
    else:
        buses = bus_cache.get_all()

    return BusPositionsResponse(
        buses=buses,
        last_updated=bus_cache.last_updated,
        count=len(buses),
    )


@router.get("/lines")
async def get_active_lines():
    """Get list of currently active bus lines."""
    buses = bus_cache.get_all()
    lines = sorted(set(b.line_ref for b in buses))
    return {"lines": lines, "count": len(lines)}
