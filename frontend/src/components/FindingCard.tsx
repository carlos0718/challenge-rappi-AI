import type { Finding } from "../types/api";

const severityColor = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low:    "bg-green-100 text-green-700",
};
const typeIcon = {
  anomaly: "⚡", trend: "📉", benchmark: "📊", correlation: "🔗", opportunity: "🚀",
};

export default function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcon[finding.type]}</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{finding.type}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityColor[finding.severity]}`}>
          {finding.severity}
        </span>
      </div>
      <p className="text-sm text-gray-800">{finding.description}</p>
      <div className="flex gap-2 flex-wrap">
        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{finding.metric}</span>
        {finding.zone    && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{finding.zone}</span>}
        {finding.country && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{finding.country}</span>}
      </div>
    </div>
  );
}
