/**
 * @file explain.ts
 * @description Natural language explanation generator combining deterministic bilingual templates with optional Gemini REST API integration.
 */

import {
  MAX_LLM_OUTPUT_CHARS,
  LLM_REQUEST_TIMEOUT_MS,
  DEFAULT_GEMINI_MODEL,
} from "./constants";
import { ExplanationInput, ExplanationResult } from "./types";
import { ITEMS } from "./i18n";

export type { ExplanationInput, ExplanationResult };

/**
 * Builds a deterministic bilingual template explanation using forecast change, confidence, and primary reason.
 * Always available offline and guaranteed never to fail.
 *
 * @param input Explanation parameters including item, change7, confidence, language, and retrieved reasons.
 * @returns Formatted natural language string in the requested language.
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
 * Validates candidate LLM output against safety, length, and format constraints.
 *
 * @param text Candidate generated text string.
 * @returns True if text is valid plain text under character limit without markdown.
 */
function isValidLLMOutput(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  if (text.length >= MAX_LLM_OUTPUT_CHARS) return false;
  if (/[\*#`_~\[\]]/.test(text)) return false;
  return true;
}

/**
 * Generates natural language advice explanation. Calls Google Gemini REST API if GEMINI_API_KEY is present,
 * with strict 8-second timeout and validation. Silently falls back to template on any error.
 *
 * @param input Explanation parameters including item, change7, confidence, language, and reasons.
 * @returns Promise resolving to ExplanationResult with explanation text and usedLLM flag.
 */
export async function generateExplanation(
  input: ExplanationInput
): Promise<ExplanationResult> {
  const fallbackText = buildTemplateExplanation(input);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { text: fallbackText, usedLLM: false };
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
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
    const timer = setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT_MS);

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
    return { text: fallbackText, usedLLM: false };
  }
}
