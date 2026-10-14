/**
 * @file route.ts
 * @description GET /api/health - Returns system health, total supported commodities, data source, and LLM key status.
 */

import { NextResponse } from "next/server";
import { getDataSourceInfo } from "@/lib/forecast";
import { ITEMS } from "@/lib/i18n";
import { createApiError } from "@/lib/api-error";
import { HealthApiResponse } from "@/lib/types";

export async function GET() {
  try {
    const { sourceName } = getDataSourceInfo();
    const hasLLMKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

    const payload: HealthApiResponse = {
      ok: true,
      items: ITEMS.length,
      dataSource: sourceName,
      llm: hasLLMKey,
    };

    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Health check error";
    return createApiError("Health check failed", message, 500);
  }
}
