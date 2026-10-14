/**
 * @file types.ts
 * @description Shared domain TypeScript interfaces and types across ML, API, and UI components.
 */

/** Supported interface languages. */
export type Language = "te" | "en";

/** Confidence levels for price forecast. */
export type ConfidenceLevel = "High" | "Medium" | "Low";

/** Actionable purchase verdict categories. */
export type VerdictType = "BUY_NOW" | "WAIT" | "BUY_LITTLE";

/** Price direction indicator over 7 days. */
export type PriceDirection = "up" | "down" | "stable";

/** Single weekly historical price observation. */
export interface HistoryPoint {
  week_start: string;
  price: number;
}

/** Forecast projection for an upcoming week with prediction intervals. */
export interface ForecastPoint {
  week: number;
  week_start: string;
  point: number;
  lower: number;
  upper: number;
}

/** 12-week rolling-origin out-of-sample backtest results. */
export interface BacktestResult {
  modelMAPE: number;
  naiveMAPE: number;
  beatsNaive: boolean;
}

/** Complete forecast payload computed for an item. */
export interface ItemForecast {
  item: string;
  dataSource: string;
  isSynthetic: boolean;
  history: HistoryPoint[];
  forecast: ForecastPoint[];
  latestPrice: number;
  change7: number;
  backtest: BacktestResult;
  confidence: ConfidenceLevel;
}

/** Result returned by the pure verdict determination engine. */
export interface VerdictResult {
  verdict: VerdictType;
  rawVerdict: VerdictType;
  downgraded: boolean;
  downgradeReason_en?: string;
  downgradeReason_te?: string;
  change7: number;
  confidence: ConfidenceLevel;
}

/** Parsed markdown agricultural note structure. */
export interface NoteDoc {
  id: string;
  title: string;
  items: string[] | "all";
  tags: string[];
  source: string;
  source_url: string;
  verified: boolean;
  content: string;
}

/** Retrieved agricultural knowledge reason for advice. */
export interface RetrievedReason {
  title: string;
  source: string;
  source_url: string;
  verified: boolean;
  score?: number;
}

/** Context parameters passed to the RAG retrieval engine. */
export interface RagContext {
  item: string;
  direction: PriceDirection;
  month?: number;
  extraQuery?: string;
}

/** Input parameters for explanation generation. */
export interface ExplanationInput {
  item: string;
  change7: number;
  confidence: ConfidenceLevel;
  lang: Language;
  reasons: RetrievedReason[];
  downgraded?: boolean;
}

/** Result of the explanation generator. */
export interface ExplanationResult {
  text: string;
  usedLLM: boolean;
}

/** Definition for each tracked vegetable commodity. */
export interface ItemDefinition {
  id: string;
  name_en: string;
  name_te: string;
  emoji: string;
  keywords: string[];
}

/** Target audience persona definition for the "Who is this for?" section. */
export interface TargetPersona {
  id: string;
  emoji: string;
  title_en: string;
  title_te: string;
  benefit_en: string;
  benefit_te: string;
}

/** API response payload for GET /api/forecast. */
export interface ForecastApiResponse {
  item: string;
  history: HistoryPoint[];
  forecast: ForecastPoint[];
  latestPrice: number;
  change7: number;
  backtest: BacktestResult;
  confidence: ConfidenceLevel;
  dataSource: string;
  isSynthetic: boolean;
}

/** API response payload for POST /api/advice. */
export interface AdviceApiResponse {
  verdict: VerdictType;
  change7: number;
  confidence: ConfidenceLevel;
  explanation: string;
  reasons: RetrievedReason[];
  usedLLM: boolean;
  dataSource: string;
  isSynthetic: boolean;
}

/** API response payload for GET /api/health. */
export interface HealthApiResponse {
  ok: boolean;
  items: number;
  dataSource: string;
  llm: boolean;
}

/** Uniform standardized JSON API error response structure. */
export interface ApiErrorResponse {
  error: string;
  message: string;
}
