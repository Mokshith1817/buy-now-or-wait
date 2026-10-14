/**
 * @file forecast.ts
 * @description Statistical forecasting engine implementing Holt-Winters Additive model, parameter grid search, and rolling-origin backtesting.
 */

import fs from "fs";
import path from "path";
import { generateSampleData } from "../../scripts/generate-sample-data";
import {
  SEASONAL_PERIOD,
  MIN_OBSERVATIONS_FOR_SEASONAL,
  FORECAST_HORIZON_WEEKS,
  BACKTEST_WINDOW_WEEKS,
  HW_GRID_ALPHAS,
  HW_GRID_BETAS,
  HW_GRID_GAMMAS,
  PREDICTION_INTERVAL_Z_MULTIPLIER,
  CONFIDENCE_HIGH_MAPE_THRESHOLD,
  CONFIDENCE_MEDIUM_MAPE_THRESHOLD,
  MS_PER_WEEK,
} from "./constants";
import {
  ForecastPoint,
  HistoryPoint,
  BacktestResult,
  ConfidenceLevel,
  ItemForecast,
} from "./types";

export type {
  ForecastPoint,
  HistoryPoint,
  BacktestResult,
  ConfidenceLevel,
  ItemForecast,
};

interface RawDataRow {
  week_start: string;
  item: string;
  price: number;
}

export interface FittedHW {
  level: number;
  trend: number;
  seasonals: number[];
  fitted: number[];
  residuals: number[];
  residualStd: number;
  alpha: number;
  beta: number;
  gamma: number;
}

// In-memory cache for deterministic memoization
const forecastCache = new Map<string, ItemForecast>();
let cachedDataSource: string | null = null;
let cachedRawData: Map<string, RawDataRow[]> | null = null;

/**
 * Reads data source label from data/DATA_SOURCE.txt to identify synthetic vs live data.
 *
 * @returns Object with sourceName and boolean isSynthetic flag.
 */
export function getDataSourceInfo(): { sourceName: string; isSynthetic: boolean } {
  if (cachedDataSource) {
    return {
      sourceName: cachedDataSource,
      isSynthetic: cachedDataSource.toLowerCase().startsWith("synthetic"),
    };
  }

  const sourceFile = path.resolve(process.cwd(), "data", "DATA_SOURCE.txt");
  if (fs.existsSync(sourceFile)) {
    const content = fs.readFileSync(sourceFile, "utf8");
    const firstLine = content.split("\n")[0].trim();
    cachedDataSource = firstLine || "synthetic";
  } else {
    cachedDataSource = "synthetic";
  }

  return {
    sourceName: cachedDataSource,
    isSynthetic: cachedDataSource.toLowerCase().startsWith("synthetic"),
  };
}

/**
 * Loads price history from data/prices.csv, generating sample data deterministically if missing.
 *
 * @returns Map of vegetable item id to array of chronological price rows.
 */
export function loadPricesData(): Map<string, RawDataRow[]> {
  if (cachedRawData) return cachedRawData;

  const dataDir = path.resolve(process.cwd(), "data");
  const csvPath = path.join(dataDir, "prices.csv");

  if (!fs.existsSync(csvPath)) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const { csvContent, sourceContent } = generateSampleData();
    fs.writeFileSync(csvPath, csvContent, "utf8");
    fs.writeFileSync(path.join(dataDir, "DATA_SOURCE.txt"), sourceContent, "utf8");
  }

  const content = fs.readFileSync(csvPath, "utf8");
  const lines = content.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  const map = new Map<string, RawDataRow[]>();

  // Skip CSV header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length < 3) continue;
    const week_start = parts[0].trim();
    const item = parts[1].trim();
    const price = parseFloat(parts[2].trim());
    if (isNaN(price)) continue;

    if (!map.has(item)) {
      map.set(item, []);
    }
    map.get(item)!.push({ week_start, item, price });
  }

  for (const [, rows] of map.entries()) {
    rows.sort((a, b) => a.week_start.localeCompare(b.week_start));
  }

  cachedRawData = map;
  return map;
}

/**
 * Fits Holt-Winters Additive model with seasonal period m = 52.
 * Falls back to damped trend linear model if series length < 104 points.
 *
 * @param series Historical price observations.
 * @param m Seasonal period length (default: 52 weeks).
 * @param alpha Level smoothing coefficient.
 * @param beta Trend smoothing coefficient.
 * @param gamma Seasonal smoothing coefficient.
 * @returns FittedHW object with fitted values, residuals, and residual standard deviation.
 */
export function fitHoltWintersAdditive(
  series: number[],
  m = SEASONAL_PERIOD,
  alpha = 0.3,
  beta = 0.05,
  gamma = 0.3
): FittedHW {
  const n = series.length;
  if (n < MIN_OBSERVATIONS_FOR_SEASONAL) {
    return fitDampedTrend(series, alpha, beta);
  }

  // Initial Level: mean of first annual cycle
  let initialLevel = 0;
  for (let i = 0; i < m; i++) initialLevel += series[i];
  initialLevel /= m;

  // Initial Trend: average year-over-year change per step
  let initialTrend = 0;
  for (let i = 0; i < m; i++) {
    initialTrend += (series[m + i] - series[i]) / m;
  }
  initialTrend /= m;

  // Initial Seasonals: average deviation from year averages over first 2 cycles
  const year1Avg = initialLevel;
  let year2Avg = 0;
  for (let i = 0; i < m; i++) year2Avg += series[m + i];
  year2Avg /= m;

  const initS: number[] = new Array(m);
  let sSum = 0;
  for (let i = 0; i < m; i++) {
    const dev1 = series[i] - year1Avg;
    const dev2 = series[m + i] - year2Avg;
    initS[i] = (dev1 + dev2) / 2;
    sSum += initS[i];
  }

  // Normalize so seasonals sum strictly to 0
  const sMean = sSum / m;
  for (let i = 0; i < m; i++) {
    initS[i] -= sMean;
  }

  const seasonals = [...initS];
  let level = initialLevel;
  let trend = initialTrend;

  const fitted: number[] = new Array(n);
  const residuals: number[] = new Array(n);

  for (let t = 0; t < n; t++) {
    const sIdx = t % m;
    const sVal = seasonals[sIdx];
    const yHat = level + trend + sVal;
    fitted[t] = yHat;
    residuals[t] = series[t] - yHat;

    const y = series[t];
    const prevLevel = level;
    const prevTrend = trend;

    level = alpha * (y - sVal) + (1 - alpha) * (prevLevel + prevTrend);
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
    seasonals[sIdx] = gamma * (y - level) + (1 - gamma) * sVal;
  }

  let sumSq = 0;
  for (let t = 0; t < n; t++) {
    sumSq += residuals[t] * residuals[t];
  }
  const residualStd = Math.sqrt(sumSq / n);

  return {
    level,
    trend,
    seasonals,
    fitted,
    residuals,
    residualStd,
    alpha,
    beta,
    gamma,
  };
}

/**
 * Fallback damped trend linear model when fewer than 104 data points are available.
 *
 * @param series Historical price observations.
 * @param alpha Level smoothing coefficient.
 * @param beta Trend smoothing coefficient.
 * @param phi Trend damping parameter.
 * @returns FittedHW structure without seasonality.
 */
function fitDampedTrend(series: number[], alpha = 0.3, beta = 0.05, phi = 0.95): FittedHW {
  const n = series.length;
  let level = series[0] || 0;
  let trend = n > 1 ? series[1] - series[0] : 0;

  const fitted: number[] = new Array(n);
  const residuals: number[] = new Array(n);

  for (let t = 0; t < n; t++) {
    const yHat = level + phi * trend;
    fitted[t] = yHat;
    residuals[t] = series[t] - yHat;

    const y = series[t];
    const prevLevel = level;
    level = alpha * y + (1 - alpha) * (prevLevel + phi * trend);
    trend = beta * (level - prevLevel) + (1 - beta) * phi * trend;
  }

  let sumSq = 0;
  for (let t = 0; t < n; t++) sumSq += residuals[t] * residuals[t];
  const residualStd = Math.sqrt(sumSq / Math.max(1, n));

  return {
    level,
    trend,
    seasonals: new Array(SEASONAL_PERIOD).fill(0),
    fitted,
    residuals,
    residualStd,
    alpha,
    beta,
    gamma: 0,
  };
}

/**
 * Fits Holt-Winters model with grid search across alpha, beta, gamma minimizing in-sample SSE.
 *
 * @param series Time series data array.
 * @param m Seasonal period length (default: 52).
 * @returns Best fitted model parameters and state.
 */
export function fitBestHW(series: number[], m = SEASONAL_PERIOD): FittedHW {
  if (series.length < MIN_OBSERVATIONS_FOR_SEASONAL) {
    return fitDampedTrend(series);
  }

  let bestFit: FittedHW | null = null;
  let minSSE = Infinity;

  for (const a of HW_GRID_ALPHAS) {
    for (const b of HW_GRID_BETAS) {
      for (const g of HW_GRID_GAMMAS) {
        const fit = fitHoltWintersAdditive(series, m, a, b, g);
        let sse = 0;
        // Evaluate from m onwards to allow initial states to stabilize
        for (let t = m; t < series.length; t++) {
          const err = fit.residuals[t];
          sse += err * err;
        }
        if (sse < minSSE) {
          minSSE = sse;
          bestFit = fit;
        }
      }
    }
  }

  return bestFit || fitHoltWintersAdditive(series, m, 0.3, 0.05, 0.3);
}

/**
 * Runs 12-week rolling-origin backtest against a Naive persistence baseline.
 *
 * @param series Full historical price array.
 * @param m Seasonal period length (default: 52).
 * @returns BacktestResult with modelMAPE, naiveMAPE, and beatsNaive flag.
 */
export function runBacktest(series: number[], m = SEASONAL_PERIOD): BacktestResult {
  const K = BACKTEST_WINDOW_WEEKS;
  const n = series.length;
  if (n <= K + 10) {
    return { modelMAPE: 0, naiveMAPE: 0, beatsNaive: true };
  }

  let modelApeSum = 0;
  let naiveApeSum = 0;

  for (let k = K; k >= 1; k--) {
    const targetIdx = n - k;
    const actual = series[targetIdx];
    const trainData = series.slice(0, targetIdx);

    const fit = fitBestHW(trainData, m);

    const nextSeasonIdx = targetIdx % m;
    const seasonComponent = fit.seasonals[nextSeasonIdx] ?? 0;
    const modelForecast = Math.max(0, fit.level + fit.trend + seasonComponent);

    const naiveForecast = trainData[trainData.length - 1];

    if (actual > 0) {
      const modelApe = (Math.abs(actual - modelForecast) / actual) * 100;
      const naiveApe = (Math.abs(actual - naiveForecast) / actual) * 100;
      modelApeSum += modelApe;
      naiveApeSum += naiveApe;
    }
  }

  const modelMAPE = Number((modelApeSum / K).toFixed(2));
  const naiveMAPE = Number((naiveApeSum / K).toFixed(2));
  const beatsNaive = modelMAPE < naiveMAPE;

  return { modelMAPE, naiveMAPE, beatsNaive };
}

/**
 * Evaluates backtest metrics to assign High, Medium, or Low confidence.
 * Never grants High confidence if the model fails to beat the Naive baseline.
 *
 * @param backtest Backtest outcome containing modelMAPE and beatsNaive.
 * @returns ConfidenceLevel ("High" | "Medium" | "Low").
 */
export function computeConfidence(backtest: BacktestResult): ConfidenceLevel {
  let conf: ConfidenceLevel;
  if (backtest.modelMAPE < CONFIDENCE_HIGH_MAPE_THRESHOLD && backtest.beatsNaive) {
    conf = "High";
  } else if (backtest.modelMAPE < CONFIDENCE_MEDIUM_MAPE_THRESHOLD) {
    conf = "Medium";
  } else {
    conf = "Low";
  }

  if (!backtest.beatsNaive && conf === "High") {
    conf = "Medium";
  }

  return conf;
}

/**
 * Computes 4-week forecast, prediction intervals, 7-day change, and backtest metrics for an item.
 * Deterministically memoized in-memory on first request.
 *
 * @param item Identifier of the vegetable commodity.
 * @returns Complete ItemForecast payload.
 */
export function getForecastForItem(item: string): ItemForecast {
  if (forecastCache.has(item)) {
    return forecastCache.get(item)!;
  }

  const pricesMap = loadPricesData();
  const rows = pricesMap.get(item);

  if (!rows || rows.length === 0) {
    throw new Error(`No price data found for item: ${item}`);
  }

  const series = rows.map((r) => r.price);
  const n = series.length;
  const m = SEASONAL_PERIOD;

  const fit = fitBestHW(series, m);
  const backtest = runBacktest(series, m);
  const confidence = computeConfidence(backtest);

  const lastRow = rows[n - 1];
  const lastDate = new Date(lastRow.week_start + "T00:00:00Z");

  const forecast: ForecastPoint[] = [];
  for (let h = 1; h <= FORECAST_HORIZON_WEEKS; h++) {
    const targetIdx = n - 1 + h;
    const sIdx = targetIdx % m;
    const seasonVal = fit.seasonals[sIdx] ?? 0;
    const rawPoint = fit.level + h * fit.trend + seasonVal;
    const point = Number(Math.max(0, rawPoint).toFixed(2));

    const margin = PREDICTION_INTERVAL_Z_MULTIPLIER * fit.residualStd * Math.sqrt(h);
    const lower = Number(Math.max(0, point - margin).toFixed(2));
    const upper = Number(Math.max(point, point + margin).toFixed(2));

    const forecastDate = new Date(lastDate.getTime() + h * MS_PER_WEEK);
    const yyyy = forecastDate.getUTCFullYear();
    const mm = String(forecastDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(forecastDate.getUTCDate()).padStart(2, "0");
    const week_start = `${yyyy}-${mm}-${dd}`;

    forecast.push({
      week: h,
      week_start,
      point,
      lower,
      upper,
    });
  }

  const latestPrice = Number(series[n - 1].toFixed(2));
  const week1Forecast = forecast[0].point;
  const change7 = Number((((week1Forecast - latestPrice) / latestPrice) * 100).toFixed(2));

  const historySlice = rows.slice(-SEASONAL_PERIOD).map((r) => ({
    week_start: r.week_start,
    price: r.price,
  }));

  const { sourceName, isSynthetic } = getDataSourceInfo();

  const result: ItemForecast = {
    item,
    dataSource: sourceName,
    isSynthetic,
    history: historySlice,
    forecast,
    latestPrice,
    change7,
    backtest,
    confidence,
  };

  forecastCache.set(item, result);
  return result;
}

/**
 * Clears in-memory memoization cache for test isolation.
 */
export function clearForecastCache(): void {
  forecastCache.clear();
  cachedRawData = null;
  cachedDataSource = null;
}
