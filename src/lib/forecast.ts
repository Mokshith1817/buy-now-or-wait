import fs from "fs";
import path from "path";
import { generateSampleData } from "../../scripts/generate-sample-data";

export interface ForecastPoint {
  week: number; // 1, 2, 3, 4
  week_start: string; // YYYY-MM-DD
  point: number;
  lower: number;
  upper: number;
}

export interface HistoryPoint {
  week_start: string;
  price: number;
}

export interface BacktestResult {
  modelMAPE: number;
  naiveMAPE: number;
  beatsNaive: boolean;
}

export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface ItemForecast {
  item: string;
  dataSource: string;
  isSynthetic: boolean;
  history: HistoryPoint[]; // last 52 weeks
  forecast: ForecastPoint[]; // 4 weeks
  latestPrice: number;
  change7: number;
  backtest: BacktestResult;
  confidence: ConfidenceLevel;
}

interface RawDataRow {
  week_start: string;
  item: string;
  price: number;
}

// In-memory cache for memoization
const forecastCache = new Map<string, ItemForecast>();
let cachedDataSource: string | null = null;
let cachedRawData: Map<string, RawDataRow[]> | null = null;

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

  // Skip header: week_start,item,price_inr_per_kg
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

  // Ensure rows are sorted by week_start ascending
  for (const [key, rows] of map.entries()) {
    rows.sort((a, b) => a.week_start.localeCompare(b.week_start));
  }

  cachedRawData = map;
  return map;
}

interface HoltWintersParams {
  alpha: number;
  beta: number;
  gamma: number;
}

interface FittedHW {
  level: number;
  trend: number;
  seasonals: number[]; // length m (52)
  fitted: number[];
  residuals: number[];
  residualStd: number;
  alpha: number;
  beta: number;
  gamma: number;
}

/**
 * Holt-Winters Additive model with period m = 52.
 */
export function fitHoltWintersAdditive(
  series: number[],
  m = 52,
  alpha = 0.3,
  beta = 0.05,
  gamma = 0.3
): FittedHW {
  const n = series.length;
  if (n < 2 * m) {
    return fitDampedTrend(series, alpha, beta);
  }

  // Initial Level: average of first year
  let initialLevel = 0;
  for (let i = 0; i < m; i++) initialLevel += series[i];
  initialLevel /= m;

  // Initial Trend: average difference between year 2 and year 1
  let initialTrend = 0;
  for (let i = 0; i < m; i++) {
    initialTrend += (series[m + i] - series[i]) / m;
  }
  initialTrend /= m;

  // Initial Seasonals: average deviation from year averages over first 2 years
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
  // Normalize so seasonals sum to 0
  const sMean = sSum / m;
  for (let i = 0; i < m; i++) {
    initS[i] -= sMean;
  }

  // State arrays:
  // We keep seasonals ring of size m
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

    // Update level
    level = alpha * (y - sVal) + (1 - alpha) * (prevLevel + prevTrend);
    // Update trend
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
    // Update seasonal
    seasonals[sIdx] = gamma * (y - level) + (1 - gamma) * sVal;
  }

  // Residual std
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
 * Damped trend fallback when length < 104
 */
function fitDampedTrend(series: number[], alpha = 0.3, beta = 0.05, phi = 0.95): FittedHW {
  const n = series.length;
  let level = series[0];
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
    seasonals: new Array(52).fill(0),
    fitted,
    residuals,
    residualStd,
    alpha,
    beta,
    gamma: 0,
  };
}

/**
 * Grid search for alpha in {0.1, 0.3, 0.5}, beta in {0.01, 0.05}, gamma in {0.1, 0.3, 0.5}
 * minimizing in-sample squared error.
 */
export function fitBestHW(series: number[], m = 52): FittedHW {
  if (series.length < 2 * m) {
    return fitDampedTrend(series);
  }

  const alphas = [0.1, 0.3, 0.5];
  const betas = [0.01, 0.05];
  const gammas = [0.1, 0.3, 0.5];

  let bestFit: FittedHW | null = null;
  let minSSE = Infinity;

  for (const a of alphas) {
    for (const b of betas) {
      for (const g of gammas) {
        const fit = fitHoltWintersAdditive(series, m, a, b, g);
        let sse = 0;
        // evaluate from m onwards to allow initial states to stabilize
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
 * Rolling-origin backtest:
 * for each of the last 12 weeks, train on data before that week,
 * forecast 1 week ahead, compute MAPE.
 * Also compute NAIVE baseline MAPE (last value).
 */
export function runBacktest(series: number[], m = 52): BacktestResult {
  const K = 12;
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

    // Fit model on trainData
    const fit = fitBestHW(trainData, m);

    // 1-step ahead forecast:
    const nextSeasonIdx = targetIdx % m;
    const seasonComponent = fit.seasonals[nextSeasonIdx] ?? 0;
    const modelForecast = Math.max(0, fit.level + fit.trend + seasonComponent);

    // Naive baseline is last observed value
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
 * Determine confidence level based on backtest accuracy:
 * High if modelMAPE < 6 and beatsNaive; Medium if modelMAPE < 12; otherwise Low.
 * If not beatsNaive, never above Medium.
 */
export function computeConfidence(backtest: BacktestResult): ConfidenceLevel {
  let conf: ConfidenceLevel;
  if (backtest.modelMAPE < 6 && backtest.beatsNaive) {
    conf = "High";
  } else if (backtest.modelMAPE < 12) {
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
 * Main forecast function for an item.
 * Memoized in-memory on first request.
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
  const m = 52;

  // Fit best HW model on entire series
  const fit = fitBestHW(series, m);
  const backtest = runBacktest(series, m);
  const confidence = computeConfidence(backtest);

  // Compute 4-week ahead forecasts with prediction intervals
  // Interval = point +/- 1.28 * residual_std * sqrt(h), clamp lower at 0
  const lastRow = rows[n - 1];
  const lastDate = new Date(lastRow.week_start + "T00:00:00Z");
  const MS_PER_WEEK = 7 * 24 * 3600 * 1000;

  const forecast: ForecastPoint[] = [];
  for (let h = 1; h <= 4; h++) {
    const targetIdx = n - 1 + h;
    const sIdx = targetIdx % m;
    const seasonVal = fit.seasonals[sIdx] ?? 0;
    const rawPoint = fit.level + h * fit.trend + seasonVal;
    const point = Number(Math.max(0, rawPoint).toFixed(2));

    const margin = 1.28 * fit.residualStd * Math.sqrt(h);
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
  // change7 = (forecast week+1 - latest actual) / latest actual * 100
  const change7 = Number((((week1Forecast - latestPrice) / latestPrice) * 100).toFixed(2));

  // History for UI: last 52 weeks
  const historySlice = rows.slice(-52).map((r) => ({
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

export function clearForecastCache(): void {
  forecastCache.clear();
  cachedRawData = null;
  cachedDataSource = null;
}
