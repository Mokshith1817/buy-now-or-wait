import fs from "fs";
import path from "path";

// Seeded PRNG (Mulberry32) for deterministic output
function mulberry32(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ItemConfig {
  item: string;
  basePrice: number;
  seasonAmplitude: number;
  seasonPeakWeek: number; // 0-51 week index inside year where price peaks
  trendSlope: number; // INR increase per week
  noiseStd: number;
  spikes: { weekIndex: number; boost: number; durationWeeks: number }[];
}

const ITEMS_CONFIG: ItemConfig[] = [
  {
    item: "tomato",
    basePrice: 32,
    seasonAmplitude: 16,
    seasonPeakWeek: 28, // July monsoon peak
    trendSlope: 0.02,
    noiseStd: 2.5,
    spikes: [
      { weekIndex: 42, boost: 35, durationWeeks: 4 },
      { weekIndex: 96, boost: 45, durationWeeks: 5 },
      { weekIndex: 164, boost: 38, durationWeeks: 4 },
    ],
  },
  {
    item: "onion",
    basePrice: 35,
    seasonAmplitude: 18,
    seasonPeakWeek: 45, // November post-monsoon / pre-Kharif arrival peak
    trendSlope: 0.025,
    noiseStd: 3.0,
    spikes: [
      { weekIndex: 51, boost: 40, durationWeeks: 4 },
      { weekIndex: 110, boost: 48, durationWeeks: 6 },
      { weekIndex: 182, boost: 36, durationWeeks: 4 },
    ],
  },
  {
    item: "potato",
    basePrice: 26,
    seasonAmplitude: 8,
    seasonPeakWeek: 45, // Nov storage depletion before winter arrival
    trendSlope: 0.015,
    noiseStd: 1.5,
    spikes: [
      { weekIndex: 48, boost: 16, durationWeeks: 5 },
      { weekIndex: 152, boost: 18, durationWeeks: 4 },
    ],
  },
  {
    item: "brinjal",
    basePrice: 34,
    seasonAmplitude: 6,
    seasonPeakWeek: 24, // Early summer/monsoon
    trendSlope: 0.02,
    noiseStd: 2.0,
    spikes: [
      { weekIndex: 68, boost: 18, durationWeeks: 3 },
      { weekIndex: 140, boost: 16, durationWeeks: 3 },
    ],
  },
  {
    item: "okra",
    basePrice: 42,
    seasonAmplitude: 10,
    seasonPeakWeek: 22,
    trendSlope: 0.02,
    noiseStd: 2.5,
    spikes: [
      { weekIndex: 75, boost: 22, durationWeeks: 4 },
      { weekIndex: 148, boost: 20, durationWeeks: 3 },
    ],
  },
  {
    item: "green_chilli",
    basePrice: 58,
    seasonAmplitude: 14,
    seasonPeakWeek: 30,
    trendSlope: 0.03,
    noiseStd: 3.5,
    spikes: [
      { weekIndex: 38, boost: 32, durationWeeks: 4 },
      { weekIndex: 102, boost: 36, durationWeeks: 4 },
      { weekIndex: 172, boost: 28, durationWeeks: 3 },
    ],
  },
  {
    item: "cabbage",
    basePrice: 24,
    seasonAmplitude: 6,
    seasonPeakWeek: 35,
    trendSlope: 0.015,
    noiseStd: 1.8,
    spikes: [
      { weekIndex: 82, boost: 14, durationWeeks: 3 },
      { weekIndex: 158, boost: 15, durationWeeks: 4 },
    ],
  },
  {
    item: "carrot",
    basePrice: 38,
    seasonAmplitude: 12,
    seasonPeakWeek: 28, // summer off-season peak
    trendSlope: 0.02,
    noiseStd: 2.2,
    spikes: [
      { weekIndex: 60, boost: 20, durationWeeks: 4 },
      { weekIndex: 134, boost: 22, durationWeeks: 4 },
    ],
  },
];

export function generateSampleData(): { csvContent: string; sourceContent: string } {
  const TOTAL_WEEKS = 208; // 4 years * 52 weeks
  const END_DATE = new Date(Date.UTC(2026, 9, 12)); // 2026-10-12 (Monday)
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const START_DATE_MS = END_DATE.getTime() - (TOTAL_WEEKS - 1) * MS_PER_WEEK;

  const rng = mulberry32(42069);

  // Normal random variable using Box-Muller
  function randomNormal(mean = 0, std = 1): number {
    const u1 = Math.max(1e-9, rng());
    const u2 = rng();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * std;
  }

  // Pre-generate week date strings
  const weekDates: string[] = [];
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const d = new Date(START_DATE_MS + w * MS_PER_WEEK);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    weekDates.push(`${yyyy}-${mm}-${dd}`);
  }

  const rows: { week_start: string; item: string; price_inr_per_kg: string }[] = [];

  for (const cfg of ITEMS_CONFIG) {
    for (let w = 0; w < TOTAL_WEEKS; w++) {
      const weekInYear = w % 52;
      // Cosine peak at seasonPeakWeek: max when (weekInYear - seasonPeakWeek) == 0
      const seasonal =
        cfg.seasonAmplitude *
        Math.cos((2 * Math.PI * (weekInYear - cfg.seasonPeakWeek)) / 52);

      const trend = cfg.trendSlope * w;
      const noise = randomNormal(0, cfg.noiseStd);

      // Supply shock spikes
      let spikeBoost = 0;
      for (const sp of cfg.spikes) {
        if (w >= sp.weekIndex && w < sp.weekIndex + sp.durationWeeks) {
          const progress = (w - sp.weekIndex) / sp.durationWeeks;
          // Triangle / bell spike shape
          const shape = Math.sin(progress * Math.PI);
          spikeBoost += sp.boost * shape;
        }
      }

      let price = cfg.basePrice + seasonal + trend + noise + spikeBoost;
      // Clamp reasonable minimum (cannot be negative or unreasonably tiny)
      if (price < 10) price = 10 + Math.abs(noise * 0.5);

      rows.push({
        week_start: weekDates[w],
        item: cfg.item,
        price_inr_per_kg: price.toFixed(2),
      });
    }
  }

  // Header and rows
  const csvLines = ["week_start,item,price_inr_per_kg"];
  for (const r of rows) {
    csvLines.push(`${r.week_start},${r.item},${r.price_inr_per_kg}`);
  }

  const csvContent = csvLines.join("\n") + "\n";
  const sourceContent = "synthetic\nSynthetic sample weekly vegetable prices generated for demo purposes.\n";

  return { csvContent, sourceContent };
}

if (require.main === module || (typeof process !== "undefined" && process.argv[1]?.endsWith("generate-sample-data.ts"))) {
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const { csvContent, sourceContent } = generateSampleData();
  const csvPath = path.join(dataDir, "prices.csv");
  const sourcePath = path.join(dataDir, "DATA_SOURCE.txt");

  fs.writeFileSync(csvPath, csvContent, "utf8");
  fs.writeFileSync(sourcePath, sourceContent, "utf8");
  console.log(`Successfully generated sample data at ${csvPath}`);
  console.log(`Data source flag set at ${sourcePath}`);
}
