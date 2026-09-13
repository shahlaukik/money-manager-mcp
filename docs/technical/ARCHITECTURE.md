# MCP Server Architecture for Money Manager

## Overview

This document describes the architecture of the Money Manager MCP (Model Context Protocol) server, which enables AI assistants to interact with Realbyte Money Manager personal finance data through a standardized protocol.

---

## 1. Technology Stack

### Programming Language: **TypeScript**

**Rationale:**

- Built on [FastMCP](https://github.com/punkpeye/fastmcp), an opinionated MCP server framework on top of the official SDK
- Strong typing for API request/response schemas
- Better IDE support and developer experience
- Native JSON handling for API responses
- Async/await support for HTTP operations

### Core Dependencies

| Package                   | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| `fastmcp`                 | MCP server framework (transport, dispatch, schema) |
| `axios`                   | HTTP client for API calls                          |
| `zod`                     | Input schema validation (also drives tool schemas) |
| `dotenv`                  | Environment variable management                    |
| `xml2js`                  | XML response parsing (for transaction list)        |
| `tough-cookie`            | Cookie/session management                          |
| `axios-cookiejar-support` | Cookie jar integration with axios                  |

### Development Dependencies

| Package       | Purpose                                            |
| ------------- | -------------------------------------------------- |
| `typescript`  | TypeScript compiler                                |
| `@types/node` | Node.js type definitions                           |
| `tsx`         | TypeScript execution (dev mode)                    |
| `eslint`      | Linter (with `typescript-eslint` type-aware rules) |
| `prettier`    | Code formatter                                     |

---

## 2. Project Structure

```text
money-manager-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── client/
│   │   ├── http-client.ts    # HTTP client with session management
│   │   └── identifiers.ts    # character classifiers for JS-literal parsing
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
│   └── USAGE.md
├── dist/                     # Compiled JavaScript output
├── .agents/skills/           # Repo-local agent skills (live end-to-end test protocol)
├── .env.example              # Example environment variables
├── .gitignore
├── AGENTS.md                 # Guidance for AI coding agents
├── CONTRIBUTING.md
├── eslint.config.mjs
├── LICENSE
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. MCP Tools

### Tool Naming Convention

Tools follow the pattern: `{category}_{action}` using snake_case.

| Category Prefix | Description                 |
| --------------- | --------------------------- |
| `init_`         | Initialization operations   |
| `transaction_`  | Transaction CRUD operations |
| `summary_`      | Summary and reporting       |
| `asset_`        | Asset management            |
| `card_`         | Credit card management      |
| `transfer_`     | Money transfers             |
| `dashboard_`    | Dashboard/chart data        |

### Implemented Tools

| #   | Tool Name                   | API Endpoint              | Method |
| --- | --------------------------- | ------------------------- | ------ |
| 1   | `init_get_data`             | `/getInitData`            | GET    |
| 2   | `transaction_list`          | `/getDataByPeriod`        | GET    |
| 3   | `transaction_create`        | `/create`                 | POST   |
| 4   | `transaction_update`        | `/update`                 | POST   |
| 5   | `transaction_delete`        | `/delete`                 | POST   |
| 6   | `summary_get_period`        | `/getSummaryDataByPeriod` | GET    |
| 7   | `summary_export_excel`      | `/getExcelFile`           | POST   |
| 8   | `asset_list`                | `/getAssetData`           | GET    |
| 9   | `asset_create`              | `/assetAdd`               | POST   |
| 10  | `asset_update`              | `/assetModify`            | POST   |
| 11  | `asset_delete`              | `/removeAsset`            | POST   |
| 12  | `card_list`                 | `/getCardData`            | GET    |
| 13  | `card_create`               | `/addAssetCard`           | POST   |
| 14  | `card_update`               | `/modifyCard`             | POST   |
| 15  | `transfer_create`           | `/moveAsset`              | POST   |
| 16  | `transfer_update`           | `/modifyMoveAsset`        | POST   |
| 17  | `dashboard_get_overview`    | `/getDashBoardData`       | GET    |
| 18  | `dashboard_get_asset_chart` | `/getEachAssetChartData`  | POST   |

### Tool Registration

Each tool is defined **once** in `src/tools/handlers.ts` as an entry in the `TOOLS` array, binding together its name, description, Zod input schema, and handler. FastMCP uses the Zod schema to:

1. Auto-generate the JSON Schema advertised to clients via `tools/list`
2. Validate inputs before the handler runs
3. Dispatch `tools/call` to the right handler

`src/index.ts` is a thin bootstrap: it creates the `FastMCP` server, binds the HTTP client to each handler via closure, wraps each handler's domain-object result as JSON text content, and starts the stdio transport. There is no hand-maintained JSON Schema list and no double validation.

The server also sends an `instructions` block in the MCP initialize handshake. Because end users install via `npx money-manager-mcp@latest` and never see this repository's docs, those instructions carry the critical usage contract: call `init_get_data` first (IDs are not guessable), create tools do not return new IDs, `transfer_update` does not update in place, there is no `card_delete`, and `transaction_list` can hang on empty date ranges.

---

## 4. Key Implementation Details

### 4.1 HTTP Client

The HTTP client (`src/client/http-client.ts`) handles:

- **Session Management**: Maintains cookies across requests using `tough-cookie`
- **Cookie Persistence**: Optionally saves/loads session cookies to `.session-cookies.json` (written with owner-only permissions; unchanged state is never rewritten)
- **Retry Logic**: Configurable, exponential-backoff retry for failed **read** requests only — a timed-out write may already have been applied upstream, so POSTs run single-shot to avoid duplicating a financial write
- **Timeout Handling**: Configurable request timeouts
- **Response Size Cap**: Responses over 25 MiB are rejected (legitimate responses are far smaller)
- **Response Parsing**: Handles JavaScript object literals and XML responses

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
<dataset>
  <results>2</results>
  <row>
    <id>txn_001</id>
    <mbDate>2025-01-15</mbDate>
    ...
  </row>
</dataset>
```

The server uses `xml2js` to parse and transform this to structured JSON.

### 4.4 Excel Export

The Money Manager API returns HTML-based `.xls` files (not true XLSX format). The server:

1. Downloads the Excel file content
2. Saves with `.xls` extension for compatibility
3. Warns if user requests `.xlsx` extension

---

## 5. Error Handling

### Error Classes

| Class          | Meaning                                | Retryable        |
| -------------- | -------------------------------------- | ---------------- |
| `NetworkError` | Connection failures, timeouts          | Yes (by default) |
| `APIError`     | Server returned an error HTTP status   | On 5xx           |
| `SessionError` | Authentication/session issues          | Never            |
| `FileError`    | File system errors (exports)           | Never            |
| `McpError`     | Base class; internal/unexpected errors | Never            |

### Error Surfacing

Handlers throw `McpError` subclasses (`NetworkError`, `APIError`, etc.). FastMCP catches these and returns them to the client as native MCP tool results with `isError: true`. The message is the only client-facing payload — anything the client should see (e.g. the `transaction_list` timeout hint) is part of the message — while the `retryable` flag drives the HTTP client's retry decisions internally.

Successful results are returned as a single text content block containing the JSON-serialized domain object (e.g. `{ count, transactions }`).

---

## 6. Configuration

Configuration is defined by a single Zod schema (`src/config/index.ts`), which is also the source of truth for defaults. The `--baseUrl` CLI flag is the primary way to set the server address.

### Environment Variables

| Variable                        | Required | Default | Description          |
| ------------------------------- | -------- | ------- | -------------------- |
| `MONEY_MANAGER_BASE_URL`        | No\*     | -       | Server URL           |
| `MONEY_MANAGER_TIMEOUT`         | No       | 30000   | Request timeout (ms) |
| `MONEY_MANAGER_RETRY_COUNT`     | No       | 3       | Retry attempts       |
| `MONEY_MANAGER_LOG_LEVEL`       | No       | info    | Log level            |
| `MONEY_MANAGER_SESSION_PERSIST` | No       | true    | Persist cookies      |

\* Either `--baseUrl` or `MONEY_MANAGER_BASE_URL` must be provided.

A few settings have no environment variable and can only be set through the config file: `server.retryDelay` (base delay for the exponential-backoff retry, default 1000 ms), `logging.format` (`json` or `text`, default `json`), and `session.cookieFile` (default `.session-cookies.json`). The full key reference is in [SETUP.md](../SETUP.md).

### Configuration Priority

Highest priority first:

1. **CLI argument** — `--baseUrl http://192.168.1.1:8888`
2. **Environment variables** — `MONEY_MANAGER_*`
3. **Config file** — `.money-manager-mcp.json` in the working directory
4. **Schema defaults**

### Configuration Loading

1. Load `.env` file if present (via `dotenv`)
2. Merge file config + env config + CLI override
3. Validate with the Zod schema, which fills in defaults

---

## 7. Security Considerations

### Implemented Security Measures

1. **No Credential Storage**: API uses session cookies only
2. **Cookie Persistence**: Session cookies stored locally with owner-only file permissions (excluded from git)
3. **Input Validation**: All tool inputs validated with Zod schemas
4. **Export Confinement**: `summary_export_excel`'s `outputPath` must resolve inside the server's working directory — absolute paths, `..` traversal, and symlinks pointing outside it are rejected during input validation
5. **No Code Evaluation**: Response parsing never falls back to `eval`/`new Function`; malformed upstream responses throw instead of executing

### Files Excluded from Repository

- `.env` - Environment configuration
- `.session-cookies.json` - Session data
- `*.xls`, `*.xlsx` - Exported financial data

---

## 8. Data Flow

```text
┌─────────────────┐
│   AI Assistant  │
│ (Claude/Copilot)│
└────────┬────────┘
         │ MCP Protocol (stdio)
         ▼
┌─────────────────┐
│  FastMCP Server │
│  (index.ts)     │
└────────┬────────┘
         │ validates args, dispatches
         ▼
┌─────────────────┐
│  Tool Handler   │
│ (handlers.ts)   │
└────────┬────────┘
         │ builds request
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
  assetGroupId?: string;
  assetType: "group" | "item";
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

There is no automated test suite. The server is verified by:

1. `npm run build` — TypeScript strict compilation (the primary gate)
2. `npm run lint` — ESLint
3. Manual testing with an MCP-compatible client (Claude Desktop, VS Code)

For a full live end-to-end protocol — all 18 tools exercised with throwaway data and guaranteed cleanup — follow the `testing-money-manager-mcp` skill in `.agents/skills/testing-money-manager-mcp/SKILL.md`.

Handlers are pure `(client, args) → object` functions, so they can be unit-tested against a mocked `HttpClient` without a live server, but no such tests are included.

### Debug Mode

Set `MONEY_MANAGER_LOG_LEVEL=debug` for verbose logging:

```bash
MONEY_MANAGER_LOG_LEVEL=debug node dist/index.js
```
