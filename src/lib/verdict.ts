/**
 * @file verdict.ts
 * @description Pure business rules engine determining purchase advice from price change percentage and model confidence.
 */

import { VERDICT_BUY_NOW_THRESHOLD, VERDICT_WAIT_THRESHOLD } from "./constants";
import { ConfidenceLevel, VerdictType, VerdictResult } from "./types";

export type { VerdictType, VerdictResult };

/**
 * Pure function to determine purchase advice based on next week's predicted price change
 * and model confidence.
 *
 * Rules:
 * - change7 >= +8  -> BUY_NOW (prices may rise soon)
 * - change7 <= -8  -> WAIT (prices may ease soon)
 * - otherwise      -> BUY_LITTLE (prices likely stable)
 * - If confidence is Low -> downgrade BUY_NOW or WAIT to BUY_LITTLE.
 *
 * @param change7 Projected percentage price change over the next 7 days.
 * @param confidence Statistical model confidence rating ("High" | "Medium" | "Low").
 * @returns VerdictResult containing final verdict, raw verdict, and downgrade reason if applicable.
 */
export function determineVerdict(
  change7: number,
  confidence: ConfidenceLevel
): VerdictResult {
  let rawVerdict: VerdictType;

  if (change7 >= VERDICT_BUY_NOW_THRESHOLD) {
    rawVerdict = "BUY_NOW";
  } else if (change7 <= VERDICT_WAIT_THRESHOLD) {
    rawVerdict = "WAIT";
  } else {
    rawVerdict = "BUY_LITTLE";
  }

  let finalVerdict: VerdictType = rawVerdict;
  let downgraded = false;
  let downgradeReason_en: string | undefined;
  let downgradeReason_te: string | undefined;

  if (confidence === "Low" && (rawVerdict === "BUY_NOW" || rawVerdict === "WAIT")) {
    finalVerdict = "BUY_LITTLE";
    downgraded = true;
    downgradeReason_en =
      "Prediction confidence is Low, so advice is adjusted to buying only a little for immediate needs.";
    downgradeReason_te =
      "అంచనా నమ్మకం తక్కువగా ఉన్నందున, తక్షణ అవసరాలకు కొద్దిగా మాత్రమే కొనాలని సూచించబడింది.";
  }

  return {
    verdict: finalVerdict,
    rawVerdict,
    downgraded,
    downgradeReason_en,
    downgradeReason_te,
    change7,
    confidence,
  };
}
