import { NextRequest, NextResponse } from "next/server";
import { getForecastForItem } from "@/lib/forecast";
import { determineVerdict } from "@/lib/verdict";
import { retrieveRelevantNotes } from "@/lib/rag";
import { generateExplanation } from "@/lib/explain";
import { VALID_ITEM_IDS, Language } from "@/lib/i18n";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be an object" },
        { status: 400 }
      );
    }

    const { item, lang } = body as { item?: unknown; lang?: unknown };

    if (typeof item !== "string" || !VALID_ITEM_IDS.has(item.toLowerCase())) {
      return NextResponse.json(
        {
          error: "Invalid item",
          message: `Item must be one of: ${Array.from(VALID_ITEM_IDS).join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (lang !== "te" && lang !== "en") {
      return NextResponse.json(
        {
          error: "Invalid lang",
          message: 'Language must be either "te" or "en"',
        },
        { status: 400 }
      );
    }

    const cleanItem = item.toLowerCase();
    const cleanLang: Language = lang;

    const forecastData = getForecastForItem(cleanItem);
    const verdictResult = determineVerdict(forecastData.change7, forecastData.confidence);

    let direction: "up" | "down" | "stable" = "stable";
    if (forecastData.change7 >= 8) direction = "up";
    else if (forecastData.change7 <= -8) direction = "down";

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

    return NextResponse.json({
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Advice generation failed";
    return NextResponse.json(
      { error: "Advice generation failed", message },
      { status: 500 }
    );
  }
}
