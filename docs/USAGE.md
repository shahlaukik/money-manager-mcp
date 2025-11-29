# Usage Guide

This guide covers how to use the Money Manager MCP tools with AI assistants.

## Tool Categories

The MCP server provides **18 tools** organized into 7 categories:

| Category       | Tools | Description                               |
| -------------- | ----- | ----------------------------------------- |
| Initialization | 1     | Get app configuration and categories      |
| Transactions   | 4     | Create, read, update, delete transactions |
| Summaries      | 2     | Financial reports and Excel export        |
| Assets         | 4     | Manage bank accounts and assets           |
| Credit Cards   | 3     | Manage credit cards                       |
| Transfers      | 2     | Move money between accounts               |
| Dashboard      | 2     | Charts and analytics                      |

---

## Initialization

### `init_get_data`

Retrieves initial application data including categories, payment types, asset groups, and configuration.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mbid` | string | No | Money book ID |

**Example prompts:**

- "Get my Money Manager configuration"
- "Show me my expense categories"
- "What payment types are available?"

---

## Transactions

### `transaction_list`

Lists transactions within a date range.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | Yes | Start date (YYYY-MM-DD) |
| `endDate` | string | Yes | End date (YYYY-MM-DD) |
| `mbid` | string | Yes | Money book ID |
| `assetId` | string | No | Filter by asset |

**Example prompts:**

- "Show my transactions from November 2025"
- "List all transactions from my checking account this month"
- "What did I spend in the last 7 days?"

### `transaction_create`

Creates a new income or expense transaction.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mbDate` | string | Yes | Transaction date (YYYY-MM-DD) |
| `assetId` | string | Yes | Asset/Account ID |
| `payType` | string | Yes | Payment type name |
| `mcid` | string | Yes | Category ID |
| `mbCategory` | string | Yes | Category name |
| `mbCash` | number | Yes | Amount |
| `inOutCode` | string | Yes | "0" for income, "1" for expense |
| `inOutType` | string | Yes | Transaction type name |
| `mcscid` | string | No | Subcategory ID |
| `subCategory` | string | No | Subcategory name |
| `mbContent` | string | No | Description |
| `mbDetailContent` | string | No | Detailed notes |

**Example prompts:**

- "Record a $50 grocery expense from my checking account"
- "Add $3000 salary income for today"
- "Log a $25 restaurant expense with note 'lunch with team'"

### `transaction_update`

Updates an existing transaction.

**Parameters:** Same as `transaction_create`, plus:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Transaction ID |

**Example prompts:**

- "Change the amount on transaction XYZ to $75"
- "Update the category of my last grocery expense to 'Dining Out'"

### `transaction_delete`

Deletes one or more transactions.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ids` | array | Yes | Transaction IDs to delete |

**Example prompts:**

- "Delete transaction ID abc123"
- "Remove the duplicate transaction from yesterday"

---

## Financial Summaries

### `summary_get_period`

Retrieves financial summary statistics for a date range.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | Yes | Start date (YYYY-MM-DD) |
| `endDate` | string | Yes | End date (YYYY-MM-DD) |

**Example prompts:**

- "What's my spending summary for November?"
- "Show my income vs expenses this month"
- "How much did I spend on each category last month?"

### `summary_export_excel`

Exports transaction data to an Excel file.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | Yes | Start date (YYYY-MM-DD) |
| `endDate` | string | Yes | End date (YYYY-MM-DD) |
| `mbid` | string | Yes | Money book ID |
| `outputPath` | string | Yes | File path (use .xls extension) |
| `assetId` | string | No | Filter by asset |
| `inOutType` | string | No | Filter by type |

**Example prompts:**

- "Export my October transactions to Excel"
- "Download a spreadsheet of all my expenses this year"

---

## Assets

### `asset_list`

Retrieves all assets/accounts with balances.

**Parameters:** None

**Example prompts:**

- "What are my current account balances?"
- "Show me all my assets"
- "List my bank accounts"

### `asset_create`

Creates a new asset/account.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assetGroupId` | string | Yes | Asset group ID |
| `assetGroupName` | string | Yes | Asset group name |
| `assetName` | string | Yes | Asset name |
| `assetMoney` | number | Yes | Initial balance |
| `linkAssetId` | string | No | Linked asset ID |
| `linkAssetName` | string | No | Linked asset name |

**Example prompts:**

- "Create a new savings account with $5000 balance"
- "Add a new investment account"

### `asset_update`

Updates an existing asset.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assetId` | string | Yes | Asset ID |
| `assetGroupId` | string | Yes | Asset group ID |
| `assetGroupName` | string | Yes | Asset group name |
| `assetName` | string | Yes | Asset name |
| `assetMoney` | number | Yes | Current balance |
| `linkAssetId` | string | No | Linked asset ID |
| `linkAssetName` | string | No | Linked asset name |

**Example prompts:**

- "Update my savings account balance to $6500"
- "Rename my checking account to 'Primary Checking'"

### `asset_delete`

Removes an asset.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assetId` | string | Yes | Asset ID |

**Example prompts:**

- "Delete my old savings account"

---

## Credit Cards

### `card_list`

Retrieves all credit cards.

**Parameters:** None

**Example prompts:**

- "Show my credit cards"
- "What's my unpaid credit card balance?"

### `card_create`

Creates a new credit card.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cardName` | string | Yes | Card name |
| `linkAssetId` | string | Yes | Linked payment asset ID |
| `linkAssetName` | string | Yes | Linked payment asset name |
| `notPayMoney` | number | Yes | Unpaid balance (negative) |
| `jungsanDay` | number | No | Balance calculation day (1-31) |
| `paymentDay` | number | No | Payment due day (1-31) |

**Example prompts:**

- "Add a new Visa credit card linked to my checking account"

### `card_update`

Updates a credit card.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assetId` | string | Yes | Card asset ID |
| `cardName` | string | Yes | Card name |
| `linkAssetId` | string | Yes | Linked payment asset ID |
| `linkAssetName` | string | Yes | Linked payment asset name |
| `jungsanDay` | number | No | Balance calculation day |
| `paymentDay` | number | No | Payment due day |

---

## Transfers

### `transfer_create`

Transfers money between assets.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `moveDate` | string | Yes | Transfer date (YYYY-MM-DD) |
| `fromAssetId` | string | Yes | Source asset ID |
| `fromAssetName` | string | Yes | Source asset name |
| `toAssetId` | string | Yes | Destination asset ID |
| `toAssetName` | string | Yes | Destination asset name |
| `moveMoney` | number | Yes | Transfer amount |
| `moneyContent` | string | No | Description |
| `mbDetailContent` | string | No | Detailed notes |

**Example prompts:**

- "Transfer $500 from savings to checking"
- "Move $1000 to my investment account"

### `transfer_update`

Modifies an existing transfer.

**Parameters:** Same as `transfer_create`, plus:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Transfer ID |

**Note:** The server creates a new transfer with a new ID; the old ID will no longer exist.

---

## Dashboard

### `dashboard_get_overview`

Retrieves dashboard overview with trends and breakdown.

**Parameters:** None

**Example prompts:**

- "Show my financial dashboard"
- "What's my net worth trend?"
- "Show my asset and debt breakdown"

### `dashboard_get_asset_chart`

Retrieves historical chart data for a specific asset.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assetId` | string | Yes | Asset ID |

**Example prompts:**

- "Show the balance history for my savings account"
- "How has my checking account balance changed over time?"

---

## Common Workflows

### Monthly Budget Review

```
1. "Show my spending summary for November"
2. "Which category had the highest expenses?"
3. "List my food-related transactions this month"
4. "Export November transactions to Excel"
```

### Recording Daily Expenses

```
1. "Record a $45 grocery expense at Walmart today"
2. "Add a $12 lunch expense from my credit card"
3. "Log a $50 gas expense with note 'weekly fill-up'"
```

### Account Management

```
1. "What are my current account balances?"
2. "Transfer $200 from checking to savings"
3. "Show my savings account balance history"
```

### End of Month Review

```
1. "Show my income vs expenses for this month"
2. "What's my current net worth?"
3. "Export this month's data to Excel for my records"
```

---

## Tips

1. **Use natural language**: The AI will extract the right parameters from your request
2. **Be specific with dates**: "November 2025" is clearer than "last month"
3. **Reference accounts by name**: "my checking account" rather than remembering IDs
4. **Ask for summaries first**: Get an overview before diving into details
5. **Combine operations**: "Show my November expenses and export them to Excel"

---

## Troubleshooting

**"Asset/Category not found"**

- Use `init_get_data` first to see available options
- Check the exact names in Money Manager

**"Invalid date format"**

- Use YYYY-MM-DD format (e.g., "2025-11-15")
- Or use natural language like "today" or "November 15"

**"Transaction not created"**

- Ensure all required fields are provided
- Check that the asset and category exist
- Verify the amount is a positive number

**"Export failed"**

- Use `.xls` extension (not `.xlsx`)
- Ensure the output path is writable
- Check available disk space
