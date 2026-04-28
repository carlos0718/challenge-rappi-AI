import { getMetricsData, type WeekCol } from "../dataLoader.js";

interface Input {
  metric_high: string;
  metric_low: string;
  threshold_high?: number;
  threshold_low?: number;
  week: WeekCol;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
}

export function multivariateAnalysis(input: Input) {
  const data = getMetricsData();
  const highRows = data.filter((r) => r.METRIC === input.metric_high);
  const lowRows  = data.filter((r) => r.METRIC === input.metric_low);

  const highValues = highRows.map((r) => r[input.week]);
  const lowValues  = lowRows.map((r) => r[input.week]);

  const pHigh = input.threshold_high ?? 75;
  const pLow  = input.threshold_low  ?? 25;

  const cutHigh = percentile(highValues, pHigh);
  const cutLow  = percentile(lowValues,  pLow);

  const highMap = new Map(highRows.map((r) => [`${r.COUNTRY}|${r.ZONE}`, r]));

  const results = lowRows
    .filter((r) => r[input.week] <= cutLow)
    .flatMap((lowRow) => {
      const key = `${lowRow.COUNTRY}|${lowRow.ZONE}`;
      const highRow = highMap.get(key);
      if (!highRow || highRow[input.week] < cutHigh) return [];
      return [{
        zone:         lowRow.ZONE,
        city:         lowRow.CITY,
        country:      lowRow.COUNTRY,
        zone_type:    lowRow.ZONE_TYPE,
        [input.metric_high]: highRow[input.week],
        [input.metric_low]:  lowRow[input.week],
      }];
    })
    .sort((a, b) => (b[input.metric_high] as number) - (a[input.metric_high] as number));

  return {
    metric_high: input.metric_high,
    metric_low:  input.metric_low,
    week:        input.week,
    cutoffs:     { high: cutHigh, low: cutLow },
    count:       results.length,
    zones:       results,
  };
}
