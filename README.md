# n8n-nodes-sqlaccounting

An [n8n](https://n8n.io) community node for the [SQL Accounting](https://www.sql.com.my) REST API (Malaysia).

Connects SQL Accounting to any automation via the SQL Accounting n8n Node platform — a credit-based service that handles SigV4 signing, rate limiting, and usage tracking.

[![npm version](https://img.shields.io/npm/v/n8n-nodes-sqlaccounting)](https://www.npmjs.com/package/n8n-nodes-sqlaccounting)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Features

- **81 endpoints** — Sales, Purchase, AR, AP, GL, Stock, Manufacturing, and Reports
- **Zero runtime dependencies** — uses only Node.js built-ins (required for n8n Cloud)
- **Auto-pagination** — Return All toggle loops through pages automatically
- **Guided fields** for master data, raw JSON body editor for transactional documents
- **Credit-based billing** — buy credits at the portal, spend per API call

---

## Prerequisites

1. A running SQL Accounting installation with the REST API enabled
2. A SQL Accounting API access key and secret key (from SQL Account → Tools → API Settings)
3. A platform API key from the SQL Accounting n8n Node portal (`sqlnode_...`)

---

## Installation

### In n8n (recommended)

```
Settings → Community Nodes → Install → n8n-nodes-sqlaccounting
```

### Self-hosted via CLI

```bash
npm install n8n-nodes-sqlaccounting
```

---

## Credentials

Configure a **SQL Accounting API** credential with these five fields:

| Field | Description | Default |
|-------|-------------|---------|
| Platform API Key | Your `sqlnode_...` key from the portal | — |
| SQL Access Key | From SQL Account API settings | — |
| SQL Secret Key | From SQL Account API settings (encrypted by n8n) | — |
| Service | SigV4 service name | `sqlaccount` |
| Region | SigV4 region | `ap-southeast-5` |

Use the **Test credential** button to verify all five values are correct. This sends a `GET /profile` request (costs 1 credit).

---

## Credit Costs

| Operation type | Credits per call |
|----------------|-----------------|
| List / Get / Report | 1 |
| Create | 3 |
| Update (auto GET + PUT) | 4 total |
| Delete | 5 |

Return All loops through pages — each page costs 1 credit.

---

## Operations

### Master Data (guided fields for Create/Update)

`account` `agent` `area` `assetdisposal` `assetgroup` `assetitem` `batch`
`companycategory` `location` `memberpoint` `pmmethod` `pricetag` `project`
`shipper` `stockcategory` `stockgroup` `tariff` `tax` `terms` `whtax`

### Transactional — Sales

`salesinvoice` `salesorder` `salesquotation` `salescreditnote` `salesdebitnote`
`salescancellednote` `cashsales` `deliveryorder` `extradeliveryorder`

### Transactional — Purchase

`purchaseinvoice` `purchaseorder` `purchaserequest` `purchasereturned`
`purchasedebitnote` `purchasecancellednote` `cashpurchase` `goodsreceived`
`extragoodsreceived`

### Transactional — Accounts Receivable

`customer` `customerinvoice` `customercreditnote` `customerdebitnote`
`customerpayment` `customerdeposit` `customerrefund` `customercontra`

### Transactional — Accounts Payable

`supplier` `supplierinvoice` `suppliercreditnote` `supplierdebitnote`
`supplierpayment` `supplierdeposit` `supplierrefund` `suppliercontra`

### Transactional — GL / Stock / Manufacturing

`journalentry` `paymentvoucher` `receiptvoucher` `bankadjustment` `stockitem`
`stockadjustment` `stockissue` `stockreceived` `stocktransfer` `assembly`
`disassembly` `joborder` `itemtemplate` `currency`

### Reports (read-only)

`profile` `version` `stockaging` `stockanalysis` `stockbalanceinquiry`
`stockbatchexpiry` `stockcard` `stockcardqty` `stockmonthendbalance`
`stockphysicalworksheet` `stockreorderadvice` `stockserialnumberconflict`
`stockserialnumberoutstanding`

---

## JSON Body Example — Sales Invoice

Use this as a starting point for the **Request Body (JSON)** field:

```json
{
  "docno": "IV-00001",
  "docdate": "2026-01-15",
  "code": "CUSTOMER001",
  "description": "Monthly consulting services",
  "currencycode": "MYR",
  "currencyrate": 1,
  "docamt": 1060.00,
  "sdsdocdetail": [
    {
      "itemcode": "SVC001",
      "description": "Consulting service",
      "qty": 1,
      "uom": "UNIT",
      "unitprice": 1000.00,
      "disc": 0,
      "tax": "SR6",
      "taxamt": 60.00,
      "localamt": 1000.00
    }
  ]
}
```

---

## Error Reference

| Error | Cause | Fix |
|-------|-------|-----|
| Authentication failed | Invalid platform API key | Check the Platform API Key in your credential |
| Insufficient credits | Balance is zero | Top up at the portal |
| 4xx from SQL Accounting | Bad request data | Check your JSON body or Record ID |
| 5xx from SQL Accounting | SQL Accounting server error | No credit charged — retry later |

---

## License

[MIT](LICENSE)
