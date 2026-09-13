#!/usr/bin/env node

/**
 * Money Manager MCP Server
 *
 * An MCP server that lets AI assistants manage personal finances through the
 * Realbyte Money Manager Android app (PC Manager web server).
 *
 * Built on FastMCP: each tool is defined once (in `tools/handlers.ts`) with a
 * Zod schema, which FastMCP advertises to clients, validates inputs with, and
 * dispatches. This file only wires the server, binds the HTTP client, wraps
 * handler results as MCP text content, and boots the stdio transport.
 */

import { FastMCP, type ContentResult } from "fastmcp";

import { loadConfig, type Config } from "./config/index.js";
import { createHttpClient, type HttpClient } from "./client/http-client.js";
import { TOOLS } from "./tools/handlers.js";

import packageJson from "../package.json" with { type: "json" };

/**
 * Registers every tool, binding the HTTP client and wrapping each handler's
 * domain-object result as JSON text content (the tool's existing wire format).
 */
function registerTools(server: FastMCP, client: HttpClient): void {
  for (const tool of TOOLS) {
    server.addTool({
      name: tool.name,
      description: tool.description,
      parameters: tool.schema,
      execute: async (args) => {
        const result = await tool.handler(client, args);
        const content: ContentResult = {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
        return content;
      },
    });
  }
}

/** Parses the `--baseUrl <value>` flag from argv (the only CLI option). */
function parseBaseUrlArg(): string | undefined {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--baseUrl" && argv[i + 1]) {
      return argv[i + 1];
    }
  }
  return undefined;
}

async function main(): Promise<void> {
  // Logging goes to stderr so the stdio JSON-RPC channel on stdout stays clean.
  const log = (msg: string) => console.error(`[money-manager-mcp] ${msg}`);

  const cliBaseUrl = parseBaseUrlArg();
  const config: Config = loadConfig({ baseUrl: cliBaseUrl });
  log(`Base URL: ${config.server.baseUrl}`);

  const httpClient = createHttpClient(config);
  log("HTTP client initialized.");

  const server = new FastMCP({
    name: "money-manager-mcp",
    version: packageJson.version as `${number}.${number}.${number}`,
    // Sent to clients in the MCP initialize handshake so models reach the
    // critical usage contract without access to the repo's docs/ or AGENTS.md
    // (end users install via `npx money-manager-mcp@latest`). Keep concise.
    instructions: [
      "Personal-finance server backed by the Realbyte Money Manager Android app's PC Manager web server (same-Wi-Fi, single book).",
      "ALWAYS call `init_get_data` first: it returns the `mbid` plus the category IDs (`mcid`), payment-type names, and asset group IDs that the create/update/transfer tools require. These IDs are not guessable and most create/update failures come from using a wrong/imagined ID.",
      "The four create tools — `transaction_create`, `asset_create`, `card_create`, `transfer_create` — return `{success, message}` with NO new id (upstream API limitation). To get the id of what you just created, call the matching `_list` tool afterward.",
      "`transfer_update` does NOT update in place: the server creates a NEW transfer with a NEW id and invalidates the old one. Find the new id via `transaction_list` filtered by the source asset and date (look for the inOutCode '3' Transfer-Out row).",
      "There is no `card_delete` tool (the upstream API has no card-delete endpoint); a card can only be removed manually in the app.",
      "`transaction_list` can time out on date ranges that contain no transactions (upstream bug) — narrow the range or confirm data exists first.",
    ].join("\n"),
  });

  registerTools(server, httpClient);

  log(`Registered ${TOOLS.length} tools. Starting server (stdio)...`);
  await server.start({ transportType: "stdio" });
}

main().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[money-manager-mcp] Fatal error: ${msg}`);
  process.exit(1);
});
