import { describe, it, expect } from "vitest";
import { getForecastForItem, clearForecastCache } from "@/lib/forecast";
import { ITEMS } from "@/lib/i18n";

describe("Forecast Engine", () => {
  it("returns finite numbers, 4 points, valid intervals, and finite MAPE for every item", () => {
    clearForecastCache();

    for (const item of ITEMS) {
      const result = getForecastForItem(item.id);

      // Verify item id
      expect(result.item).toBe(item.id);

      // Verify latest price
      expect(Number.isFinite(result.latestPrice)).toBe(true);
      expect(result.latestPrice).toBeGreaterThan(0);

      // Verify change7
      expect(Number.isFinite(result.change7)).toBe(true);

      // Verify history (last 52 weeks)
      expect(result.history.length).toBe(52);
      for (const h of result.history) {
        expect(Number.isFinite(h.price)).toBe(true);
        expect(h.price).toBeGreaterThan(0);
        expect(h.week_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }

      // Verify 4 forecast points
      expect(result.forecast.length).toBe(4);
      for (let i = 0; i < result.forecast.length; i++) {
        const pt = result.forecast[i];
        expect(pt.week).toBe(i + 1);
        expect(Number.isFinite(pt.point)).toBe(true);
        expect(Number.isFinite(pt.lower)).toBe(true);
        expect(Number.isFinite(pt.upper)).toBe(true);

        // Interval checks: lower <= point <= upper
        expect(pt.lower).toBeLessThanOrEqual(pt.point);
        expect(pt.point).toBeLessThanOrEqual(pt.upper);

        // Lower bound clamped at 0
        expect(pt.lower).toBeGreaterThanOrEqual(0);

        // Valid date string
        expect(pt.week_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }

      // Verify backtest metrics
      expect(Number.isFinite(result.backtest.modelMAPE)).toBe(true);
      expect(Number.isFinite(result.backtest.naiveMAPE)).toBe(true);
      expect(typeof result.backtest.beatsNaive).toBe("boolean");
      expect(result.backtest.modelMAPE).toBeGreaterThanOrEqual(0);
      expect(result.backtest.naiveMAPE).toBeGreaterThanOrEqual(0);

      // Verify confidence rating
      expect(["High", "Medium", "Low"]).toContain(result.confidence);
      if (!result.backtest.beatsNaive) {
        expect(result.confidence).not.toBe("High");
      }
    }
  });
});
