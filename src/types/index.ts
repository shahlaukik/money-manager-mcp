/**
 * Domain type definitions for the Money Manager MCP server.
 *
 * Input types live in `schemas/index.ts` (inferred from the Zod schemas, which
 * are the single source of truth). This file holds the response/domain shapes
 * used by handlers and the HTTP client.
 */

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Transaction record from the API.
 *
 * `inOutCode` is kept as a loose string (rather than the `InOutCode` enum below)
 * because the API uses a wider range of codes than "income"/"expense" (transfers,
 * card payments, etc.); the schemas constrain it only where that matters.
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

// ============================================================================
// Asset Types
// ============================================================================

/** Asset type — can be a group or an individual item. */
export type AssetType = "group" | "item";

/** Asset record from the API. */
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

/** Asset group containing multiple assets. */
export interface AssetGroup {
  assetGroupId: string;
  assetType: "group";
  assetName: string;
  assetMoney: number;
  color?: string;
  children: Asset[];
}

// ============================================================================
// Credit Card Types
// ============================================================================

/** Credit card record from the API. */
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

/** Credit card group. */
export interface CardGroup {
  assetGroupId: string;
  assetType: "group";
  assetName: string;
  assetMoney: number;
  notPayMoney: number;
  color?: string;
  children: CreditCard[];
}

// ============================================================================
// Initialization Types
// ============================================================================

/** Sub-category record. */
export interface SubCategory {
  mcscid: string;
  mcscname: string;
}

/** Category record with optional sub-categories. */
export interface Category {
  mcid: string;
  mcname: string;
  mcsc?: SubCategory[];
}

/** Payment type record. */
export interface PaymentType {
  ptid: string;
  ptname: string;
}

/** Money book record (for multi-book support). */
export interface MoneyBook {
  mbid: string;
  mbname: string;
}

/** Asset name reference (simplified asset info). */
export interface AssetName {
  assetId: string;
  assetType: string;
  assetName: string;
}

/** Initial data configuration. */
export interface InitData {
  mbid: string;
  initStartDate: string;
  initEndDate: string;
}

/**
 * Raw response from getInitData (before transformation).
 * JS-literal parsed by the HTTP client.
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

/** Summary statistics. */
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

/** Category-level summary. */
export interface CategorySummary {
  mcname: string;
  mcSum: number;
  budget?: number;
}

/** Raw summary response from API (before transformation). */
export interface RawSummaryResponse {
  summary: Summary;
  income: CategorySummary[];
  outcome: CategorySummary[];
}

// ============================================================================
// Dashboard Types
// ============================================================================

/** Asset summary for dashboard. */
export interface AssetSummary {
  totalAsset: number;
  asset: number;
  debt: number;
}

/** Monthly trend data point. */
export interface MonthlyData {
  month: string;
  total: number;
  asset: number;
  debt: number;
}

/** Asset ratio data for charts. */
export interface AssetRatio {
  assetName: string;
  assetMoney: number;
}

/** Debt ratio data for charts. */
export interface DebtRatio {
  assetName: string;
  assetMoney: number;
}

/** Raw dashboard response from API (before transformation). */
export interface RawDashboardResponse {
  assetSummary: AssetSummary;
  assetLine: MonthlyData[];
  assetRatio: AssetRatio[];
  debtRatio: DebtRatio[];
}

/** Monthly asset data point for individual asset charts. */
export interface MonthlyAssetData {
  month: string;
  assetMoney: number;
}

/** Raw asset chart response from API. */
export interface RawAssetChartResponse {
  assetChartData: MonthlyAssetData[];
}
