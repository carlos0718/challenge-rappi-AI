import Anthropic from '@anthropic-ai/sdk';
import {buildSystemPrompt} from '../config/systemPrompt.js';
import {detectAnomalies} from './anomalyDetector.js';
import {analyzeTrends} from './trendAnalyzer.js';
import {runBenchmarking} from './benchmarker.js';
import {findCorrelations} from './correlationFinder.js';

const anthropic = new Anthropic({apiKey: process.env['ANTHROPIC_API_KEY']});

export interface Finding {
	rank: number;
	type: 'anomaly' | 'trend' | 'benchmark' | 'correlation' | 'opportunity';
	severity: 'high' | 'medium' | 'low';
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
	usage: {input_tokens: number; output_tokens: number; cache_read_input_tokens: number};
}

export async function generateInsightsReport(): Promise<InsightsReportResponse> {
	const anomalies = detectAnomalies().slice(0, 10);
	const trends = analyzeTrends().slice(0, 10);
	const benchmarks = runBenchmarking(10);
	const correlations = findCorrelations();

	const context = `
## Anomalías detectadas (cambio >10% WoW)
${anomalies.map((a) => `- ${a.metric} en ${a.zone} (${a.country}): ${a.change_pct.toFixed(1)}% ${a.direction === 'down' ? '↓' : '↑'}`).join('\n')}

## Tendencias preocupantes (3+ semanas de caída consecutiva)
${trends.map((t) => `- ${t.metric} en ${t.zone} (${t.country}): ${t.consecutive_declines} semanas, cambio total ${t.total_change_pct.toFixed(1)}%`).join('\n')}

## Benchmarking (zonas que se desvían >20% de su peer group)
${benchmarks.map((b) => `- ${b.metric} en ${b.zone} (${b.country}, ${b.zone_type}): ${b.deviation_pct.toFixed(1)}% vs promedio de peers`).join('\n')}

## Correlaciones entre métricas
${correlations.map((c) => `- ${c.metric_a} ↔ ${c.metric_b}: r=${c.pearson_r.toFixed(2)} (${c.strength} ${c.direction})`).join('\n')}
`.trim();

	const response = await anthropic.messages.create({
		model: 'claude-sonnet-4-6',
		max_tokens: 4096,
		system: buildSystemPrompt(),
		messages: [
			{
				role: 'user',
				content: `Basándote en este análisis estadístico de la semana más reciente (L0W), genera un reporte ejecutivo estructurado en JSON con exactamente este formato:

{
  "top_findings": [
    { "rank": 1, "type": "anomaly|trend|benchmark|correlation|opportunity", "severity": "high|medium|low", "description": "...", "metric": "...", "zone": "...", "country": "..." }
  ],
  "recommendations": ["acción 1", "acción 2", "acción 3"],
  "at_risk_metrics": ["métrica 1", "métrica 2"]
}

Incluye los 5 hallazgos más importantes. Responde SOLO con el JSON, sin texto adicional.

${context}`
			}
		]
	});

	const textBlock = response.content.find((b) => b.type === 'text');
	const raw = textBlock?.type === 'text' ? textBlock.text.trim() : '{}';

	let parsed: {top_findings?: unknown[]; recommendations?: unknown[]; at_risk_metrics?: unknown[]};
	try {
		const jsonMatch = raw.match(/\{[\s\S]*\}/);
		parsed = JSON.parse(jsonMatch?.[0] ?? '{}') as typeof parsed;
	} catch {
		parsed = {};
	}

	const findings = ((parsed.top_findings ?? []) as Finding[]).map((f, i) => ({...f, rank: i + 1}));

	return {
		week: 'L0W',
		generated_at: new Date().toISOString(),
		top_findings: findings,
		recommendations: (parsed.recommendations ?? []) as string[],
		at_risk_metrics: (parsed.at_risk_metrics ?? []) as string[],
		usage: {
			input_tokens: response.usage.input_tokens,
			output_tokens: response.usage.output_tokens,
			cache_read_input_tokens: (response.usage as unknown as Record<string, number>)['cache_read_input_tokens'] ?? 0,
		},
	};
}
