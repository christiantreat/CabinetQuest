# Cabinet Quest — Qualtrics Embed Integration

This document describes how to embed Cabinet Quest inside a Qualtrics survey as
an iframe and capture its results **entirely within Qualtrics** — small summary
metrics as Embedded Data fields and the full timestamped event log as a string
in a hidden text-entry question.

There is **no backend, no API key, no email service, and no external endpoint**.
All data flows from the iframe to the parent Qualtrics page via `postMessage`.

---

## 1. URL parameter contract

The app reads two query parameters on load:

| Param          | Required | Meaning                                                                 |
|----------------|----------|-------------------------------------------------------------------------|
| `sid`          | yes      | Unique session key minted by Qualtrics. Stamped onto every payload and onto local records. |
| `parentOrigin` | optional | Explicit target origin for `postMessage`. If omitted, messages are posted with target `*`. Recommended for production. |

If `sid` is absent **and** the app is not running inside an iframe, it behaves
exactly as the standalone/testing build: nothing is transmitted, localStorage
and the Export button work as before.

**Example embed URL** (what the iframe `src` should be):

```
https://christiantreat.github.io/CabinetQuest/?sid=${e://Field/sid}&parentOrigin=https://YOURORG.qualtrics.com
```

In Qualtrics, `${e://Field/sid}` is piped text that resolves to the value of the
`sid` Embedded Data field you set in the Survey Flow (see §4).

---

## 2. Message protocol

The app calls a single emitter, `emitResults(type, summary, log)`, which posts:

```js
{
  source: 'codesbu',          // constant tag to identify our messages
  type: 'mission_complete' | 'session_complete',
  sid: '<the sid from the URL>',
  appVersion: '1.0.0',
  sessionStart: 1781001215934, // wall-clock ms timestamp of session start
  summary: { /* FLAT object of cq_ scalar fields, see §3 */ },
  log: null | '<compact JSON string>'  // present ONLY on session_complete
}
```

- **`mission_complete`** fires after each scenario is submitted (training *and*
  assessment mode), so partial sessions are still captured. `summary` contains
  the `cq_mN_*` fields for that one mission. `log` is `null`.
- **`session_complete`** fires once, when all scenarios are finished
  (training "Training Complete" screen, or assessment "Assessment Complete").
  `summary` contains **all** `cq_mN_*` fields merged plus the session-level
  aggregate fields. `log` is the full compact event-log string.

Messages are only posted when the app is actually inside an iframe
(`window.parent !== window`). Target origin is `parentOrigin` if provided, else `*`.

### Event-log format (the `log` string)

A compact, self-describing JSON string. Whitespace-free; repeated enums use
integer codes; timestamps are integer milliseconds since session start.

```json
{
  "v": "1.0.0",
  "sid": "TEST123",
  "s": 1781001215934,
  "lg": { "areas": {"airway":0,"resus":1,...}, "drawers": {"resus-d3":0,...} },
  "codes": {"1":"scenario_start","2":"cart_open","3":"drawer_open",
            "4":"item_select","5":"item_deselect","6":"collect",
            "7":"submit","8":"session_complete"},
  "e": [ [120,2,1], [1530,3,0], [2100,4,5], [2600,5,5], ... ]
}
```

Each entry in `e` is `[msDelta, code, ...args]`:

| Code | Event           | Args                                  |
|------|-----------------|---------------------------------------|
| 1    | scenario_start  | mission number (1-based)              |
| 2    | cart_open       | area code (index into `lg.areas`)     |
| 3    | drawer_open     | drawer code (index into `lg.drawers`) |
| 4    | item_select     | item index (index into the app's items array) |
| 5    | item_deselect   | item index                            |
| 6    | collect         | count of items collected              |
| 7    | submit          | mission number, score                 |
| 8    | session_complete| —                                     |

The log warns to the console if it exceeds ~15000 chars (the hidden text-entry
field ceiling is ~20000). In practice a full 3-scenario session is well under 1 KB.

---

## 3. Embedded Data field names emitted (the COMPLETE list)

All field names are prefixed `cq_`. Mission numbers map to scenario order:

- **m1 = Arterial Line Placement**
- **m2 = Central Line Placement**
- **m3 = Chest Tube Insertion**

### Per-mission fields (emitted for each mission N ∈ {1,2,3})

| Field                  | Type        | Meaning |
|------------------------|-------------|---------|
| `cq_mN_scenario`       | string      | Scenario display name |
| `cq_mN_time`           | int (sec)   | Completion time for the mission |
| `cq_mN_score`          | int 0–100   | Scored result |
| `cq_mN_stars`          | int 0–5     | Star rating |
| `cq_mN_ess_found`      | int         | Essential items collected |
| `cq_mN_ess_total`      | int         | Essential items required |
| `cq_mN_opt_found`      | int         | Optional items collected |
| `cq_mN_opt_total`      | int         | Optional items available |
| `cq_mN_extra`          | int         | Incorrect (not-needed) items collected |
| `cq_mN_missed_ess`     | int         | Essential items missed |
| `cq_mN_correct`        | int         | Correct selections (essential + optional found) |
| `cq_mN_incorrect`      | int         | Incorrect selections (= extras) |
| `cq_mN_accuracy`       | float 0–1   | correct / (correct + incorrect), 2 dp |
| `cq_mN_drawers_opened` | int         | Total drawer-open actions this mission |
| `cq_mN_distinct_drawers`| int        | Distinct drawers opened this mission |
| `cq_mN_cart_opens`     | int         | Cart approach/open actions this mission |
| `cq_mN_complete`       | int 0/1     | 1 if all essential items were collected |

That's **17 fields × 3 missions = 51 mission fields.**

### Session-level fields (emitted on `session_complete` only)

| Field             | Type       | Meaning |
|-------------------|------------|---------|
| `cq_sid`          | string     | The session key |
| `cq_app_version`  | string     | App version (`1.0.0`) |
| `cq_mode`         | string     | `training` or `assessment` |
| `cq_missions_done`| int        | Number of missions completed |
| `cq_session_time` | int (sec)  | Wall-clock session duration |
| `cq_total_score`  | int        | Sum of mission scores |
| `cq_avg_score`    | int        | Average mission score |
| `cq_avg_accuracy` | float 0–1  | Average mission accuracy, 2 dp |

Plus one hidden text-entry question for the event log (suggested field name
`cq_event_log`).

> **A note on metrics that are NOT emitted.** The original app captured
> completion time, essential/optional/extra/missed counts, score and stars.
> **Drawers opened** and **cart opens** were *not* tracked before this
> integration — they are now instrumented and emitted as shown above.
> **Error-correction latency** is *not* emitted as a summary scalar: the app
> does not define a single unambiguous "wrong selection → correction" interval.
> However, the raw `item_select` (code 4) and `item_deselect` (code 5) events in
> the event log carry per-action millisecond timestamps and item indices, so
> error-correction behavior can be reconstructed offline from the log.

---

## 4. Qualtrics setup steps

### Step 1 — Declare Embedded Data fields in the Survey Flow (do this FIRST)

Survey → **Survey Flow** → **Add a New Element → Embedded Data**, placed at the
**top** of the flow (above the question block). Add each field name below. Set
`sid` to a value (e.g. `${rand://int/100000:999999}` or a panel ID); leave the
rest empty — they are written by JavaScript.

```
sid

cq_m1_scenario  cq_m1_time  cq_m1_score  cq_m1_stars
cq_m1_ess_found cq_m1_ess_total cq_m1_opt_found cq_m1_opt_total
cq_m1_extra cq_m1_missed_ess cq_m1_correct cq_m1_incorrect cq_m1_accuracy
cq_m1_drawers_opened cq_m1_distinct_drawers cq_m1_cart_opens cq_m1_complete

cq_m2_scenario  cq_m2_time  cq_m2_score  cq_m2_stars
cq_m2_ess_found cq_m2_ess_total cq_m2_opt_found cq_m2_opt_total
cq_m2_extra cq_m2_missed_ess cq_m2_correct cq_m2_incorrect cq_m2_accuracy
cq_m2_drawers_opened cq_m2_distinct_drawers cq_m2_cart_opens cq_m2_complete

cq_m3_scenario  cq_m3_time  cq_m3_score  cq_m3_stars
cq_m3_ess_found cq_m3_ess_total cq_m3_opt_found cq_m3_opt_total
cq_m3_extra cq_m3_missed_ess cq_m3_correct cq_m3_incorrect cq_m3_accuracy
cq_m3_drawers_opened cq_m3_distinct_drawers cq_m3_cart_opens cq_m3_complete

cq_app_version cq_mode cq_missions_done cq_session_time
cq_total_score cq_avg_score cq_avg_accuracy
```

(Embedded Data must be declared in the flow *before* JavaScript can write to it.)

### Step 2 — Add a hidden text-entry question for the event log

In your question block, add a **Text Entry** question (single line is fine).

1. Note its **QID** (e.g. `QID42`) — visible under the question's options or in
   the survey's question IDs. You'll reference it in the listener.
2. Hide it from participants: open the question's **JavaScript**? No — instead
   add to the question's **CSS class** or simply hide via the listener. The
   simplest approach: give the question itself a style of `display:none` by
   adding this to the question's HTML/JS, or hide its container in the listener
   (the snippet below does `.hide()` on it).
3. Optionally also map its answer to an Embedded Data field `cq_event_log` via
   Survey Flow if you prefer a clean column name; otherwise the log lives in the
   text question's response column.

### Step 3 — Add the iframe question pointing at GitHub Pages

Add a **Text/Graphic** (descriptive) question. Click the question text, choose
the **HTML View** (`<>`), and paste an iframe whose `src` carries the `sid`:

```html
<iframe
  src="https://christiantreat.github.io/CabinetQuest/?sid=${e://Field/sid}&parentOrigin=https://YOURORG.qualtrics.com"
  style="width:100%;height:80vh;border:0;"
  allow="fullscreen"
  title="Cabinet Quest">
</iframe>
```

Replace `YOURORG.qualtrics.com` with your survey's actual origin (the host shown
in the browser address bar while editing the survey).

### Step 4 — Add the listener JavaScript

Put the snippet in §5 in the **JavaScript** of the **iframe question** (gear icon
on the question → *Add JavaScript*), inside `addOnload`. It listens for messages,
validates origin and `source`, writes each summary key to its Embedded Data
field, and on `session_complete` stores the log into the hidden text question.

---

## 5. Ready-to-paste Qualtrics question JavaScript listener

> Replace `LOG_QID` with the QID of your hidden text-entry question (e.g. `'QID42'`).
> The origin check is locked to the GitHub Pages origin.

```javascript
Qualtrics.SurveyEngine.addOnload(function () {
    var GITHUB_ORIGIN = 'https://christiantreat.github.io'; // origin only, no path
    var LOG_QID = 'QID42'; // <-- set to your hidden text-entry question's QID

    var self = this;

    // Hide the log text-entry question from participants.
    try {
        var logQ = document.getElementById(LOG_QID);
        if (logQ) { logQ.style.display = 'none'; }
    } catch (e) {}

    function handler(event) {
        // 1) Validate the sender's origin.
        if (event.origin !== GITHUB_ORIGIN) { return; }

        var data = event.data;
        if (!data || data.source !== 'codesbu') { return; }

        // 2) Write every summary key straight to its matching Embedded Data field.
        //    Summary keys are already the cq_ field names.
        if (data.summary && typeof data.summary === 'object') {
            for (var key in data.summary) {
                if (Object.prototype.hasOwnProperty.call(data.summary, key)) {
                    Qualtrics.SurveyEngine.setEmbeddedData(key, data.summary[key]);
                }
            }
        }

        // Always stamp the session key (in case it wasn't pre-seeded).
        if (data.sid) {
            Qualtrics.SurveyEngine.setEmbeddedData('sid', data.sid);
        }

        // 3) On session completion, persist the full event log.
        if (data.type === 'session_complete' && data.log) {
            // Store into the hidden text-entry question's answer...
            try {
                var input = document.querySelector('#' + LOG_QID + ' textarea, #' + LOG_QID + ' input[type="text"]');
                if (input) {
                    input.value = data.log;
                    if (window.jQuery) { jQuery(input).trigger('change'); }
                }
            } catch (e) {}
            // ...and also as Embedded Data for convenience.
            Qualtrics.SurveyEngine.setEmbeddedData('cq_event_log', data.log);

            // Optional: auto-advance once the session is done.
            // self.clickNextButton();
        }
    }

    window.addEventListener('message', handler, false);
    this.__cqHandler = handler;
});

Qualtrics.SurveyEngine.addOnUnload(function () {
    if (this.__cqHandler) {
        window.removeEventListener('message', this.__cqHandler, false);
    }
});
```

---

## 6. Testing locally

You don't need Qualtrics to verify the integration.

### A) Standalone (no transmission)

Open `index.html` directly (or via any static server). With no `sid` and no
iframe parent, the app runs exactly as before: gameplay, in-app feedback,
localStorage (`cq3`/`cq3a`), and the **Export** button all work, and nothing is
posted.

### B) Simulated embedded context

Create a tiny parent page next to `index.html` and open **that** page:

```html
<!-- test-parent.html -->
<!doctype html><meta charset="utf-8"><title>CQ embed test</title>
<iframe src="index.html?sid=TEST123&parentOrigin=http://localhost:8000"
        style="width:100%;height:90vh;border:0"></iframe>
<script>
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.source !== 'codesbu') return;
    console.log('[CQ]', e.data.type, e.data);
    if (e.data.type === 'session_complete') {
      console.log('[CQ] log length:', e.data.log.length);
      console.log('[CQ] log:', e.data.log);
    }
  });
</script>
```

Serve the folder (`python3 -m http.server 8000`) and open
`http://localhost:8000/test-parent.html`. Play through a scenario: you should
see a `mission_complete` message logged after each submit, and a
`session_complete` message (with a compact `log` string) after finishing all
scenarios. Confirm `sid` is `TEST123` and the target origin matched
`parentOrigin`.

### C) Quick console check inside the iframe

In the iframe's devtools console you can confirm the parsed params:

```js
new URLSearchParams(location.search).get('sid'); // "TEST123"
```
