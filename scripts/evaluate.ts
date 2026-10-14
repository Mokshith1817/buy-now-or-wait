import fs from "fs";
import path from "path";
import { getForecastForItem } from "../src/lib/forecast";
import { ITEMS } from "../src/lib/i18n";

export async function runEvaluation() {
  console.log("\n=======================================================");
  console.log("   BUY NOW OR WAIT: 12-WEEK ROLLING BACKTEST EVALUATION");
  console.log("=======================================================\n");

  const results: {
    item: string;
    name_en: string;
    name_te: string;
    latestPrice: number;
    nextWeekPrice: number;
    change7: number;
    modelMAPE: number;
    naiveMAPE: number;
    beatsNaive: boolean;
    confidence: string;
  }[] = [];

  for (const it of ITEMS) {
    const fc = getForecastForItem(it.id);
    results.push({
      item: it.id,
      name_en: it.name_en,
      name_te: it.name_te,
      latestPrice: fc.latestPrice,
      nextWeekPrice: fc.forecast[0].point,
      change7: fc.change7,
      modelMAPE: fc.backtest.modelMAPE,
      naiveMAPE: fc.backtest.naiveMAPE,
      beatsNaive: fc.backtest.beatsNaive,
      confidence: fc.confidence,
    });
  }

  // Console output
  console.table(
    results.map((r) => ({
      Item: r.name_en,
      "Telugu Name": r.name_te,
      "Latest (₹)": `₹${r.latestPrice.toFixed(2)}`,
      "Next Wk (₹)": `₹${r.nextWeekPrice.toFixed(2)}`,
      "Change (%)": `${r.change7 > 0 ? "+" : ""}${r.change7.toFixed(1)}%`,
      "Model MAPE": `${r.modelMAPE.toFixed(2)}%`,
      "Naive MAPE": `${r.naiveMAPE.toFixed(2)}%`,
      "Beats Naive": r.beatsNaive ? "YES" : "NO",
      Confidence: r.confidence,
    }))
  );

  const avgModelMAPE =
    results.reduce((acc, r) => acc + r.modelMAPE, 0) / results.length;
  const avgNaiveMAPE =
    results.reduce((acc, r) => acc + r.naiveMAPE, 0) / results.length;
  const beatenCount = results.filter((r) => r.beatsNaive).length;

  console.log(
    `\nSummary: Model average MAPE: ${avgModelMAPE.toFixed(
      2
    )}% | Naive baseline average MAPE: ${avgNaiveMAPE.toFixed(2)}%`
  );
  console.log(
    `Model beats Naive baseline in ${beatenCount} / ${results.length} items.\n`
  );

  // Generate markdown evaluation document
  const tableRows = results
    .map(
      (r) =>
        `| ${r.name_en} (${r.item}) | ${r.name_te} | ₹${r.latestPrice.toFixed(
          2
        )} | ₹${r.nextWeekPrice.toFixed(2)} | ${r.change7 > 0 ? "+" : ""}${r.change7.toFixed(
          1
        )}% | ${r.modelMAPE.toFixed(2)}% | ${r.naiveMAPE.toFixed(2)}% | ${
          r.beatsNaive ? "✅ Yes" : "❌ No"
        } | **${r.confidence}** |`
    )
    .join("\n");

  const mdContent = `# Model Evaluation Report: 12-Week Rolling-Origin Backtest

This report documents the quantitative performance evaluation of the **Holt-Winters Additive model** against the standard **Naive baseline** (predicting next week's price equals the latest observed price) across all 8 essential vegetables.

## Evaluation Methodology

- **Model**: Holt-Winters Additive model with 52-week yearly seasonality, level, and linear trend.
- **Hyperparameter Optimization**: In-sample grid search minimizing squared error across $\\alpha \\in \\{0.1, 0.3, 0.5\\}$, $\\beta \\in \\{0.01, 0.05\\}$, and $\\gamma \\in \\{0.1, 0.3, 0.5\\}$.
- **Backtest Procedure**: Rolling-origin out-of-sample evaluation over the most recent 12 weeks. For each origin week $t$, the model is fitted purely on data prior to $t$ (origin $< t$) and generates a 1-step ahead forecast $\\hat{y}_t$.
- **Metric**: Mean Absolute Percentage Error (MAPE):
  $$\\text{MAPE} = \\frac{1}{12} \\sum_{k=1}^{12} \\left| \\frac{y_{t_k} - \\hat{y}_{t_k}}{y_{t_k}} \\right| \\times 100$$
- **Naive Baseline**: $\\hat{y}^{\\text{naive}}_t = y_{t-1}$.
- **Confidence Rating**:
  - **High**: $\\text{modelMAPE} < 6\\%$ AND beats naive baseline.
  - **Medium**: $\\text{modelMAPE} < 12\\%$. (Capped at Medium if it does not beat naive).
  - **Low**: $\\text{modelMAPE} \\ge 12\\%$.

---

## 12-Week Backtest Results Table

| Item | Telugu Name | Latest Price | Next Wk Forecast | 7-Day Change | Model MAPE | Naive MAPE | Beats Naive? | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${tableRows}

---

## Performance Summary

- **Average Model MAPE**: **${avgModelMAPE.toFixed(2)}%**
- **Average Naive MAPE**: **${avgNaiveMAPE.toFixed(2)}%**
- **Items Beating Baseline**: **${beatenCount} / ${results.length} (${(
    (beatenCount / results.length) *
    100
  ).toFixed(0)}%)**

## Key Observations

1. **Strong Seasonality Capture**: Highly seasonal commodities like Onion and Tomato benefit strongly from the 52-week seasonal component during transition periods.
2. **Short-Term Fluctuations vs Naive**: When price shocks occur or during flat seasonal stretches, the naive baseline remains competitive. The app honestly surfaces whether the statistical model beat the naive baseline for every single item.
3. **Low-Confidence Safeguards**: When MAPE exceeds 12% or uncertainty is high, the system automatically downgrades aggressive recommendations ("BUY NOW" or "WAIT") to "BUY A LITTLE" to protect household budgets.
`;

  const docsDir = path.resolve(process.cwd(), "docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const evalPath = path.join(docsDir, "EVALUATION.md");
  fs.writeFileSync(evalPath, mdContent, "utf8");
  console.log(`Evaluation report written to ${evalPath}\n`);
}

if (
  require.main === module ||
  (typeof process !== "undefined" &&
    process.argv[1]?.endsWith("evaluate.ts"))
) {
  runEvaluation().catch((err) => {
    console.error("Evaluation failed:", err);
    process.exit(1);
  });
}
