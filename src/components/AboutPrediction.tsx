/**
 * @file AboutPrediction.tsx
 * @description Transparent disclosure panel detailing statistical model methodology, out-of-sample backtest accuracy, and disclaimer.
 */

"use client";

import React from "react";
import { BacktestResult } from "@/lib/types";

interface AboutPredictionProps {
  summaryTitle: string;
  modelMethodText: string;
  backtestAccuracyText: string;
  modelMapeLabel: string;
  naiveMapeLabel: string;
  beatsNaiveLabel: string;
  yesText: string;
  noText: string;
  backtest: BacktestResult;
  dataSource: string;
  disclaimerText: string;
}

export function AboutPrediction({
  summaryTitle,
  modelMethodText,
  backtestAccuracyText,
  modelMapeLabel,
  naiveMapeLabel,
  beatsNaiveLabel,
  yesText,
  noText,
  backtest,
  dataSource,
  disclaimerText,
}: AboutPredictionProps) {
  return (
    <details className="about-panel">
      <summary className="about-summary">
        <span>{summaryTitle}</span>
        <span aria-hidden="true">▾</span>
      </summary>
      <div className="about-content">
        <p>
          <strong>{modelMethodText}</strong>
        </p>

        <div>
          <p>
            <strong>{backtestAccuracyText}</strong>
          </p>
          <table className="backtest-table">
            <thead>
              <tr>
                <th>{modelMapeLabel}</th>
                <th>{naiveMapeLabel}</th>
                <th>{beatsNaiveLabel}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{backtest.modelMAPE.toFixed(2)}%</td>
                <td>{backtest.naiveMAPE.toFixed(2)}%</td>
                <td>{backtest.beatsNaive ? yesText : noText}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          <strong>Data Source:</strong> {dataSource}
        </p>

        <div className="disclaimer-line">{disclaimerText}</div>
      </div>
    </details>
  );
}
