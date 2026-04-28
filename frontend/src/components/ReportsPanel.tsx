import { useState, memo } from "react";
import FindingCard  from "./FindingCard";
import MetricsTable from "./MetricsTable";
import TrendChart   from "./TrendChart";
import type { Finding, InsightsReportResponse } from "../types/api";

const severityBadge: Record<Finding["severity"], string> = {
  high:   "background:#fee2e2;color:#b91c1c;border:1px solid #fecaca",
  medium: "background:#fef9c3;color:#92400e;border:1px solid #fde68a",
  low:    "background:#dcfce7;color:#166534;border:1px solid #bbf7d0",
};

const typeIcon: Record<Finding["type"], string> = {
  anomaly: "⚡", trend: "📉", benchmark: "📊", correlation: "🔗", opportunity: "🚀",
};

const CATEGORY_LABELS_HTML: Record<Finding["type"], string> = {
  anomaly: "⚡ Anomalías", trend: "📉 Tendencias", benchmark: "📊 Benchmarking",
  correlation: "🔗 Correlaciones", opportunity: "🚀 Oportunidades",
};

function buildHtml(report: InsightsReportResponse): string {
  const date = new Date(report.generated_at).toLocaleString("es");

  const byCategory = (["anomaly", "trend", "benchmark", "correlation", "opportunity"] as Finding["type"][])
    .map((cat) => ({ cat, findings: report.top_findings.filter((f) => f.type === cat) }))
    .filter(({ findings }) => findings.length > 0);

  const findingHtml = (f: Finding) => `
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;background:#fff">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">
          ${typeIcon[f.type]} ${f.type}
        </span>
        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:9999px;${severityBadge[f.severity]}">
          ${f.severity}
        </span>
      </div>
      <p style="font-size:14px;color:#1f2937;line-height:1.6;margin:0 0 8px">${f.description}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:${f.recommendation ? "10px" : "0"}">
        <span style="background:#f3f4f6;color:#6b7280;font-size:11px;padding:2px 8px;border-radius:4px">${f.metric}</span>
        ${f.zone    ? `<span style="background:#f3f4f6;color:#6b7280;font-size:11px;padding:2px 8px;border-radius:4px">${f.zone}</span>` : ""}
        ${f.country ? `<span style="background:#f3f4f6;color:#6b7280;font-size:11px;padding:2px 8px;border-radius:4px">${f.country}</span>` : ""}
      </div>
      ${f.recommendation ? `
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 12px;font-size:12px;color:#9a3412">
        → ${f.recommendation}
      </div>` : ""}
    </div>`;

  const categorySections = byCategory.map(({ cat, findings }) => `
    <div style="margin-bottom:24px">
      <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px">
        ${CATEGORY_LABELS_HTML[cat]}
      </p>
      ${findings.map(findingHtml).join("")}
    </div>`).join("");

  const recommendationsHtml = report.recommendations.length > 0 ? `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px">
      <h2 style="font-size:14px;font-weight:600;color:#374151;margin:0 0 12px;display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:4px;height:16px;background:#60a5fa;border-radius:2px"></span>
        Recomendaciones Estratégicas
      </h2>
      <ol style="margin:0;padding-left:20px">
        ${report.recommendations.map((r) => `<li style="font-size:14px;color:#374151;margin-bottom:8px;line-height:1.5">${r}</li>`).join("")}
      </ol>
    </div>` : "";

  const atRiskHtml = report.at_risk_metrics.length > 0 ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px">
      <h2 style="font-size:14px;font-weight:600;color:#b91c1c;margin:0 0 10px">Métricas en Riesgo</h2>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${report.at_risk_metrics.map((m) => `<span style="background:#fee2e2;color:#b91c1c;font-size:11px;padding:3px 10px;border-radius:9999px">${m}</span>`).join("")}
      </div>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reporte Ejecutivo Semanal — Rappi AI</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f9fafb; color:#111827; margin:0; padding:32px 16px; }
    .container { max-width: 720px; margin: 0 auto; }
    @media print { body { background: #fff; padding: 0; } }
  </style>
</head>
<body>
<div class="container">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px">
    <div style="width:36px;height:36px;background:#f97316;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px">R</div>
    <div>
      <h1 style="margin:0;font-size:20px;font-weight:700">Reporte Ejecutivo Semanal</h1>
      <p style="margin:0;font-size:12px;color:#9ca3af">Rappi AI · Semana ${report.week} · Generado ${date}</p>
    </div>
  </div>

  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;display:flex;justify-content:space-around;text-align:center;margin-bottom:24px">
    <div><p style="margin:0;font-size:11px;color:#9ca3af">Semana</p><p style="margin:4px 0 0;font-size:14px;font-weight:600">${report.week}</p></div>
    <div><p style="margin:0;font-size:11px;color:#9ca3af">Hallazgos</p><p style="margin:4px 0 0;font-size:14px;font-weight:600">${report.top_findings.length}</p></div>
    <div><p style="margin:0;font-size:11px;color:#9ca3af">Generado</p><p style="margin:4px 0 0;font-size:14px;font-weight:600">${date}</p></div>
  </div>

  <div style="margin-bottom:24px">
    <h2 style="font-size:14px;font-weight:600;color:#374151;margin:0 0 14px;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:4px;height:16px;background:#fb923c;border-radius:2px"></span>
      Resumen Ejecutivo
    </h2>
    ${categorySections}
  </div>

  ${recommendationsHtml}
  ${atRiskHtml}
</div>
</body>
</html>`;
}

type FindingsView = "cards" | "table";

const CATEGORY_ORDER: Finding["type"][] = ["anomaly", "trend", "benchmark", "correlation", "opportunity"];

const categoryLabel: Record<Finding["type"], string> = {
  anomaly:     "⚡ Anomalías",
  trend:       "📉 Tendencias",
  benchmark:   "📊 Benchmarking",
  correlation: "🔗 Correlaciones",
  opportunity: "🚀 Oportunidades",
};

const ReportsPanel = memo(function ReportsPanel() {
  const [report,       setReport]       = useState<InsightsReportResponse | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [findingsView, setFindingsView] = useState<FindingsView>("cards");

  function downloadHtml() {
    if (!report) return;
    const blob = new Blob([buildHtml(report)], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `rappi-reporte-${report.week}-${new Date().toISOString().slice(0,10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runReport() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/v1/insights-report", { method: "POST" });
      const data = await res.json() as InsightsReportResponse;
      setReport(data);
    } catch {
      setError("Error al generar el reporte. Verifica que el backend está corriendo.");
    } finally {
      setLoading(false);
    }
  }

  const byCategory = CATEGORY_ORDER.reduce<Record<Finding["type"], Finding[]>>(
    (acc, cat) => {
      acc[cat] = report?.top_findings.filter((f) => f.type === cat) ?? [];
      return acc;
    },
    {} as Record<Finding["type"], Finding[]>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reporte Ejecutivo Semanal</h2>
          <p className="text-sm text-gray-500 mt-1">Análisis automático de la semana más reciente (L0W)</p>
        </div>
        <div className="flex gap-2">
          {report && (
            <button type="button" onClick={downloadHtml}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition flex items-center gap-1.5">
              <span>↓</span> Descargar HTML
            </button>
          )}
          <button type="button" onClick={runReport} disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
            {loading ? "Generando…" : report ? "Regenerar" : "Generar Reporte"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="flex justify-center space-x-1 mb-3">
            {[0, 150, 300].map((d) => (
              <div key={d} className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
          <p className="text-sm text-gray-500">Analizando datos operacionales…</p>
        </div>
      )}

      {report && !loading && (
        <>
          {/* Metadata strip */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between text-center">
            {[
              { label: "Generado",   value: new Date(report.generated_at).toLocaleString("es") },
              { label: "Semana",     value: report.week },
              { label: "Hallazgos", value: String(report.top_findings.length) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          {/* ── Resumen Ejecutivo ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-400 rounded-full inline-block" />
                Resumen Ejecutivo
              </h3>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                <button type="button"
                  onClick={() => setFindingsView("cards")}
                  className={`px-3 py-1.5 transition ${findingsView === "cards" ? "bg-orange-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                  Tarjetas
                </button>
                <button type="button"
                  onClick={() => setFindingsView("table")}
                  className={`px-3 py-1.5 transition border-l border-gray-200 ${findingsView === "table" ? "bg-orange-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                  Tabla
                </button>
              </div>
            </div>

            {findingsView === "table" ? (
              <MetricsTable findings={report.top_findings} />
            ) : (
              <div className="space-y-5">
                {CATEGORY_ORDER.map((cat) => {
                  const findings = byCategory[cat];
                  if (findings.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                        {categoryLabel[cat]}
                      </p>
                      <div className="space-y-3">
                        {findings.map((f) => <FindingCard key={`cat-${f.rank}`} finding={f} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 3. Recomendaciones Estratégicas ── */}
          {report.recommendations.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-400 rounded-full inline-block" />
                Recomendaciones Estratégicas
              </h3>
              <ul className="space-y-2">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-orange-500 font-bold shrink-0">{i + 1}.</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Métricas en Riesgo ── */}
          {report.at_risk_metrics.length > 0 && (
            <section className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-700 mb-2">Métricas en Riesgo</h3>
              <div className="flex flex-wrap gap-2">
                {report.at_risk_metrics.map((m) => (
                  <span key={m} className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">{m}</span>
                ))}
              </div>
            </section>
          )}

          {/* ── Tendencias (gráficos) ── */}
          {report.trend_data && report.trend_data.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tendencias</h3>
              <div className="space-y-4">
                {report.trend_data.map((series) => (
                  <TrendChart
                    key={`${series.metric}-${series.zone}`}
                    metric={`${series.metric} — ${series.zone}`}
                    data={series.points}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
});

export default ReportsPanel;
