import { getMetricsData, WEEK_COLS } from "../dataLoader.js";

interface Input {
  zone: string;
  metric: string;
  n_weeks: number;
  country?: string;
}

export function getTrend(input: Input) {
  let rows = getMetricsData().filter(
    (r) => r.ZONE.toLowerCase() === input.zone.toLowerCase() && r.METRIC === input.metric
  );
  if (input.country) rows = rows.filter((r) => r.COUNTRY === input.country);

  if (rows.length === 0) {
    return { error: `No data found for zone "${input.zone}" and metric "${input.metric}"` };
  }

  const row = rows[0]!;
  const weeksToShow = WEEK_COLS.slice(-(input.n_weeks + 1));

  const trend = weeksToShow.map((week) => ({
    week,
    value: row[week],
  }));

  const first = trend[0]?.value ?? 0;
  const last  = trend[trend.length - 1]?.value ?? 0;
  const change = first !== 0 ? ((last - first) / first) * 100 : 0;

  return {
    zone:    row.ZONE,
    city:    row.CITY,
    country: row.COUNTRY,
    metric:  input.metric,
    trend,
    summary: { first_value: first, last_value: last, change_pct: change },
  };
}
