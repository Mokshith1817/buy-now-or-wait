import { ConfidenceLevel } from "./forecast";
import { RetrievedReason } from "./rag";
import { Language, ITEMS } from "./i18n";

export interface ExplanationInput {
  item: string;
  change7: number;
  confidence: ConfidenceLevel;
  lang: Language;
  reasons: RetrievedReason[];
  downgraded?: boolean;
}

export interface ExplanationResult {
  text: string;
  usedLLM: boolean;
}

/**
 * Deterministic template fallback (ALWAYS available)
 */
export function buildTemplateExplanation(input: ExplanationInput): string {
  const itemObj = ITEMS.find((i) => i.id === input.item);
  const itemNameEn = itemObj ? itemObj.name_en : input.item;
  const itemNameTe = itemObj ? itemObj.name_te : input.item;

  const absChange = Math.abs(Math.round(input.change7));
  const primaryReason = input.reasons[0]?.title || "";

  if (input.lang === "te") {
    const confLabel =
      input.confidence === "High"
        ? "ఎక్కువ"
        : input.confidence === "Medium"
        ? "మధ్యస్థం"
        : "తక్కువ";

    let trendText: string;
    if (input.change7 >= 8) {
      trendText = `వచ్చే వారం ${itemNameTe} ధర సుమారు ${absChange}% పెరగవచ్చు`;
    } else if (input.change7 <= -8) {
      trendText = `వచ్చే వారం ${itemNameTe} ధర సుమారు ${absChange}% తగ్గవచ్చు`;
    } else {
      trendText = `వచ్చే వారం ${itemNameTe} ధర దాదాపు స్థిరంగా ఉండవచ్చు (${absChange}% మార్పు)`;
    }

    let result = `${trendText} (నమ్మకం: ${confLabel}).`;
    if (primaryReason) {
      result += ` కారణం: ${primaryReason}.`;
    }
    if (input.downgraded) {
      result += ` నమ్మకం తక్కువగా ఉన్నందున కొద్దిగా మాత్రమే కొనడం శ్రేయస్కరం.`;
    }
    return result;
  }

  // English fallback
  const confLabel = input.confidence;
  let trendText: string;
  if (input.change7 >= 8) {
    trendText = `${itemNameEn} price may rise about ${absChange}% next week`;
  } else if (input.change7 <= -8) {
    trendText = `${itemNameEn} price may fall about ${absChange}% next week`;
  } else {
    trendText = `${itemNameEn} price is likely to stay steady (about ${absChange}% change) next week`;
  }

  let result = `${trendText} (confidence: ${confLabel}).`;
  if (primaryReason) {
    result += ` Reason: ${primaryReason}.`;
  }
  if (input.downgraded) {
    result += ` Confidence is low, so buying a little for immediate needs is advisable.`;
  }
  return result;
}

/**
 * Validate LLM generated text:
 * - non-empty
 * - under 500 characters
 * - no markdown symbols (*, #, `, _, ~, [, ])
 */
function isValidLLMOutput(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  if (text.length >= 500) return false;
  // Markdown symbols check
  if (/[\*#`_~\[\]]/.test(text)) return false;
  return true;
}

/**
 * Generate explanation: Calls Gemini REST API if GEMINI_API_KEY is present,
 * otherwise safely returns deterministic template fallback.
 */
export async function generateExplanation(
  input: ExplanationInput
): Promise<ExplanationResult> {
  const fallbackText = buildTemplateExplanation(input);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { text: fallbackText, usedLLM: false };
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  const itemObj = ITEMS.find((i) => i.id === input.item);
  const itemName = input.lang === "te" ? (itemObj?.name_te || input.item) : (itemObj?.name_en || input.item);
  const targetLanguage = input.lang === "te" ? "Telugu" : "English";
  const direction = input.change7 >= 8 ? "rising" : input.change7 <= -8 ? "falling" : "stable";

  const reasonsText = input.reasons
    .slice(0, 3)
    .map((r, i) => `${i + 1}. ${r.title}`)
    .join("\n");

  const prompt = `You are a vegetable price advisor for ordinary families.
Item: ${itemName}
Forecast change for next 7 days: ${input.change7 > 0 ? "+" : ""}${Math.round(input.change7)}% (${direction})
Model confidence: ${input.confidence}
Retrieved agricultural notes:
${reasonsText}

Instructions:
- Write exactly 2 to 3 short sentences in simple ${targetLanguage}.
- Use everyday words suitable for homemakers and elders.
- Use only the provided forecast numbers and notes. Do not invent any outside facts or statistics.
- Never promise savings. Always use cautious words like "likely" or "may".
- Output plain text ONLY. Absolutely NO markdown symbols (no asterisks, no hashes, no bullet points, no backticks).`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      return { text: fallbackText, usedLLM: false };
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (candidateText && isValidLLMOutput(candidateText)) {
      return { text: candidateText, usedLLM: true };
    }

    return { text: fallbackText, usedLLM: false };
  } catch {
    // Silently fallback on any network error, timeout, or parsing error
    return { text: fallbackText, usedLLM: false };
  }
}
