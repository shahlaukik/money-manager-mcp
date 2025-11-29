/**
 * Type definitions for the Money Manager MCP server
 * Based on the API documentation and architecture specifications
 */

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Transaction type codes used by the API
 */
export enum InOutCode {
  INCOME = '0',
  EXPENSE = '1',
  UNKNOWN = '2',
  TRANSFER_OUT = '3',
  TRANSFER_IN = '4',
  CARD_PAYMENT_OUT = '7',
  CARD_PAYMENT_IN = '8',
}

/**
 * Transaction record from the API
 */
export interface Transaction {
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
  mbCash: number;
  inOutCode: string;
  inOutType: string;
  mbDetailContent?: string;
}

/**
 * Input for creating a new transaction
 */
export interface TransactionCreateInput {
  mbDate: string;
  assetId: string;
  payType: string;
  mcid: string;
  mbCategory: string;
  mbCash: number;
  inOutCode: '0' | '1';
  inOutType: string;
  mcscid?: string;
  subCategory?: string;
  mbContent?: string;
  mbDetailContent?: string;
}

/**
 * Input for updating a transaction
 */
export interface TransactionUpdateInput {
  id: string;
  mbDate: string;
  assetId: string;
  payType: string;
  mcid: string;
  mbCategory: string;
  mbCash: number;
  inOutCode: string;
  inOutType: string;
  mcscid?: string;
  subCategory?: string;
  mbContent?: string;
  mbDetailContent?: string;
}

/**
 * Response for transaction list
 */
export interface TransactionListResponse {
  count: number;
  transactions: Transaction[];
}

/**
 * Response for transaction create/update/delete operations
 */
export interface TransactionOperationResponse {
  success: boolean;
  transactionId?: string;
  deletedCount?: number;
  message?: string;
}

// ============================================================================
// Asset Types
// ============================================================================

/**
 * Asset type - can be a group or an individual item
 */
export type AssetType = 'group' | 'item';

/**
 * Asset record from the API
 */
export interface Asset {
  assetId: string;
  assetGroupId?: string;
  assetType: AssetType;
  assetName: string;
  assetMoney: number;
  linkAssetId?: string;
  linkAssetName?: string;
  color?: string;
  children?: Asset[];
}

/**
 * Asset group containing multiple assets
 */
export interface AssetGroup {
  assetGroupId: string;
  assetType: 'group';
  assetName: string;
  assetMoney: number;
  color?: string;
  children: Asset[];
}

/**
 * Input for creating a new asset
 */
export interface AssetCreateInput {
  assetGroupId: string;
  assetGroupName: string;
  assetName: string;
  assetMoney: number;
  linkAssetId?: string;
  linkAssetName?: string;
}

/**
 * Input for updating an asset
 */
export interface AssetUpdateInput extends AssetCreateInput {
  assetId: string;
}

/**
 * Response for asset operations
 */
export interface AssetOperationResponse {
  success: boolean;
  assetId?: string;
  message?: string;
}

/**
 * Response for asset list
 */
export interface AssetListResponse {
  assetGroups: AssetGroup[];
  totalBalance: number;
}

// ============================================================================
// Credit Card Types
// ============================================================================

/**
 * Credit card record from the API
 */
export interface CreditCard {
  assetId: string;
  assetName: string;
  assetMoney: number;
  notPayMoney: number;
  linkAssetId: string;
  linkAssetName?: string;
  jungsanDay?: number;
  paymentDay?: number;
  color?: string;
}

/**
 * Credit card group
 */
export interface CardGroup {
  assetGroupId: string;
  assetType: 'group';
  assetName: string;
  assetMoney: number;
  notPayMoney: number;
  color?: string;
  children: CreditCard[];
}

/**
 * Input for creating a new credit card
 */
export interface CardCreateInput {
  cardName: string;
  linkAssetId: string;
  linkAssetName: string;
  notPayMoney: number;
  jungsanDay?: number;
  paymentDay?: number;
}

/**
 * Input for updating a credit card
 */
export interface CardUpdateInput {
  assetId: string;
  cardName: string;
  linkAssetId: string;
  linkAssetName: string;
  jungsanDay?: number;
  paymentDay?: number;
}

/**
 * Response for card operations
 */
export interface CardOperationResponse {
  success: boolean;
  cardId?: string;
  message?: string;
}

/**
 * Response for card list
 */
export interface CardListResponse {
  cardGroups: CardGroup[];
  totalUnpaid: number;
}

// ============================================================================
// Category Types
// ============================================================================

/**
 * Sub-category record
 */
export interface SubCategory {
  mcscid: string;
  mcscname: string;
}

/**
 * Category record with optional sub-categories
 */
export interface Category {
  mcid: string;
  mcname: string;
  mcsc?: SubCategory[];
}

/**
 * Payment type record
 */
export interface PaymentType {
  ptid: string;
  ptname: string;
}

/**
 * Money book record (for multi-book support)
 */
export interface MoneyBook {
  mbid: string;
  mbname: string;
}

/**
 * Asset name reference (simplified asset info)
 */
export interface AssetName {
  assetId: string;
  assetType: string;
  assetName: string;
}

// ============================================================================
// Initialization Types
// ============================================================================

/**
 * Initial data configuration
 */
export interface InitData {
  mbid: string;
  initStartDate: string;
  initEndDate: string;
}

/**
 * Response for getInitData API call
 */
export interface InitDataResponse {
  initData: InitData;
  categories: {
    income: Category[];
    expense: Category[];
  };
  paymentTypes: PaymentType[];
  multiBooks: MoneyBook[];
  assetGroups: AssetGroup[];
  assetNames: AssetName[];
}

/**
 * Raw response from getInitData API (before transformation)
 */
export interface RawInitDataResponse {
  initData: InitData;
  category_0: Category[];
  category_1: Category[];
  payType: PaymentType[];
  multiBooks?: MoneyBook[];
  assetGroups?: AssetGroup[];
  assetNames?: AssetName[];
  inOutText?: unknown[];
}

// ============================================================================
// Summary Types
// ============================================================================

/**
 * Summary statistics
 */
export interface Summary {
  startDate: string;
  endDate: string;
  income: number;
  outcome: number;
  cash: number;
  card: number;
  etcExpense?: number;
  etcExpenseOpt?: boolean;
  sum: number;
}

/**
 * Category-level summary
 */
export interface CategorySummary {
  mcname: string;
  mcSum: number;
  budget?: number;
}

/**
 * Response for getSummaryDataByPeriod API call
 */
export interface SummaryResponse {
  summary: Summary;
  incomeByCategory: CategorySummary[];
  expenseByCategory: CategorySummary[];
}

/**
 * Raw summary response from API (before transformation)
 */
export interface RawSummaryResponse {
  summary: Summary;
  income: CategorySummary[];
  outcome: CategorySummary[];
}

// ============================================================================
// Transfer Types
// ============================================================================

/**
 * Input for creating a transfer between assets
 */
export interface TransferCreateInput {
  moveDate: string;
  fromAssetId: string;
  fromAssetName: string;
  toAssetId: string;
  toAssetName: string;
  moveMoney: number;
  moneyContent?: string;
  mbDetailContent?: string;
}

/**
 * Input for updating a transfer
 */
export interface TransferUpdateInput extends TransferCreateInput {
  id: string;
}

/**
 * Response for transfer operations
 */
export interface TransferOperationResponse {
  success: boolean;
  transferId?: string;
  message?: string;
}

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * Asset summary for dashboard
 */
export interface AssetSummary {
  totalAsset: number;
  asset: number;
  debt: number;
}

/**
 * Monthly trend data point
 */
export interface MonthlyData {
  month: string;
  total: number;
  asset: number;
  debt: number;
}

/**
 * Asset ratio data for charts
 */
export interface AssetRatio {
  assetName: string;
  assetMoney: number;
}

/**
 * Debt ratio data for charts
 */
export interface DebtRatio {
  assetName: string;
  assetMoney: number;
}

/**
 * Response for getDashBoardData API call
 */
export interface DashboardResponse {
  assetSummary: AssetSummary;
  monthlyTrend: MonthlyData[];
  assetRatio: AssetRatio[];
  debtRatio: DebtRatio[];
}

/**
 * Raw dashboard response from API (before transformation)
 */
export interface RawDashboardResponse {
  assetSummary: AssetSummary;
  assetLine: MonthlyData[];
  assetRatio: AssetRatio[];
  debtRatio: DebtRatio[];
}

/**
 * Monthly asset data point for individual asset charts
 */
export interface MonthlyAssetData {
  month: string;
  assetMoney: number;
}

/**
 * Response for getEachAssetChartData API call
 */
export interface AssetChartResponse {
  assetId: string;
  chartData: MonthlyAssetData[];
}

/**
 * Raw asset chart response from API
 */
export interface RawAssetChartResponse {
  assetChartData: MonthlyAssetData[];
}

// ============================================================================
// Backup Types
// ============================================================================

/**
 * Response for backup download operation
 */
export interface BackupDownloadResponse {
  success: boolean;
  filePath: string;
  fileSize: number;
  message?: string;
}

/**
 * Response for backup restore operation
 */
export interface BackupRestoreResponse {
  success: boolean;
  message?: string;
}

// ============================================================================
// Export Types
// ============================================================================

/**
 * Input for Excel export
 */
export interface ExcelExportInput {
  startDate: string;
  endDate: string;
  mbid: string;
  assetId?: string;
  inOutType?: string;
  outputPath: string;
}

/**
 * Response for Excel export operation
 */
export interface ExcelExportResponse {
  success: boolean;
  filePath: string;
  fileSize: number;
  message?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Server configuration
 */
export interface ServerConfig {
  baseUrl: string;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  persist: boolean;
  cookieFile: string;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
}

/**
 * Default values configuration
 */
export interface DefaultsConfig {
  mbid?: string;
  dateFormat: string;
}

/**
 * Complete application configuration
 */
export interface AppConfig {
  server: ServerConfig;
  session?: SessionConfig;
  logging?: LoggingConfig;
  defaults?: DefaultsConfig;
}

// ============================================================================
// API Response Wrapper Types
// ============================================================================

/**
 * Generic API success response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Generic API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Union type for API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Tool Input/Output Types
// ============================================================================

/**
 * Common tool result type
 */
export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}