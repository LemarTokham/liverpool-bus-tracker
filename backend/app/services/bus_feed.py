import asyncio
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import httpx

from app.config import get_settings
from app.models.schemas import BusPosition

logger = logging.getLogger(__name__)

NS = {"siri": "http://www.siri.org.uk/siri"}


def parse_vehicle_activity(activity: ET.Element, provider: str) -> BusPosition | None:
    """Parse a single SIRI VehicleActivity element into a BusPosition."""
    try:
        journey = activity.find("siri:MonitoredVehicleJourney", NS)
        if journey is None:
            return None

        location = journey.find("siri:VehicleLocation", NS)
        if location is None:
            return None

        lat = location.findtext("siri:Latitude", namespaces=NS)
        lng = location.findtext("siri:Longitude", namespaces=NS)
        if lat is None or lng is None:
            return None

        bearing_text = journey.findtext("siri:Bearing", namespaces=NS)
        bearing = float(bearing_text) if bearing_text else None

        recorded_at_text = activity.findtext("siri:RecordedAtTime", namespaces=NS)
        recorded_at = (
            datetime.fromisoformat(recorded_at_text)
            if recorded_at_text
            else datetime.now(timezone.utc)
        )

        return BusPosition(
            vehicle_ref=journey.findtext("siri:VehicleRef", default="unknown", namespaces=NS),
            line_ref=journey.findtext("siri:LineRef", default="unknown", namespaces=NS),
            published_line_name=journey.findtext("siri:PublishedLineName", default="unknown", namespaces=NS),
            direction=journey.findtext("siri:DirectionRef", default="unknown", namespaces=NS),
            latitude=float(lat),
            longitude=float(lng),
            bearing=bearing,
            origin_name=journey.findtext("siri:OriginName", default="", namespaces=NS).replace("_", " "),
            destination_name=journey.findtext("siri:DestinationName", default="", namespaces=NS).replace("_", " "),
            operator_ref=journey.findtext("siri:OperatorRef", default="unknown", namespaces=NS),
            recorded_at=recorded_at,
            provider=provider,
        )
    except Exception as e:
        logger.warning(f"Failed to parse VehicleActivity: {e}")
        return None


def parse_siri_xml(xml_text: str, provider: str) -> list[BusPosition]:
    """Parse full SIRI VehicleMonitoring XML response."""
    root = ET.fromstring(xml_text)
    activities = root.findall(
        ".//siri:VehicleMonitoringDelivery/siri:VehicleActivity", NS
    )

    buses = []
    for activity in activities:
        bus = parse_vehicle_activity(activity, provider)
        if bus is not None:
            buses.append(bus)

    return buses


async def fetch_single_feed(feed_id: str, provider: str, api_key: str) -> list[BusPosition]:
    """Fetch and parse a single BODS SIRI feed."""
    settings = get_settings()
    url = f"{settings.bus_feed_base_url}/{feed_id}/?api_key={api_key}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url)
        response.raise_for_status()

    return parse_siri_xml(response.text, provider)


async def fetch_all_bus_positions() -> list[BusPosition]:
    """Fetch bus positions from all configured feeds in parallel."""
    settings = get_settings()

    tasks = [
        fetch_single_feed(feed["id"], feed["provider"], settings.bus_feed_api_key)
        for feed in settings.bus_feeds
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_buses: list[BusPosition] = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            feed = settings.bus_feeds[i]
            logger.error(f"Failed to fetch {feed['provider']} feed: {result}")
        else:
            all_buses.extend(result)

    return all_buses
