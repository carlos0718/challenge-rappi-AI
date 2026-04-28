import Anthropic from '@anthropic-ai/sdk';
import {buildSystemPrompt} from '../config/systemPrompt.js';
import {TOOL_DEFINITIONS} from '../tools/definitions.js';
import {executeTool} from '../tools/toolExecutor.js';
import {getHistory, appendMessage} from './conversationStore.js';

const anthropic = new Anthropic({apiKey: process.env['ANTHROPIC_API_KEY']});
console.log('ANTHROPIC_API_KEY', process.env['ANTHROPIC_API_KEY']);
export interface InsightQueryRequest {
	question: string;
	sessionId: string;
}

export interface ChartSeries {
	metric: string;
	type: 'line' | 'bar';
	zone?: string;
	country?: string;
	points: { week?: string; label?: string; value: number }[];
}

export interface InsightQueryResponse {
	answer: string;
	suggestions: string[];
	sessionId: string;
	chart_data: ChartSeries[];
	usage: {input_tokens: number; output_tokens: number; cache_read_input_tokens: number};
}

export async function handleInsightQuery(req: InsightQueryRequest): Promise<InsightQueryResponse> {
	const {question, sessionId} = req;

	appendMessage(sessionId, {role: 'user', content: question});
	const messages = getHistory(sessionId);

	let totalUsage = {input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0};
	const chartData: ChartSeries[] = [];

	// Agentic loop
	while (true) {
		const response = await anthropic.messages.create({
			model: 'claude-sonnet-4-6',
			max_tokens: 4096,
			system: buildSystemPrompt(),
			tools: TOOL_DEFINITIONS,
			messages
		});

		totalUsage.input_tokens += response.usage.input_tokens;
		totalUsage.output_tokens += response.usage.output_tokens;
		totalUsage.cache_read_input_tokens += (response.usage as unknown as Record<string, number>)['cache_read_input_tokens'] ?? 0;

		appendMessage(sessionId, {role: 'assistant', content: response.content});

		if (response.stop_reason === 'end_turn') {
			const textBlock = response.content.find((b) => b.type === 'text');
			const fullText = textBlock?.type === 'text' ? textBlock.text : '';

			const {answer, suggestions} = parseAnswerAndSuggestions(fullText);
			return {answer, suggestions, sessionId, chart_data: chartData, usage: totalUsage};
		}

		if (response.stop_reason === 'tool_use') {
			const toolResults: Anthropic.ToolResultBlockParam[] = [];

			for (const block of response.content) {
				if (block.type !== 'tool_use') continue;
				const result = await executeTool(block.name, block.input as Record<string, unknown>);

				if (block.name === 'get_trend' && result && typeof result === 'object' && 'trend' in result) {
					const r = result as {zone: string; country: string; metric: string; trend: {week: string; value: number}[]};
					chartData.push({type: 'line', metric: r.metric, zone: r.zone, country: r.country, points: r.trend});
				}

				if (block.name === 'filter_zones' && result && typeof result === 'object' && 'zones' in result) {
					const r = result as {metric: string; week: string; zones: {zone: string; value: number}[]};
					if (r.zones.length > 0) {
						chartData.push({
							type: 'bar',
							metric: `${r.metric} (${r.week})`,
							points: r.zones.map((z) => ({label: z.zone, value: z.value})),
						});
					}
				}

				if (block.name === 'compare_segments' && result && typeof result === 'object' && 'wealthy' in result) {
					const r = result as {metric: string; week: string; country: string; wealthy: {avg: number}; non_wealthy: {avg: number}};
					chartData.push({
						type: 'bar',
						metric: `${r.metric} — Wealthy vs Non-Wealthy${r.country !== 'all' ? ` (${r.country})` : ''} (${r.week})`,
						points: [
							{label: 'Wealthy',     value: Math.round(r.wealthy.avg    * 100) / 100},
							{label: 'Non-Wealthy', value: Math.round(r.non_wealthy.avg * 100) / 100},
						],
					});
				}

				if (block.name === 'aggregate_by' && result && typeof result === 'object' && 'data' in result) {
					const r = result as {metric: string; week: string; dimension: string; data: Record<string, number>[]};
					const dimKey = r.dimension === 'country' ? 'country' : 'zone_type';
					chartData.push({
						type: 'bar',
						metric: `${r.metric} por ${r.dimension === 'country' ? 'país' : 'tipo de zona'} (${r.week})`,
						points: r.data.map((d) => ({label: String(d[dimKey] ?? ''), value: Math.round((d['avg'] ?? 0) * 100) / 100})),
					});
				}

				toolResults.push({
					type: 'tool_result',
					tool_use_id: block.id,
					content: JSON.stringify(result)
				});
			}

			appendMessage(sessionId, {role: 'user', content: toolResults});
		}
	}
}

function parseAnswerAndSuggestions(text: string): {answer: string; suggestions: string[]} {
	const idx = text.indexOf('**Sugerencias:**');
	if (idx === -1) return {answer: text.trim(), suggestions: []};

	const answer = text.slice(0, idx).trim();
	const suggestionsBlock = text.slice(idx + '**Sugerencias:**'.length).trim();
	const suggestions = suggestionsBlock
		.split('\n')
		.map((l) => l.replace(/^[-*\d.]\s*/, '').trim())
		.filter(Boolean)
		.slice(0, 3);

	return {answer, suggestions};
}
