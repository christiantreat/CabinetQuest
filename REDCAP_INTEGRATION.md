# REDCap Integration — CodeSBU / CabinetQuest

Collect analytics/event data from the training site and store it in a Stony
Brook REDCap project, **without embedding the site in REDCap**. The website is
the native frontend. Events are sent to a small server-side proxy we control
(`redcap_proxy.py`), and the proxy imports them into REDCap via the REDCap API.
The browser never sees the REDCap API token.

Data flow:

```
training site (browser)  ->  our proxy (server)  ->  REDCap API
        fetch POST /collect        POST https://redcap.stonybrookmedicine.edu/api/
```

## Hard rules (do NOT violate)

- **NEVER** put the REDCap API token in client-side code, HTML, or any file
  committed to the repo. It lives only in an environment variable / secrets
  manager on the server.
- **NEVER** have the browser call the REDCap API directly. The browser only ever
  talks to our `/collect` proxy endpoint.
- **NEVER** collect direct identifiers (name, email, MRN, NetID) unless the IRB
  protocol explicitly requires them. Default to an anonymous per-session UUID.
- All traffic is HTTPS only. CORS on the proxy is locked to our site's origin.
- Do not collect real participant data until the REDCap project is in
  **Production** mode AND IRB approval is in place. Build/test against
  Development mode only.

## What is implemented in this repo

| File | Role |
|---|---|
| `redcap_proxy.py` | FastAPI proxy: `POST /collect` (validate → map → REDCap import), `GET /healthz` |
| `requirements.txt` | Proxy dependencies (`fastapi`, `httpx`, `uvicorn`) |
| `.env.example` | Template for the proxy's environment variables |
| `redcap_data_dictionary.csv` | Importable REDCap data dictionary defining the six fields below |
| `index.html` | Frontend logging module (`redcapLog(...)`) + event hooks |

### Frontend configuration

In `index.html`, set one constant at deploy time (search for
`REDCAP_COLLECT_URL`):

```javascript
const REDCAP_COLLECT_URL = 'https://<our-proxy-host>/collect';
```

Leave it empty (`''`) to disable all REDCap logging — local development and
standalone use then behave exactly as before. Logging is fire-and-forget:
events are queued, sent in order with up to 3 retries, flushed via
`navigator.sendBeacon` on page close, and every call is wrapped in try/catch so
a logging failure can never block or break the learner's UI.

### Session ID

Anonymous per-session ID, never a direct identifier:

- **Embedded in Qualtrics** (`?sid=...` present): the Qualtrics `sid` is reused
  so REDCap platform analytics join to the corresponding survey record by study
  session key only.
- **Standalone**: `crypto.randomUUID()`, persisted in `sessionStorage` for the
  tab session.

### Event catalog (what the site sends)

One REDCap record per event (~10 records per session). `module` is `app`,
`tutorial`, `session`, or a scenario id (`s4` arterial line, `s2` central line,
`s3` chest tube).

| `event_type` | When | Key `event_data` fields |
|---|---|---|
| `session_start` | App init | `phase`, `embedded`, `app_version`, `screen_w/h` |
| `tutorial_start` | Tutorial begins | `phase` |
| `tutorial_complete` | Tutorial finished or skipped | `completed` (1/0), `steps_done`, `steps_total`, `time` |
| `scenario_start` | Mission attempt begins (incl. retries) | `scenario`, `order`, `mode`, `retry` |
| `mission_complete` | Mission submitted | full `cq_mN_*` summary: time, score, stars, essential/optional/extra item counts, accuracy, drawer openings, distinct drawers, cart opens |
| `session_complete` | All missions done (or directed phase done) | session aggregates + `log`: the full timestamped action stream (drawer opening sequences, item selections/deselections, navigation pathway) with its own decoding legend |
| `client_error` | Uncaught JS error (capped at 10/session) | `message`, `source`, `line` |

This covers the protocol §6.2 "System-Generated Platform Analytics": per-mission
completion time, drawer openings, correct/incorrect/missed selections,
accuracy, navigation pathway with timestamps, and error-correction latency (all
derivable from the timestamped `log` in `session_complete`). `client_error`
events support feasibility criterion F3 (technical-error rate).

> If/when the metrics stabilize, promote frequently-queried keys out of
> `event_data` into their own typed fields — REDCap cannot query inside the blob.

## REDCap endpoint and conventions

- **API URL:** `https://redcap.stonybrookmedicine.edu/api/`
- All requests are **HTTP POST** with `Content-Type: application/x-www-form-urlencoded`.
- Every request includes a `token` parameter (32-char hex, unique to user+project).
- We use JSON responses (`format=json`, `returnFormat=json`).
- There is **one** endpoint for everything; `content` and `action` select the
  operation.

## Data model (REDCap data dictionary)

Project uses **record auto-numbering**, one record per event. Import
`redcap_data_dictionary.csv` via Project Setup → Data Dictionary.

| REDCap field name | Type | Notes |
|---|---|---|
| `record_id` | text | auto-assigned by REDCap |
| `session_id` | text | anonymous per-session UUID |
| `server_timestamp` | text | ISO-8601, set server-side, UTC |
| `module` | text | which sim/page, e.g. `s4`, `tutorial` |
| `event_type` | text | e.g. `scenario_start`, `mission_complete` |
| `event_data` | notes/paragraph | JSON blob of event-specific fields |

## The proxy: importing one event

`redcap_proxy.py` accepts JSON at `POST /collect`, validates it against an
allow-list (`Event` Pydantic model — extend this if the site starts sending new
fields), maps it via `to_redcap_record()`, and imports it with this
form-encoded POST to the REDCap API:

| Parameter | Value |
|---|---|
| `token` | from env var, never hardcoded |
| `content` | `record` |
| `action` | `import` |
| `format` | `json` |
| `type` | `flat` |
| `overwriteBehavior` | `normal` |
| `forceAutoNumber` | `true` |
| `returnContent` | `count` |
| `returnFormat` | `json` |
| `data` | JSON-encoded array of one record obj |

On success REDCap returns `{"count": 1}`. Anything else is treated as a
failure, logged server-side, and surfaced to the browser as a generic 502 —
REDCap's response is never leaked to the client.

Note: `/collect` parses the raw request body as JSON regardless of declared
content type, so the frontend's `sendBeacon` flush (which posts `text/plain`
and therefore needs no CORS preflight during page unload) works too.

### Other REDCap API calls you may need

- **Export records:** `content=record`, `format=json`, `type=flat` (prefer the
  REDCap UI for one-off pulls).
- **Export the data dictionary:** `content=metadata`, `format=json` (verify
  field names programmatically before importing).
- **Generate next record name:** `content=generateNextRecordName` (only if you
  manage IDs yourself instead of `forceAutoNumber`).

## Configuration (environment variables)

```
REDCAP_API_URL=https://redcap.stonybrookmedicine.edu/api/
REDCAP_API_TOKEN=<32-char token from the project's API page — secrets manager, not repo>
ALLOWED_ORIGIN=https://<our-training-site-host>
```

`ALLOWED_ORIGIN` may be a comma-separated list (e.g. production site plus a
localhost origin during development).

## Running and testing

```bash
pip install -r requirements.txt
export REDCAP_API_TOKEN=<Development-mode test project token>
export ALLOWED_ORIGIN=http://localhost:8080
uvicorn redcap_proxy:app --port 8000
```

Smoke test:

```bash
curl -s http://localhost:8000/healthz
# {"status":"ok"}

curl -s -X POST http://localhost:8000/collect \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"test-0001","module":"s4","event_type":"scenario_start","event_data":{"scenario":"Arterial Line Placement","order":1,"mode":"training"}}'
# {"status":"ok"}  -> exactly one new record in the Development project
```

- Use REDCap's built-in **API Playground** (project API menu) to confirm exact
  parameter behavior and to generate a known-good sample request to diff
  against.
- Verify imported records appear in the project's Record Status Dashboard and
  that `event_data` round-trips as valid JSON.
- Confirm CORS: a request from any origin other than `ALLOWED_ORIGIN` must be
  rejected by the browser.

## Acceptance criteria

1. No token or credential appears anywhere in client code or the repo.
2. Browser → proxy → REDCap; browser never contacts REDCap directly.
3. A test event POSTed to `/collect` produces exactly one new record in the
   REDCap **Development** project with all six fields populated.
4. `event_data` round-trips as valid JSON.
5. CORS rejects requests from origins other than `ALLOWED_ORIGIN`.
6. Proxy returns `{"status":"ok"}` on success and a non-leaky 502 on REDCap
   error.
7. `/healthz` returns ok for uptime checks.

## Compliance gates (must clear before go-live)

- [ ] IRB approval covers this data collection.
- [ ] REDCap project moved from Development to **Production**.
- [ ] Proxy hosted on SBU-approved infrastructure if data is identifiable.
- [ ] Data Management Plan / retention reviewed if required by funder.
