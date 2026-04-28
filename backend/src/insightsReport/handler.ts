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
	recommendation?: string;
}

export interface InsightsReportResponse {
	week: string;
	generated_at: string;
	top_findings: Finding[];
	recommendations: string[];
	at_risk_metrics: string[];
	trend_data: { metric: string; zone: string; points: { week: string; value: number }[] }[];
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
    {
      "rank": 1,
      "type": "anomaly|trend|benchmark|correlation|opportunity",
      "severity": "high|medium|low",
      "description": "descripción detallada del hallazgo",
      "metric": "nombre de la métrica",
      "zone": "nombre de la zona",
      "country": "código de país",
      "recommendation": "acción concreta y accionable para este hallazgo específico"
    }
  ],
  "recommendations": ["recomendación estratégica 1", "recomendación estratégica 2", "recomendación estratégica 3"],
  "at_risk_metrics": ["métrica 1", "métrica 2"]
}

REGLAS OBLIGATORIAS:
- Incluye EXACTAMENTE 5 hallazgos (top_findings).
- Debe haber AL MENOS UN hallazgo de cada una de estas 5 categorías: anomaly, trend, benchmark, correlation, opportunity.
- Cada hallazgo DEBE incluir el campo "recommendation" con una acción concreta y específica para ese hallazgo.
- Las "recommendations" del nivel superior son recomendaciones estratégicas generales (distintas a las de cada finding).
- Si no hay datos suficientes para una categoría, infiere una oportunidad de mejora basada en el contexto.
- Responde SOLO con el JSON, sin texto adicional.

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

	const trendData = trends.slice(0, 5).map((t) => ({
		metric: t.metric,
		zone: t.zone,
		points: t.values,
	}));

	return {
		week: 'L0W',
		generated_at: new Date().toISOString(),
		top_findings: findings,
		recommendations: (parsed.recommendations ?? []) as string[],
		at_risk_metrics: (parsed.at_risk_metrics ?? []) as string[],
		trend_data: trendData,
		usage: {
			input_tokens: response.usage.input_tokens,
			output_tokens: response.usage.output_tokens,
			cache_read_input_tokens: (response.usage as unknown as Record<string, number>)['cache_read_input_tokens'] ?? 0,
		},
	};
}
