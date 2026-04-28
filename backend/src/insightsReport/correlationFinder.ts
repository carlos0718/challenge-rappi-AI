import { getMetricsData } from "../tools/dataLoader.js";

export interface Correlation {
  metric_a: string;
  metric_b: string;
  pearson_r: number;
  strength: "strong" | "moderate" | "weak";
  direction: "positive" | "negative";
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  const num   = xs.reduce((s, x, i) => s + (x - meanX) * ((ys[i] ?? 0) - meanY), 0);
  const denX  = Math.sqrt(xs.reduce((s, x) => s + (x - meanX) ** 2, 0));
  const denY  = Math.sqrt(ys.reduce((s, y) => s + (y - meanY) ** 2, 0));
  return denX * denY === 0 ? 0 : num / (denX * denY);
}

export function findCorrelations(minAbsR = 0.6): Correlation[] {
  const data    = getMetricsData();
  const metrics = [...new Set(data.map((r) => r.METRIC))];
  const results: Correlation[] = [];

  // Build zone key → metric → value map
  const zoneMetricMap = new Map<string, Map<string, number>>();
  for (const row of data) {
    const key = `${row.COUNTRY}|${row.ZONE}`;
    if (!zoneMetricMap.has(key)) zoneMetricMap.set(key, new Map());
    zoneMetricMap.get(key)!.set(row.METRIC, row.L0W_ROLL);
  }

  const zones = [...zoneMetricMap.keys()];

  for (let i = 0; i < metrics.length; i++) {
    for (let j = i + 1; j < metrics.length; j++) {
      const mA = metrics[i]!;
      const mB = metrics[j]!;

      const xs: number[] = [];
      const ys: number[] = [];
      for (const zone of zones) {
        const m = zoneMetricMap.get(zone)!;
        if (m.has(mA) && m.has(mB)) {
          xs.push(m.get(mA)!);
          ys.push(m.get(mB)!);
        }
      }

      const r = pearson(xs, ys);
      if (Math.abs(r) >= minAbsR) {
        results.push({
          metric_a:  mA,
          metric_b:  mB,
          pearson_r: r,
          strength:  Math.abs(r) >= 0.8 ? "strong" : Math.abs(r) >= 0.6 ? "moderate" : "weak",
          direction: r > 0 ? "positive" : "negative",
        });
      }
    }
  }

  return results.sort((a, b) => Math.abs(b.pearson_r) - Math.abs(a.pearson_r));
}
