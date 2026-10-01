# Node <-> Proxy Contract (v1)

Single source of coupling between two repos:

- **node repo** `n8n-nodes-sqlaccounting` (n8n community node)
- **backend repo** `sqlaccount-proxy` (Supabase edge function + portal)

This file and `operations.json` are copied verbatim into both repos. Each repo has a test that
fails if its copy differs from the expected hash/content. Change the contract only by bumping
`contract_version` and updating both repos.

## 1. Endpoint

```
POST {PROXY_BASE_URL}/functions/v1/sqlaccount
Authorization: Bearer sqlnode_<token>
Content-Type: application/json
```

`PROXY_BASE_URL` is a constant in the node (single place). The node never sends HTTP method or path.
The proxy derives them from `operations.json`.

## 2. Request body

```json
{
  "contract_version": 1,
  "sql": {
    "access_key": "xxxx.sql.my/APIUSER",
    "secret_key": "....",
    "region": "ap-southeast-5",
    "service": "sqlaccount"
  },
  "operation": "account.list",
  "path_param": null,
  "query": { "offset": 0, "code": "300*" },
  "body": null
}
```

| Field | Type | Rules |
|-------|------|-------|
| `contract_version` | integer | must equal 1 else `unsupported_version` |
| `sql.access_key` / `sql.secret_key` | string | required. Never persisted, never logged, held in memory for one request. |
| `sql.region` / `sql.service` | string | optional, defaults `ap-southeast-5` / `sqlaccount` |
| `operation` | string | `<resource>.<op>` where resource is in `operations.json` and op is in that resource's ops |
| `path_param` | string \| integer \| null | required iff op is get/update/delete on a resource whose `path_param` is not null. `DOCKEY`/`AUTOKEY` must be a positive integer (number or numeric string). `CODE` must be non-empty. |
| `query` | object of string/number/boolean | list/report ops. `offset` (integer >= 0) always allowed. Unknown keys are forwarded (API filters are per entity). Values are URL-encoded by the proxy. `*` and `~` are preserved. |
| `body` | object \| null | required and non-empty for create/update. Real JSON types (numbers stay numbers, booleans stay booleans). Empty object `{}` on create/update is rejected with `validation_failed` (upstream crashes on empty body). |

## 3. Success response (HTTP 200)

```json
{
  "ok": true,
  "data": [ { "code": "300-000" } ],
  "pagination": { "offset": 0, "limit": 50, "count": 1, "has_more": false },
  "meta": { "request_id": "uuid", "upstream_status": 200, "contract_version": 1 }
}
```

- `data`: array for list/report, object for get/create/update, `{ "success": true }` for delete.
- The proxy unwraps the upstream `{ pagination, data }` and `{ data }` envelopes.
- `pagination` only for list/report. `has_more` = `count === limit` (page size 50). The node loops while `has_more`, adding `limit` to `offset`.

## 4. Error response

Always JSON, always this shape:

```json
{
  "ok": false,
  "error": {
    "code": "validation_failed",
    "message": "Human readable message",
    "field": "body.taxtype",
    "hint": "taxtype must be an integer",
    "upstream_status": null
  },
  "meta": { "request_id": "uuid", "contract_version": 1 }
}
```

| HTTP | `error.code` | Meaning |
|------|--------------|---------|
| 400 | `unsupported_version` | wrong `contract_version` |
| 400 | `unknown_operation` | operation not in registry |
| 401 | `invalid_token` | missing/unknown/revoked Bearer token |
| 402 | `subscription_inactive` | no active/trialing subscription |
| 422 | `validation_failed` | bad path_param, empty body, malformed input. `field` and `hint` set when known. |
| 429 | `rate_limited` | abuse guard (default 120 req/min/token). `Retry-After` header set. |
| 502 | `sql_auth_failed` | upstream returned 401/403 (bad SQL access/secret key) |
| 502 | `upstream_error` | upstream 4xx/5xx or network failure. `upstream_status` and original message included. |
| 500 | `internal_error` | bug. Never leaks secrets. |

The node must read the JSON body on non-2xx (use `ignoreHttpStatusErrors: true`) and branch on
`error.code`, never on HTTP status text or substring matching.

## 5. Security requirements (proxy)

1. Only ever call `https://api.sql.my` (fixed host). Path comes from registry, never from the client.
2. Never log request bodies, response bodies, headers, or any `sql.*` value. Log only
   `{ key_id, operation, status, duration_ms, request_id }`.
3. Token stored as SHA-256 hash only. Format `sqlnode_` + 43 chars base64url (32 random bytes).
4. `sql.secret_key` exists only in a local variable during signing.
5. CORS closed (server-to-server only).

## 6. Pagination

Page size is fixed at 50 (`page_size` in `operations.json`). Node must not assume any other size.

## 7. Versioning

`contract_version` is an integer. Additive optional fields do not bump it. Removing/renaming
fields, changing codes or semantics does.
