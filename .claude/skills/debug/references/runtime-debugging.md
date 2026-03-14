# Runtime Debugging with HTTP Log Server

Hypothesis-driven runtime instrumentation for bugs that static analysis cannot resolve.

## When to Use

- Bug requires runtime data: variable states, execution paths, timing
- Static analysis and code reading are insufficient to identify root cause
- Need to verify which code path actually executes at runtime
- Reproducing the bug produces no useful console/log output

## Debug Server

| Detail | Value |
|--------|-------|
| Script | `debug/scripts/debug-server.js` |
| Start | `node .claude/skills/debug/scripts/debug-server.js [sessionId]` (run in background) |
| Host | `127.0.0.1:6143` |
| Endpoint | `POST /ingest/{sessionId}` |
| Log file | `.claude/tmp/debug-{sessionId}.log` (JSONL format) |
| Stop | Kill the background process after debugging completes |

## Log Schema

Each line in the JSONL log file follows this schema:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique log ID, e.g. `log_{timestamp}_{label}` |
| `timestamp` | number | `Date.now()` / epoch milliseconds |
| `location` | string | `file:line` where instrumented |
| `message` | string | Human-readable description |
| `data` | object | Captured variable states and values |
| `hypothesisId` | string | Which hypothesis this log tests (e.g. `"A"`, `"B"`, `"A,B"`) |

```json
{
  "id": "log_1719432000000_tokenCheck",
  "timestamp": 1719432000000,
  "location": "src/auth.ts:42",
  "message": "Token validation result",
  "data": { "token": "eyJ...", "isValid": false, "reason": "expired" },
  "hypothesisId": "A"
}
```

## Instrumentation Patterns

### JavaScript / TypeScript

Wrap in `// #region agent log` / `// #endregion` markers for easy cleanup.

```js
// #region agent log
fetch('http://127.0.0.1:6143/ingest/SESSION_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: `log_${Date.now()}_labelHere`,
    timestamp: Date.now(),
    location: 'src/auth.ts:42',
    message: 'Token validation result',
    data: { token, isValid, reason },
    hypothesisId: 'A'
  })
}).catch(() => {});
// #endregion
```

`.catch(() => {})` prevents instrumentation from affecting app behavior.

### Python

Wrap in `# region agent log` / `# endregion` markers.

```python
# region agent log
try:
    import urllib.request, json
    urllib.request.urlopen(urllib.request.Request(
        'http://127.0.0.1:6143/ingest/SESSION_ID',
        data=json.dumps({
            'id': f'log_{int(time.time()*1000)}_labelHere',
            'timestamp': int(time.time() * 1000),
            'location': 'src/auth.py:42',
            'message': 'Token validation result',
            'data': {'token': token, 'is_valid': is_valid},
            'hypothesisId': 'A'
        }).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    ))
except Exception:
    pass
# endregion
```

## Hypothesis-Driven Approach

1. **Generate hypotheses** -- formulate 2-4 possible root causes for the bug
2. **Identify evidence** -- for each hypothesis, determine what runtime data would prove or disprove it
3. **Instrument** -- insert log points tagged with `hypothesisId` at relevant code paths
4. **Reproduce** -- ask the user to trigger the bug
5. **Read logs** -- parse `.claude/tmp/debug-{sessionId}.log`
6. **Analyze** -- determine which hypotheses are supported or eliminated by the evidence
7. **Fix** -- apply the fix targeting the confirmed root cause

## Cleanup Procedure

After the fix is verified:

1. Search for all `#region agent log` / `#endregion` blocks (and Python `# region agent log` / `# endregion`) and remove them
2. Stop the debug server background process
3. Delete the log file at `.claude/tmp/debug-{sessionId}.log`
