# Realbyte Money Manager API Documentation

## Overview

This document describes the API endpoints used by the Money Manager MCP server to communicate with the Realbyte Money Manager application.

The application uses **ExtJS** framework with **Ext.Ajax.request** for AJAX calls. The base URI for all API endpoints is `/moneyBook`.

---

## API Discovery Methodology

The API endpoints documented here were discovered through reverse engineering the Money Manager web interface:

### Discovery Process

1. **Web Interface Analysis**: Fetched the HTML structure of the Money Manager web interface to understand the application layout and identify JavaScript file references.

2. **JavaScript Analysis**: Downloaded and analyzed the frontend JavaScript files to understand:
   - How API calls are made (using ExtJS's `Ext.Ajax.request`)
   - What endpoints exist and their parameters
   - Expected request/response formats
   - Data models and their structures

3. **Network Traffic Analysis**: Observed actual API calls to verify:
   - Request parameter formats
   - Response data structures
   - Session handling mechanisms

4. **Documentation Synthesis**: Combined findings into this comprehensive API reference.

### Key Files Analyzed

| File | Purpose |
|------|---------|
| `initVar.js` | Configuration variables and base URI |
| `init.js` | Store initialization and data loading |
| `moneybook.js` | Transaction CRUD operations |
| `moneybookLeft.js` | Summary panel and charts |
| `asset.js` | Asset and credit card management |
| `assetDashBoard.js` | Dashboard charts and analytics |
| `assetDetailList.js` | Individual asset details |
| `setting.js` | Backup/restore functionality |
| `layout.js` | Main application layout |

### Techniques Used

- **Pattern Recognition**: Identified `Ext.Ajax.request` calls to discover endpoints
- **Store Configuration**: Analyzed ExtJS data stores to understand response formats
- **Form Submission**: Traced form handling to identify POST parameters
- **Error Handling**: Examined error handlers to understand failure modes

---

## Base URL

```
{MONEY_MANAGER_BASE_URL}/moneyBook
```

Where `MONEY_MANAGER_BASE_URL` is your Money Manager server address (e.g., `http://192.168.1.100:7200`).

---

## Authentication

- Uses session-based authentication via cookies
- Session cookie name: `sessionid`
- Session is maintained across requests automatically

---

## API Endpoints Summary

| # | Endpoint | Method | Category | Description |
|---|----------|--------|----------|-------------|
| 1 | `/getInitData` | GET/POST | Initialization | Get initial application data |
| 2 | `/getDataByPeriod` | GET | Transactions | Get transaction data by date range |
| 3 | `/create` | POST | Transactions | Create a new transaction |
| 4 | `/update` | POST | Transactions | Update an existing transaction |
| 5 | `/delete` | POST | Transactions | Delete transactions |
| 6 | `/getSummaryDataByPeriod` | GET | Summary | Get financial summary by period |
| 7 | `/getExcelFile` | POST | Export | Export data to Excel file |
| 8 | `/getAssetData` | GET | Assets | Get asset list data (tree structure) |
| 9 | `/getCardData` | GET | Assets | Get credit card data (tree structure) |
| 10 | `/assetAdd` | POST | Assets | Add a new asset |
| 11 | `/assetModify` | POST | Assets | Modify an existing asset |
| 12 | `/removeAsset` | POST | Assets | Remove an asset |
| 13 | `/addAssetCard` | POST | Credit Cards | Add a new credit card |
| 14 | `/modifyCard` | POST | Credit Cards | Modify a credit card |
| 15 | `/moveAsset` | POST | Transfers | Transfer money between assets |
| 16 | `/modifyMoveAsset` | POST | Transfers | Modify an asset transfer |
| 17 | `/getDashBoardData` | GET | Dashboard | Get dashboard chart data |
| 18 | `/getEachAssetChartData` | POST | Dashboard | Get individual asset chart data |
| 19 | `/uploadSqlFile` | POST | Backup/Restore | Upload SQLite backup file |
| 20 | `/money.sqlite` | GET | Backup/Restore | Download SQLite database file |

---

## Detailed API Documentation

### 1. Get Initial Data

**Endpoint:** `GET/POST /moneyBook/getInitData`

**Description:** Retrieves initial application data including categories, payment types, asset groups, and multi-book configuration.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mbid` | string | No | Money book ID |

**Response Format:** JSON
```json
{
  "initData": {
    "mbid": "string",
    "initStartDate": "YYYY-MM-DD",
    "initEndDate": "YYYY-MM-DD"
  },
  "category_0": [
    {
      "mcid": "string",
      "mcname": "string",
      "mcsc": [
        {
          "mcscid": "string",
          "mcscname": "string"
        }
      ]
    }
  ],
  "category_1": [...],
  "payType": [
    {
      "ptid": "string",
      "ptname": "string"
    }
  ],
  "multiBooks": [
    {
      "mbid": "string",
      "mbname": "string"
    }
  ],
  "assetGroups": [
    {
      "assetGroupId": "string",
      "assetType": "string",
      "assetName": "string"
    }
  ],
  "assetNames": [
    {
      "assetId": "string",
      "assetType": "string",
      "assetName": "string"
    }
  ],
  "inOutText": [...]
}
```

---

### 2. Get Data By Period

**Endpoint:** `GET /moneyBook/getDataByPeriod`

**Description:** Retrieves transaction records for a specified date range.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | Yes | Start date (YYYY-MM-DD) |
| `endDate` | string | Yes | End date (YYYY-MM-DD) |
| `mbid` | string | Yes | Money book ID |
| `assetId` | string | No | Filter by specific asset ID |

**Response Format:** XML
```xml
<data>
  <results>count</results>
  <row>
    <id>string</id>
    <mbDate>YYYY-MM-DD</mbDate>
    <assetId>string</assetId>
    <toAssetId>string</toAssetId>
    <targetAssetId>string</targetAssetId>
    <payType>string</payType>
    <mcid>string</mcid>
    <mbCategory>string</mbCategory>
    <mcscid>string</mcscid>
    <subCategory>string</subCategory>
    <mbContent>string</mbContent>
    <mbCash>float</mbCash>
    <inOutCode>string</inOutCode>
    <inOutType>string</inOutType>
    <mbDetailContent>string</mbDetailContent>
  </row>
</data>
```

**inOutCode Values:**
- `0` = Income
- `1` = Expense
- `2` = Unknown
- `3` = Transfer Out
- `4` = Transfer In
- `7` = Card Payment Out
- `8` = Card Payment In

---

### 3. Create Transaction

**Endpoint:** `POST /moneyBook/create`

**Description:** Creates a new transaction record.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mbDate` | date | Yes | Transaction date (YYYY-MM-DD) |
| `assetId` | string | Yes | Asset/Account ID |
| `toAssetId` | string | No | Target asset ID (for transfers) |
| `targetAssetId` | string | No | Target asset ID |
| `payType` | string | Yes | Payment type name |
| `mcid` | string | Yes | Category ID |
| `mbCategory` | string | Yes | Category name |
| `mcscid` | string | No | Subcategory ID |
| `subCategory` | string | No | Subcategory name |
| `mbContent` | string | No | Transaction description |
| `mbCash` | float | Yes | Amount |
| `inOutCode` | string | Yes | Transaction type code |
| `inOutType` | string | Yes | Transaction type name |
| `mbDetailContent` | string | No | Detailed notes |

**Response Format:** JSON (success/failure indicator)

---

### 4. Update Transaction

**Endpoint:** `POST /moneyBook/update`

**Description:** Updates an existing transaction record.

**Request Parameters:** Same as Create Transaction, plus:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Transaction ID |

**Response Format:** JSON (success/failure indicator)

---

### 5. Delete Transactions

**Endpoint:** `POST /moneyBook/delete`

**Description:** Deletes one or more transactions.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ids` | string | Yes | Colon-separated list of transaction IDs (e.g., ":id1:id2:id3") |

**Response Format:** JSON (success/failure indicator)

---

### 6. Get Summary Data By Period

**Endpoint:** `GET /moneyBook/getSummaryDataByPeriod`

**Description:** Retrieves financial summary statistics for a date range.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | Yes | Start date (YYYY-MM-DD) |
| `endDate` | string | Yes | End date (YYYY-MM-DD) |

**Response Format:** JSON
```json
{
  "summary": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "income": "number",
    "outcome": "number",
    "cash": "number",
    "card": "number",
    "etcExpense": "number",
    "etcExpenseOpt": "boolean",
    "sum": "number"
  },
  "income": [
    {
      "mcname": "string",
      "mcSum": "number"
    }
  ],
  "outcome": [
    {
      "mcname": "string",
      "mcSum": "number",
      "budget": "number"
    }
  ]
}
```

---

### 7. Export to Excel

**Endpoint:** `POST /moneyBook/getExcelFile`

**Description:** Exports transaction data to Excel file format.

**Request Parameters:** (Form submission)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | Yes | Start date (YYYY-MM-DD) |
| `endDate` | string | Yes | End date (YYYY-MM-DD) |
| `mbid` | string | Yes | Money book ID |
| `assetId` | string | No | Filter by asset ID |
| `inOutType` | string | No | Filter by income/expense type |

**Response Format:** Excel file download (HTML-based .xls format)

---

### 8. Get Asset Data

**Endpoint:** `GET /moneyBook/getAssetData`

**Description:** Retrieves asset list in tree structure format.

**Response Format:** JSON (Tree structure for ExtJS TreeGrid)
```json
[
  {
    "assetGroupId": "string",
    "assetType": "group",
    "assetName": "string",
    "assetMoney": "number",
    "color": "string",
    "children": [
      {
        "assetId": "string",
        "assetType": "item",
        "assetName": "string",
        "assetMoney": "number",
        "color": "string",
        "linkAssetId": "string"
      }
    ]
  }
]
```

---

### 9. Get Card Data

**Endpoint:** `GET /moneyBook/getCardData`

**Description:** Retrieves credit card list in tree structure format.

**Response Format:** JSON (Tree structure for ExtJS TreeGrid)
```json
[
  {
    "assetGroupId": "string",
    "assetType": "group",
    "assetName": "string",
    "assetMoney": "number",
    "notPayMoney": "number",
    "color": "string",
    "children": [
      {
        "assetId": "string",
        "assetType": "item",
        "assetName": "string",
        "assetMoney": "number",
        "notPayMoney": "number",
        "color": "string",
        "linkAssetId": "string",
        "jungsanDay": "number",
        "paymentDay": "number"
      }
    ]
  }
]
```

---

### 10. Add Asset

**Endpoint:** `POST /moneyBook/assetAdd`

**Description:** Creates a new asset/account.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assetGroupId` | string | Yes | Asset group ID |
| `assetGroupName` | string | Yes | Asset group name |
| `assetName` | string | Yes | Asset name |
| `assetMoney` | number | Yes | Initial balance |
| `linkAssetId` | string | No | Linked asset ID (for certain asset types) |
| `linkAssetName` | string | No | Linked asset name |

**Response Format:** JSON (success/failure indicator)

---

### 11. Modify Asset

**Endpoint:** `POST /moneyBook/assetModify`

**Description:** Modifies an existing asset/account.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assetId` | string | Yes | Asset ID |
| `assetGroupId` | string | Yes | Asset group ID |
| `assetGroupName` | string | Yes | Asset group name |
| `assetName` | string | Yes | Asset name |
| `assetMoney` | number | Yes | Current balance |
| `linkAssetId` | string | No | Linked asset ID |
| `linkAssetName` | string | No | Linked asset name |

**Response Format:** JSON (success/failure indicator)

---

### 12. Remove Asset

**Endpoint:** `POST /moneyBook/removeAsset`

**Description:** Removes an asset/account.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assetId` | string | Yes | Asset ID to remove |

**Response Format:** JSON (success/failure indicator)

---

### 13. Add Credit Card

**Endpoint:** `POST /moneyBook/addAssetCard`

**Description:** Creates a new credit card.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cardName` | string | Yes | Credit card name |
| `linkAssetId` | string | Yes | Linked payment asset ID |
| `linkAssetName` | string | Yes | Linked payment asset name |
| `notPayMoney` | number | Yes | Unpaid balance (negative value) |
| `jungsanDay` | number | No | Balance calculation day (1-31) |
| `paymentDay` | number | No | Payment due day (1-31) |

**Response Format:** JSON (success/failure indicator)

---

### 14. Modify Credit Card

**Endpoint:** `POST /moneyBook/modifyCard`

**Description:** Modifies an existing credit card.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assetId` | string | Yes | Card asset ID |
| `cardName` | string | Yes | Credit card name |
| `linkAssetId` | string | Yes | Linked payment asset ID |
| `linkAssetName` | string | Yes | Linked payment asset name |
| `jungsanDay` | number | No | Balance calculation day (1-31) |
| `paymentDay` | number | No | Payment due day (1-31) |

**Response Format:** JSON (success/failure indicator)

---

### 15. Transfer Between Assets

**Endpoint:** `POST /moneyBook/moveAsset`

**Description:** Transfers money between two assets.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `moveDate` | date | Yes | Transfer date (YYYY-MM-DD) |
| `fromAssetId` | string | Yes | Source asset ID |
| `fromAssetName` | string | Yes | Source asset name |
| `toAssetId` | string | Yes | Destination asset ID |
| `toAssetName` | string | Yes | Destination asset name |
| `moveMoney` | number | Yes | Transfer amount |
| `moneyContent` | string | No | Transfer description |
| `mbDetailContent` | string | No | Detailed notes |

**Response Format:** JSON (success/failure indicator)

---

### 16. Modify Asset Transfer

**Endpoint:** `POST /moneyBook/modifyMoveAsset`

**Description:** Modifies an existing asset transfer.

**Request Parameters:** Same as Transfer Between Assets, plus:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Transfer transaction ID |

**Response Format:** JSON (success/failure indicator)

---

### 17. Get Dashboard Data

**Endpoint:** `GET /moneyBook/getDashBoardData`

**Description:** Retrieves dashboard chart data including asset trends and portfolio breakdown.

**Response Format:** JSON
```json
{
  "assetSummary": {
    "totalAsset": "number",
    "asset": "number",
    "debt": "number"
  },
  "assetLine": [
    {
      "month": "string",
      "total": "number",
      "asset": "number",
      "debt": "number"
    }
  ],
  "assetRatio": [
    {
      "assetName": "string",
      "assetMoney": "number"
    }
  ],
  "debtRatio": [
    {
      "assetName": "string",
      "assetMoney": "number"
    }
  ]
}
```

---

### 18. Get Individual Asset Chart Data

**Endpoint:** `POST /moneyBook/getEachAssetChartData`

**Description:** Retrieves historical chart data for a specific asset.

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assetId` | string | Yes | Asset ID |

**Response Format:** JSON
```json
{
  "assetChartData": [
    {
      "month": "string",
      "assetMoney": "number"
    }
  ]
}
```

---

### 19. Upload SQLite Backup File

**Endpoint:** `POST /moneyBook/uploadSqlFile`

**Description:** Uploads a SQLite database file for data restoration.

**Request Parameters:** (Multipart form data)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | SQLite database file (money.sqlite) |

**Response Format:** JSON (success/failure indicator)

---

### 20. Download SQLite Database

**Endpoint:** `GET /moneyBook/money.sqlite`

**Description:** Downloads the SQLite database file for backup purposes.

**Response Format:** SQLite database file

---

## Data Models

### Transaction Record (MoneyBookElem)
```javascript
{
  id: string,           // Transaction ID
  mbDate: date,         // Transaction date (YYYY-MM-DD)
  assetId: string,      // Asset/Account ID
  toAssetId: string,    // Target asset ID (for transfers)
  targetAssetId: string,// Alternative target asset ID
  payType: string,      // Payment type name
  mcid: string,         // Category ID
  mbCategory: string,   // Category name
  mcscid: string,       // Subcategory ID
  subCategory: string,  // Subcategory name
  mbContent: string,    // Transaction description
  mbCash: float,        // Amount
  inOutCode: string,    // Transaction type code (0-8)
  inOutType: string,    // Transaction type name
  mbDetailContent: string // Detailed notes
}
```

### Asset Record
```javascript
{
  assetId: string,      // Asset ID
  assetGroupId: string, // Asset group ID
  assetType: string,    // "group" or "item"
  assetName: string,    // Asset name
  assetMoney: number,   // Current balance
  linkAssetId: string,  // Linked asset ID (for credit cards)
  color: string         // Display color
}
```

### Credit Card Record
```javascript
{
  assetId: string,      // Card asset ID
  assetName: string,    // Card name
  assetMoney: number,   // Previous month balance
  notPayMoney: number,  // Unpaid balance
  linkAssetId: string,  // Linked payment asset ID
  jungsanDay: number,   // Balance calculation day
  paymentDay: number    // Payment due day
}
```

---

## Error Handling

The API uses standard HTTP status codes:

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Session expired |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error |

---

## Notes

1. **Date Format:** All dates use the format `YYYY-MM-DD`
2. **Number Format:** Currency values are typically formatted with two decimal places
3. **Session Management:** Session cookies are automatically managed by the HTTP client
4. **Response Parsing:** Some endpoints return XML (transaction list), while others return JSON