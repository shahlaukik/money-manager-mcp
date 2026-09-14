import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";

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
 * True if `outputPath` resolves to a location inside the current working
 * directory. Symlinks on the deepest existing ancestor are resolved too, so a
 * pre-existing link under the cwd pointing elsewhere fails the check instead
 * of smuggling the export outside the working directory.
 *
 * Existence is probed with `lstatSync` (which does not follow symlinks), so a
 * dangling symlink at any point along the path stops the walk and gets fully
 * resolved — a dangling link would otherwise pass an `existsSync` probe (its
 * target doesn't exist) and be followed by the eventual write. Any lookup
 * error fails closed.
 */
export function resolvesInsideWorkingDirectory(outputPath: string): boolean {
  try {
    const cwd = fs.realpathSync(process.cwd());
    const resolved = path.resolve(process.cwd(), outputPath);

    // The export file usually doesn't exist yet; walk up to the deepest
    // ancestor that exists and resolve symlinks from there.
    let existing = resolved;
    for (;;) {
      try {
        fs.lstatSync(existing);
        break;
      } catch {
        const parent = path.dirname(existing);
        if (parent === existing) {
          break; // reached the filesystem root
        }
        existing = parent;
      }
    }
    const target = path.join(
      fs.realpathSync(existing),
      resolved.slice(existing.length),
    );

    // `target` must equal the real cwd or live under it (with a separator).
    return (
      target === cwd ||
      target.startsWith(cwd + path.sep) ||
      target.startsWith(cwd + "/")
    );
  } catch {
    return false;
  }
}

/**
 * Input schema for summary_export_excel tool
 *
 * `outputPath` must be a relative `.xls`/`.xlsx` path that resolves inside the
 * server's working directory. This stops a caller from exporting financial
 * data to an arbitrary location (e.g. `../../../../etc/...`, an absolute path,
 * or a symlink planted under the cwd pointing outside it) and from using the
 * export as a primitive to overwrite non-export files (`.gitconfig`,
 * `package.json`, …) inside the working directory. The checks run in
 * validation so a malicious or prompt-injected client is rejected before the
 * handler runs; the write path re-runs the containment check at write time.
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
  .refine((data) => /\.(xlsx|xls)$/i.test(data.outputPath), {
    message:
      "outputPath must end in .xls or .xlsx (other extensions are not allowed).",
    path: ["outputPath"],
  })
  .refine((data) => resolvesInsideWorkingDirectory(data.outputPath), {
    message:
      "outputPath must be a relative path inside the working directory (absolute paths and parent-directory traversal are not allowed).",
    path: ["outputPath"],
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
 * Input schema for card_list tool (no parameters)
 */
export const CardListInputSchema = z.object({});

export type CardListInput = z.infer<typeof CardListInputSchema>;

/**
 * Day of month (1-31), shared by card_create / card_update.
 *
 * Zod v4's JSON-Schema conversion — which FastMCP uses for v4 schemas —
 * inlines reused subschemas by default, so each usage is advertised as an
 * explicit `{"type":"integer"}`. (Under zod v3 the converter deduplicated
 * shared subschemas into `$ref` pointers that many MCP clients don't resolve,
 * so these fields had to be defined inline per schema.)
 */
export const DayOfMonthSchema = z.number().int().min(1).max(31);

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
