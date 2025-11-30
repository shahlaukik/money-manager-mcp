#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError as SdkMcpError,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig, type Config } from "./config/index.js";
import { createHttpClient, type HttpClient } from "./client/http-client.js";
import { wrapError, ValidationError } from "./errors/index.js";
import {
  ToolSchemas,
  type ToolName,
  safeValidateToolInput,
} from "./schemas/index.js";
import { executeToolHandler } from "./tools/handlers.js";

import packageJson from "../package.json" with { type: "json" };

/**
 * Tool definitions for the MCP server
 * Each tool maps to a Money Manager API endpoint
 */
const TOOL_DEFINITIONS = [
  // Initialization
  {
    name: "init_get_data",
    description:
      "Retrieves initial application data including categories, payment types, asset groups, and multi-book configuration.",
    inputSchema: {
      type: "object" as const,
      properties: {
        mbid: {
          type: "string",
          description: "Optional: Money book ID",
        },
      },
    },
  },

  // Transactions
  {
    name: "transaction_list",
    description: "Lists transactions within a date range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        startDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "End date (YYYY-MM-DD)",
        },
        mbid: {
          type: "string",
          description: "Money book ID",
        },
        assetId: {
          type: "string",
          description: "Optional: Filter by asset ID",
        },
      },
      required: ["startDate", "endDate", "mbid"],
    },
  },
  {
    name: "transaction_create",
    description: "Creates a new income or expense transaction.",
    inputSchema: {
      type: "object" as const,
      properties: {
        mbDate: {
          type: "string",
          description: "Transaction date (YYYY-MM-DD)",
        },
        assetId: { type: "string", description: "Asset/Account ID" },
        payType: { type: "string", description: "Payment type name" },
        mcid: { type: "string", description: "Category ID" },
        mbCategory: { type: "string", description: "Category name" },
        mbCash: { type: "number", description: "Amount" },
        inOutCode: {
          type: "string",
          enum: ["0", "1"],
          description: "0=Income, 1=Expense",
        },
        inOutType: { type: "string", description: "Transaction type name" },
        mcscid: { type: "string", description: "Optional: Subcategory ID" },
        subCategory: {
          type: "string",
          description: "Optional: Subcategory name",
        },
        mbContent: { type: "string", description: "Optional: Description" },
        mbDetailContent: {
          type: "string",
          description: "Optional: Detailed notes",
        },
      },
      required: [
        "mbDate",
        "assetId",
        "payType",
        "mcid",
        "mbCategory",
        "mbCash",
        "inOutCode",
        "inOutType",
      ],
    },
  },
  {
    name: "transaction_update",
    description: "Updates an existing transaction.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Transaction ID" },
        mbDate: {
          type: "string",
          description: "Transaction date (YYYY-MM-DD)",
        },
        assetId: { type: "string", description: "Asset/Account ID" },
        payType: { type: "string", description: "Payment type name" },
        mcid: { type: "string", description: "Category ID" },
        mbCategory: { type: "string", description: "Category name" },
        mbCash: { type: "number", description: "Amount" },
        inOutCode: { type: "string", description: "Transaction type code" },
        inOutType: { type: "string", description: "Transaction type name" },
        mcscid: { type: "string", description: "Optional: Subcategory ID" },
        subCategory: {
          type: "string",
          description: "Optional: Subcategory name",
        },
        mbContent: { type: "string", description: "Optional: Description" },
        mbDetailContent: {
          type: "string",
          description: "Optional: Detailed notes",
        },
      },
      required: [
        "id",
        "mbDate",
        "assetId",
        "payType",
        "mcid",
        "mbCategory",
        "mbCash",
        "inOutCode",
        "inOutType",
      ],
    },
  },
  {
    name: "transaction_delete",
    description: "Deletes one or more transactions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of transaction IDs to delete",
        },
      },
      required: ["ids"],
    },
  },

  // Summary
  {
    name: "summary_get_period",
    description: "Retrieves financial summary statistics for a date range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "summary_export_excel",
    description:
      "Exports transaction data to Excel file. The server returns an HTML-based Excel format. Use .xls extension for best compatibility (if .xlsx is provided, it will be auto-corrected to .xls with a warning).",
    inputSchema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
        mbid: { type: "string", description: "Money book ID" },
        assetId: {
          type: "string",
          description: "Optional: Filter by asset ID",
        },
        inOutType: {
          type: "string",
          description: "Optional: Filter by transaction type",
        },
        outputPath: {
          type: "string",
          description:
            "Local path to save the Excel file (use .xls extension for best compatibility)",
        },
      },
      required: ["startDate", "endDate", "mbid", "outputPath"],
    },
  },

  // Assets
  {
    name: "asset_list",
    description: "Retrieves all assets in a hierarchical structure.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "asset_create",
    description: "Creates a new asset/account.",
    inputSchema: {
      type: "object" as const,
      properties: {
        assetGroupId: { type: "string", description: "Asset group ID" },
        assetGroupName: { type: "string", description: "Asset group name" },
        assetName: { type: "string", description: "Asset name" },
        assetMoney: { type: "number", description: "Initial balance" },
        linkAssetId: {
          type: "string",
          description: "Optional: Linked asset ID",
        },
        linkAssetName: {
          type: "string",
          description: "Optional: Linked asset name",
        },
      },
      required: ["assetGroupId", "assetGroupName", "assetName", "assetMoney"],
    },
  },
  {
    name: "asset_update",
    description: "Modifies an existing asset.",
    inputSchema: {
      type: "object" as const,
      properties: {
        assetId: { type: "string", description: "Asset ID" },
        assetGroupId: { type: "string", description: "Asset group ID" },
        assetGroupName: { type: "string", description: "Asset group name" },
        assetName: { type: "string", description: "Asset name" },
        assetMoney: { type: "number", description: "Current balance" },
        linkAssetId: {
          type: "string",
          description: "Optional: Linked asset ID",
        },
        linkAssetName: {
          type: "string",
          description: "Optional: Linked asset name",
        },
      },
      required: [
        "assetId",
        "assetGroupId",
        "assetGroupName",
        "assetName",
        "assetMoney",
      ],
    },
  },
  {
    name: "asset_delete",
    description: "Removes an asset.",
    inputSchema: {
      type: "object" as const,
      properties: {
        assetId: { type: "string", description: "Asset ID to delete" },
      },
      required: ["assetId"],
    },
  },

  // Credit Cards
  {
    name: "card_list",
    description: "Retrieves all credit cards in a hierarchical structure.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "card_create",
    description: "Creates a new credit card.",
    inputSchema: {
      type: "object" as const,
      properties: {
        cardName: { type: "string", description: "Credit card name" },
        linkAssetId: { type: "string", description: "Linked payment asset ID" },
        linkAssetName: {
          type: "string",
          description: "Linked payment asset name",
        },
        notPayMoney: {
          type: "number",
          description: "Unpaid balance (negative value)",
        },
        jungsanDay: {
          type: "number",
          description: "Optional: Balance calculation day (1-31)",
        },
        paymentDay: {
          type: "number",
          description: "Optional: Payment due day (1-31)",
        },
      },
      required: ["cardName", "linkAssetId", "linkAssetName", "notPayMoney"],
    },
  },
  {
    name: "card_update",
    description: "Modifies an existing credit card.",
    inputSchema: {
      type: "object" as const,
      properties: {
        assetId: { type: "string", description: "Card asset ID" },
        cardName: { type: "string", description: "Credit card name" },
        linkAssetId: { type: "string", description: "Linked payment asset ID" },
        linkAssetName: {
          type: "string",
          description: "Linked payment asset name",
        },
        jungsanDay: {
          type: "number",
          description: "Optional: Balance calculation day (1-31)",
        },
        paymentDay: {
          type: "number",
          description: "Optional: Payment due day (1-31)",
        },
      },
      required: ["assetId", "cardName", "linkAssetId", "linkAssetName"],
    },
  },

  // Transfers
  {
    name: "transfer_create",
    description: "Transfers money between two assets.",
    inputSchema: {
      type: "object" as const,
      properties: {
        moveDate: { type: "string", description: "Transfer date (YYYY-MM-DD)" },
        fromAssetId: { type: "string", description: "Source asset ID" },
        fromAssetName: { type: "string", description: "Source asset name" },
        toAssetId: { type: "string", description: "Destination asset ID" },
        toAssetName: { type: "string", description: "Destination asset name" },
        moveMoney: { type: "number", description: "Transfer amount" },
        moneyContent: { type: "string", description: "Optional: Description" },
        mbDetailContent: {
          type: "string",
          description: "Optional: Detailed notes",
        },
      },
      required: [
        "moveDate",
        "fromAssetId",
        "fromAssetName",
        "toAssetId",
        "toAssetName",
        "moveMoney",
      ],
    },
  },
  {
    name: "transfer_update",
    description:
      "Modifies an existing transfer. WARNING: The server creates a new transfer with a NEW ID instead of updating in-place. The old ID will no longer exist after update. Use transaction_list to get the new ID if needed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Transfer transaction ID" },
        moveDate: { type: "string", description: "Transfer date (YYYY-MM-DD)" },
        fromAssetId: { type: "string", description: "Source asset ID" },
        fromAssetName: { type: "string", description: "Source asset name" },
        toAssetId: { type: "string", description: "Destination asset ID" },
        toAssetName: { type: "string", description: "Destination asset name" },
        moveMoney: { type: "number", description: "Transfer amount" },
        moneyContent: { type: "string", description: "Optional: Description" },
        mbDetailContent: {
          type: "string",
          description: "Optional: Detailed notes",
        },
      },
      required: [
        "id",
        "moveDate",
        "fromAssetId",
        "fromAssetName",
        "toAssetId",
        "toAssetName",
        "moveMoney",
      ],
    },
  },

  // Dashboard
  {
    name: "dashboard_get_overview",
    description:
      "Retrieves dashboard overview with asset trends and portfolio breakdown.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "dashboard_get_asset_chart",
    description: "Retrieves historical chart data for a specific asset.",
    inputSchema: {
      type: "object" as const,
      properties: {
        assetId: { type: "string", description: "Asset ID" },
      },
      required: ["assetId"],
    },
  },

  // Backup - DISABLED: These tools are dangerous and not recommended for use via MCP
  // {
  //   name: 'backup_download',
  //   description: 'Downloads the SQLite database backup.',
  //   inputSchema: {
  //     type: 'object' as const,
  //     properties: {
  //       outputPath: { type: 'string', description: 'Local path to save the backup file' },
  //     },
  //     required: ['outputPath'],
  //   },
  // },
  // {
  //   name: 'backup_restore',
  //   description: 'Restores from a SQLite database backup file.',
  //   inputSchema: {
  //     type: 'object' as const,
  //     properties: {
  //       filePath: { type: 'string', description: 'Path to the SQLite backup file' },
  //     },
  //     required: ['filePath'],
  //   },
  // },
];

/**
 * Money Manager MCP Server
 */
class MoneyManagerMcpServer {
  private server: Server;
  private httpClient: HttpClient | null = null;
  private config: Config | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "money-manager-mcp",
        version: packageJson.version,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  /**
   * Sets up request handlers for the MCP server
   */
  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: TOOL_DEFINITIONS,
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Validate tool name
      if (!this.isValidToolName(name)) {
        throw new SdkMcpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`,
        );
      }

      // Validate input using Zod schema
      const validationResult = safeValidateToolInput(name, args);
      if (!validationResult.success) {
        const error = ValidationError.fromZodError(validationResult.error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: {
                  code: error.code,
                  message: error.message,
                  details: error.details,
                },
              }),
            },
          ],
          isError: true,
        };
      }

      try {
        // Execute the tool (placeholder - will be implemented in Phase 2)
        const result = await this.executeTool(name, validationResult.data);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        const mcpError = wrapError(error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: {
                  code: mcpError.code,
                  message: mcpError.message,
                  retryable: mcpError.retryable,
                  details: mcpError.details,
                },
              }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Sets up error handling for the server
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Server Error]", error);
    };

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\nReceived SIGINT, shutting down gracefully...");
      await this.shutdown();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("\nReceived SIGTERM, shutting down gracefully...");
      await this.shutdown();
      process.exit(0);
    });
  }

  /**
   * Checks if a tool name is valid
   */
  private isValidToolName(name: string): name is ToolName {
    return name in ToolSchemas;
  }

  /**
   * Executes a tool by delegating to the appropriate handler
   */
  private async executeTool(name: ToolName, args: unknown): Promise<unknown> {
    // Ensure HTTP client is initialized
    if (!this.httpClient || !this.config) {
      throw new Error("Server not initialized. Call start() first.");
    }

    // Execute the tool handler
    return executeToolHandler(this.httpClient, name, args);
  }

  /**
   * Starts the MCP server
   */
  async start(): Promise<void> {
    try {
      // Parse command line arguments
      const args = process.argv.slice(2);
      let customBaseUrl: string | undefined;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "--baseUrl" && args[i + 1]) {
          customBaseUrl = args[i + 1];
          break;
        }
      }

      // Load configuration
      this.config = await loadConfig();

      // Override baseUrl if provided via command line
      if (customBaseUrl) {
        this.config.server.baseUrl = customBaseUrl;
      }
      console.error(
        `[MCP Server] Configuration loaded. Base URL: ${this.config.server.baseUrl}`,
      );

      // Create HTTP client
      this.httpClient = createHttpClient(this.config);
      console.error("[MCP Server] HTTP client initialized.");

      // Start the server with stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error(
        "[MCP Server] Money Manager MCP Server started successfully.",
      );
    } catch (error) {
      console.error("[MCP Server] Failed to start server:", error);
      throw error;
    }
  }

  /**
   * Shuts down the server gracefully
   */
  async shutdown(): Promise<void> {
    try {
      await this.server.close();
      console.error("[MCP Server] Server closed.");
    } catch (error) {
      console.error("[MCP Server] Error during shutdown:", error);
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const server = new MoneyManagerMcpServer();
  await server.start();
}

// Run the server
main().catch((error) => {
  console.error("[MCP Server] Fatal error:", error);
  process.exit(1);
});
