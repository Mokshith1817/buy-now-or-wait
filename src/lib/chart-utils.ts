/**
 * @file chart-utils.ts
 * @description Mathematical scaling and coordinate generation utilities for hand-drawn SVG time series charts.
 */

export interface ChartDimensions {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

export interface ChartBounds {
  minVal: number;
  maxVal: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Calculates responsive minimum and maximum Y-axis boundaries with headroom.
 *
 * @param historyPrices Array of observed historical price values.
 * @param forecastIntervals Array of forecasted points with lower and upper intervals.
 * @returns ChartBounds object with minVal and maxVal clamped at 0 minimum.
 */
export function calculateChartBounds(
  historyPrices: number[],
  forecastIntervals: { point: number; lower: number; upper: number }[]
): ChartBounds {
  const allValues = [
    ...historyPrices,
    ...forecastIntervals.map((f) => f.upper),
    ...forecastIntervals.map((f) => f.lower),
    ...forecastIntervals.map((f) => f.point),
  ];

  if (allValues.length === 0) {
    return { minVal: 0, maxVal: 100 };
  }

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);

  const minVal = Math.max(0, Math.floor(rawMin * 0.9));
  const maxVal = Math.ceil(rawMax * 1.1) || 10;

  return { minVal, maxVal: maxVal > minVal ? maxVal : minVal + 10 };
}

/**
 * Maps a single time-series point to 2D SVG canvas coordinates.
 *
 * @param value Price value on Y axis.
 * @param index Sequential index on X axis.
 * @param totalPoints Total number of points across the horizontal axis.
 * @param bounds Min and max values for Y scaling.
 * @param dimensions SVG canvas dimensions and padding.
 * @returns Point2D containing mapped x and y coordinates.
 */
export function mapPointToSvg(
  value: number,
  index: number,
  totalPoints: number,
  bounds: ChartBounds,
  dimensions: ChartDimensions
): Point2D {
  const plotW = dimensions.width - dimensions.padLeft - dimensions.padRight;
  const plotH = dimensions.height - dimensions.padTop - dimensions.padBottom;

  const denominator = Math.max(1, totalPoints - 1);
  const x = dimensions.padLeft + (index / denominator) * plotW;

  const range = bounds.maxVal - bounds.minVal || 1;
  const y = dimensions.padTop + plotH - ((value - bounds.minVal) / range) * plotH;

  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
  };
}

/**
 * Generates an SVG path `d` attribute string connecting sequential points with straight lines.
 *
 * @param points Array of 2D coordinates.
 * @returns SVG path string (e.g., "M 10 20 L 30 40 ...").
 */
export function generateLinePath(points: Point2D[]): string {
  if (points.length === 0) return "";
  return points.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`,
    ""
  ).trim();
}

/**
 * Generates a closed polygon SVG path `d` string for the shaded prediction interval fan.
 *
 * @param upperPoints Upper bound points along forecast trajectory.
 * @param lowerPoints Lower bound points along forecast trajectory.
 * @param anchor Origin point connecting from the latest historical price.
 * @returns Closed SVG path string ending with "Z".
 */
export function generateBandPath(
  upperPoints: Point2D[],
  lowerPoints: Point2D[],
  anchor: Point2D
): string {
  if (upperPoints.length === 0) return "";
  const reversedLower = [...lowerPoints].reverse();
  const allPoints = [anchor, ...upperPoints, ...reversedLower, anchor];
  return `${generateLinePath(allPoints)} Z`;
}
