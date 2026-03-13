import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import buses
from app.services.bus_feed import fetch_all_bus_positions
from app.services.cache import bus_cache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def poll_bus_feed():
    """Background task that polls the SIRI feed on an interval."""
    settings = get_settings()
    while True:
        try:
            positions = await fetch_all_bus_positions()
            bus_cache.update(positions)
        except Exception as e:
            logger.error(f"Failed to fetch bus feed: {e}")
        await asyncio.sleep(settings.poll_interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(poll_bus_feed())
    logger.info("Bus feed polling started")
    yield
    task.cancel()
    logger.info("Bus feed polling stopped")


app = FastAPI(
    title="Liverpool Bus Tracker API",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(buses.router)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "buses_cached": bus_cache.count,
        "last_updated": bus_cache.last_updated,
    }
