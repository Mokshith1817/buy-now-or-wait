/**
 * @file constants.ts
 * @description Centralized domain constants, statistical model parameters, and threshold limits.
 */

/** Percentage threshold for a BUY_NOW verdict (+8% or higher projected price change). */
export const VERDICT_BUY_NOW_THRESHOLD = 8.0;

/** Percentage threshold for a WAIT verdict (-8% or lower projected price change). */
export const VERDICT_WAIT_THRESHOLD = -8.0;

/** Seasonality cycle period in weeks (52 weeks = 1 full year). */
export const SEASONAL_PERIOD = 52;

/** Minimum time-series observations required for seasonal model (2 full annual cycles = 104 weeks). */
export const MIN_OBSERVATIONS_FOR_SEASONAL = 104;

/** Number of weeks to project into the future. */
export const FORECAST_HORIZON_WEEKS = 4;

/** Number of historical weeks evaluated in rolling-origin backtest. */
export const BACKTEST_WINDOW_WEEKS = 12;

/** Grid search candidate values for Holt-Winters smoothing level parameter alpha. */
export const HW_GRID_ALPHAS = [0.1, 0.3, 0.5] as const;

/** Grid search candidate values for Holt-Winters smoothing trend parameter beta. */
export const HW_GRID_BETAS = [0.01, 0.05] as const;

/** Grid search candidate values for Holt-Winters smoothing seasonal parameter gamma. */
export const HW_GRID_GAMMAS = [0.1, 0.3, 0.5] as const;

/** Standard normal Z-score multiplier for 80% two-sided prediction interval (+/- 1.28 * std). */
export const PREDICTION_INTERVAL_Z_MULTIPLIER = 1.28;

/** Maximum MAPE percentage to qualify for High confidence (and must beat naive baseline). */
export const CONFIDENCE_HIGH_MAPE_THRESHOLD = 6.0;

/** Maximum MAPE percentage to qualify for Medium confidence. */
export const CONFIDENCE_MEDIUM_MAPE_THRESHOLD = 12.0;

/** Milliseconds in one calendar week (7 days * 24h * 3600s * 1000ms). */
export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Number of recent historical weeks rendered on the interactive SVG chart. */
export const CHART_HISTORY_WEEKS_DISPLAY = 26;

/** Maximum character length allowed for LLM explanation generation. */
export const MAX_LLM_OUTPUT_CHARS = 500;

/** Timeout in milliseconds for upstream Gemini REST API requests. */
export const LLM_REQUEST_TIMEOUT_MS = 8000;

/** Default Gemini model identifier when GEMINI_MODEL environment variable is unset. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
