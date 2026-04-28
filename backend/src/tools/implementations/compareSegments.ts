import { getMetricsData, type WeekCol } from "../dataLoader.js";

interface Input {
  metric: string;
  week: WeekCol;
  country?: string;
}

export function compareSegments(input: Input) {
  let rows = getMetricsData().filter((r) => r.METRIC === input.metric);
  if (input.country) rows = rows.filter((r) => r.COUNTRY === input.country);

  const wealthy    = rows.filter((r) => r.ZONE_TYPE === "Wealthy");
  const nonWealthy = rows.filter((r) => r.ZONE_TYPE === "Non Wealthy");

  const avg = (arr: typeof rows) =>
    arr.length ? arr.reduce((s, r) => s + r[input.week], 0) / arr.length : 0;

  const wealthyAvg    = avg(wealthy);
  const nonWealthyAvg = avg(nonWealthy);
  const diff          = wealthyAvg - nonWealthyAvg;
  const diffPct       = nonWealthyAvg !== 0 ? (diff / nonWealthyAvg) * 100 : 0;

  return {
    metric:  input.metric,
    week:    input.week,
    country: input.country ?? "all",
    wealthy:     { avg: wealthyAvg,    count: wealthy.length },
    non_wealthy: { avg: nonWealthyAvg, count: nonWealthy.length },
    difference:  { absolute: diff, percent: diffPct },
  };
}
