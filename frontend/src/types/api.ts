export interface InsightQueryRequest  { question: string; sessionId: string; }

export interface TrendPoint { week?: string; label?: string; value: number; }

export interface ChartSeries {
  metric: string;
  type: "line" | "bar";
  zone?: string;
  country?: string;
  points: TrendPoint[];
}

export interface InsightQueryResponse {
  answer: string;
  suggestions: string[];
  sessionId: string;
  chart_data: ChartSeries[];
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number };
}

export interface Finding {
  rank: number;
  type: "anomaly" | "trend" | "benchmark" | "correlation" | "opportunity";
  severity: "high" | "medium" | "low";
  description: string;
  metric: string;
  zone?: string;
  country?: string;
  recommendation?: string;
}

export interface InsightsReportResponse {
  week: string;
  generated_at: string;
  top_findings: Finding[];
  recommendations: string[];
  at_risk_metrics: string[];
  trend_data?: { metric: string; zone: string; points: TrendPoint[] }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  chart_data?: ChartSeries[];
  timestamp: Date;
}
