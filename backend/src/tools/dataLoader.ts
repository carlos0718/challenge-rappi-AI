import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
// Anchor: backend/src/tools/ → up 3 levels → project root → data/
const DATA_DIR = resolve(__dirname, "../../../data");

export interface MetricRow {
  COUNTRY: string;
  CITY: string;
  ZONE: string;
  ZONE_TYPE: "Wealthy" | "Non Wealthy";
  ZONE_PRIORITIZATION: "Not Prioritized" | "Prioritized" | "High Priority";
  METRIC: string;
  L8W_ROLL: number;
  L7W_ROLL: number;
  L6W_ROLL: number;
  L5W_ROLL: number;
  L4W_ROLL: number;
  L3W_ROLL: number;
  L2W_ROLL: number;
  L1W_ROLL: number;
  L0W_ROLL: number;
}

export interface OrderRow {
  COUNTRY: string;
  CITY: string;
  ZONE: string;
  METRIC: string;
  L8W: number;
  L7W: number;
  L6W: number;
  L5W: number;
  L4W: number;
  L3W: number;
  L2W: number;
  L1W: number;
  L0W: number;
}

export const WEEK_COLS = ["L8W_ROLL","L7W_ROLL","L6W_ROLL","L5W_ROLL","L4W_ROLL","L3W_ROLL","L2W_ROLL","L1W_ROLL","L0W_ROLL"] as const;
export type WeekCol = (typeof WEEK_COLS)[number];

function parseCsv(filePath: string): Record<string, string>[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = (lines[0] ?? "").split(",").map((h) => h.trim().replace(/\r/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/\r/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

let _metricsData: MetricRow[] | null = null;
let _ordersData: OrderRow[] | null = null;

export function getMetricsData(): MetricRow[] {
  if (_metricsData) return _metricsData;

  const csvPath = resolve(process.env["METRICS_CSV_PATH"] ?? `${DATA_DIR}/raw_input_metrics.csv`);
  const raw = parseCsv(csvPath);

  _metricsData = raw.map((r) => ({
    COUNTRY: r["COUNTRY"] ?? "",
    CITY: r["CITY"] ?? "",
    ZONE: r["ZONE"] ?? "",
    ZONE_TYPE: (r["ZONE_TYPE"] ?? "Non Wealthy") as MetricRow["ZONE_TYPE"],
    ZONE_PRIORITIZATION: (r["ZONE_PRIORITIZATION"] ?? "Not Prioritized") as MetricRow["ZONE_PRIORITIZATION"],
    METRIC: r["METRIC"] ?? "",
    L8W_ROLL: parseFloat(r["L8W_ROLL"] ?? "0") || 0,
    L7W_ROLL: parseFloat(r["L7W_ROLL"] ?? "0") || 0,
    L6W_ROLL: parseFloat(r["L6W_ROLL"] ?? "0") || 0,
    L5W_ROLL: parseFloat(r["L5W_ROLL"] ?? "0") || 0,
    L4W_ROLL: parseFloat(r["L4W_ROLL"] ?? "0") || 0,
    L3W_ROLL: parseFloat(r["L3W_ROLL"] ?? "0") || 0,
    L2W_ROLL: parseFloat(r["L2W_ROLL"] ?? "0") || 0,
    L1W_ROLL: parseFloat(r["L1W_ROLL"] ?? "0") || 0,
    L0W_ROLL: parseFloat(r["L0W_ROLL"] ?? "0") || 0,
  }));

  return _metricsData;
}

export function getOrdersData(): OrderRow[] {
  if (_ordersData) return _ordersData;

  const csvPath = resolve(process.env["ORDERS_CSV_PATH"] ?? `${DATA_DIR}/raw_orders.csv`);
  const raw = parseCsv(csvPath);

  _ordersData = raw.map((r) => ({
    COUNTRY: r["COUNTRY"] ?? "",
    CITY: r["CITY"] ?? "",
    ZONE: r["ZONE"] ?? "",
    METRIC: r["METRIC"] ?? "",
    L8W: parseFloat(r["L8W"] ?? "0") || 0,
    L7W: parseFloat(r["L7W"] ?? "0") || 0,
    L6W: parseFloat(r["L6W"] ?? "0") || 0,
    L5W: parseFloat(r["L5W"] ?? "0") || 0,
    L4W: parseFloat(r["L4W"] ?? "0") || 0,
    L3W: parseFloat(r["L3W"] ?? "0") || 0,
    L2W: parseFloat(r["L2W"] ?? "0") || 0,
    L1W: parseFloat(r["L1W"] ?? "0") || 0,
    L0W: parseFloat(r["L0W"] ?? "0") || 0,
  }));

  return _ordersData;
}
