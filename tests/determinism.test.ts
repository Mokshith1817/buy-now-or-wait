import { describe, it, expect } from "vitest";
import { getForecastForItem, clearForecastCache } from "@/lib/forecast";
import { determineVerdict } from "@/lib/verdict";
import { retrieveRelevantNotes } from "@/lib/rag";
import { buildTemplateExplanation } from "@/lib/explain";
import { ITEMS } from "@/lib/i18n";

describe("Determinism", () => {
  it("gives identical forecast output when run twice with or without cache", () => {
    for (const item of ITEMS) {
      clearForecastCache();
      const run1 = getForecastForItem(item.id);

      clearForecastCache();
      const run2 = getForecastForItem(item.id);

      expect(run1).toEqual(run2);
    }
  });

  it("gives identical verdict and explanation when run twice", () => {
    const verdict1 = determineVerdict(12.5, "High");
    const verdict2 = determineVerdict(12.5, "High");
    expect(verdict1).toEqual(verdict2);

    const reasons1 = retrieveRelevantNotes({ item: "onion", direction: "up", month: 6 });
    const reasons2 = retrieveRelevantNotes({ item: "onion", direction: "up", month: 6 });
    expect(reasons1).toEqual(reasons2);

    const exp1 = buildTemplateExplanation({
      item: "onion",
      change7: 12.5,
      confidence: "High",
      lang: "te",
      reasons: reasons1,
    });
    const exp2 = buildTemplateExplanation({
      item: "onion",
      change7: 12.5,
      confidence: "High",
      lang: "te",
      reasons: reasons2,
    });
    expect(exp1).toBe(exp2);
  });
});
