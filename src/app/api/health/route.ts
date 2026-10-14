import { NextResponse } from "next/server";
import { getDataSourceInfo } from "@/lib/forecast";
import { ITEMS } from "@/lib/i18n";

export async function GET() {
  try {
    const { sourceName } = getDataSourceInfo();
    const hasLLMKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

    return NextResponse.json({
      ok: true,
      items: ITEMS.length,
      dataSource: sourceName,
      llm: hasLLMKey,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Health check error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
