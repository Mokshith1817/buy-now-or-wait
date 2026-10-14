/**
 * @file PriceChart.tsx
 * @description Accessible hand-crafted SVG time-series chart rendering 26-week history, 4-week forecast, and shaded prediction fan.
 */

"use client";

import React from "react";
import { Language, HistoryPoint, ForecastPoint } from "@/lib/types";
import {
  calculateChartBounds,
  mapPointToSvg,
  generateLinePath,
  generateBandPath,
  ChartDimensions,
} from "@/lib/chart-utils";
import { CHART_HISTORY_WEEKS_DISPLAY } from "@/lib/constants";

interface PriceChartProps {
  history: HistoryPoint[];
  forecast: ForecastPoint[];
  lang: Language;
  title: string;
  chartSrDescription: string;
}

const DEFAULT_DIMENSIONS: ChartDimensions = {
  width: 640,
  height: 240,
  padLeft: 45,
  padRight: 20,
  padTop: 20,
  padBottom: 35,
};

export function PriceChart({
  history,
  forecast,
  lang,
  title,
  chartSrDescription,
}: PriceChartProps) {
  const recentHistory = history.slice(-CHART_HISTORY_WEEKS_DISPLAY);
  const totalPoints = recentHistory.length + forecast.length;

  const bounds = calculateChartBounds(
    recentHistory.map((h) => h.price),
    forecast
  );

  // Map history points
  const historyPoints = recentHistory.map((h, i) =>
    mapPointToSvg(h.price, i, totalPoints, bounds, DEFAULT_DIMENSIONS)
  );

  const historyPathD = generateLinePath(historyPoints);

  const lastHistIdx = recentHistory.length - 1;
  const lastHistPt = historyPoints[lastHistIdx] || { x: DEFAULT_DIMENSIONS.padLeft, y: 100 };

  // Map forecast points originating from the latest history point
  const forecastMappedPoints = forecast.map((f, i) =>
    mapPointToSvg(f.point, recentHistory.length + i, totalPoints, bounds, DEFAULT_DIMENSIONS)
  );
  const forecastPathD = generateLinePath([lastHistPt, ...forecastMappedPoints]);

  // Map upper and lower interval points for the shaded fan
  const upperMappedPoints = forecast.map((f, i) =>
    mapPointToSvg(f.upper, recentHistory.length + i, totalPoints, bounds, DEFAULT_DIMENSIONS)
  );
  const lowerMappedPoints = forecast.map((f, i) =>
    mapPointToSvg(f.lower, recentHistory.length + i, totalPoints, bounds, DEFAULT_DIMENSIONS)
  );
  const bandPathD = generateBandPath(upperMappedPoints, lowerMappedPoints, lastHistPt);

  // Y-axis ticks
  const yTicks = [
    bounds.minVal,
    Math.round(bounds.minVal + (bounds.maxVal - bounds.minVal) * 0.33),
    Math.round(bounds.minVal + (bounds.maxVal - bounds.minVal) * 0.66),
    bounds.maxVal,
  ];

  const latestPrice = recentHistory[recentHistory.length - 1]?.price || 0;
  const nextPrice = forecast[0]?.point || 0;

  const srSummary =
    lang === "te"
      ? `గత 26 వారాల అసలు ధర ₹${bounds.minVal} నుండి ₹${bounds.maxVal} వరకు ఉంది. ప్రస్తుత ధర ₹${latestPrice.toFixed(
          2
        )}. వచ్చే వారం అంచనా ధర ₹${nextPrice.toFixed(2)}.`
      : `Price chart: past 26-week range between ₹${bounds.minVal} and ₹${bounds.maxVal}. Latest price is ₹${latestPrice.toFixed(
          2
        )}. Next week projected price is ₹${nextPrice.toFixed(2)}.`;

  return (
    <section className="chart-section" aria-label="Price chart">
      <h2 className="chart-title">{title}</h2>
      <div className="svg-chart-container">
        <p className="sr-only">{srSummary}</p>
        <svg
          viewBox={`0 0 ${DEFAULT_DIMENSIONS.width} ${DEFAULT_DIMENSIONS.height}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={chartSrDescription}
        >
          <title>{title}</title>
          <desc>{srSummary}</desc>

          {/* Horizontal gridlines */}
          {yTicks.map((tick, i) => {
            const mapped = mapPointToSvg(tick, 0, totalPoints, bounds, DEFAULT_DIMENSIONS);
            return (
              <g key={i}>
                <line
                  x1={DEFAULT_DIMENSIONS.padLeft}
                  y1={mapped.y}
                  x2={DEFAULT_DIMENSIONS.width - DEFAULT_DIMENSIONS.padRight}
                  y2={mapped.y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={DEFAULT_DIMENSIONS.padLeft - 8}
                  y={mapped.y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#64748b"
                  fontWeight="500"
                >
                  ₹{tick}
                </text>
              </g>
            );
          })}

          {/* Shaded interval band */}
          <path
            d={bandPathD}
            fill="rgba(234, 88, 12, 0.16)"
            stroke="#fed7aa"
            strokeWidth="1"
          />

          {/* Solid line: Historical prices */}
          <path
            d={historyPathD}
            fill="none"
            stroke="#0f766e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dashed line: Forecast projection */}
          <path
            d={forecastPathD}
            fill="none"
            stroke="#ea580c"
            strokeWidth="3"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Anchor Dot */}
          <circle
            cx={lastHistPt.x}
            cy={lastHistPt.y}
            r="5"
            fill="#0f766e"
            stroke="#ffffff"
            strokeWidth="2"
          />

          {/* Forecast Dots */}
          {forecastMappedPoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={i === 0 ? "5" : "4"}
              fill="#ea580c"
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}

          {/* X Axis labels */}
          <text
            x={DEFAULT_DIMENSIONS.padLeft}
            y={DEFAULT_DIMENSIONS.height - 12}
            textAnchor="start"
            fontSize="12"
            fill="#64748b"
            fontWeight="500"
          >
            {lang === "te" ? "-26 వారాలు" : "-26 wks"}
          </text>

          <text
            x={lastHistPt.x}
            y={DEFAULT_DIMENSIONS.height - 12}
            textAnchor="middle"
            fontSize="12"
            fill="#0f766e"
            fontWeight="700"
          >
            {lang === "te" ? "ప్రస్తుతం" : "Now"}
          </text>

          <text
            x={DEFAULT_DIMENSIONS.width - DEFAULT_DIMENSIONS.padRight}
            y={DEFAULT_DIMENSIONS.height - 12}
            textAnchor="end"
            fontSize="12"
            fill="#ea580c"
            fontWeight="700"
          >
            +4 {lang === "te" ? "వారాలు" : "wks"}
          </text>
        </svg>
      </div>

      <div className="chart-legend" aria-hidden="true">
        <span className="legend-item">
          <span className="legend-line-history" />
          <span>{lang === "te" ? "గత 26 వారాలు (అసలు)" : "Past 26 weeks (Actual)"}</span>
        </span>
        <span className="legend-item">
          <span className="legend-line-forecast" />
          <span>{lang === "te" ? "రాబోయే 4 వారాల అంచనా" : "4-week forecast"}</span>
        </span>
        <span className="legend-item">
          <span className="legend-band" />
          <span>{lang === "te" ? "అంచనా పరిధి (80%)" : "Forecast interval"}</span>
        </span>
      </div>
    </section>
  );
}
