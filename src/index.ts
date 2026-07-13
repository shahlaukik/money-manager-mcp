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

  const config: Config = await loadConfig();
  const cliBaseUrl = parseBaseUrlArg();
  if (cliBaseUrl) {
    config.server.baseUrl = cliBaseUrl;
  }
  log(`Base URL: ${config.server.baseUrl}`);

  const httpClient = createHttpClient(config);
  log("HTTP client initialized.");

  const server = new FastMCP({
    name: "money-manager-mcp",
    version: packageJson.version as `${number}.${number}.${number}`,
  });

  registerTools(server, httpClient);

  log(`Registered ${TOOLS.length} tools. Starting server (stdio)...`);
  await server.start({ transportType: "stdio" });
}

main().catch((error) => {
  console.error("[money-manager-mcp] Fatal error:", error);
  process.exit(1);
});
