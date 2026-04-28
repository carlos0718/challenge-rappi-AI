import { useState, memo }  from "react";
import FindingCard   from "./FindingCard";
import MetricsTable  from "./MetricsTable";
import TrendChart    from "./TrendChart";
import type { InsightsReportResponse } from "../types/api";

type FindingsView = "cards" | "table";

const ReportsPanel = memo(function ReportsPanel() {
  const [report,       setReport]       = useState<InsightsReportResponse | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [findingsView, setFindingsView] = useState<FindingsView>("cards");

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reporte Ejecutivo Semanal</h2>
          <p className="text-sm text-gray-500 mt-1">Análisis automático de la semana más reciente (L0W)</p>
        </div>
        <button onClick={runReport} disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
          {loading ? "Generando…" : "Generar Reporte"}
        </button>
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

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Top Hallazgos</h3>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => setFindingsView("cards")}
                  className={`px-3 py-1.5 transition ${
                    findingsView === "cards"
                      ? "bg-orange-500 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Tarjetas
                </button>
                <button
                  onClick={() => setFindingsView("table")}
                  className={`px-3 py-1.5 transition border-l border-gray-200 ${
                    findingsView === "table"
                      ? "bg-orange-500 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Tabla
                </button>
              </div>
            </div>

            {findingsView === "cards" ? (
              <div className="space-y-3">
                {report.top_findings.map((f) => <FindingCard key={f.rank} finding={f} />)}
              </div>
            ) : (
              <MetricsTable findings={report.top_findings} />
            )}
          </div>

          {report.recommendations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recomendaciones</h3>
              <ul className="space-y-2">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-orange-500 font-bold shrink-0">{i + 1}.</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.at_risk_metrics.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-700 mb-2">Métricas en Riesgo</h3>
              <div className="flex flex-wrap gap-2">
                {report.at_risk_metrics.map((m) => (
                  <span key={m} className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">{m}</span>
                ))}
              </div>
            </div>
          )}

          {report.trend_data && report.trend_data.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tendencias</h3>
              <div className="space-y-4">
                {report.trend_data.map((series) => (
                  <TrendChart
                    key={series.metric}
                    metric={series.metric}
                    data={series.points}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default ReportsPanel;
