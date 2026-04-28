import { getOrdersData } from "../dataLoader.js";

interface Input {
  n_weeks: number;
  top_n?: number;
  country?: string;
}

export function getGrowthZones(input: Input) {
  let rows = getOrdersData();
  if (input.country) rows = rows.filter((r) => r.COUNTRY === input.country);

  const orderCols = ["L8W","L7W","L6W","L5W","L4W","L3W","L2W","L1W","L0W"] as const;
  type OrderCol = (typeof orderCols)[number];

  const recentCols = orderCols.slice(-input.n_weeks) as OrderCol[];
  const baseCols   = orderCols.slice(-(input.n_weeks + 1), -input.n_weeks) as OrderCol[];

  const baseCol   = baseCols[0];
  const latestCol = recentCols[recentCols.length - 1];

  if (!baseCol || !latestCol) {
    return { error: "n_weeks out of range" };
  }

  const results = rows
    .filter((r) => r[baseCol] > 0)
    .map((r) => {
      const base   = r[baseCol];
      const latest = r[latestCol];
      const growth = ((latest - base) / base) * 100;
      const trend  = recentCols.map((c) => ({ week: c, orders: r[c] }));
      return { zone: r.ZONE, city: r.CITY, country: r.COUNTRY, base_orders: base, latest_orders: latest, growth_pct: growth, trend };
    })
    .sort((a, b) => b.growth_pct - a.growth_pct)
    .slice(0, input.top_n ?? 10);

  return { n_weeks: input.n_weeks, country: input.country ?? "all", count: results.length, zones: results };
}
