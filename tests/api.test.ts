import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { POST } from "@/app/api/advice/route";
import { GET as getForecast } from "@/app/api/forecast/route";
import { GET as getHealth } from "@/app/api/health/route";
import { NextRequest } from "next/server";
import { ITEMS } from "@/lib/i18n";

describe("API Routes", () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterAll(() => {
    if (originalEnv) process.env.GEMINI_API_KEY = originalEnv;
  });

  function createPostRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 for bad item", async () => {
    const req = createPostRequest({ item: "mango", lang: "te" });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid item");
  });

  it("returns 400 for bad lang", async () => {
    const req = createPostRequest({ item: "tomato", lang: "fr" });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid lang");
  });

  it("with GEMINI_API_KEY unset returns usedLLM=false and non-empty explanation in both languages", async () => {
    // English
    const reqEn = createPostRequest({ item: "onion", lang: "en" });
    const resEn = await POST(reqEn);
    expect(resEn.status).toBe(200);

    const dataEn = await resEn.json();
    expect(dataEn.usedLLM).toBe(false);
    expect(dataEn.explanation).toBeTruthy();
    expect(typeof dataEn.explanation).toBe("string");
    expect(dataEn.explanation.length).toBeGreaterThan(10);
    expect(dataEn.verdict).toBeDefined();
    expect(dataEn.reasons.length).toBe(3);

    // Telugu
    const reqTe = createPostRequest({ item: "onion", lang: "te" });
    const resTe = await POST(reqTe);
    expect(resTe.status).toBe(200);

    const dataTe = await resTe.json();
    expect(dataTe.usedLLM).toBe(false);
    expect(dataTe.explanation).toBeTruthy();
    expect(typeof dataTe.explanation).toBe("string");
    // Verify it contains Telugu characters
    expect(/[\u0C00-\u0C7F]/.test(dataTe.explanation)).toBe(true);
    expect(dataTe.verdict).toBeDefined();
    expect(dataTe.reasons.length).toBe(3);
  });

  it("advice API successfully generates verdicts for all 8 items", async () => {
    for (const it of ITEMS) {
      const req = createPostRequest({ item: it.id, lang: "te" });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(["BUY_NOW", "WAIT", "BUY_LITTLE"]).toContain(data.verdict);
      expect(Number.isFinite(data.change7)).toBe(true);
      expect(["High", "Medium", "Low"]).toContain(data.confidence);
    }
  });

  it("GET /api/forecast returns 200 for valid item and 400 for invalid item", async () => {
    const reqValid = new NextRequest("http://localhost:3000/api/forecast?item=tomato");
    const resValid = await getForecast(reqValid);
    expect(resValid.status).toBe(200);
    const dataValid = await resValid.json();
    expect(dataValid.item).toBe("tomato");
    expect(dataValid.forecast.length).toBe(4);
    expect(dataValid.history.length).toBe(52);

    const reqInvalid = new NextRequest("http://localhost:3000/api/forecast?item=pineapple");
    const resInvalid = await getForecast(reqInvalid);
    expect(resInvalid.status).toBe(400);
  });

  it("GET /api/health returns 200 with ok, 8 items, and dataSource", async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.items).toBe(8);
    expect(data.dataSource).toBeTruthy();
    expect(data.llm).toBe(false);
  });
});
