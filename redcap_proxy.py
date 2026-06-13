"""redcap_proxy.py -- server-side proxy between the CodeSBU training site and
the Stony Brook REDCap API.

The browser POSTs one JSON event at a time to /collect; this service validates
it against an allow-list, maps it onto the REDCap data dictionary (see
redcap_data_dictionary.csv), and imports it as exactly one new record via the
REDCap API. The REDCap API token lives only in the REDCAP_API_TOKEN environment
variable -- it is never sent to, or visible from, the browser, and REDCap's
responses are never leaked to the client.

    browser --POST /collect--> this proxy --POST--> https://redcap.stonybrookmedicine.edu/api/

Configuration (environment variables):
    REDCAP_API_URL    REDCap API endpoint (defaults to the SBU instance)
    REDCAP_API_TOKEN  32-char project API token -- secrets manager only, never the repo
    ALLOWED_ORIGIN    origin(s) of the training site, comma-separated

Run locally against a Development-mode test project:
    pip install -r requirements.txt
    export REDCAP_API_TOKEN=<dev project token>
    export ALLOWED_ORIGIN=http://localhost:8080
    uvicorn redcap_proxy:app --port 8000
"""

import json
import logging
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("redcap_proxy")

REDCAP_API_URL = os.environ.get(
    "REDCAP_API_URL", "https://redcap.stonybrookmedicine.edu/api/"
)
REDCAP_API_TOKEN = os.environ.get("REDCAP_API_TOKEN", "")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "")

# Allow-list of what the site may send. Anything else is rejected with a 400.
ALLOWED_EVENT_TYPES = {
    "session_start",
    "tutorial_start",
    "tutorial_complete",
    "scenario_start",
    "mission_complete",
    "session_complete",
    "client_error",
}
SESSION_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
MODULE_RE = re.compile(r"^[a-z0-9_-]{1,64}$")
MAX_BODY_BYTES = 64_000        # hard cap on the request body
MAX_EVENT_DATA_CHARS = 32_000  # cap on the serialized event_data blob


class Event(BaseModel):
    """One analytics event as sent by the training site (the frontend contract)."""

    session_id: str
    module: str
    event_type: str
    event_data: dict = Field(default_factory=dict)

    @field_validator("session_id")
    @classmethod
    def _session_id(cls, v: str) -> str:
        if not SESSION_ID_RE.match(v):
            raise ValueError("invalid session_id")
        return v

    @field_validator("module")
    @classmethod
    def _module(cls, v: str) -> str:
        if not MODULE_RE.match(v):
            raise ValueError("invalid module")
        return v

    @field_validator("event_type")
    @classmethod
    def _event_type(cls, v: str) -> str:
        if v not in ALLOWED_EVENT_TYPES:
            raise ValueError("invalid event_type")
        return v

    @field_validator("event_data")
    @classmethod
    def _event_data(cls, v: dict) -> dict:
        if len(json.dumps(v, separators=(",", ":"))) > MAX_EVENT_DATA_CHARS:
            raise ValueError("event_data too large")
        return v


def to_redcap_record(event: Event) -> dict:
    """Map one Event onto the REDCap field names.

    record_id must be present in the payload but its value is ignored: the
    import uses forceAutoNumber=true, so REDCap assigns the real record id.
    """
    return {
        "record_id": "0",
        "session_id": event.session_id,
        "server_timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
        "module": event.module,
        "event_type": event.event_type,
        "event_data": json.dumps(event.event_data, separators=(",", ":")),
    }


class RedcapImportError(Exception):
    pass


async def import_record(client: httpx.AsyncClient, record: dict) -> None:
    """Import one record into REDCap; raise RedcapImportError on anything
    other than a confirmed single-record import."""
    resp = await client.post(
        REDCAP_API_URL,
        data={
            "token": REDCAP_API_TOKEN,
            "content": "record",
            "action": "import",
            "format": "json",
            "type": "flat",
            "overwriteBehavior": "normal",
            "forceAutoNumber": "true",
            "returnContent": "count",
            "returnFormat": "json",
            "data": json.dumps([record]),
        },
    )
    if resp.status_code == 200:
        try:
            if json.loads(resp.text).get("count") == 1:
                return
        except (ValueError, AttributeError):
            pass
    # Log server-side only; the browser gets a generic 502.
    logger.error("REDCap import failed: HTTP %s %s", resp.status_code, resp.text[:2000])
    raise RedcapImportError()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not REDCAP_API_TOKEN:
        logger.warning("REDCAP_API_TOKEN is not set -- /collect will return 503")
    if not ALLOWED_ORIGIN:
        logger.warning("ALLOWED_ORIGIN is not set -- browser requests will be blocked by CORS")
    app.state.http = httpx.AsyncClient(timeout=10.0)
    yield
    await app.state.http.aclose()


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

if ALLOWED_ORIGIN:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in ALLOWED_ORIGIN.split(",") if o.strip()],
        allow_methods=["POST"],
        allow_headers=["Content-Type"],
        max_age=86400,
    )


@app.post("/collect")
async def collect(request: Request):
    raw = await request.body()
    if len(raw) > MAX_BODY_BYTES:
        return JSONResponse({"detail": "payload too large"}, status_code=413)
    # Parse the body manually (not as a typed FastAPI JSON parameter) so the
    # site's navigator.sendBeacon fallback -- which posts text/plain -- is
    # accepted alongside fetch's application/json.
    try:
        event = Event(**json.loads(raw))
    except Exception:
        return JSONResponse({"detail": "invalid event"}, status_code=400)
    if not REDCAP_API_TOKEN:
        return JSONResponse({"detail": "proxy not configured"}, status_code=503)
    try:
        await import_record(request.app.state.http, to_redcap_record(event))
    except RedcapImportError:
        return JSONResponse({"detail": "upstream error"}, status_code=502)
    except httpx.HTTPError:
        logger.exception("REDCap request failed")
        return JSONResponse({"detail": "upstream error"}, status_code=502)
    return {"status": "ok"}


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
