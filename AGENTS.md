# AGENTS.md

Guidance for AI coding agents (Claude, Copilot, ZCode, etc.) working in this repository. Read this before making changes.

## Project Overview

Money Manager MCP is a **Model Context Protocol** server that lets AI assistants manage personal finances through the **Realbyte Money Manager** Android app's "PC Manager" web server (a local-network HTTP service).

The server runs over **stdio** and exposes **18 tools** (no resources, no prompts). It is built on [FastMCP](https://github.com/punkpeye/fastmcp) and written in TypeScript (strict mode, ESM, Node ≥ 22).

A phone running the Money Manager app and the computer running the server must be on the **same Wi-Fi network**. There is no automated test suite.

## Repository Structure

```text
src/
├── index.ts          # Server bootstrap — thin; wires FastMCP + HTTP client + stdio
├── client/
│   ├── http-client.ts  # axios + cookie sessions, retry, XML & JS-literal parsing
│   └── identifiers.ts  # character classifiers used by the JS-literal parser
├── config/
│   └── index.ts      # Layered config: CLI > env > .money-manager-mcp.json > defaults
├── errors/
│   └── index.ts      # McpError taxonomy (Network/API/Session/File/Internal)
├── schemas/
│   └── index.ts      # Zod input schemas — single source of truth for tool inputs
├── tools/
│   └── handlers.ts   # Tool handlers + the TOOLS registry (one definition per tool)
└── types/
    └── index.ts      # Domain/response types (response shapes; inputs come from schemas)
docs/
├── SETUP.md                      # Installation & configuration
├── USAGE.md                      # Tool reference with example prompts
└── technical/
    ├── ARCHITECTURE.md           # System design
    └── API_DOCUMENTATION.md      # Upstream Money Manager HTTP API reference
```

## Important Commands

```bash
npm run build    # tsc → dist/  (the gate: must stay clean)
npm run dev      # tsx src/index.ts (run from source, no build)
npm start        # node dist/index.js (run compiled output)
npm run lint     # ESLint
npm run format   # Prettier
```

The server requires a base URL (the only required setting). In development pass it as a flag:

```bash
npm run dev -- --baseUrl http://192.168.1.1:8888
```

The server blocks on stdio waiting for an MCP client. There is no HTTP port and no "server ready" line on stdout — logs go to **stderr** to keep the JSON-RPC channel on stdout clean.

## Development Workflow

1. `npm install`
2. Make changes in `src/`.
3. `npm run build` — the single source of truth for "does it compile." Strict
   TypeScript; errors here block everything.
4. `npm run lint` and `npm run format`.
5. Manual verification against a real Money Manager server via an MCP client
   (there is no test runner). For the full end-to-end protocol — every tool,
   throwaway test data only, guaranteed cleanup and baseline verification —
   follow the `testing-money-manager-mcp` skill in
   `.agents/skills/testing-money-manager-mcp/SKILL.md`.

There is no CI config in the repo; the build + lint commands above are the checks.

## Architecture in Brief

**Define each tool once.** In `src/tools/handlers.ts`, every entry in the `TOOLS` array binds together a `name`, `description`, Zod `schema`, and `handler`. FastMCP then:

1. derives the JSON Schema advertised to clients via `tools/list`,
2. validates inputs against that schema before the handler runs,
3. dispatches `tools/call` to the handler.

`src/index.ts` is intentionally thin: it creates the `FastMCP` server, binds the shared `HttpClient` to each handler via closure, wraps each handler's returned domain object as JSON text content, and starts the stdio transport.

**Do not** introduce a hand-maintained JSON Schema list, separate registration calls per tool, or a second validation layer. The Zod schema is the single source.

**Handlers are pure** `(client, args) → domain object` functions. They must not import or call FastMCP APIs, format MCP content, or know they run under MCP. That wrapping happens once in `index.ts`.

## Configuration

Layered (highest priority first), all funneled through one Zod schema in `src/config/index.ts`:

1. `--baseUrl` CLI flag (only CLI option)
2. `MONEY_MANAGER_*` environment variables
3. `.money-manager-mcp.json` in the working directory
4. Schema defaults

Supported env vars: `MONEY_MANAGER_BASE_URL`, `MONEY_MANAGER_TIMEOUT`, `MONEY_MANAGER_RETRY_COUNT`, `MONEY_MANAGER_LOG_LEVEL`, `MONEY_MANAGER_SESSION_PERSIST`.

## Coding Conventions

- **TypeScript strict mode**, ESM (`"type": "module"`), `NodeNext` module resolution.
  Use `.js` extensions in relative imports (required under NodeNext).
- **No `any`.** Define explicit types. Input types are inferred from their Zod schema
  (`z.infer<typeof ...Schema>`) in `src/schemas/index.ts`.
- **Files** are `kebab-case`; **types/interfaces** are `PascalCase`; **tool names**
  are `snake_case` (`{category}_{action}`, e.g. `transaction_create`).
- Prefer `const` over `let`. Match the existing comment density and JSDoc style.
- **Errors:** throw the appropriate `McpError` subclass from `src/errors` (e.g. `NetworkError`, `APIError`, `FileError`). `retryable` drives the HTTP client's retry decisions; FastMCP surfaces the message to the client as an `isError` result — the message is the only client-facing payload, so anything the client should see must be part of it.

## Adding / Modifying a Tool

1. Define the Zod schema **and** exported inferred input type in `src/schemas/index.ts`.
2. Add a response/domain type to `src/types/index.ts` if the API returns a new shape.
3. Write a `handle...` function in `src/tools/handlers.ts` taking
   `(client: HttpClient, args: <Input>)`. Return a plain domain object.
4. Add an entry to the `TOOLS` array (name, description, schema, handler).
5. Update `docs/USAGE.md` and the tool table in `README.md`.
6. `npm run build` and `npm run lint`.

Do not touch `src/index.ts` when adding a tool — the registry loop already covers it.

## Upstream API Quirks (Important)

The Money Manager HTTP API is unusual. Respect these when writing handlers:

- **Response format is not JSON.** Most endpoints return JavaScript object-literal syntax (single quotes, unquoted keys). The HTTP client parses it (JSON.parse → non-evaluating literal-to-JSON tokenizer; there is deliberately no `eval`/`new Function` fallback). Transaction lists come back as **XML**, parsed via `client.getXml()`.
- **All endpoints are under `/moneyBook`** (the client prepends it).
- **Dates are date-only.** The API silently accepts `YYYY-MM-DDTHH:mm:ss` values, but the app records them as 12:00 AM — the time is never persisted (verified against a live server). All schemas use `DateSchema`; do not add datetime support.
- **`transfer_update` does not update in place** — the server creates a new transfer with a new ID and the old one becomes invalid. The handler's result message warns about this; keep that warning.
- **`transaction_list` can hang** on date ranges with no transactions (server bug).
  `NetworkError.timeoutForTransactionList` carries the hint in its message.
- **`/addAssetCard` hangs forever** (no response, no card created) unless both
  `jungsanDay` and `paymentDay` are sent; `handleCardCreate` defaults them to `1`.
- **`/modifyCard` resets omitted fields** instead of preserving them (omitted
  payment day comes back empty, omitted link asset is cleared); `handleCardUpdate`
  fills omitted days from the card's current state before updating.
- **Excel export returns HTML-based `.xls`**, not real XLSX. `.xlsx` paths are
  auto-corrected to `.xls`.
- **Backup/restore endpoints** (`/uploadSqlFile`, `/money.sqlite`) exist upstream
  but are deliberately **not** exposed as tools — they operate on the raw SQLite DB.

## Documentation Expectations

- Docs describe **behavior and intent**, not transient implementation mechanics.
- Do **not** invent features, speculate about future work, or document removed code.
- Keep the README tool table and `docs/USAGE.md` in sync with `TOOLS` in `handlers.ts`.
- When you change a tool's schema or add a tool, update the relevant docs in the same change.

## Things to Avoid

- No hand-maintained JSON Schema, manual per-tool registration, or duplicate validation.
- No logging to stdout (it corrupts the stdio JSON-RPC channel) — use `console.error`
  or the client's internal logger.
- No new runtime dependencies without a clear need; the dependency list is intentionally small.
- No `any`, no `@ts-ignore`, no loosening strict flags.
- Don't expose the backup/restore endpoints as tools.
- Don't commit `.env`, `.session-cookies.json`, `*.xls`/`*.xlsx`, or the local
  `.github/prompts/` directory (all gitignored).

## Project Philosophy

Small, readable, correct. One definition per tool. The Zod schema is the source of truth; types and advertised schemas flow from it. Handlers stay pure and transport-agnostic. The HTTP client absorbs the upstream API's quirks once, so handlers read like straightforward request/response code.
