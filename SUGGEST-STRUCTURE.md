# Estructura Sugerida — Solución Técnica en 5 Pasos

Cada paso corresponde a una feature clave de la API de Anthropic aplicada al problema de Rappi.

---

## Paso 1 — System Prompt + Prompt Caching

### Problema que resuelve
El bot necesita conocer las 13 métricas de Rappi, sus definiciones, los 9 países, los tipos de zona y las reglas de negocio en cada conversación. Sin caching, esto costaría ~$0.04 por llamada solo en tokens de contexto.

### Implementación

```
src/
  config/
    systemPrompt.ts       ← Ensambla el prompt completo para la API
    metricsDict.ts        ← Las 13 métricas con definiciones (bloque cacheable)
    businessRules.ts      ← Países, zone types, reglas de benchmarking
```

**`src/config/metricsDict.ts`** — extracto:
```typescript
export const METRICS_DICTIONARY = `
## Diccionario de Métricas Operacionales

- **Lead Penetration**: % de usuarios que hicieron su primer pedido en una zona nueva
- **Perfect Orders**: % de pedidos sin incidencias (cancelaciones, demoras >30min, reclamos)
- **Gross Profit UE**: Ganancia bruta por unidad económica en la zona
- **Pro Adoption**: % de usuarios activos con suscripción Rappi Pro
- **Turbo Adoption**: % de pedidos realizados vía Turbo (entrega <20min)
... (13 métricas totales)
`;
```

**`src/config/systemPrompt.ts`** — estructura con caching:
```typescript
export function buildSystemPrompt(dynamicContext?: string) {
  return [
    {
      type: "text" as const,
      text: METRICS_DICTIONARY + "\n\n" + BUSINESS_RULES,
      cache_control: { type: "ephemeral" as const }  // ← TTL: 5 minutos
    },
    {
      type: "text" as const,
      text: `Eres un analista de datos de Rappi. Respondes preguntas sobre métricas operacionales
usando las tools disponibles. Siempre cita la métrica, zona y semana en tus respuestas.
${dynamicContext ?? ""}`
    }
  ];
}
```

### Ahorro de costos
- Sin caching: ~2,000 tokens de sistema × $3/1M = $0.006 por llamada
- Con caching: primeras 5 minutos = 10% del precio = $0.0006 por llamada
- **~90% de reducción** en sesiones de múltiples preguntas

---

## Paso 2 — Tool Use (6 Herramientas de Análisis)

### Problema que resuelve
Claude no puede leer el CSV directamente. Necesita "herramientas" que ejecuten consultas sobre el DataFrame y devuelvan resultados estructurados.

### Implementación

```
src/
  tools/
    definitions.ts              ← JSON schemas para la API de Anthropic
    dataLoader.ts               ← Carga el CSV como DataFrame de Danfo.js
    toolExecutor.ts             ← Dispatcher: tool_name → función TypeScript
    implementations/
      filterZones.ts
      compareSegments.ts
      getTrend.ts
      aggregateBy.ts
      multivariateAnalysis.ts
      getGrowthZones.ts
```

**`src/tools/definitions.ts`** — formato para la API:
```typescript
export const TOOL_DEFINITIONS = [
  {
    name: "filter_zones",
    description: "Filtra zonas según una métrica, operador y umbral para una semana específica",
    input_schema: {
      type: "object",
      properties: {
        metric: { type: "string", description: "Nombre de la métrica (ej: 'Lead Penetration')" },
        operator: { type: "string", enum: [">", "<", ">=", "<=", "=="] },
        threshold: { type: "number", description: "Valor umbral" },
        week: { type: "string", description: "Semana (ej: 'L0W', 'L1W', ... 'L8W')" }
      },
      required: ["metric", "operator", "threshold", "week"]
    }
  },
  // ... 5 tools más
];
```

**`src/tools/toolExecutor.ts`** — agentic loop dispatcher:
```typescript
export async function executeTool(toolName: string, toolInput: Record<string, unknown>) {
  switch (toolName) {
    case "filter_zones":          return filterZones(toolInput);
    case "compare_segments":      return compareSegments(toolInput);
    case "get_trend":             return getTrend(toolInput);
    case "aggregate_by":          return aggregateBy(toolInput);
    case "multivariate_analysis": return multivariateAnalysis(toolInput);
    case "get_growth_zones":      return getGrowthZones(toolInput);
    default: throw new Error(`Tool desconocida: ${toolName}`);
  }
}
```

### Las 6 tools

| Tool | Tipo de query | Ejemplo |
|------|--------------|---------|
| `filter_zones` | Filtrado | "Top 5 zonas con mayor Lead Penetration esta semana" |
| `compare_segments` | Comparación | "Wealthy vs Non-Wealthy en México" |
| `get_trend` | Temporal | "Evolución de Gross Profit en Chapinero últimas 8 semanas" |
| `aggregate_by` | Agregación | "Lead Penetration promedio por país" |
| `multivariate_analysis` | Multivariable | "Zonas con alta Lead Penetration pero bajo Perfect Order" |
| `get_growth_zones` | Inferencial | "Zonas que más crecen en órdenes (5 semanas)" |

---

## Paso 3 — Skill: /insight-query (Bot Conversacional)

### Problema que resuelve
El equipo SP&A necesita hacer preguntas en lenguaje natural sin saber SQL ni Python. El bot mantiene contexto entre preguntas de la misma sesión.

### Implementación

El skill se divide en dos capas siguiendo la convención de Claude Code:

```
.claude/
  skills/
    insight-query/
      SKILL.md                 ← slash command /insight-query
                                 (prompt de instrucción para Claude Code)

backend/src/
  insightQuery/
    handler.ts                 ← POST /api/v1/insight-query + agentic loop
    conversationStore.ts       ← Historial de conversación por sessionId
    proactiveSuggestions.ts    ← Sugerencias de follow-up
```

**Agentic loop en `handler.ts`:**
```typescript
async function agenticLoop(messages: MessageParam[], systemPrompt: TextBlockParam[]) {
  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      messages
    });

    // Añadir respuesta de Claude al historial
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Loop terminado: devolver texto final al usuario
      return extractTextContent(response.content);
    }

    if (response.stop_reason === "tool_use") {
      // Ejecutar cada tool solicitada
      const toolResults: ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result)
          });
        }
      }
      // Añadir resultados al historial y continuar el loop
      messages.push({ role: "user", content: toolResults });
    }
  }
}
```

**Flujo completo:**
```
Usuario: "Top 5 zonas con mayor Lead Penetration esta semana"
  ↓
Claude: llama filter_zones(metric="Lead Penetration", operator=">", threshold=0, week="L0W")
  ↓
Backend: ejecuta query en Danfo.js DataFrame → devuelve JSON con top 5 zonas
  ↓
Claude: interpreta resultado y responde en lenguaje natural con tabla formateada
  ↓
Sugerencias: "¿Quieres comparar con la semana anterior?" / "¿Ver tendencia de estas zonas?"
```

---

## Paso 4 — Skill: /insights-report (Reportes Automáticos)

### Problema que resuelve
Los equipos pierden horas semanales identificando problemas manualmente. El sistema genera un resumen ejecutivo con los top 5 hallazgos más relevantes.

### Implementación

```
.claude/
  skills/
    insights-report/
      SKILL.md                ← slash command /insights-report
                                (prompt de instrucción para Claude Code)

backend/src/
  insightsReport/
    handler.ts                ← POST /api/v1/insights-report
    anomalyDetector.ts        ← Cambios >10% WoW
    trendAnalyzer.ts          ← 3+ semanas de caída consecutiva
    benchmarker.ts            ← Comparación entre zonas similares
    correlationFinder.ts      ← Correlaciones entre métricas (Pearson r)
    reportFormatter.ts        ← Prompt a Claude con hallazgos estructurados
```

**Pipeline en `handler.ts`:**
```typescript
export async function generateInsightsReport(week = "L0W") {
  // 1. Análisis estadístico pre-procesado (sin LLM)
  const anomalies    = detectAnomalies(dataFrame, week, threshold = 0.10);
  const trends       = analyzeTrends(dataFrame, week, minWeeks = 3);
  const benchmarks   = runBenchmarking(dataFrame, week);
  const correlations = findCorrelations(dataFrame, week);

  // 2. Ensamblar contexto estructurado para Claude
  const analysisContext = formatAnalysisForPrompt({
    anomalies, trends, benchmarks, correlations, week
  });

  // 3. Claude genera la narrativa ejecutiva
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    system: buildSystemPrompt(),      // ← con caching
    messages: [{
      role: "user",
      content: `Basándote en este análisis estadístico de la semana ${week}, genera un reporte
ejecutivo con los top 5 hallazgos más relevantes y recomendaciones accionables:

${analysisContext}`
    }]
  });

  return parseReportResponse(response);
}
```

**Output estructurado:**
```json
{
  "week": "L0W",
  "generated_at": "2026-04-28T09:00:00Z",
  "top_findings": [
    {
      "rank": 1,
      "type": "anomaly",
      "severity": "high",
      "description": "Lead Penetration en Chapinero (CO) cayó 18% vs semana anterior",
      "metric": "Lead Penetration",
      "zone": "Chapinero",
      "country": "CO"
    }
  ],
  "recommendations": [
    "Revisar disponibilidad de restaurantes en Chapinero durante fin de semana"
  ],
  "at_risk_metrics": ["Lead Penetration", "Perfect Orders"]
}
```

---

## Paso 5 — Hook: Scheduler Semanal

### Problema que resuelve
El reporte debe generarse automáticamente cada lunes sin intervención humana.

### Implementación

Los hooks se organizan siguiendo la recomendación de seguridad de Anthropic de usar **rutas absolutas** en los scripts, combinada con un mecanismo de plantilla para que el proyecto sea compartible:

```
scripts/
  init-claude.js               ← reemplaza $PWD por la ruta absoluta real del proyecto

.claude/
  settings.example.json        ← commiteado: usa $PWD como placeholder (portable)
  settings.local.json          ← gitignored: generado por init-claude.js con rutas absolutas

backend/src/
  hooks/
    weeklyReport.ts            ← función TypeScript que implementa la lógica del hook
```

**Por qué este patrón:** Anthropic recomienda rutas absolutas en los scripts de hooks para evitar ataques de path interception y binary planting. Pero rutas absolutas hacen que `settings.json` no sea compartible entre máquinas (cada developer tiene el proyecto en un path distinto). La solución: `settings.example.json` con `$PWD` → `npm run setup` → `settings.local.json` con el path real.

**`scripts/init-claude.js`:**
```javascript
const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const examplePath = path.join(projectRoot, ".claude", "settings.example.json");
const localPath   = path.join(projectRoot, ".claude", "settings.local.json");

const template = fs.readFileSync(examplePath, "utf8");
const resolved = template.replaceAll("$PWD", projectRoot);

fs.writeFileSync(localPath, resolved, "utf8");
console.log(`✓ .claude/settings.local.json generado con rutas absolutas`);
```

**`.claude/settings.example.json`** — plantilla commiteada:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "insights-report",
        "hooks": [
          {
            "type": "command",
            "command": "node $PWD/backend/src/hooks/weeklyReport.ts"
          }
        ]
      }
    ]
  }
}
```

**`.claude/settings.local.json`** — generado (gitignored), ejemplo en una Mac:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "insights-report",
        "hooks": [
          {
            "type": "command",
            "command": "node /Users/carlos/projects/challenge-rappi-AI/backend/src/hooks/weeklyReport.ts"
          }
        ]
      }
    ]
  }
}
```

**`backend/src/hooks/weeklyReport.ts`** — función del hook:

**`backend/src/weeklyScheduler.ts`:**
```typescript
import cron from "node-cron";
import { generateInsightsReport } from "./insightsReport/handler";

// Cada lunes a las 9:00am (hora del servidor)
cron.schedule("0 9 * * 1", async () => {
  console.log(`[${new Date().toISOString()}] Iniciando generación de reporte semanal...`);

  try {
    const report = await generateInsightsReport();
    console.log(`[${new Date().toISOString()}] Reporte generado: ${report.top_findings.length} hallazgos`);
    
    // (Bonus) Distribuir el reporte
    await distributeReport(report);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error en scheduler:`, err);
  }
});
```

### Cron expressions usadas

| Frecuencia | Expresión |
|------------|-----------|
| Cada lunes 9am | `0 9 * * 1` |
| Cada día laboral 8am | `0 8 * * 1-5` |
| Cada hora | `0 * * * *` |

---

## Estructura de carpetas completa

```
challenge-rappi-AI/
├── package.json                     ← npm workspaces: ["backend", "frontend"]
├── CLAUDE.md
├── TO-DO.md
├── SUGGEST-STRUCTURE.md
├── EXPLAIN.md
├── .env.example
│
├── scripts/
│   └── init-claude.js               ← reemplaza $PWD → genera settings.local.json
│
├── .claude/                         ← convención Claude Code (Anthropic)
│   ├── skills/
│   │   ├── insight-query/
│   │   │   └── SKILL.md             ← Paso 3: slash command /insight-query
│   │   └── insights-report/
│   │       └── SKILL.md             ← Paso 4: slash command /insights-report
│   ├── agents/
│   │   ├── backend-expert.md        ← agente experto en backend (Node.js, Danfo.js, SDK)
│   │   └── frontend-expert.md      ← agente experto en frontend (Vite, React, Recharts, TanStack)
│   ├── settings.example.json        ← Paso 5: plantilla commiteada con $PWD
│   └── settings.local.json          ← Paso 5: generado por setup, gitignored
│
├── data/
│   ├── raw_input_metrics.csv        ← 12,574 filas (zona+métrica × semana)
│   └── raw_orders.csv               ← 1,243 filas
│
├── backend/                         ← Node.js 20 + Express + TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config/                  ← Paso 1: system prompt + caching
│       │   ├── systemPrompt.ts
│       │   ├── metricsDict.ts
│       │   └── businessRules.ts
│       ├── tools/                   ← Paso 2: 6 herramientas de análisis
│       │   ├── definitions.ts
│       │   ├── dataLoader.ts
│       │   ├── toolExecutor.ts
│       │   └── implementations/
│       │       ├── filterZones.ts
│       │       ├── compareSegments.ts
│       │       ├── getTrend.ts
│       │       ├── aggregateBy.ts
│       │       ├── multivariateAnalysis.ts
│       │       └── getGrowthZones.ts
│       ├── insightQuery/            ← Paso 3: lógica del bot conversacional
│       │   ├── handler.ts
│       │   ├── conversationStore.ts
│       │   └── proactiveSuggestions.ts
│       ├── insightsReport/          ← Paso 4: lógica de reportes automáticos
│       │   ├── handler.ts
│       │   ├── anomalyDetector.ts
│       │   ├── trendAnalyzer.ts
│       │   ├── benchmarker.ts
│       │   ├── correlationFinder.ts
│       │   └── reportFormatter.ts
│       ├── hooks/                   ← Paso 5: funciones que ejecutan los hooks
│       │   └── weeklyReport.ts      ← lógica del reporte semanal (invocada por el hook)
│       └── server.ts                ← Express app + rutas
│
└── frontend/                        ← React 19 + Vite 5 (SPA)
    ├── index.html
    ├── vite.config.ts               ← proxy /api → localhost:3001
    ├── package.json
    └── src/
        ├── main.tsx
        ├── App.tsx                  ← tabs Chat / Reportes (sin router)
        ├── types/api.ts
        └── components/
            ├── ChatInterface.tsx
            ├── ReportsPanel.tsx
            └── FindingCard.tsx
```

---

## Demo y Presentación (30 min)

### Paso 4 — Decisiones Técnicas (5 min)

#### Arquitectura elegida

```
CSV / Datos brutos
       ↓
Danfo.js DataFrames  ←──── 6 TypeScript tools
       ↓
Tool Executor (dispatcher)
       ↓
Claude Sonnet 4.6 (Agentic Loop)  ←── System Prompt cacheado
       ↓
Express API (/insight-query / /insights-report)
       ↓
Next.js Frontend (Chat + Reportes)
```

**¿Por qué esta arquitectura?**
- El LLM actúa como orquestador inteligente, no como motor de datos: Claude decide *qué* analizar, las tools ejecutan *cómo* hacerlo. Esto evita alucinaciones numéricas porque Claude nunca inventa datos, solo interpreta resultados reales del DataFrame.
- Danfo.js permite operar el CSV en memoria sin necesidad de base de datos, lo cual simplifica el deploy y reduce latencia.
- El agentic loop desacopla la lógica de negocio del LLM: si cambia un cálculo, solo se edita la tool, no el prompt.

#### Elección del LLM: Claude Sonnet 4.6

| Criterio | Claude Sonnet 4.6 | GPT-4o | Gemini 1.5 Pro |
|----------|------------------|--------|----------------|
| Soporte nativo de Tool Use | Sí | Sí | Sí |
| Prompt Caching | Sí (0.10× en cache hits) | No | Sí (limitado) |
| Costo input/output | $3 / $15 por 1M | $5 / $15 por 1M | $3.5 / $10.5 por 1M |
| Calidad de razonamiento analítico | Alta | Alta | Alta |
| SDK TypeScript oficial | `@anthropic-ai/sdk` | `openai` | `@google/generative-ai` |

**Decisión**: Sonnet 4.6 gana por **Prompt Caching nativo**, que reduce ~90% el costo de tokens repetidos del diccionario de métricas. Para un caso de uso con contexto fijo largo y muchas llamadas, es la opción más económica sin sacrificar calidad.

#### Trade-offs principales

| Decisión | Alternativa descartada | Razón del trade-off |
|----------|----------------------|---------------------|
| Danfo.js en memoria | PostgreSQL / BigQuery | Simplicidad de deploy vs. escalabilidad. Para el MVP con datos dummy es suficiente; con datos reales de Rappi se migraría a SQL. |
| Historial en memoria (Map) | Redis / base de datos | Sin persistencia entre reinicios. Aceptable para demo; en producción se usaría Redis. |
| node-cron para scheduler | n8n / Airflow | Menor overhead de infraestructura. n8n sería mejor para workflows complejos con notificaciones. |
| Tool Use (6 tools fijas) | RAG sobre datos | Tools dan resultados deterministas y auditables. RAG sería más flexible pero menos preciso en números. |
| Next.js monorepo | Frontend separado | Simplifica deploy en una sola instancia para la demo. |

---

### Paso 5 — Limitaciones y Próximos Pasos (2 min)

#### Limitaciones actuales

| Limitación | Impacto | Solución con más tiempo |
|------------|---------|------------------------|
| Datos en memoria (sin persistencia) | El historial de conversaciones se pierde al reiniciar | Migrar a Redis para sessions + PostgreSQL para datos |
| CSV estático | No refleja datos en tiempo real de Rappi | Conectar a API interna de Rappi o warehouse (BigQuery/Snowflake) |
| Sin autenticación | Cualquiera puede acceder a los endpoints | Agregar JWT + middleware de autenticación |
| Prompt caching con TTL de 5 min | En sesiones con >5 min de inactividad se pierde el cache | Evaluar cache persistente (beta en Anthropic) o refrescar activamente |
| 6 tools fijas | No puede responder preguntas fuera del scope predefinido | Ampliar con tools dinámicas o RAG sobre métricas nuevas |
| Sin manejo de errores de rate limit | La API de Anthropic tiene límites por minuto | Implementar retry con exponential backoff |

#### ¿Qué mejorarías con más tiempo?

1. **Persistencia real**: Migrar el DataFrame a PostgreSQL y el historial de conversación a Redis. Esto permite escalar a múltiples instancias y sobrevivir reinicios.

2. **Streaming en el frontend**: Activar `stream: true` en el agentic loop para que el usuario vea la respuesta aparecer token a token, mejorando la UX especialmente en respuestas largas.

3. **Extended Thinking para análisis inferenciales**: Para queries del tipo "¿qué explica el crecimiento de estas zonas?", activar `thinking: { type: "enabled", budget_tokens: 8000 }` daría respuestas significativamente más profundas.

4. **Tool `generate_chart()`**: Permitir que Claude solicite generar visualizaciones dinámicas (líneas, barras, scatter) según el tipo de análisis, renderizadas con Recharts en el frontend.

5. **Fine-tuning del system prompt**: Con datos reales y feedback de los analistas SP&A, refinar las instrucciones para mejorar la calidad de respuestas en los casos edge.

6. **Exportación a PDF/CSV**: Añadir endpoint que genere el reporte ejecutivo como archivo descargable para distribución en reuniones.

7. **Deploy en la nube**: Containerizar con Docker y desplegar en Railway/Render con variables de entorno seguras. Estimar costos reales con tráfico de producción.

---

### Paso 6 — Q&A (10 min)

#### Preguntas frecuentes anticipadas

**¿Por qué no usar SQL directamente en lugar de Danfo.js?**
> Para el MVP con datos dummy en CSV, Danfo.js es suficiente y elimina la necesidad de mantener una base de datos. En producción con datos reales de Rappi, la migración a SQL sería el primer paso.

**¿Cómo garantizas que Claude no inventa números?**
> Las tools retornan datos directamente del DataFrame. Claude nunca genera números por sí mismo, solo interpreta los resultados de las tools. El prompt incluye la instrucción explícita: "Solo usa datos de las tools disponibles, nunca inventes valores."

**¿Cuánto costaría en producción para el equipo real de Rappi?**
> Con 10 usuarios, 50 sesiones/semana de 10 preguntas cada una, y 4 reportes semanales: ~$10-20 USD/mes con prompt caching activo. Sin caching sería ~$100-200 USD/mes.

**¿Por qué Sonnet 4.6 y no Opus 4.7?**
> Opus tiene mejor razonamiento pero cuesta ~5× más. Para consultas analíticas estructuradas con tools bien definidas, Sonnet 4.6 da la misma calidad de respuesta. Opus se reservaría para análisis inferenciales muy complejos.

**¿Cómo escalaría si Rappi lo desplegara para todos los países?**
> 1) Reemplazar CSV por conexión a warehouse (BigQuery). 2) Redis para cache de sesiones. 3) Load balancer frente a múltiples instancias de Express. 4) Prompt caching persistente cuando Anthropic lo libere en GA.
