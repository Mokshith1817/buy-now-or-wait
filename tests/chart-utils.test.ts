import { describe, it, expect } from "vitest";
import {
  calculateChartBounds,
  mapPointToSvg,
  generateLinePath,
  generateBandPath,
  ChartDimensions,
} from "@/lib/chart-utils";

describe("Chart Utils", () => {
  const mockDimensions: ChartDimensions = {
    width: 600,
    height: 300,
    padLeft: 50,
    padRight: 20,
    padTop: 20,
    padBottom: 40,
  };

  it("calculates positive bounds with headroom and clamps min at 0", () => {
    const history = [20, 25, 30, 22];
    const forecast = [
      { point: 32, lower: 18, upper: 40 },
      { point: 35, lower: 15, upper: 45 },
    ];

    const bounds = calculateChartBounds(history, forecast);
    expect(bounds.minVal).toBeGreaterThanOrEqual(0);
    expect(bounds.minVal).toBeLessThanOrEqual(15);
    expect(bounds.maxVal).toBeGreaterThanOrEqual(45);
  });

  it("handles empty arrays gracefully with default positive bounds", () => {
    const bounds = calculateChartBounds([], []);
    expect(bounds.minVal).toBe(0);
    expect(bounds.maxVal).toBe(100);
  });

  it("correctly maps values and indices into SVG coordinate space", () => {
    const bounds = { minVal: 10, maxVal: 50 };
    const ptStart = mapPointToSvg(10, 0, 10, bounds, mockDimensions);
    const ptEnd = mapPointToSvg(50, 9, 10, bounds, mockDimensions);

    // X coordinates should span from padLeft to width - padRight
    expect(ptStart.x).toBe(mockDimensions.padLeft);
    expect(ptEnd.x).toBe(mockDimensions.width - mockDimensions.padRight);

    // Higher value (50) should have smaller Y coordinate (higher on SVG canvas)
    expect(ptEnd.y).toBe(mockDimensions.padTop);
    expect(ptStart.y).toBe(mockDimensions.height - mockDimensions.padBottom);
  });

  it("generates valid SVG line and band paths", () => {
    const pts = [
      { x: 50, y: 100 },
      { x: 100, y: 80 },
      { x: 150, y: 60 },
    ];
    const linePath = generateLinePath(pts);
    expect(linePath).toBe("M 50 100 L 100 80 L 150 60");

    const upper = [{ x: 100, y: 50 }, { x: 150, y: 40 }];
    const lower = [{ x: 100, y: 90 }, { x: 150, y: 100 }];
    const anchor = { x: 50, y: 70 };
    const bandPath = generateBandPath(upper, lower, anchor);

    expect(bandPath.startsWith("M 50 70")).toBe(true);
    expect(bandPath.endsWith("Z")).toBe(true);
  });
});
