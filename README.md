# n8n-nodes-sqlaccounting

An [n8n](https://n8n.io) community node for the [SQL Accounting](https://www.sql.com.my) REST API (Malaysia).

It connects n8n to SQL Accounting through the SQL Accounting n8n Node service: a subscription proxy that signs your requests (AWS SigV4), enforces fair use and forwards them to `api.sql.my`.

[![npm version](https://img.shields.io/npm/v/n8n-nodes-sqlaccounting)](https://www.npmjs.com/package/n8n-nodes-sqlaccounting)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Features

- **81 resources**: master data, sales, purchase, AR, AP, GL, stock and reports.
- **Typed fields.** Required inputs are shown as real fields. Integers, booleans, dates and decimals are sent in the type the API expects. Enumerations (account type, journal, term type) are dropdowns.
- **Dropdowns that load from your company.** Fields such as Currency, Terms, Tax, Account, Customer, Supplier, Stock Item and Location list your own records.
- **Line-item editor** for sales, purchase, stock and journal documents. A raw JSON mode (pre-filled with a template) is available for every document.
- **Validation before sending.** Missing required fields, bad dates, missing lines, unbalanced journals and non-numeric IDs are reported all at once, before any request is made.
- **Return All** with correct 50-record paging, a Limit option and a Max Pages safety cap.
- **Filters** with a per-resource field list. Wildcards (`*term*`) and ranges (`2025-01-01~2025-01-31`) work on SQL Account 5.2025.1061.890 and later.
- **Zero runtime dependencies.**

---

## Prerequisites

1. SQL Accounting with the REST API enabled.
2. A SQL Accounting API **access key** and **secret key** (SQL Account API settings).
3. A **subscription token** (`sqlnode_...`) from the SQL Accounting n8n Node portal.

---

## Installation

In n8n: **Settings → Community Nodes → Install** → `n8n-nodes-sqlaccounting`.

Self-hosted via CLI: `npm install n8n-nodes-sqlaccounting`.

---

## Credentials

Create a **SQL Accounting API** credential:

| Field | Description | Default |
|-------|-------------|---------|
| Platform Token | Your `sqlnode_...` subscription token | none |
| SQL Access Key | From SQL Account API settings, format `<key_id>.sql.my/APIUSER` | none |
| SQL Secret Key | From SQL Account API settings | none |
| Service | SigV4 service name | `sqlaccount` |
| Region | SigV4 region | `ap-southeast-5` |
| Proxy URL | Advanced. Only for self-hosting or local testing | service URL |

**Test credential** calls `profile.get` and checks the token, the subscription and your SQL keys at once.

### How your SQL keys are handled

The node cannot sign requests itself, so your SQL access and secret keys are sent with each request over HTTPS to the proxy. The proxy holds them in memory only long enough to sign that single request. They are never stored and never logged, and request and response bodies are not logged either. The proxy sees the accounting data in transit, so use a SQL Account API user with the minimum rights you need.

---

## Using the node

### Records (master data)

1. Pick a **Resource** (for example Currency) and an **Operation**.
2. **Create** shows the required fields as inputs. Everything else is under **Additional Fields**. Use **Extra Fields (JSON)** for anything not listed, such as the `sdsbranch` sub-array on a customer.
3. **Update** shows **Fields to Update**. Only what you set is sent.
4. **Get / Update / Delete** need a record identifier. The field is labelled by what the resource uses:
   - **Code**: the record code, for example `USD`.
   - **DocKey / AutoKey**: SQL Account's internal numeric ID, for example for Tax, Shipper, Tariff, Batch, Stock Item and Asset records. This is not the code. Use **List** with a filter (for example `code=ST-6%`) and read `autokey` or `dockey` from the result.

### Documents (invoices, orders, journals, payments)

1. Fill the required header fields (customer or supplier code, date).
2. Add **Line Items**.
3. Or switch on **Use Raw JSON Instead**. The body is pre-filled with a template for that document type.

Example, a journal entry: set Document Date, add two lines (`Account`, `Debit`/`Credit`). Totals must balance, otherwise the node tells you before sending.

### Lists, filters and paging

- **Return All** fetches every page (50 records each), up to **Max Pages**.
- Without Return All, **Limit** (1 to 50) and **Offset** apply.
- **Filters** lists the fields of the resource. **Custom Filters** takes any API field name.

### Deleting

Delete returns `{ "success": true, "resource": "...", "deleted": <id> }`.

---

## Example workflows

Import with **Workflow menu → Import from URL/File** (or paste into the canvas), then pick your **SQL Accounting API** credential on the node.

**1. List every currency**

```json
{
  "nodes": [
    { "parameters": {}, "name": "Manual Trigger", "type": "n8n-nodes-base.manualTrigger", "typeVersion": 1, "position": [0, 0] },
    {
      "parameters": { "resource": "currency", "operation": "currency.list", "returnAll": true },
      "name": "List currencies",
      "type": "n8n-nodes-sqlaccounting.sqlAccounting",
      "typeVersion": 1,
      "position": [220, 0],
      "credentials": { "sqlAccountingApi": { "id": "", "name": "SQL Accounting API" } }
    }
  ],
  "connections": { "Manual Trigger": { "main": [[{ "node": "List currencies", "type": "main", "index": 0 }]] } }
}
```

**2. Create a sales quotation with one line**

```json
{
  "nodes": [
    { "parameters": {}, "name": "Manual Trigger", "type": "n8n-nodes-base.manualTrigger", "typeVersion": 1, "position": [0, 0] },
    {
      "parameters": {
        "resource": "salesquotation",
        "operation": "salesquotation.create",
        "salesquotation__code": "CUS-01",
        "salesquotation__docdate": "={{ $today.toISODate() }}",
        "salesquotation__lines": { "line": [{ "itemcode": "STK-001", "qty": "1", "unitprice": "100.00" }] }
      },
      "name": "Create quotation",
      "type": "n8n-nodes-sqlaccounting.sqlAccounting",
      "typeVersion": 1,
      "position": [220, 0],
      "credentials": { "sqlAccountingApi": { "id": "", "name": "SQL Accounting API" } }
    }
  ],
  "connections": { "Manual Trigger": { "main": [[{ "node": "Create quotation", "type": "main", "index": 0 }]] } }
}
```

The customer `CUS-01` and the stock item `STK-001` must already exist in SQL Account.

---

## Using the node with an AI Agent

The **SQL Accounting** node works as an agent tool. Add it to the agent's tools, choose the **Resource** and **Operation** yourself (they cannot be filled by the model), and let the model fill only the inputs you pick with n8n's "Let the model define this parameter" option. Use **List** or **Get** for read-only access. Add one tool per task you want the agent to do.

---

## Troubleshooting

| Error code | Meaning | Fix |
|------------|---------|-----|
| `invalid_token` | Token wrong or revoked | Check Platform Token in the credential, or generate a new one in the portal |
| `subscription_inactive` | No active subscription | Renew in the portal |
| `rate_limited` | Over 120 requests per minute per token | Wait and retry, or slow the workflow |
| `sql_auth_failed` | SQL Account rejected the keys | Check SQL Access Key and Secret Key |
| `validation_failed` | Input rejected (field and hint are shown) | Fix the named field |
| `upstream_error` | SQL Account returned an error | Read the message and the upstream status |
| `unsupported_version` | Node and proxy versions differ | Update the node |
| `internal_error` | Proxy bug | Report it with the request id |

Common SQL Account messages:

- `not a valid floating point value`: a code was used where an AutoKey or DocKey is required.
- Empty bodies crash the SQL Account backend, so the node never sends them.

---

## Development

```bash
npm install --legacy-peer-deps
npm test               # unit and integration tests
npm run test:cov       # with coverage
npm run lint
npm run build
```

Local testing without the cloud service:

```bash
npm run mock-proxy     # contract-compliant mock on http://localhost:8787, token sqlnode_test
```

Then create a credential with Platform Token `sqlnode_test`, any SQL keys, and Proxy URL `http://localhost:8787`.

The contract between the node and the proxy is in [contract/CONTRACT.md](contract/CONTRACT.md). The resource and operation list is generated from [contract/operations.json](contract/operations.json) (`npm run gen:registry`); tests fail if the two drift.

---

## License

MIT
