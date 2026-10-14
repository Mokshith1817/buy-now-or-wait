/**
 * @file route.ts
 * @description POST /api/advice - Returns buying advice verdict, explanation, and retrieved agricultural reasons.
 */

import { NextRequest, NextResponse } from "next/server";
import { getForecastForItem } from "@/lib/forecast";
import { determineVerdict } from "@/lib/verdict";
import { retrieveRelevantNotes } from "@/lib/rag";
import { generateExplanation } from "@/lib/explain";
import { VALID_ITEM_IDS, Language } from "@/lib/i18n";
import { createApiError } from "@/lib/api-error";
import { VERDICT_BUY_NOW_THRESHOLD, VERDICT_WAIT_THRESHOLD } from "@/lib/constants";
import { AdviceApiResponse, PriceDirection } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createApiError("Invalid JSON body", "Request body could not be parsed as JSON", 400);
    }

    if (!body || typeof body !== "object") {
      return createApiError("Invalid request", "Request body must be an object", 400);
    }

    const { item, lang } = body as { item?: unknown; lang?: unknown };

    if (typeof item !== "string" || !VALID_ITEM_IDS.has(item.toLowerCase())) {
      return createApiError(
        "Invalid item",
        `Item must be one of: ${Array.from(VALID_ITEM_IDS).join(", ")}`,
        400
      );
    }

    if (lang !== "te" && lang !== "en") {
      return createApiError(
        "Invalid lang",
        'Language must be either "te" or "en"',
        400
      );
    }

    const cleanItem = item.toLowerCase();
    const cleanLang: Language = lang;

    const forecastData = getForecastForItem(cleanItem);
    const verdictResult = determineVerdict(forecastData.change7, forecastData.confidence);

    let direction: PriceDirection = "stable";
    if (forecastData.change7 >= VERDICT_BUY_NOW_THRESHOLD) direction = "up";
    else if (forecastData.change7 <= VERDICT_WAIT_THRESHOLD) direction = "down";

    const reasons = retrieveRelevantNotes({
      item: cleanItem,
      direction,
      month: new Date().getUTCMonth(),
    });

    const explanationResult = await generateExplanation({
      item: cleanItem,
      change7: forecastData.change7,
      confidence: forecastData.confidence,
      lang: cleanLang,
      reasons,
      downgraded: verdictResult.downgraded,
    });

    const payload: AdviceApiResponse = {
      verdict: verdictResult.verdict,
      change7: forecastData.change7,
      confidence: forecastData.confidence,
      explanation: explanationResult.text,
      reasons: reasons.map((r) => ({
        title: r.title,
        source: r.source,
        source_url: r.source_url,
        verified: r.verified,
      })),
      usedLLM: explanationResult.usedLLM,
      dataSource: forecastData.dataSource,
      isSynthetic: forecastData.isSynthetic,
    };

    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Advice generation failed";
    return createApiError("Advice generation failed", message, 500);
  }
}
