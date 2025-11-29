# MCP Server Architecture for Money Manager

## Overview

This document describes the architecture of the Money Manager MCP (Model Context Protocol) server, which enables AI assistants to interact with Realbyte Money Manager personal finance data through a standardized protocol.

---

## 1. Technology Stack

### Programming Language: **TypeScript**

**Rationale:**
- First-class MCP SDK support with `@modelcontextprotocol/sdk`
- Strong typing for API request/response schemas
- Better IDE support and developer experience
- Native JSON handling for API responses
- Async/await support for HTTP operations

### Core Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server implementation |
| `axios` | HTTP client for API calls |
| `zod` | Runtime schema validation |
| `dotenv` | Environment variable management |
| `xml2js` | XML response parsing (for transaction list) |
| `tough-cookie` | Cookie/session management |
| `axios-cookiejar-support` | Cookie jar integration with axios |

### Development Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | TypeScript compiler |
| `@types/node` | Node.js type definitions |
| `tsx` | TypeScript execution |

---

## 2. Project Structure

```
money-manager-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── client/
│   │   └── http-client.ts    # HTTP client with session management
│   ├── config/
│   │   └── index.ts          # Configuration loader
│   ├── errors/
│   │   └── index.ts          # Custom error classes
│   ├── schemas/
│   │   └── index.ts          # Zod validation schemas
│   ├── tools/
│   │   └── handlers.ts       # Tool handler implementations
│   └── types/
│       └── index.ts          # TypeScript type definitions
├── docs/
│   ├── technical/
│   │   ├── API_DOCUMENTATION.md
│   │   └── ARCHITECTURE.md
│   ├── SETUP.md
│   ├── USAGE.md
│   └── CONTRIBUTING.md
├── dist/                     # Compiled JavaScript output
├── .env.example              # Example environment variables
├── .gitignore
├── LICENSE
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. MCP Tools

### Tool Naming Convention

Tools follow the pattern: `{category}_{action}` using snake_case.

| Category Prefix | Description |
|-----------------|-------------|
| `init_` | Initialization operations |
| `transaction_` | Transaction CRUD operations |
| `summary_` | Summary and reporting |
| `asset_` | Asset management |
| `card_` | Credit card management |
| `transfer_` | Money transfers |
| `dashboard_` | Dashboard/chart data |

### Implemented Tools

| # | Tool Name | API Endpoint | Method |
|---|-----------|--------------|--------|
| 1 | `init_get_data` | `/getInitData` | GET |
| 2 | `transaction_list` | `/getDataByPeriod` | GET |
| 3 | `transaction_create` | `/create` | POST |
| 4 | `transaction_update` | `/update` | POST |
| 5 | `transaction_delete` | `/delete` | POST |
| 6 | `summary_get_period` | `/getSummaryDataByPeriod` | GET |
| 7 | `summary_export_excel` | `/getExcelFile` | POST |
| 8 | `asset_list` | `/getAssetData` | GET |
| 9 | `asset_create` | `/assetAdd` | POST |
| 10 | `asset_update` | `/assetModify` | POST |
| 11 | `asset_delete` | `/removeAsset` | POST |
| 12 | `card_list` | `/getCardData` | GET |
| 13 | `card_create` | `/addAssetCard` | POST |
| 14 | `card_update` | `/modifyCard` | POST |
| 15 | `transfer_create` | `/moveAsset` | POST |
| 16 | `transfer_update` | `/modifyMoveAsset` | POST |
| 17 | `dashboard_get_overview` | `/getDashBoardData` | GET |
| 18 | `dashboard_get_asset_chart` | `/getEachAssetChartData` | POST |

---

## 4. Key Implementation Details

### 4.1 HTTP Client

The HTTP client (`src/client/http-client.ts`) handles:

- **Session Management**: Maintains cookies across requests using `tough-cookie`
- **Cookie Persistence**: Optionally saves/loads session cookies to `.session-cookies.json`
- **Retry Logic**: Configurable retry attempts for failed requests
- **Timeout Handling**: Configurable request timeouts
- **Response Parsing**: Handles both JSON and XML responses

### 4.2 JavaScript Literal Parsing

A key challenge was parsing the `getInitData` response, which returns JavaScript object literals rather than valid JSON. The server implements a custom parser that:

1. Safely handles JavaScript object literal syntax
2. Converts to valid JSON format
3. Extracts categories, payment types, and asset information

```typescript
// Example: JavaScript literal response
{
  initData: { mbid: "default" },  // Note: unquoted keys
  category_0: [...]
}

// Converted to proper JSON for processing
{
  "initData": { "mbid": "default" },
  "category_0": [...]
}
```

### 4.3 XML Response Handling

Transaction list responses come in XML format:

```xml
<data>
  <results>2</results>
  <row>
    <id>txn_001</id>
    <mbDate>2025-01-15</mbDate>
    ...
  </row>
</data>
```

The server uses `xml2js` to parse and transform this to structured JSON.

### 4.4 Excel Export

The Money Manager API returns HTML-based `.xls` files (not true XLSX format). The server:

1. Downloads the Excel file content
2. Saves with `.xls` extension for compatibility
3. Warns if user requests `.xlsx` extension

---

## 5. Error Handling

### Error Categories

```typescript
enum ErrorCategory {
  NETWORK = "NETWORK",           // Connection failures, timeouts
  API = "API",                   // API returned error response
  VALIDATION = "VALIDATION",     // Input validation failures
  SESSION = "SESSION",           // Authentication/session issues
  FILE = "FILE",                 // File system errors
  INTERNAL = "INTERNAL"          // Unexpected errors
}
```

### Error Response Structure

```typescript
interface McpError {
  code: string                   // Error code (e.g., "NETWORK_TIMEOUT")
  category: ErrorCategory        // Error category
  message: string                // Human-readable message
  details?: Record<string, any>  // Additional context
  retryable: boolean             // Whether retry might succeed
}
```

---

## 6. Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONEY_MANAGER_BASE_URL` | Yes | - | Server URL |
| `MONEY_MANAGER_TIMEOUT` | No | 30000 | Request timeout (ms) |
| `MONEY_MANAGER_RETRY_COUNT` | No | 3 | Retry attempts |
| `MONEY_MANAGER_LOG_LEVEL` | No | info | Log level |
| `MONEY_MANAGER_SESSION_PERSIST` | No | true | Persist cookies |

### Configuration Loading

1. Load `.env` file if present
2. Read environment variables
3. Apply defaults for missing values
4. Validate with Zod schema

---

## 7. Security Considerations

### Implemented Security Measures

1. **No Credential Storage**: API uses session cookies only
2. **Cookie Persistence**: Session cookies stored locally (excluded from git)
3. **Input Validation**: All tool inputs validated with Zod schemas

### Files Excluded from Repository

- `.env` - Environment configuration
- `.session-cookies.json` - Session data
- `*.xls`, `*.xlsx` - Exported financial data
- `*.sqlite` - Database backups

---

## 8. Data Flow

```
┌─────────────────┐
│   AI Assistant  │
│ (Claude/Copilot)│
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────┐
│  MCP Server     │
│ (money-manager) │
└────────┬────────┘
         │ Tool Invocation
         ▼
┌─────────────────┐
│  Tool Handler   │
│   (handlers.ts) │
└────────┬────────┘
         │ Validated Input
         ▼
┌─────────────────┐
│  HTTP Client    │
│ (http-client.ts)│
└────────┬────────┘
         │ HTTP + Cookies
         ▼
┌─────────────────┐
│ Money Manager   │
│    Server       │
└─────────────────┘
```

---

## 9. Type System

### Key Type Definitions

```typescript
// Transaction
interface Transaction {
  id: string;
  mbDate: string;
  assetId: string;
  payType: string;
  mcid: string;
  mbCategory: string;
  mbCash: number;
  inOutCode: string;
  inOutType: string;
  // ... optional fields
}

// Asset
interface Asset {
  assetId: string;
  assetGroupId: string;
  assetType: 'group' | 'item';
  assetName: string;
  assetMoney: number;
  children?: Asset[];
}

// Category
interface Category {
  mcid: string;
  mcname: string;
  mcsc?: SubCategory[];
}
```

---

## 10. Testing

### Manual Testing

The server can be tested by:

1. Running the built server with proper configuration
2. Using an MCP-compatible client (Claude Desktop, VS Code)
3. Invoking tools and verifying responses

### Debug Mode

Set `MONEY_MANAGER_LOG_LEVEL=debug` for verbose logging:

```bash
MONEY_MANAGER_LOG_LEVEL=debug node dist/index.js
```

---

## 11. Future Enhancements

Potential improvements for future versions:

1. **MCP Resources**: Expose assets and categories as browsable resources
2. **MCP Prompts**: Pre-built prompts for common financial queries
3. **Caching**: Cache initialization data for faster subsequent calls
4. **Batch Operations**: Support bulk transaction creation
5. **Unit Tests**: Comprehensive test suite with mocked responses
