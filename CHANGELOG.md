# Changelog

## 1.2.1

- The Resource dropdown is now grouped into sections (Sales Documents, Purchase Documents, AR Customer Ledger, AP Supplier Ledger, GL Journals & Vouchers, Stock Movements, Master Data, Reports), sorted A-Z within each, so you can find a resource by typing its section. Resource values are unchanged; existing workflows keep working.

## 1.2.0

- New node **SQL Accounting AI**: one tool for AI Agents where the model chooses the resource and operation. It can Describe resources and fields, List and Get records, and (only when Allow Changes is on) create, update and delete. Read-only by default; errors are returned to the model as data. No new dependencies.

## 1.1.4

- Documentation: how to use the node as a read-only tool for the n8n AI Agent (the node already supports tool mode through `usableAsTool`).

## 1.1.3

- Fix: 1.1.2 failed to load on n8n releases that do not export `NodeConnectionTypes` ("Class could not be found"). The node now falls back to the `main` connection type there.

## 1.1.2

- Passes the official n8n community package scanner: themed light/dark icons for the node and credential, `usableAsTool`, `NodeConnectionTypes.Main`, no raw error re-throws, author email.
- The access key field is no longer masked (it is an identifier, not a secret).

## 1.1.1

- Published from GitHub Actions with npm provenance (trusted publishing), as required for n8n verification.
- README: example workflows and authentication notes.

## 1.1.0

New backend contract (`contract/CONTRACT.md` v1): subscription token, SigV4 signing on the server.

### Fixed
- Return All skipped records 50-99 of every page (it advanced the offset by 100; the API page size is 50).
- Return All could loop until its cap when the response was wrapped; it now follows `has_more` and fails loudly at Max Pages.
- Wrong path-parameter types: Asset Group, Asset Item, Asset Disposal and Shipper use AutoKey, Member Point uses DocKey, Item Template uses Code.
- Payment Method no longer offers Create and Update (the API is read/delete only).
- Guided values were all sent as strings; integers, numbers, booleans and dates are now sent in their real types, decimals as text.
- Delete returned a bare string; it now returns a success item.
- Raw JSON body defaulted to `{}`, which crashes the SQL Account backend; it now defaults to a per-document template, and empty bodies are rejected before sending.
- Filter values containing `offset=` were rewritten during paging.
- Errors are mapped from the proxy error code instead of matching text in the message.
- `Limit` was documented but missing.

### Added
- Typed field forms for all master data with required fields, dropdowns and company lookups.
- Line-item editor and templates for documents, with validation before sending.
- Record ID fields labelled Code, DocKey or AutoKey.
- Per-resource filter field lists.
- Proxy URL credential option, mock proxy and a test suite.
