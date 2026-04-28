import { getMetricsData, type WeekCol } from "../dataLoader.js";

interface Input {
  metric: string;
  operator: ">" | "<" | ">=" | "<=" | "==";
  threshold: number;
  week: WeekCol;
  top_n?: number;
  country?: string;
}

const compare = (val: number, op: Input["operator"], threshold: number): boolean => {
  if (op === ">")  return val > threshold;
  if (op === "<")  return val < threshold;
  if (op === ">=") return val >= threshold;
  if (op === "<=") return val <= threshold;
  return val === threshold;
};

export function filterZones(input: Input) {
  let rows = getMetricsData().filter((r) => r.METRIC === input.metric);

  if (input.country) rows = rows.filter((r) => r.COUNTRY === input.country);

  const filtered = rows
    .filter((r) => compare(r[input.week], input.operator, input.threshold))
    .sort((a, b) => b[input.week] - a[input.week]);

  const result = (input.top_n ? filtered.slice(0, input.top_n) : filtered).map((r) => ({
    zone:      r.ZONE,
    city:      r.CITY,
    country:   r.COUNTRY,
    zone_type: r.ZONE_TYPE,
    value:     r[input.week],
  }));

  return { metric: input.metric, week: input.week, count: result.length, zones: result };
}
