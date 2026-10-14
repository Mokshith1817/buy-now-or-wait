/**
 * @file route.ts
 * @description GET /api/forecast - Returns 52-week price history, 4-week forecast with bands, and backtest metrics.
 */

import { NextRequest, NextResponse } from "next/server";
import { getForecastForItem } from "@/lib/forecast";
import { VALID_ITEM_IDS } from "@/lib/i18n";
import { createApiError } from "@/lib/api-error";
import { ForecastApiResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const item = searchParams.get("item")?.trim().toLowerCase();

    if (!item || !VALID_ITEM_IDS.has(item)) {
      return createApiError(
        "Invalid item",
        `Item must be one of: ${Array.from(VALID_ITEM_IDS).join(", ")}`,
        400
      );
    }

    const forecastData = getForecastForItem(item);

    const payload: ForecastApiResponse = {
      item: forecastData.item,
      history: forecastData.history,
      forecast: forecastData.forecast,
      latestPrice: forecastData.latestPrice,
      change7: forecastData.change7,
      backtest: forecastData.backtest,
      confidence: forecastData.confidence,
      dataSource: forecastData.dataSource,
      isSynthetic: forecastData.isSynthetic,
    };

    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return createApiError("Forecast calculation failed", message, 500);
  }
}
