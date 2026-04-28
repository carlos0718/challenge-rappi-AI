# Rappi AI — Sistema de Análisis Inteligente para Operaciones

Sistema conversacional que democratiza el acceso a insights operacionales de Rappi. Permite al equipo SP&A consultar métricas en lenguaje natural y recibe reportes ejecutivos automáticos semanales, usando **Claude Sonnet 4.6** como LLM central.

---

## Autor

**Carlos Jesus**  
📧 cajs0718@gmail.com  
💼 [linkedin.com/in/carlos-jesus-dev](https://www.linkedin.com/in/carlos-jesus-dev/)  
🌐 [portfolio-master-carlos-jesus.vercel.app](https://portfolio-master-carlos-jesus.vercel.app/)  
🐙 [github.com/carlos0718](https://github.com/carlos0718)

---

## Cómo funciona

### Arquitectura general

```
Usuario (pregunta en lenguaje natural)
        ↓
Frontend React/Vite  →  POST /api/v1/insight-query
        ↓
Express handler (backend)
        ↓
Agentic Loop con Claude Sonnet 4.6
  ├─ Claude decide qué tool llamar
  ├─ toolExecutor ejecuta la función sobre los CSVs
  ├─ resultado → Claude interpreta y responde
  └─ loop hasta stop_reason: "end_turn"
        ↓
Respuesta en lenguaje natural + gráficos → Frontend
```

### Las dos funcionalidades principales

| Skill              | Endpoint                       | Descripción                                                                                                                  |
| ------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Bot conversacional | `POST /api/v1/insight-query`   | Responde preguntas sobre métricas en lenguaje natural, mantiene historial de sesión y genera gráficos automáticamente        |
| Reporte automático | `POST /api/v1/insights-report` | Genera un reporte ejecutivo semanal con hallazgos clasificados por categoría, recomendaciones accionables y descarga en HTML |

---

## Instalación y ejecución

### Requisitos

- Node.js 20+
- Cuenta de Anthropic con API Key activa

### Setup

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd challenge-rappi-AI

# 2. Instalar dependencias y generar configuración local
npm run setup

# 3. Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env y completar ANTHROPIC_API_KEY
```

### Desarrollo

```bash
# Inicia backend (puerto 3001) + frontend (puerto 3000) en paralelo
npm run dev
```

Abrir `http://localhost:3000` en el browser.

### Variables de entorno (`backend/.env`)

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
METRICS_CSV_PATH=./data/raw_input_metrics.csv
ORDERS_CSV_PATH=./data/raw_orders.csv
```

---

## Datos

Los CSVs están en `data/` y se cargan en memoria al iniciar el backend:

| Archivo                 | Filas  | Descripción                                                   |
| ----------------------- | ------ | ------------------------------------------------------------- |
| `raw_input_metrics.csv` | 12,574 | Una fila por (zona × métrica), columnas `L8W_ROLL … L0W_ROLL` |
| `raw_orders.csv`        | 1,243  | Órdenes por zona, columnas `L8W … L0W`                        |

**9 países**: AR, BR, CL, CO, CR, EC, MX, PE, UY  
**13 métricas**: Lead Penetration, MLTV Top Verticals Adoption, Gross Profit UE, % Restaurants Sessions With Optimal Assortment, y más  
**Zonas**: Wealthy / Non-Wealthy × Not Prioritized / Prioritized / High Priority

---

## Herramientas de análisis (Tool Use)

Claude puede llamar 6 herramientas para responder preguntas:

| Tool                    | Descripción                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `filter_zones`          | Top/bottom N zonas para una métrica en una semana dada         |
| `compare_segments`      | Compara Wealthy vs Non-Wealthy para una métrica y país         |
| `get_trend`             | Evolución de una métrica en una zona a lo largo de las semanas |
| `aggregate_by`          | Agrega una métrica por país o tipo de zona                     |
| `multivariate_analysis` | Zonas donde una métrica es alta y otra baja simultáneamente    |
| `get_growth_zones`      | Zonas con mayor crecimiento en las últimas N semanas           |

El loop agéntico continúa mientras Claude devuelva `stop_reason: "tool_use"` y termina con `stop_reason: "end_turn"`.

---

## Costos de API y técnicas de optimización

### Precios de Claude Sonnet 4.6

| Tipo de token     | Precio        |
| ----------------- | ------------- |
| Input (sin caché) | $3.00 / MTok  |
| **Cache write**   | $3.75 / MTok  |
| **Cache read**    | $0.30 / MTok  |
| Output            | $15.00 / MTok |

> Fuente: [Anthropic Pricing](https://www.anthropic.com/pricing)

---

### Técnica 1 — Prompt Caching

El system prompt está dividido en dos bloques. El primero (diccionario de métricas + reglas de negocio) se marca como cacheable:

```typescript
// backend/src/config/systemPrompt.ts
system: [
	{
		type: 'text',
		text: `${METRICS_DICTIONARY}\n\n${BUSINESS_RULES}`,
		cache_control: {type: 'ephemeral'} // ← bloque cacheado
	},
	{
		type: 'text',
		text: dynamicInstruction // ← bloque dinámico (no cacheado)
	}
];
```

**Impacto real:**  
El bloque cacheado tiene ~600 tokens. En una sesión con 10 preguntas:

| Sin caché                         | Con caché                                         |
| --------------------------------- | ------------------------------------------------- |
| 10 × 600 tok = 6,000 input tokens | 1 cache write + 9 cache reads                     |
| 10 × $3.00/MTok = **$0.018**      | $0.00225 (write) + $0.00162 (reads) = **$0.0039** |

**Ahorro: ~78%** en los tokens del system prompt por sesión.

El TTL del caché ephemeral es de **5 minutos**. Mientras el usuario siga activo en la misma sesión, cada pregunta paga solo $0.30/MTok en lugar de $3.00/MTok por ese bloque.

---

### Técnica 2 — Historial de conversación stateless

El historial se almacena en el backend por `sessionId` (Map en memoria) y se envía completo en cada llamada. Esto evita re-procesar contexto en el frontend y permite que Claude mantenga coherencia sin estado en la API:

```typescript
// backend/src/insightQuery/conversationStore.ts
const store = new Map<string, MessageParam[]>();

export function getHistory(sessionId: string): MessageParam[];
export function appendMessage(sessionId: string, message: MessageParam): void;
```

Los mensajes `tool_result` también se agregan al historial para que Claude recuerde qué datos ya consultó y no repita llamadas.

---

### Técnica 3 — Pre-procesamiento estadístico en el reporte

Para el endpoint `/insights-report`, el análisis estadístico se corre en el servidor **antes** de llamar a Claude. Se le entrega un resumen ya procesado en lugar del CSV completo:

```
Antes: enviar 12,574 filas → Claude analiza → ~50,000 tokens input
Ahora: detectAnomalies() + analyzeTrends() + runBenchmarking() + findCorrelations()
       → resumen de ~800 tokens → Claude genera narrativa
```

**Ahorro estimado: ~98%** en tokens de input para el reporte.

---

### Técnica 4 — Carga de datos en memoria (singleton)

Los CSVs se parsean una sola vez al iniciar el servidor y se cachean en variables del módulo. Cada herramienta opera sobre arrays en memoria con `.filter()` / `.map()` / `.reduce()`, sin I/O en cada request:

```typescript
let _metricsData: MetricRow[] | null = null;

export function getMetricsData(): MetricRow[] {
  if (_metricsData) return _metricsData;  // cache hit
  _metricsData = parseCsv(...);           // solo la primera vez
  return _metricsData;
}
```

---

### Estimación de costo por uso típico

| Escenario                                | Tokens aprox.            | Costo estimado |
| ---------------------------------------- | ------------------------ | -------------- |
| 1 pregunta al bot (cache hit)            | 800 input + 400 output   | ~$0.008        |
| 1 pregunta con 2 tool calls (cache hit)  | 1,500 input + 600 output | ~$0.014        |
| 1 reporte ejecutivo completo             | 1,200 input + 800 output | ~$0.016        |
| Sesión típica (10 preguntas + 1 reporte) | ~18,000 tokens totales   | ~$0.12         |

> Estimaciones con precios de Claude Sonnet 4.6 al 28/04/2026. Los primeros tokens de cada sesión incluyen un cache write; los subsiguientes pagan cache read.

---

## Stack tecnológico

| Capa      | Tecnología                                 |
| --------- | ------------------------------------------ |
| LLM       | Claude Sonnet 4.6 (`claude-sonnet-4-6`)    |
| Backend   | Node.js 20 + Express + TypeScript          |
| Frontend  | React 19 + Vite 5 + Tailwind CSS           |
| Gráficos  | Recharts                                   |
| Tablas    | TanStack Table                             |
| Scheduler | node-cron (reporte semanal cada lunes 9am) |
| SDK       | @anthropic-ai/sdk                          |

## Estructura del proyecto

```
challenge-rappi-AI/
├── data/                        # CSVs con datos operacionales
├── backend/src/
│   ├── config/                  # System prompt + prompt caching
│   ├── tools/                   # 6 herramientas de análisis
│   ├── insightQuery/            # Bot conversacional (70% del score)
│   ├── insightsReport/          # Reportes automáticos (30% del score)
│   ├── hooks/                   # Scheduler semanal (node-cron)
│   └── server.ts                # Express app
└── frontend/src/
    ├── components/
    │   ├── ChatInterface.tsx     # Chat con historial, markdown y gráficos
    │   ├── ReportsPanel.tsx      # Panel de reportes + descarga HTML
    │   └── FindingCard.tsx       # Tarjeta de hallazgo con recomendación
    └── types/api.ts              # Contratos con el backend
```
