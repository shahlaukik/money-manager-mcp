/**
 * Tool handlers for the Money Manager MCP server.
 *
 * Each handler is a pure `(client, args) → domain object` function. FastMCP
 * validates `args` against the tool's Zod schema before invoking the handler,
 * so handlers receive already-typed input. The `TOOLS` registry binds each
 * handler with its name, description, and schema for registration in index.ts.
 */

import type { z } from "zod";

import type { HttpClient } from "../client/http-client.js";
import { FileError, wrapError } from "../errors/index.js";
import {
  AssetCreateInputSchema,
  type AssetCreateInput,
  AssetDeleteInputSchema,
  type AssetDeleteInput,
  AssetListInputSchema,
  AssetUpdateInputSchema,
  type AssetUpdateInput,
  CardCreateInputSchema,
  type CardCreateInput,
  CardListInputSchema,
  CardUpdateInputSchema,
  type CardUpdateInput,
  DashboardGetAssetChartInputSchema,
  type DashboardGetAssetChartInput,
  DashboardGetOverviewInputSchema,
  InitGetDataInputSchema,
  type InitGetDataInput,
  SummaryExportExcelInputSchema,
  type SummaryExportExcelInput,
  SummaryGetPeriodInputSchema,
  type SummaryGetPeriodInput,
  TransactionCreateInputSchema,
  type TransactionCreateInput,
  TransactionDeleteInputSchema,
  type TransactionDeleteInput,
  TransactionListInputSchema,
  type TransactionListInput,
  TransactionUpdateInputSchema,
  type TransactionUpdateInput,
  TransferCreateInputSchema,
  type TransferCreateInput,
  TransferUpdateInputSchema,
  type TransferUpdateInput,
} from "../schemas/index.js";
import type {
  AssetGroup,
  CardGroup,
  RawAssetChartResponse,
  RawDashboardResponse,
  RawInitDataResponse,
  RawSummaryResponse,
  Transaction,
} from "../types/index.js";

// ============================================================================
// Raw API response shapes (internal)
// ============================================================================

// These mirror the upstream Money Manager responses and live here, close to the
// handlers that consume them. Raw*Response domain shapes come from types/, while
// these two are the loose/loosely-typed XML + operation envelopes.

/** Raw XML response structure for transactions (getXml result). */
interface RawTransactionXmlResponse {
  dataset: {
    results: string;
    row?: RawTransactionRow | RawTransactionRow[];
  };
}

/** Raw transaction row from the XML response. */
interface RawTransactionRow {
  id: string;
  mbDate: string;
  assetId: string;
  toAssetId?: string;
  targetAssetId?: string;
  payType: string;
  mcid: string;
  mbCategory: string;
  mcscid?: string;
  subCategory?: string;
  mbContent?: string;
  mbCash: string;
  inOutCode: string;
  inOutType: string;
  mbDetailContent?: string;
}

/** Generic API operation response (create/update/delete/asset/card/transfer). */
interface ApiOperationResponse {
  success?: boolean;
  result?: string;
  message?: string;
  id?: string;
  assetId?: string;
  cardId?: string;
  transferId?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Parses the API's success indicator (missing fields default to success). */
function succeeded(response: ApiOperationResponse): boolean {
  return response.success !== false && response.result !== "fail";
}

/** Coerces the API's string/number money values into a number. */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return 0;
}

// ============================================================================
// Handlers
// ============================================================================

/** Retrieves initial application data: categories, payment types, assets, books. */
export async function handleInitGetData(
  client: HttpClient,
  args: InitGetDataInput,
) {
  const params: Record<string, string | undefined> = {};
  if (args.mbid) params["mbid"] = args.mbid;

  const raw = await client.get<RawInitDataResponse>("/getInitData", params);
  return {
    initData: raw.initData,
    categories: {
      income: raw.category_0 || [],
      expense: raw.category_1 || [],
    },
    paymentTypes: raw.payType || [],
    multiBooks: raw.multiBooks || [],
    assetGroups: raw.assetGroups || [],
    assetNames: raw.assetNames || [],
  };
}

/** Lists transactions within a date range (handles three XML empty-edge cases). */
export async function handleTransactionList(
  client: HttpClient,
  args: TransactionListInput,
) {
  const raw = await client.getXml<RawTransactionXmlResponse>(
    "/getDataByPeriod",
    {
      startDate: args.startDate,
      endDate: args.endDate,
      mbid: args.mbid,
      assetId: args.assetId,
    },
  );

  // Missing/empty dataset → no transactions.
  if (!raw || !raw.dataset) return { count: 0, transactions: [] };
  // xml2js turns `<dataset results="0"></dataset>` (ignoreAttrs) into a string.
  if (typeof raw.dataset === "string") return { count: 0, transactions: [] };

  const count = parseInt(raw.dataset?.results || "0", 10);
  let transactions: Transaction[] = [];

  if (raw.dataset?.row) {
    const rows = Array.isArray(raw.dataset.row)
      ? raw.dataset.row
      : [raw.dataset.row];
    transactions = rows.map((row: RawTransactionRow) => ({
      id: row.id,
      mbDate: row.mbDate,
      assetId: row.assetId,
      toAssetId: row.toAssetId,
      targetAssetId: row.targetAssetId,
      payType: row.payType,
      mcid: row.mcid,
      mbCategory: row.mbCategory,
      mcscid: row.mcscid,
      subCategory: row.subCategory,
      mbContent: row.mbContent,
      mbCash: parseFloat(row.mbCash) || 0,
      inOutCode: row.inOutCode,
      inOutType: row.inOutType,
      mbDetailContent: row.mbDetailContent,
    }));
  }

  return { count, transactions };
}

/** Creates a new income or expense transaction. */
export async function handleTransactionCreate(
  client: HttpClient,
  args: TransactionCreateInput,
) {
  const response = await client.post<ApiOperationResponse>("/create", {
    mbDate: args.mbDate,
    assetId: args.assetId,
    payType: args.payType,
    mcid: args.mcid,
    mbCategory: args.mbCategory,
    mbCash: args.mbCash,
    inOutCode: args.inOutCode,
    inOutType: args.inOutType,
    mcscid: args.mcscid || "",
    subCategory: args.subCategory || "",
    mbContent: args.mbContent || "",
    mbDetailContent: args.mbDetailContent || "",
  });
  return {
    success: succeeded(response),
    transactionId: response.id,
    message: response.message,
  };
}

/** Updates an existing transaction. */
export async function handleTransactionUpdate(
  client: HttpClient,
  args: TransactionUpdateInput,
) {
  const response = await client.post<ApiOperationResponse>("/update", {
    id: args.id,
    mbDate: args.mbDate,
    assetId: args.assetId,
    payType: args.payType,
    mcid: args.mcid,
    mbCategory: args.mbCategory,
    mbCash: args.mbCash,
    inOutCode: args.inOutCode,
    inOutType: args.inOutType,
    mcscid: args.mcscid || "",
    subCategory: args.subCategory || "",
    mbContent: args.mbContent || "",
    mbDetailContent: args.mbDetailContent || "",
  });
  return {
    success: succeeded(response),
    transactionId: args.id,
    message: response.message,
  };
}

/** Deletes one or more transactions (API expects ":id1:id2:id3"). */
export async function handleTransactionDelete(
  client: HttpClient,
  args: TransactionDeleteInput,
) {
  const response = await client.post<ApiOperationResponse>("/delete", {
    ids: ":" + args.ids.join(":"),
  });
  return {
    success: succeeded(response),
    deletedCount: args.ids.length,
    message: response.message,
  };
}

/** Retrieves financial summary statistics for a date range. */
export async function handleSummaryGetPeriod(
  client: HttpClient,
  args: SummaryGetPeriodInput,
) {
  const raw = await client.get<RawSummaryResponse>(
    "/getSummaryDataByPeriod",
    { startDate: args.startDate, endDate: args.endDate },
  );
  return {
    summary: raw.summary,
    incomeByCategory: raw.income || [],
    expenseByCategory: raw.outcome || [],
  };
}

/**
 * Exports transactions to Excel.
 *
 * NOTE: the Money Manager API returns an HTML file with Excel metadata, not a
 * proper XLSX binary. This format works with `.xls`; if `.xlsx` is requested it
 * is auto-corrected to `.xls` with a warning in the response message.
 */
export async function handleSummaryExportExcel(
  client: HttpClient,
  args: SummaryExportExcelInput,
) {
  let outputPath = args.outputPath;
  let extensionCorrected = false;
  if (outputPath.toLowerCase().endsWith(".xlsx")) {
    outputPath = outputPath.slice(0, -5) + ".xls";
    extensionCorrected = true;
  }

  try {
    const result = await client.downloadFile("/getExcelFile", outputPath, {
      startDate: args.startDate,
      endDate: args.endDate,
      mbid: args.mbid,
      assetId: args.assetId || "",
      inOutType: args.inOutType || "",
    });

    let message = `Excel file exported successfully to ${result.filePath}`;
    if (extensionCorrected) {
      message += ` (Note: Extension was changed from .xlsx to .xls because the server returns HTML-based Excel format which requires .xls extension for proper compatibility)`;
    }
    return {
      success: true,
      filePath: result.filePath,
      fileSize: result.fileSize,
      message,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw FileError.writeFailed(outputPath, error.message);
    }
    throw wrapError(error);
  }
}

/** Retrieves all assets in a hierarchical structure. */
export async function handleAssetList(client: HttpClient) {
  const raw = await client.get<AssetGroup[]>("/getAssetData");
  const assetGroups: AssetGroup[] = Array.isArray(raw) ? raw : [];

  let totalBalance = 0;
  for (const group of assetGroups) {
    if (group.children) {
      for (const asset of group.children) {
        totalBalance += toNumber(asset.assetMoney);
      }
    }
  }
  return { assetGroups, totalBalance };
}

/** Creates a new asset/account. */
export async function handleAssetCreate(
  client: HttpClient,
  args: AssetCreateInput,
) {
  const response = await client.post<ApiOperationResponse>("/assetAdd", {
    assetGroupId: args.assetGroupId,
    assetGroupName: args.assetGroupName,
    assetName: args.assetName,
    assetMoney: args.assetMoney,
    linkAssetId: args.linkAssetId || "",
    linkAssetName: args.linkAssetName || "",
  });
  return {
    success: succeeded(response),
    assetId: response.assetId,
    message: response.message,
  };
}

/** Modifies an existing asset. */
export async function handleAssetUpdate(
  client: HttpClient,
  args: AssetUpdateInput,
) {
  const response = await client.post<ApiOperationResponse>("/assetModify", {
    assetId: args.assetId,
    assetGroupId: args.assetGroupId,
    assetGroupName: args.assetGroupName,
    assetName: args.assetName,
    assetMoney: args.assetMoney,
    linkAssetId: args.linkAssetId || "",
    linkAssetName: args.linkAssetName || "",
  });
  return {
    success: succeeded(response),
    assetId: args.assetId,
    message: response.message,
  };
}

/** Removes an asset. */
export async function handleAssetDelete(
  client: HttpClient,
  args: AssetDeleteInput,
) {
  const response = await client.post<ApiOperationResponse>("/removeAsset", {
    assetId: args.assetId,
  });
  return {
    success: succeeded(response),
    assetId: args.assetId,
    message: response.message,
  };
}

/** Retrieves all credit cards in a hierarchical structure. */
export async function handleCardList(client: HttpClient) {
  const raw = await client.get<CardGroup[]>("/getCardData");
  const cardGroups: CardGroup[] = Array.isArray(raw) ? raw : [];

  let totalUnpaid = 0;
  for (const group of cardGroups) {
    if (group.children) {
      for (const card of group.children) {
        totalUnpaid += Math.abs(toNumber(card.notPayMoney));
      }
    }
  }
  return { cardGroups, totalUnpaid };
}

/** Creates a new credit card. */
export async function handleCardCreate(
  client: HttpClient,
  args: CardCreateInput,
) {
  const response = await client.post<ApiOperationResponse>("/addAssetCard", {
    cardName: args.cardName,
    linkAssetId: args.linkAssetId,
    linkAssetName: args.linkAssetName,
    notPayMoney: args.notPayMoney,
    jungsanDay: args.jungsanDay,
    paymentDay: args.paymentDay,
  });
  return {
    success: succeeded(response),
    cardId: response.cardId || response.assetId,
    message: response.message,
  };
}

/** Modifies an existing credit card. */
export async function handleCardUpdate(
  client: HttpClient,
  args: CardUpdateInput,
) {
  const response = await client.post<ApiOperationResponse>("/modifyCard", {
    assetId: args.assetId,
    cardName: args.cardName,
    linkAssetId: args.linkAssetId,
    linkAssetName: args.linkAssetName,
    jungsanDay: args.jungsanDay,
    paymentDay: args.paymentDay,
  });
  return {
    success: succeeded(response),
    cardId: args.assetId,
    message: response.message,
  };
}

/** Transfers money between two assets. */
export async function handleTransferCreate(
  client: HttpClient,
  args: TransferCreateInput,
) {
  const response = await client.post<ApiOperationResponse>("/moveAsset", {
    moveDate: args.moveDate,
    fromAssetId: args.fromAssetId,
    fromAssetName: args.fromAssetName,
    toAssetId: args.toAssetId,
    toAssetName: args.toAssetName,
    moveMoney: args.moveMoney,
    moneyContent: args.moneyContent || "",
    mbDetailContent: args.mbDetailContent || "",
  });
  return {
    success: succeeded(response),
    transferId: response.transferId || response.id,
    message: response.message,
  };
}

/**
 * Modifies an existing transfer.
 *
 * WARNING: the server-side API creates a NEW transfer with a NEW ID instead of
 * updating in-place — the old ID becomes invalid. Use transaction_list to find it.
 */
export async function handleTransferUpdate(
  client: HttpClient,
  args: TransferUpdateInput,
) {
  const response = await client.post<ApiOperationResponse>("/modifyMoveAsset", {
    id: args.id,
    moveDate: args.moveDate,
    fromAssetId: args.fromAssetId,
    fromAssetName: args.fromAssetName,
    toAssetId: args.toAssetId,
    toAssetName: args.toAssetName,
    moveMoney: args.moveMoney,
    moneyContent: args.moneyContent || "",
    mbDetailContent: args.mbDetailContent || "",
  });
  return {
    success: succeeded(response),
    transferId: args.id,
    message:
      response.message ||
      "WARNING: The server creates a new transfer with a NEW ID. The provided ID is now invalid. Use transaction_list to get the new ID.",
  };
}

/** Retrieves dashboard overview (asset trends + portfolio breakdown). */
export async function handleDashboardGetOverview(client: HttpClient) {
  const raw = await client.get<RawDashboardResponse>("/getDashBoardData");
  return {
    assetSummary: raw.assetSummary,
    monthlyTrend: raw.assetLine || [],
    assetRatio: raw.assetRatio || [],
    debtRatio: raw.debtRatio || [],
  };
}

/** Retrieves historical chart data for a specific asset (note: uses POST). */
export async function handleDashboardGetAssetChart(
  client: HttpClient,
  args: DashboardGetAssetChartInput,
) {
  const raw = await client.post<RawAssetChartResponse>(
    "/getEachAssetChartData",
    { assetId: args.assetId },
  );
  return { assetId: args.assetId, chartData: raw.assetChartData || [] };
}

// ============================================================================
// Tool registry
// ============================================================================

/**
 * A handler takes the HTTP client + validated args and returns a domain object.
 * Each handler is typed against its own schema's inferred input type; the
 * `ToolDefinition` wrapper erases that generic so tools can live in one array.
 */
type Handler<A> = (client: HttpClient, args: A) => Promise<unknown>;

/** Definition consumed by index.ts to register a FastMCP tool. */
type ToolDefinition<A = unknown> = {
  name: string;
  description: string;
  schema: z.ZodType;
  handler: Handler<A>;
};

/** Erased tool definition (the args type is enforced per-handler, not here). */
export type AnyToolDefinition = ToolDefinition<unknown>;

/**
 * All tools, each defined once: name + description + Zod schema (auto-advertised
 * and used for validation by FastMCP) + handler. The array is cast to the erased
 * type — each entry is fully type-checked against its own schema's input above.
 */
export const TOOLS: AnyToolDefinition[] = ([
  {
    name: "init_get_data",
    description:
      "Retrieves initial application data including categories, payment types, asset groups, and multi-book configuration.",
    schema: InitGetDataInputSchema,
    handler: handleInitGetData,
  },
  {
    name: "init_get_data",
    description:
      "Retrieves initial application data including categories, payment types, asset groups, and multi-book configuration.",
    schema: InitGetDataInputSchema,
    handler: handleInitGetData,
  },
  {
    name: "transaction_list",
    description: "Lists transactions within a date range.",
    schema: TransactionListInputSchema,
    handler: handleTransactionList,
  },
  {
    name: "transaction_create",
    description: "Creates a new income or expense transaction.",
    schema: TransactionCreateInputSchema,
    handler: handleTransactionCreate,
  },
  {
    name: "transaction_update",
    description: "Updates an existing transaction.",
    schema: TransactionUpdateInputSchema,
    handler: handleTransactionUpdate,
  },
  {
    name: "transaction_delete",
    description: "Deletes one or more transactions.",
    schema: TransactionDeleteInputSchema,
    handler: handleTransactionDelete,
  },
  {
    name: "summary_get_period",
    description: "Retrieves financial summary statistics for a date range.",
    schema: SummaryGetPeriodInputSchema,
    handler: handleSummaryGetPeriod,
  },
  {
    name: "summary_export_excel",
    description:
      "Exports transaction data to Excel file. The server returns an HTML-based Excel format. Use .xls extension for best compatibility (if .xlsx is provided, it will be auto-corrected to .xls with a warning).",
    schema: SummaryExportExcelInputSchema,
    handler: handleSummaryExportExcel,
  },
  {
    name: "asset_list",
    description: "Retrieves all assets in a hierarchical structure.",
    schema: AssetListInputSchema,
    handler: handleAssetList,
  },
  {
    name: "asset_create",
    description: "Creates a new asset/account.",
    schema: AssetCreateInputSchema,
    handler: handleAssetCreate,
  },
  {
    name: "asset_update",
    description: "Modifies an existing asset.",
    schema: AssetUpdateInputSchema,
    handler: handleAssetUpdate,
  },
  {
    name: "asset_delete",
    description: "Removes an asset.",
    schema: AssetDeleteInputSchema,
    handler: handleAssetDelete,
  },
  {
    name: "card_list",
    description: "Retrieves all credit cards in a hierarchical structure.",
    schema: CardListInputSchema,
    handler: handleCardList,
  },
  {
    name: "card_create",
    description: "Creates a new credit card.",
    schema: CardCreateInputSchema,
    handler: handleCardCreate,
  },
  {
    name: "card_update",
    description: "Modifies an existing credit card.",
    schema: CardUpdateInputSchema,
    handler: handleCardUpdate,
  },
  {
    name: "transfer_create",
    description: "Transfers money between two assets.",
    schema: TransferCreateInputSchema,
    handler: handleTransferCreate,
  },
  {
    name: "transfer_update",
    description:
      "Modifies an existing transfer. WARNING: The server creates a new transfer with a NEW ID instead of updating in-place. The old ID will no longer exist after update. Use transaction_list to get the new ID if needed.",
    schema: TransferUpdateInputSchema,
    handler: handleTransferUpdate,
  },
  {
    name: "dashboard_get_overview",
    description:
      "Retrieves dashboard overview with asset trends and portfolio breakdown.",
    schema: DashboardGetOverviewInputSchema,
    handler: handleDashboardGetOverview,
  },
  {
    name: "dashboard_get_asset_chart",
    description: "Retrieves historical chart data for a specific asset.",
    schema: DashboardGetAssetChartInputSchema,
    handler: handleDashboardGetAssetChart,
  },
] as AnyToolDefinition[]);
