import { getMetricsData, WEEK_COLS } from "../tools/dataLoader.js";

export interface DecliningTrend {
  zone: string;
  city: string;
  country: string;
  metric: string;
  consecutive_declines: number;
  values: { week: string; value: number }[];
  total_change_pct: number;
}

export function analyzeTrends(minConsecutiveDeclines = 3): DecliningTrend[] {
  const data = getMetricsData();
  const trends: DecliningTrend[] = [];

  for (const row of data) {
    let consecutive = 0;
    let maxConsecutive = 0;
    let startIdx = 0;

    for (let i = 1; i < WEEK_COLS.length; i++) {
      const prev = row[WEEK_COLS[i - 1]!];
      const curr = row[WEEK_COLS[i]!];
      if (curr < prev) {
        consecutive++;
        if (consecutive > maxConsecutive) {
          maxConsecutive = consecutive;
          startIdx = i - consecutive;
        }
      } else {
        consecutive = 0;
      }
    }

    if (maxConsecutive >= minConsecutiveDeclines) {
      const trendCols = WEEK_COLS.slice(startIdx, startIdx + maxConsecutive + 1);
      const firstVal  = row[trendCols[0]!];
      const lastVal   = row[trendCols[trendCols.length - 1]!];
      const changePct = firstVal !== 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;

      trends.push({
        zone:                 row.ZONE,
        city:                 row.CITY,
        country:              row.COUNTRY,
        metric:               row.METRIC,
        consecutive_declines: maxConsecutive,
        values:               trendCols.map((w) => ({ week: w, value: row[w] })),
        total_change_pct:     changePct,
      });
    }
  }

  return trends.sort((a, b) => b.consecutive_declines - a.consecutive_declines);
}
