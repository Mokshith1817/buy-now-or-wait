/**
 * @file PriceStats.tsx
 * @description Statistical metric display for current price, next week forecast, and model confidence rating.
 */

"use client";

import React from "react";
import { ConfidenceLevel } from "@/lib/types";

interface PriceStatsProps {
  currentPrice: number;
  predictedPrice: number;
  confidence: ConfidenceLevel;
  currentPriceLabel: string;
  predictedPriceLabel: string;
  confidenceLabel: string;
  confidenceText: string;
  perKgText: string;
}

export function PriceStats({
  currentPrice,
  predictedPrice,
  confidence,
  currentPriceLabel,
  predictedPriceLabel,
  confidenceLabel,
  confidenceText,
  perKgText,
}: PriceStatsProps) {
  return (
    <div className="stats-row">
      <div className="stat-box">
        <span className="stat-label">{currentPriceLabel}</span>
        <span className="stat-value">
          ₹{currentPrice.toFixed(2)} / {perKgText}
        </span>
      </div>
      <div className="stat-box">
        <span className="stat-label">{predictedPriceLabel}</span>
        <span className="stat-value">
          ₹{predictedPrice.toFixed(2)} / {perKgText}
        </span>
      </div>
      <div className="stat-box">
        <span className="stat-label">{confidenceLabel}</span>
        <span className={`confidence-badge confidence-${confidence}`}>
          {confidenceText}
        </span>
      </div>
    </div>
  );
}
