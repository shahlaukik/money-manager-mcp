import { z } from "zod";

/**
 * Zod schemas for input validation
 * These schemas are used to validate tool inputs before making API calls
 */

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Date string in YYYY-MM-DD format
 */
export const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

/**
 * Non-empty string
 */
export const NonEmptyString = z.string().min(1, "String cannot be empty");

/**
 * Positive number
 */
export const PositiveNumber = z.number().positive("Number must be positive");

/**
 * Non-negative number (zero or positive)
 */
export const NonNegativeNumber = z
  .number()
  .min(0, "Number must be non-negative");

/**
 * Money book ID
 */
export const MbidSchema = z.string().min(1, "Money book ID is required");

/**
 * Asset ID
 */
export const AssetIdSchema = z.string().min(1, "Asset ID is required");

/**
 * Transaction ID
 */
export const TransactionIdSchema = z
  .string()
  .min(1, "Transaction ID is required");

/**
 * Category ID
 */
export const CategoryIdSchema = z.string().min(1, "Category ID is required");

// ============================================================================
// Initialization Schemas
// ============================================================================

/**
 * Input schema for init_get_data tool
 */
export const InitGetDataInputSchema = z.object({
  mbid: z.string().optional(),
});

export type InitGetDataInput = z.infer<typeof InitGetDataInputSchema>;

// ============================================================================
// Transaction Schemas
// ============================================================================

/**
 * Income/Expense code
 */
export const InOutCodeSchema = z.enum(["0", "1"], {
  errorMap: () => ({
    message: "inOutCode must be '0' (Income) or '1' (Expense)",
  }),
});

/**
 * Extended income/expense code for updates (includes transfer codes)
 */
export const ExtendedInOutCodeSchema = z
  .string()
  .regex(/^[0-8]$/, "inOutCode must be 0-8");

/**
 * Input schema for transaction_list tool
 */
export const TransactionListInputSchema = z.object({
  startDate: DateSchema,
  endDate: DateSchema,
  mbid: MbidSchema,
  assetId: z.string().optional(),
});

export type TransactionListInput = z.infer<typeof TransactionListInputSchema>;

/**
 * Input schema for transaction_create tool
 */
export const TransactionCreateInputSchema = z.object({
  mbDate: DateSchema,
  assetId: AssetIdSchema,
  payType: NonEmptyString,
  mcid: CategoryIdSchema,
  mbCategory: NonEmptyString,
  mbCash: PositiveNumber,
  inOutCode: InOutCodeSchema,
  inOutType: NonEmptyString,
  mcscid: z.string().optional(),
  subCategory: z.string().optional(),
  mbContent: z.string().optional(),
  mbDetailContent: z.string().optional(),
});

export type TransactionCreateInput = z.infer<
  typeof TransactionCreateInputSchema
>;

/**
 * Input schema for transaction_update tool
 */
export const TransactionUpdateInputSchema = z.object({
  id: TransactionIdSchema,
  mbDate: DateSchema,
  assetId: AssetIdSchema,
  payType: NonEmptyString,
  mcid: CategoryIdSchema,
  mbCategory: NonEmptyString,
  mbCash: PositiveNumber,
  inOutCode: ExtendedInOutCodeSchema,
  inOutType: NonEmptyString,
  mcscid: z.string().optional(),
  subCategory: z.string().optional(),
  mbContent: z.string().optional(),
  mbDetailContent: z.string().optional(),
});

export type TransactionUpdateInput = z.infer<
  typeof TransactionUpdateInputSchema
>;

/**
 * Input schema for transaction_delete tool
 */
export const TransactionDeleteInputSchema = z.object({
  ids: z
    .array(TransactionIdSchema)
    .min(1, "At least one transaction ID is required"),
});

export type TransactionDeleteInput = z.infer<
  typeof TransactionDeleteInputSchema
>;

// ============================================================================
// Summary Schemas
// ============================================================================

/**
 * Input schema for summary_get_period tool
 */
export const SummaryGetPeriodInputSchema = z.object({
  startDate: DateSchema,
  endDate: DateSchema,
});

export type SummaryGetPeriodInput = z.infer<typeof SummaryGetPeriodInputSchema>;

/**
 * Input schema for summary_export_excel tool
 */
export const SummaryExportExcelInputSchema = z.object({
  startDate: DateSchema,
  endDate: DateSchema,
  mbid: MbidSchema,
  assetId: z.string().optional(),
  inOutType: z.string().optional(),
  outputPath: NonEmptyString,
});

export type SummaryExportExcelInput = z.infer<
  typeof SummaryExportExcelInputSchema
>;

// ============================================================================
// Asset Schemas
// ============================================================================

/**
 * Input schema for asset_list tool (no parameters)
 */
export const AssetListInputSchema = z.object({});

export type AssetListInput = z.infer<typeof AssetListInputSchema>;

/**
 * Input schema for asset_create tool
 */
export const AssetCreateInputSchema = z.object({
  assetGroupId: NonEmptyString,
  assetGroupName: NonEmptyString,
  assetName: NonEmptyString,
  assetMoney: z.number(),
  linkAssetId: z.string().optional(),
  linkAssetName: z.string().optional(),
});

export type AssetCreateInput = z.infer<typeof AssetCreateInputSchema>;

/**
 * Input schema for asset_update tool
 */
export const AssetUpdateInputSchema = z.object({
  assetId: AssetIdSchema,
  assetGroupId: NonEmptyString,
  assetGroupName: NonEmptyString,
  assetName: NonEmptyString,
  assetMoney: z.number(),
  linkAssetId: z.string().optional(),
  linkAssetName: z.string().optional(),
});

export type AssetUpdateInput = z.infer<typeof AssetUpdateInputSchema>;

/**
 * Input schema for asset_delete tool
 */
export const AssetDeleteInputSchema = z.object({
  assetId: AssetIdSchema,
});

export type AssetDeleteInput = z.infer<typeof AssetDeleteInputSchema>;

// ============================================================================
// Credit Card Schemas
// ============================================================================

/**
 * Day of month (1-31)
 */
export const DayOfMonthSchema = z.number().int().min(1).max(31);

/**
 * Input schema for card_list tool (no parameters)
 */
export const CardListInputSchema = z.object({});

export type CardListInput = z.infer<typeof CardListInputSchema>;

/**
 * Input schema for card_create tool
 */
export const CardCreateInputSchema = z.object({
  cardName: NonEmptyString,
  linkAssetId: AssetIdSchema,
  linkAssetName: NonEmptyString,
  notPayMoney: z.number(),
  jungsanDay: DayOfMonthSchema.optional(),
  paymentDay: DayOfMonthSchema.optional(),
});

export type CardCreateInput = z.infer<typeof CardCreateInputSchema>;

/**
 * Input schema for card_update tool
 */
export const CardUpdateInputSchema = z.object({
  assetId: AssetIdSchema,
  cardName: NonEmptyString,
  linkAssetId: AssetIdSchema,
  linkAssetName: NonEmptyString,
  jungsanDay: DayOfMonthSchema.optional(),
  paymentDay: DayOfMonthSchema.optional(),
});

export type CardUpdateInput = z.infer<typeof CardUpdateInputSchema>;

// ============================================================================
// Transfer Schemas
// ============================================================================

/**
 * Input schema for transfer_create tool
 */
export const TransferCreateInputSchema = z.object({
  moveDate: DateSchema,
  fromAssetId: AssetIdSchema,
  fromAssetName: NonEmptyString,
  toAssetId: AssetIdSchema,
  toAssetName: NonEmptyString,
  moveMoney: PositiveNumber,
  moneyContent: z.string().optional(),
  mbDetailContent: z.string().optional(),
});

export type TransferCreateInput = z.infer<typeof TransferCreateInputSchema>;

/**
 * Input schema for transfer_update tool
 */
export const TransferUpdateInputSchema = z.object({
  id: TransactionIdSchema,
  moveDate: DateSchema,
  fromAssetId: AssetIdSchema,
  fromAssetName: NonEmptyString,
  toAssetId: AssetIdSchema,
  toAssetName: NonEmptyString,
  moveMoney: PositiveNumber,
  moneyContent: z.string().optional(),
  mbDetailContent: z.string().optional(),
});

export type TransferUpdateInput = z.infer<typeof TransferUpdateInputSchema>;

// ============================================================================
// Dashboard Schemas
// ============================================================================

/**
 * Input schema for dashboard_get_overview tool (no parameters)
 */
export const DashboardGetOverviewInputSchema = z.object({});

export type DashboardGetOverviewInput = z.infer<
  typeof DashboardGetOverviewInputSchema
>;

/**
 * Input schema for dashboard_get_asset_chart tool
 */
export const DashboardGetAssetChartInputSchema = z.object({
  assetId: AssetIdSchema,
});

export type DashboardGetAssetChartInput = z.infer<
  typeof DashboardGetAssetChartInputSchema
>;

// ============================================================================
// Backup Schemas
// ============================================================================

/**
 * Input schema for backup_download tool
 */
export const BackupDownloadInputSchema = z.object({
  outputPath: NonEmptyString,
});

export type BackupDownloadInput = z.infer<typeof BackupDownloadInputSchema>;

/**
 * Input schema for backup_restore tool
 */
export const BackupRestoreInputSchema = z.object({
  filePath: NonEmptyString,
});

export type BackupRestoreInput = z.infer<typeof BackupRestoreInputSchema>;

// ============================================================================
// Tool Schema Registry
// ============================================================================

/**
 * Registry of all tool input schemas
 */
export const ToolSchemas = {
  // Initialization
  init_get_data: InitGetDataInputSchema,

  // Transactions
  transaction_list: TransactionListInputSchema,
  transaction_create: TransactionCreateInputSchema,
  transaction_update: TransactionUpdateInputSchema,
  transaction_delete: TransactionDeleteInputSchema,

  // Summary
  summary_get_period: SummaryGetPeriodInputSchema,
  summary_export_excel: SummaryExportExcelInputSchema,

  // Assets
  asset_list: AssetListInputSchema,
  asset_create: AssetCreateInputSchema,
  asset_update: AssetUpdateInputSchema,
  asset_delete: AssetDeleteInputSchema,

  // Credit Cards
  card_list: CardListInputSchema,
  card_create: CardCreateInputSchema,
  card_update: CardUpdateInputSchema,

  // Transfers
  transfer_create: TransferCreateInputSchema,
  transfer_update: TransferUpdateInputSchema,

  // Dashboard
  dashboard_get_overview: DashboardGetOverviewInputSchema,
  dashboard_get_asset_chart: DashboardGetAssetChartInputSchema,

  // Backup
  backup_download: BackupDownloadInputSchema,
  backup_restore: BackupRestoreInputSchema,
} as const;

/**
 * Type for tool names
 */
export type ToolName = keyof typeof ToolSchemas;

/**
 * Helper function to validate tool input
 */
export function validateToolInput<T extends ToolName>(
  toolName: T,
  input: unknown,
): z.infer<(typeof ToolSchemas)[T]> {
  const schema = ToolSchemas[toolName];
  return schema.parse(input);
}

/**
 * Helper function to safely validate tool input (returns result object)
 */
export function safeValidateToolInput<T extends ToolName>(
  toolName: T,
  input: unknown,
): z.SafeParseReturnType<unknown, z.infer<(typeof ToolSchemas)[T]>> {
  const schema = ToolSchemas[toolName];
  return schema.safeParse(input);
}
