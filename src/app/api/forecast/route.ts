import { NextRequest, NextResponse } from "next/server";
import { getForecastForItem } from "@/lib/forecast";
import { VALID_ITEM_IDS } from "@/lib/i18n";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const item = searchParams.get("item")?.trim().toLowerCase();

    if (!item || !VALID_ITEM_IDS.has(item)) {
      return NextResponse.json(
        {
          error: "Invalid item",
          message: `Item must be one of: ${Array.from(VALID_ITEM_IDS).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const forecastData = getForecastForItem(item);

    return NextResponse.json({
      item: forecastData.item,
      history: forecastData.history,
      forecast: forecastData.forecast,
      latestPrice: forecastData.latestPrice,
      change7: forecastData.change7,
      backtest: forecastData.backtest,
      confidence: forecastData.confidence,
      dataSource: forecastData.dataSource,
      isSynthetic: forecastData.isSynthetic,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { error: "Forecast calculation failed", message },
      { status: 500 }
    );
  }
}
