import { ConfidenceLevel } from "./forecast";

export type VerdictType = "BUY_NOW" | "WAIT" | "BUY_LITTLE";

export interface VerdictResult {
  verdict: VerdictType;
  rawVerdict: VerdictType;
  downgraded: boolean;
  downgradeReason_en?: string;
  downgradeReason_te?: string;
  change7: number;
  confidence: ConfidenceLevel;
}

/**
 * Pure function to determine purchase advice based on next week's predicted price change
 * and model confidence.
 *
 * Rules:
 * - change7 >= +8  -> BUY_NOW (prices may rise soon)
 * - change7 <= -8  -> WAIT (prices may ease soon)
 * - otherwise      -> BUY_LITTLE (prices likely stable)
 * - If confidence is Low -> downgrade BUY_NOW or WAIT to BUY_LITTLE.
 */
export function determineVerdict(
  change7: number,
  confidence: ConfidenceLevel
): VerdictResult {
  let rawVerdict: VerdictType;

  if (change7 >= 8) {
    rawVerdict = "BUY_NOW";
  } else if (change7 <= -8) {
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
