import { getMetricsData } from "../tools/dataLoader.js";

export interface BenchmarkResult {
  zone: string;
  country: string;
  zone_type: string;
  metric: string;
  value: number;
  peer_avg: number;
  deviation_pct: number;
  performance: "above" | "below";
}

export function runBenchmarking(topN = 20): BenchmarkResult[] {
  const data = getMetricsData();
  const results: BenchmarkResult[] = [];

  const metrics = [...new Set(data.map((r) => r.METRIC))];

  for (const metric of metrics) {
    const metricRows = data.filter((r) => r.METRIC === metric);
    const groups = new Map<string, typeof metricRows>();

    for (const row of metricRows) {
      const key = `${row.COUNTRY}|${row.ZONE_TYPE}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    for (const [, peers] of groups) {
      if (peers.length < 2) continue;
      const peerAvg = peers.reduce((s, r) => s + r.L0W_ROLL, 0) / peers.length;

      for (const row of peers) {
        const devPct = peerAvg !== 0 ? ((row.L0W_ROLL - peerAvg) / peerAvg) * 100 : 0;
        if (Math.abs(devPct) >= 20) {
          results.push({
            zone:          row.ZONE,
            country:       row.COUNTRY,
            zone_type:     row.ZONE_TYPE,
            metric,
            value:         row.L0W_ROLL,
            peer_avg:      peerAvg,
            deviation_pct: devPct,
            performance:   devPct > 0 ? "above" : "below",
          });
        }
      }
    }
  }

  return results
    .sort((a, b) => Math.abs(b.deviation_pct) - Math.abs(a.deviation_pct))
    .slice(0, topN);
}
