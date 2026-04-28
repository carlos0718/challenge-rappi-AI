import type { Finding } from "../types/api";

const severityColor = {
  high:   "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low:    "bg-green-100 text-green-700 border-green-200",
};

const typeIcon: Record<Finding["type"], string> = {
  anomaly:     "⚡",
  trend:       "📉",
  benchmark:   "📊",
  correlation: "🔗",
  opportunity: "🚀",
};

const typeLabel: Record<Finding["type"], string> = {
  anomaly:     "Anomalía",
  trend:       "Tendencia",
  benchmark:   "Benchmark",
  correlation: "Correlación",
  opportunity: "Oportunidad",
};

export default function FindingCard({ finding, compact = false }: { finding: Finding; compact?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcon[finding.type]}</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {typeLabel[finding.type]}
          </span>
          {!compact && (
            <span className="text-xs text-gray-400">#{finding.rank}</span>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${severityColor[finding.severity]}`}>
          {finding.severity}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-800 leading-relaxed">{finding.description}</p>

      {/* Tags */}
      <div className="flex gap-2 flex-wrap">
        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{finding.metric}</span>
        {finding.zone    && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{finding.zone}</span>}
        {finding.country && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{finding.country}</span>}
      </div>

      {/* Per-finding recommendation */}
      {finding.recommendation && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 flex gap-2">
          <span className="text-orange-500 shrink-0 text-sm">→</span>
          <p className="text-xs text-orange-800 leading-relaxed">{finding.recommendation}</p>
        </div>
      )}
    </div>
  );
}
