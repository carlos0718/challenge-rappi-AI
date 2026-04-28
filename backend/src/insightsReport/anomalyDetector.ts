import { getMetricsData } from "../tools/dataLoader.js";

export interface Anomaly {
  zone: string;
  city: string;
  country: string;
  zone_type: string;
  metric: string;
  value_current: number;
  value_previous: number;
  change_pct: number;
  direction: "up" | "down";
}

export function detectAnomalies(threshold = 0.10): Anomaly[] {
  const data = getMetricsData();
  const anomalies: Anomaly[] = [];

  for (const row of data) {
    const curr = row.L0W_ROLL;
    const prev = row.L1W_ROLL;
    if (prev === 0) continue;

    const changePct = (curr - prev) / prev;
    if (Math.abs(changePct) >= threshold) {
      anomalies.push({
        zone:           row.ZONE,
        city:           row.CITY,
        country:        row.COUNTRY,
        zone_type:      row.ZONE_TYPE,
        metric:         row.METRIC,
        value_current:  curr,
        value_previous: prev,
        change_pct:     changePct * 100,
        direction:      changePct > 0 ? "up" : "down",
      });
    }
  }

  return anomalies.sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
}
