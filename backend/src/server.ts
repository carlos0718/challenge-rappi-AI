import dotenv from 'dotenv';
import express, {type Request, type Response} from 'express';
import {z} from 'zod';
import {handleInsightQuery} from './insightQuery/handler.js';
import {generateInsightsReport} from './insightsReport/handler.js';
import {getMetricsData} from './tools/dataLoader.js';
const env = dotenv.config();

const app = express();
const PORT = process.env['PORT'] ?? 3001;
console.log('PORT', PORT);
app.use(express.json());
app.use((_, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	next();
});

// Warm up data on startup
getMetricsData();
console.log('DataFrames loaded');

// POST /api/v1/insight-query
const insightQuerySchema = z.object({
	question: z.string().min(1),
	sessionId: z.string().min(1)
});

app.post('/api/v1/insight-query', async (req: Request, res: Response) => {
	const parsed = insightQuerySchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({error: parsed.error.flatten()});
		return;
	}
	try {
		const result = await handleInsightQuery(parsed.data);
		res.json(result);
	} catch (err) {
		console.error('/api/v1/insight-query error:', err);
		res.status(500).json({error: 'Internal server error'});
	}
});

// POST /api/v1/insights-report
app.post('/api/v1/insights-report', async (_req: Request, res: Response) => {
	try {
		const report = await generateInsightsReport();
		res.json(report);
	} catch (err) {
		console.error('/api/v1/insights-report error:', err);
		res.status(500).json({error: 'Internal server error'});
	}
});

app.get('/health', (_req, res) => res.json({status: 'ok'}));

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
