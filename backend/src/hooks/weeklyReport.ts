import "dotenv/config";
import cron from "node-cron";
import { generateInsightsReport } from "../insightsReport/handler.js";

// Every Monday at 9:00am
cron.schedule("0 9 * * 1", async () => {
  console.log(`[${new Date().toISOString()}] Weekly report job started`);
  try {
    const report = await generateInsightsReport();
    console.log(`[${new Date().toISOString()}] Report generated — ${report.top_findings.length} findings`);
    console.log("At risk metrics:", report.at_risk_metrics.join(", "));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Report job failed:`, err);
  }
});

console.log("Weekly report scheduler registered (Mon 9am)");
