/**
 * Tool handlers for the Money Manager MCP server
 * Each handler implements the business logic for a specific MCP tool
 */

import type { HttpClient } from "../client/http-client.js";
import {
  ValidationError,
  FileError,
  wrapError,
} from "../errors/index.js";
import {
  InitGetDataInputSchema,
  TransactionListInputSchema,
  TransactionCreateInputSchema,
  TransactionUpdateInputSchema,
  TransactionDeleteInputSchema,
  SummaryGetPeriodInputSchema,
  SummaryExportExcelInputSchema,
  AssetListInputSchema,
  AssetCreateInputSchema,
  AssetUpdateInputSchema,
  AssetDeleteInputSchema,
  CardListInputSchema,
  CardCreateInputSchema,
  CardUpdateInputSchema,
  TransferCreateInputSchema,
  TransferUpdateInputSchema,
  DashboardGetOverviewInputSchema,
  DashboardGetAssetChartInputSchema,
  BackupDownloadInputSchema,
  BackupRestoreInputSchema,
} from "../schemas/index.js";
import type {
  InitDataResponse,
  RawInitDataResponse,
  TransactionListResponse,
  Transaction,
  TransactionOperationResponse,
  SummaryResponse,
  RawSummaryResponse,
  ExcelExportResponse,
  AssetListResponse,
  AssetGroup,
  AssetOperationResponse,
  CardListResponse,
  CardGroup,
  CardOperationResponse,
  TransferOperationResponse,
  DashboardResponse,
  RawDashboardResponse,
  AssetChartResponse,
  RawAssetChartResponse,
  BackupDownloadResponse,
  BackupRestoreResponse,
} from "../types/index.js";

// ============================================================================
// Type definitions for raw API responses
// ============================================================================

/**
 * Raw XML response structure for transactions
 */
interface RawTransactionXmlResponse {
  dataset: {
    results: string;
    row?: RawTransactionRow | RawTransactionRow[];
  };
}

/**
 * Raw transaction row from XML response
 */
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

/**
 * Generic API operation response
 */
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
// Handler type definition
// ============================================================================

/**
 * Type for tool handler function
 */
export type ToolHandler<TInput, TOutput> = (
  httpClient: HttpClient,
  input: TInput,
) => Promise<TOutput>;

// ============================================================================
// Initialization Handlers
// ============================================================================

/**
 * Handler for init_get_data tool
 * Retrieves initial application data including categories, payment types, etc.
 */
export async function handleInitGetData(
  httpClient: HttpClient,
  input: unknown,
): Promise<InitDataResponse> {
  const validated = InitGetDataInputSchema.parse(input);

  const params: Record<string, string | undefined> = {};
  if (validated.mbid) {
    params["mbid"] = validated.mbid;
  }

  const rawResponse = await httpClient.get<RawInitDataResponse>(
    "/getInitData",
    params,
  );

  // Transform the raw response to the expected format
  return {
    initData: rawResponse.initData,
    categories: {
      income: rawResponse.category_0 || [],
      expense: rawResponse.category_1 || [],
    },
    paymentTypes: rawResponse.payType || [],
    multiBooks: rawResponse.multiBooks || [],
    assetGroups: rawResponse.assetGroups || [],
    assetNames: rawResponse.assetNames || [],
  };
}

// ============================================================================
// Transaction Handlers
// ============================================================================

/**
 * Handler for transaction_list tool
 * Lists transactions within a date range
 */
export async function handleTransactionList(
  httpClient: HttpClient,
  input: unknown,
): Promise<TransactionListResponse> {
  const validated = TransactionListInputSchema.parse(input);

  const params: Record<string, string | undefined> = {
    startDate: validated.startDate,
    endDate: validated.endDate,
    mbid: validated.mbid,
    assetId: validated.assetId,
  };

  const rawResponse = await httpClient.getXml<RawTransactionXmlResponse>(
    "/getDataByPeriod",
    params,
  );

  // Handle case where response is empty or dataset is missing/empty
  if (!rawResponse || !rawResponse.dataset) {
    return { count: 0, transactions: [] };
  }

  // Handle case where dataset is an empty string (can happen with empty XML elements)
  // When xml2js parses <dataset results="0"></dataset> with ignoreAttrs:true,
  // it returns { dataset: "" } instead of { dataset: { results: "0" } }
  if (typeof rawResponse.dataset === "string") {
    return { count: 0, transactions: [] };
  }

  // Parse the XML response
  const count = parseInt(rawResponse.dataset?.results || "0", 10);
  let transactions: Transaction[] = [];

  if (rawResponse.dataset?.row) {
    const rows = Array.isArray(rawResponse.dataset.row)
      ? rawResponse.dataset.row
      : [rawResponse.dataset.row];

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

/**
 * Handler for transaction_create tool
 * Creates a new income or expense transaction
 */
export async function handleTransactionCreate(
  httpClient: HttpClient,
  input: unknown,
): Promise<TransactionOperationResponse> {
  const validated = TransactionCreateInputSchema.parse(input);

  const response = await httpClient.post<ApiOperationResponse>("/create", {
    mbDate: validated.mbDate,
    assetId: validated.assetId,
    payType: validated.payType,
    mcid: validated.mcid,
    mbCategory: validated.mbCategory,
    mbCash: validated.mbCash,
    inOutCode: validated.inOutCode,
    inOutType: validated.inOutType,
    mcscid: validated.mcscid || "",
    subCategory: validated.subCategory || "",
    mbContent: validated.mbContent || "",
    mbDetailContent: validated.mbDetailContent || "",
  });

  return {
    success: response.success !== false && response.result !== "fail",
    transactionId: response.id,
    message: response.message,
  };
}

/**
 * Handler for transaction_update tool
 * Updates an existing transaction
 */
export async function handleTransactionUpdate(
  httpClient: HttpClient,
  input: unknown,
): Promise<TransactionOperationResponse> {
  const validated = TransactionUpdateInputSchema.parse(input);

  const response = await httpClient.post<ApiOperationResponse>("/update", {
    id: validated.id,
    mbDate: validated.mbDate,
    assetId: validated.assetId,
    payType: validated.payType,
    mcid: validated.mcid,
    mbCategory: validated.mbCategory,
    mbCash: validated.mbCash,
    inOutCode: validated.inOutCode,
    inOutType: validated.inOutType,
    mcscid: validated.mcscid || "",
    subCategory: validated.subCategory || "",
    mbContent: validated.mbContent || "",
    mbDetailContent: validated.mbDetailContent || "",
  });

  return {
    success: response.success !== false && response.result !== "fail",
    transactionId: validated.id,
    message: response.message,
  };
}

/**
 * Handler for transaction_delete tool
 * Deletes one or more transactions
 */
export async function handleTransactionDelete(
  httpClient: HttpClient,
  input: unknown,
): Promise<TransactionOperationResponse> {
  const validated = TransactionDeleteInputSchema.parse(input);

  // Format IDs as colon-separated string (API expects ":id1:id2:id3" format)
  const idsString = ":" + validated.ids.join(":");

  const response = await httpClient.post<ApiOperationResponse>("/delete", {
    ids: idsString,
  });

  return {
    success: response.success !== false && response.result !== "fail",
    deletedCount: validated.ids.length,
    message: response.message,
  };
}

// ============================================================================
// Summary Handlers
// ============================================================================

/**
 * Handler for summary_get_period tool
 * Retrieves financial summary statistics for a date range
 */
export async function handleSummaryGetPeriod(
  httpClient: HttpClient,
  input: unknown,
): Promise<SummaryResponse> {
  const validated = SummaryGetPeriodInputSchema.parse(input);

  const rawResponse = await httpClient.get<RawSummaryResponse>(
    "/getSummaryDataByPeriod",
    {
      startDate: validated.startDate,
      endDate: validated.endDate,
    },
  );

  return {
    summary: rawResponse.summary,
    incomeByCategory: rawResponse.income || [],
    expenseByCategory: rawResponse.outcome || [],
  };
}

/**
 * Handler for summary_export_excel tool
 * Exports transaction data to Excel file
 *
 * NOTE: The Money Manager API returns an HTML file with Excel metadata,
 * not a proper XLSX binary. This format works with .xls extension.
 * If user provides .xlsx extension, it will be auto-corrected to .xls.
 */
export async function handleSummaryExportExcel(
  httpClient: HttpClient,
  input: unknown,
): Promise<ExcelExportResponse> {
  const validated = SummaryExportExcelInputSchema.parse(input);

  // Auto-correct .xlsx extension to .xls since API returns HTML-based Excel format
  let outputPath = validated.outputPath;
  let extensionCorrected = false;

  if (outputPath.toLowerCase().endsWith(".xlsx")) {
    outputPath = outputPath.slice(0, -5) + ".xls";
    extensionCorrected = true;
  }

  try {
    const result = await httpClient.downloadFile("/getExcelFile", outputPath, {
      startDate: validated.startDate,
      endDate: validated.endDate,
      mbid: validated.mbid,
      assetId: validated.assetId || "",
      inOutType: validated.inOutType || "",
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

// ============================================================================
// Asset Handlers
// ============================================================================

/**
 * Helper to parse string or number to number
 */
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return 0;
}

/**
 * Handler for asset_list tool
 * Retrieves all assets in a hierarchical structure
 */
export async function handleAssetList(
  httpClient: HttpClient,
  input: unknown,
): Promise<AssetListResponse> {
  AssetListInputSchema.parse(input);

  const rawResponse = await httpClient.get<AssetGroup[]>("/getAssetData");

  // Calculate total balance from all asset groups
  let totalBalance = 0;
  const assetGroups: AssetGroup[] = Array.isArray(rawResponse)
    ? rawResponse
    : [];

  for (const group of assetGroups) {
    if (group.children) {
      for (const asset of group.children) {
        // API returns assetMoney as string, need to parse it
        totalBalance += toNumber(asset.assetMoney);
      }
    }
  }

  return {
    assetGroups,
    totalBalance,
  };
}

/**
 * Handler for asset_create tool
 * Creates a new asset/account
 */
export async function handleAssetCreate(
  httpClient: HttpClient,
  input: unknown,
): Promise<AssetOperationResponse> {
  const validated = AssetCreateInputSchema.parse(input);

  const response = await httpClient.post<ApiOperationResponse>("/assetAdd", {
    assetGroupId: validated.assetGroupId,
    assetGroupName: validated.assetGroupName,
    assetName: validated.assetName,
    assetMoney: validated.assetMoney,
    linkAssetId: validated.linkAssetId || "",
    linkAssetName: validated.linkAssetName || "",
  });

  return {
    success: response.success !== false && response.result !== "fail",
    assetId: response.assetId,
    message: response.message,
  };
}

/**
 * Handler for asset_update tool
 * Modifies an existing asset
 */
export async function handleAssetUpdate(
  httpClient: HttpClient,
  input: unknown,
): Promise<AssetOperationResponse> {
  const validated = AssetUpdateInputSchema.parse(input);

  const response = await httpClient.post<ApiOperationResponse>("/assetModify", {
    assetId: validated.assetId,
    assetGroupId: validated.assetGroupId,
    assetGroupName: validated.assetGroupName,
    assetName: validated.assetName,
    assetMoney: validated.assetMoney,
    linkAssetId: validated.linkAssetId || "",
    linkAssetName: validated.linkAssetName || "",
  });

  return {
    success: response.success !== false && response.result !== "fail",
    assetId: validated.assetId,
    message: response.message,
  };
}

/**
 * Handler for asset_delete tool
 * Removes an asset
 */
export async function handleAssetDelete(
  httpClient: HttpClient,
  input: unknown,
): Promise<AssetOperationResponse> {
  const validated = AssetDeleteInputSchema.parse(input);

  const response = await httpClient.post<ApiOperationResponse>("/removeAsset", {
    assetId: validated.assetId,
  });

  return {
    success: response.success !== false && response.result !== "fail",
    assetId: validated.assetId,
    message: response.message,
  };
}

// ============================================================================
// Credit Card Handlers
// ============================================================================

/**
 * Handler for card_list tool
 * Retrieves all credit cards in a hierarchical structure
 */
export async function handleCardList(
  httpClient: HttpClient,
  input: unknown,
): Promise<CardListResponse> {
  CardListInputSchema.parse(input);

  const rawResponse = await httpClient.get<CardGroup[]>("/getCardData");

  // Calculate total unpaid balance from all card groups
  let totalUnpaid = 0;
  const cardGroups: CardGroup[] = Array.isArray(rawResponse) ? rawResponse : [];

  for (const group of cardGroups) {
    if (group.children) {
      for (const card of group.children) {
        // API returns notPayMoney as string, need to parse it
        totalUnpaid += Math.abs(toNumber(card.notPayMoney));
      }
    }
  }

  return {
    cardGroups,
    totalUnpaid,
  };
}

/**
 * Handler for card_create tool
 * Creates a new credit card
 */
export async function handleCardCreate(
  httpClient: HttpClient,
  input: unknown,
): Promise<CardOperationResponse> {
  const validated = CardCreateInputSchema.parse(input);

  const response = await httpClient.post<ApiOperationResponse>(
    "/addAssetCard",
    {
      cardName: validated.cardName,
      linkAssetId: validated.linkAssetId,
      linkAssetName: validated.linkAssetName,
      notPayMoney: validated.notPayMoney,
      jungsanDay: validated.jungsanDay,
      paymentDay: validated.paymentDay,
    },
  );

  return {
    success: response.success !== false && response.result !== "fail",
    cardId: response.cardId || response.assetId,
    message: response.message,
  };
}

/**
 * Handler for card_update tool
 * Modifies an existing credit card
 */
export async function handleCardUpdate(
  httpClient: HttpClient,
  input: unknown,
): Promise<CardOperationResponse> {
  const validated = CardUpdateInputSchema.parse(input);

  const response = await httpClient.post<ApiOperationResponse>("/modifyCard", {
    assetId: validated.assetId,
    cardName: validated.cardName,
    linkAssetId: validated.linkAssetId,
    linkAssetName: validated.linkAssetName,
    jungsanDay: validated.jungsanDay,
    paymentDay: validated.paymentDay,
  });

  return {
    success: response.success !== false && response.result !== "fail",
    cardId: validated.assetId,
    message: response.message,
  };
}

// ============================================================================
// Transfer Handlers
// ============================================================================

/**
 * Handler for transfer_create tool
 * Transfers money between two assets
 */
export async function handleTransferCreate(
  httpClient: HttpClient,
  input: unknown,
): Promise<TransferOperationResponse> {
  const validated = TransferCreateInputSchema.parse(input);

  const response = await httpClient.post<ApiOperationResponse>("/moveAsset", {
    moveDate: validated.moveDate,
    fromAssetId: validated.fromAssetId,
    fromAssetName: validated.fromAssetName,
    toAssetId: validated.toAssetId,
    toAssetName: validated.toAssetName,
    moveMoney: validated.moveMoney,
    moneyContent: validated.moneyContent || "",
    mbDetailContent: validated.mbDetailContent || "",
  });

  return {
    success: response.success !== false && response.result !== "fail",
    transferId: response.transferId || response.id,
    message: response.message,
  };
}

/**
 * Handler for transfer_update tool
 * Modifies an existing transfer
 *
 * WARNING: The server-side API creates a NEW transfer with a NEW ID instead of
 * updating in-place. The old ID will no longer exist after this operation.
 * Use transaction_list to retrieve the new ID if needed.
 */
export async function handleTransferUpdate(
  httpClient: HttpClient,
  input: unknown,
): Promise<TransferOperationResponse> {
  const validated = TransferUpdateInputSchema.parse(input);

  const response = await httpClient.post<ApiOperationResponse>(
    "/modifyMoveAsset",
    {
      id: validated.id,
      moveDate: validated.moveDate,
      fromAssetId: validated.fromAssetId,
      fromAssetName: validated.fromAssetName,
      toAssetId: validated.toAssetId,
      toAssetName: validated.toAssetName,
      moveMoney: validated.moveMoney,
      moneyContent: validated.moneyContent || "",
      mbDetailContent: validated.mbDetailContent || "",
    },
  );

  return {
    success: response.success !== false && response.result !== "fail",
    transferId: validated.id,
    message:
      response.message ||
      "WARNING: The server creates a new transfer with a NEW ID. The provided ID is now invalid. Use transaction_list to get the new ID.",
  };
}

// ============================================================================
// Dashboard Handlers
// ============================================================================

/**
 * Handler for dashboard_get_overview tool
 * Retrieves dashboard overview with asset trends and portfolio breakdown
 */
export async function handleDashboardGetOverview(
  httpClient: HttpClient,
  input: unknown,
): Promise<DashboardResponse> {
  DashboardGetOverviewInputSchema.parse(input);

  const rawResponse =
    await httpClient.get<RawDashboardResponse>("/getDashBoardData");

  return {
    assetSummary: rawResponse.assetSummary,
    monthlyTrend: rawResponse.assetLine || [],
    assetRatio: rawResponse.assetRatio || [],
    debtRatio: rawResponse.debtRatio || [],
  };
}

/**
 * Handler for dashboard_get_asset_chart tool
 * Retrieves historical chart data for a specific asset
 */
export async function handleDashboardGetAssetChart(
  httpClient: HttpClient,
  input: unknown,
): Promise<AssetChartResponse> {
  const validated = DashboardGetAssetChartInputSchema.parse(input);

  const rawResponse = await httpClient.post<RawAssetChartResponse>(
    "/getEachAssetChartData",
    {
      assetId: validated.assetId,
    },
  );

  return {
    assetId: validated.assetId,
    chartData: rawResponse.assetChartData || [],
  };
}

// ============================================================================
// Backup Handlers
// ============================================================================

/**
 * Handler for backup_download tool
 * Downloads the SQLite database backup
 */
export async function handleBackupDownload(
  httpClient: HttpClient,
  input: unknown,
): Promise<BackupDownloadResponse> {
  const validated = BackupDownloadInputSchema.parse(input);

  try {
    const result = await httpClient.downloadFileGet(
      "/money.sqlite",
      validated.outputPath,
    );

    return {
      success: true,
      filePath: result.filePath,
      fileSize: result.fileSize,
      message: `Database backup downloaded successfully to ${result.filePath}`,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw FileError.writeFailed(validated.outputPath, error.message);
    }
    throw wrapError(error);
  }
}

/**
 * Handler for backup_restore tool
 * Restores from a SQLite database backup file
 */
export async function handleBackupRestore(
  httpClient: HttpClient,
  input: unknown,
): Promise<BackupRestoreResponse> {
  const validated = BackupRestoreInputSchema.parse(input);

  try {
    const response = await httpClient.uploadFile<ApiOperationResponse>(
      "/uploadSqlFile",
      validated.filePath,
      "file",
    );

    return {
      success: response.success !== false && response.result !== "fail",
      message: response.message || "Database restored successfully",
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("File not found")) {
      throw FileError.notFound(validated.filePath);
    }
    throw wrapError(error);
  }
}

// ============================================================================
// Handler Registry
// ============================================================================

/**
 * Map of tool names to their handler functions
 */
export const toolHandlers = {
  // Initialization
  init_get_data: handleInitGetData,

  // Transactions
  transaction_list: handleTransactionList,
  transaction_create: handleTransactionCreate,
  transaction_update: handleTransactionUpdate,
  transaction_delete: handleTransactionDelete,

  // Summary
  summary_get_period: handleSummaryGetPeriod,
  summary_export_excel: handleSummaryExportExcel,

  // Assets
  asset_list: handleAssetList,
  asset_create: handleAssetCreate,
  asset_update: handleAssetUpdate,
  asset_delete: handleAssetDelete,

  // Credit Cards
  card_list: handleCardList,
  card_create: handleCardCreate,
  card_update: handleCardUpdate,

  // Transfers
  transfer_create: handleTransferCreate,
  transfer_update: handleTransferUpdate,

  // Dashboard
  dashboard_get_overview: handleDashboardGetOverview,
  dashboard_get_asset_chart: handleDashboardGetAssetChart,

  // Backup
  backup_download: handleBackupDownload,
  backup_restore: handleBackupRestore,
} as const;

/**
 * Type for tool handler names
 */
export type ToolHandlerName = keyof typeof toolHandlers;

/**
 * Execute a tool by name
 */
export async function executeToolHandler(
  httpClient: HttpClient,
  toolName: string,
  input: unknown,
): Promise<unknown> {
  const handler = toolHandlers[toolName as ToolHandlerName];

  if (!handler) {
    throw new ValidationError(`Unknown tool: ${toolName}`);
  }

  return handler(httpClient, input);
}
