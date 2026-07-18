import { z } from "zod";
import * as path from "path";

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
  message: "inOutCode must be '0' (Income) or '1' (Expense)",
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
 *
 * `outputPath` must resolve inside the server's working directory. This stops
 * a caller from exporting financial data to an arbitrary location (e.g.
 * `../../../../etc/...` or an absolute path) — only a relative path under the
 * cwd is accepted. The check runs in validation so a malicious or
 * prompt-injected client is rejected before the handler runs.
 */
export const SummaryExportExcelInputSchema = z
  .object({
    startDate: DateSchema,
    endDate: DateSchema,
    mbid: MbidSchema,
    assetId: z.string().optional(),
    inOutType: z.string().optional(),
    outputPath: NonEmptyString,
  })
  .refine(
    (data) => {
      const resolved = path.resolve(process.cwd(), data.outputPath);
      const cwd = process.cwd();
      // `resolved` must equal cwd or live directly under it (with a separator).
      return (
        resolved === cwd ||
        resolved.startsWith(cwd + path.sep) ||
        resolved.startsWith(cwd + "/")
      );
    },
    {
      message:
        "outputPath must be a relative path inside the working directory (absolute paths and parent-directory traversal are not allowed).",
      path: ["outputPath"],
    },
  );

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
 * Input schema for card_list tool (no parameters)
 */
export const CardListInputSchema = z.object({});

export type CardListInput = z.infer<typeof CardListInputSchema>;

/**
 * Day of month (1-31).
 *
 * Defined INLINE in card_create / card_update rather than as a shared
 * `DayOfMonthSchema` constant. Zod's JSON-Schema converter deduplicates shared
 * subschemas into `$ref` pointers — and many MCP clients don't resolve `$ref`,
 * so they see `{"$ref": ...}` with no explicit type, default to a string, and
 * send `"15"` instead of `15`. Zod then (correctly) rejects the string. For
 * string fields this is harmless (mis-serializing as a string is still valid),
 * but for integer fields like these it breaks card_create. Fresh inline
 * instances each get their own explicit `{"type":"integer"}` in the advertised
 * schema. See docs/USAGE.md "Known limitations" for context.
 */
export const CardCreateInputSchema = z.object({
  cardName: NonEmptyString,
  linkAssetId: AssetIdSchema,
  linkAssetName: NonEmptyString,
  notPayMoney: z.number(),
  jungsanDay: z.number().int().min(1).max(31).optional(),
  paymentDay: z.number().int().min(1).max(31).optional(),
});

export type CardCreateInput = z.infer<typeof CardCreateInputSchema>;

/**
 * Input schema for card_update tool. See card_create for why the day-of-month
 * fields are defined inline.
 */
export const CardUpdateInputSchema = z.object({
  assetId: AssetIdSchema,
  cardName: NonEmptyString,
  linkAssetId: AssetIdSchema,
  linkAssetName: NonEmptyString,
  jungsanDay: z.number().int().min(1).max(31).optional(),
  paymentDay: z.number().int().min(1).max(31).optional(),
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

