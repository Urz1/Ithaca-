# Research API (MCP-ready)

Thin authenticated JSON endpoints that external assistants can wrap as MCP tools.

## Auth

Same session cookie or bearer auth as other Ithaca APIs (`requireApiAuth`).

## Tools

### `get_stance`

`POST /api/research/stance`

```json
{ "paperId": "W123456789" }
```

Returns support / contradict / extend counts and sample snippets from `CitationCache`.

### `find_conflict_path`

`POST /api/research/conflict-path`

```json
{
  "sourceId": "W1",
  "targetId": "W2",
  "graphId": "optional-saved-snapshot-id"
}
```

Or pass inline `nodes` + `edges`. Returns conflict-biased semantic paths.

## MCP wrapping

Map these routes to MCP tools named `get_stance` and `find_conflict_path`. No MCP SDK is required inside Ithaca for v1.
