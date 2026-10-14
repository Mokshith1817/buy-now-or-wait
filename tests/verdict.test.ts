import { describe, it, expect } from "vitest";
import { determineVerdict, VerdictType } from "@/lib/verdict";
import { ConfidenceLevel } from "@/lib/forecast";

describe("Verdict Pure Rules", () => {
  interface TestCase {
    change7: number;
    confidence: ConfidenceLevel;
    expectedRaw: VerdictType;
    expectedFinal: VerdictType;
    expectedDowngraded: boolean;
  }

  const tableTests: TestCase[] = [
    // Threshold +8
    { change7: 8.0, confidence: "High", expectedRaw: "BUY_NOW", expectedFinal: "BUY_NOW", expectedDowngraded: false },
    { change7: 8.0, confidence: "Medium", expectedRaw: "BUY_NOW", expectedFinal: "BUY_NOW", expectedDowngraded: false },
    { change7: 15.2, confidence: "High", expectedRaw: "BUY_NOW", expectedFinal: "BUY_NOW", expectedDowngraded: false },
    { change7: 7.99, confidence: "High", expectedRaw: "BUY_LITTLE", expectedFinal: "BUY_LITTLE", expectedDowngraded: false },

    // Threshold -8
    { change7: -8.0, confidence: "High", expectedRaw: "WAIT", expectedFinal: "WAIT", expectedDowngraded: false },
    { change7: -8.0, confidence: "Medium", expectedRaw: "WAIT", expectedFinal: "WAIT", expectedDowngraded: false },
    { change7: -12.4, confidence: "Medium", expectedRaw: "WAIT", expectedFinal: "WAIT", expectedDowngraded: false },
    { change7: -7.99, confidence: "High", expectedRaw: "BUY_LITTLE", expectedFinal: "BUY_LITTLE", expectedDowngraded: false },

    // Neutral zone (-8 < change7 < +8)
    { change7: 0.0, confidence: "High", expectedRaw: "BUY_LITTLE", expectedFinal: "BUY_LITTLE", expectedDowngraded: false },
    { change7: 3.5, confidence: "Medium", expectedRaw: "BUY_LITTLE", expectedFinal: "BUY_LITTLE", expectedDowngraded: false },
    { change7: -4.2, confidence: "Medium", expectedRaw: "BUY_LITTLE", expectedFinal: "BUY_LITTLE", expectedDowngraded: false },

    // Low confidence downgrade
    { change7: 8.0, confidence: "Low", expectedRaw: "BUY_NOW", expectedFinal: "BUY_LITTLE", expectedDowngraded: true },
    { change7: 20.0, confidence: "Low", expectedRaw: "BUY_NOW", expectedFinal: "BUY_LITTLE", expectedDowngraded: true },
    { change7: -8.0, confidence: "Low", expectedRaw: "WAIT", expectedFinal: "BUY_LITTLE", expectedDowngraded: true },
    { change7: -18.5, confidence: "Low", expectedRaw: "WAIT", expectedFinal: "BUY_LITTLE", expectedDowngraded: true },
    { change7: 2.0, confidence: "Low", expectedRaw: "BUY_LITTLE", expectedFinal: "BUY_LITTLE", expectedDowngraded: false },
  ];

  it.each(tableTests)(
    "change7: $change7, confidence: $confidence -> final: $expectedFinal (raw: $expectedRaw, downgraded: $expectedDowngraded)",
    ({ change7, confidence, expectedRaw, expectedFinal, expectedDowngraded }) => {
      const res = determineVerdict(change7, confidence);
      expect(res.rawVerdict).toBe(expectedRaw);
      expect(res.verdict).toBe(expectedFinal);
      expect(res.downgraded).toBe(expectedDowngraded);

      if (expectedDowngraded) {
        expect(res.downgradeReason_en).toBeDefined();
        expect(res.downgradeReason_te).toBeDefined();
      }
    }
  );
});
