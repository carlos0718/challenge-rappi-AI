export interface InsightQueryRequest  { question: string; sessionId: string; }
export interface InsightQueryResponse {
  answer: string;
  suggestions: string[];
  sessionId: string;
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
}

export interface InsightsReportResponse {
  week: string;
  generated_at: string;
  top_findings: Finding[];
  recommendations: string[];
  at_risk_metrics: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  timestamp: Date;
}
