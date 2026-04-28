import { getMetricsData, type WeekCol } from "../dataLoader.js";

interface Input {
  dimension: "country" | "zone_type";
  metric: string;
  week: WeekCol;
}

export function aggregateBy(input: Input) {
  const rows = getMetricsData().filter((r) => r.METRIC === input.metric);

  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const key = input.dimension === "country" ? row.COUNTRY : row.ZONE_TYPE;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row[input.week]);
  }

  const result = Array.from(groups.entries())
    .map(([key, values]) => ({
      [input.dimension]: key,
      avg:   values.reduce((s, v) => s + v, 0) / values.length,
      min:   Math.min(...values),
      max:   Math.max(...values),
      count: values.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  return { metric: input.metric, week: input.week, dimension: input.dimension, data: result };
}
