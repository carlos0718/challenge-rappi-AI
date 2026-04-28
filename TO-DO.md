# TO-DO — Sistema de Análisis Inteligente para Operaciones Rappi

## Fase 0 — Setup del proyecto

- [ ] Inicializar proyecto Node.js 20 + TypeScript (`npm init`, `tsconfig.json`)
- [ ] Instalar dependencias de backend:
  - `@anthropic-ai/sdk`
  - `express` + `@types/express`
  - `danfojs-node`
  - `mathjs`
  - `simple-statistics`
  - `node-cron`
  - `dotenv`
  - `zod` (validación de inputs)
- [ ] Instalar dependencias de frontend (Next.js app):
  - `next`, `react`, `react-dom`
  - `@tanstack/react-table`
  - `recharts`
  - `tailwindcss`
- [ ] Crear `.env.example` con variables requeridas
- [ ] Configurar `.gitignore` (incluir `.env`, `node_modules`, `dist`)
- [ ] Copiar archivo CSV de datos a `data/rappi_operations.csv`
- [ ] Verificar que el CSV carga correctamente con Danfo.js

---

## Fase 1 — System Prompt + Prompt Caching

- [ ] Crear `src/config/metricsDict.ts` con las 13 métricas y sus definiciones
- [ ] Crear `src/config/businessRules.ts` con países, zone types y reglas de negocio
- [ ] Crear `src/config/systemPrompt.ts` que ensamble el prompt completo
- [ ] Aplicar `cache_control: { type: "ephemeral" }` al bloque del diccionario de métricas
- [ ] Verificar en logs que los tokens cacheados aparecen en `usage.cache_read_input_tokens`

---

## Fase 2 — Tools (Function Calling con Danfo.js)

- [ ] Crear `src/tools/dataLoader.ts` — carga y parseo del CSV en un DataFrame global
- [ ] Crear `src/tools/definitions.ts` — JSON schemas de las 6 tools para la API de Anthropic
- [ ] Implementar `src/tools/implementations/filterZones.ts`
  - Parámetros: `metric`, `operator` (`>`, `<`, `>=`, `<=`), `threshold`, `week`
- [ ] Implementar `src/tools/implementations/compareSegments.ts`
  - Parámetros: `metric`, `zone_type` (`Wealthy` | `Non-Wealthy`), `country`
- [ ] Implementar `src/tools/implementations/getTrend.ts`
  - Parámetros: `zone`, `metric`, `n_weeks`
- [ ] Implementar `src/tools/implementations/aggregateBy.ts`
  - Parámetros: `dimension` (`country` | `zone_type`), `metric`, `week`
- [ ] Implementar `src/tools/implementations/multivariateAnalysis.ts`
  - Parámetros: `metric_high`, `metric_low`, `threshold`
- [ ] Implementar `src/tools/implementations/getGrowthZones.ts`
  - Parámetros: `n_weeks`, `top_n`
- [ ] Crear `src/tools/toolExecutor.ts` — dispatcher que recibe `tool_use` blocks y ejecuta la función correcta
- [ ] Tests unitarios para cada tool con datos del CSV dummy

---

## Fase 3 — Skill: /insight-query (Bot Conversacional)

- [ ] Crear `src/skills/insightQuery/handler.ts`
  - `POST /api/v1/insight-query` recibe `{ question: string, sessionId: string }`
  - Implementar agentic loop completo
- [ ] Crear `src/skills/insightQuery/conversationStore.ts`
  - Almacena `messages[]` por `sessionId` en memoria (Map)
- [ ] Implementar agentic loop:
  ```
  1. Añadir pregunta del usuario a messages[]
  2. Llamar a Claude con tools + system prompt cacheado
  3. Si stop_reason === "tool_use": ejecutar tools, añadir tool_result a messages[], volver al paso 2
  4. Si stop_reason === "end_turn": devolver respuesta final
  ```
- [ ] Crear `src/skills/insightQuery/proactiveSuggestions.ts`
  - Genera 2-3 preguntas relacionadas sugeridas después de cada respuesta
- [ ] Probar los 6 tipos de queries definidos en el doc:
  - [ ] Filtrado: "Top 5 zonas con mayor Lead Penetration esta semana"
  - [ ] Comparaciones: "Compara Perfect Order entre zonas Wealthy/Non-Wealthy en México"
  - [ ] Tendencias temporales: "Evolución de Gross Profit UE en Chapinero últimas 8 semanas"
  - [ ] Agregaciones: "Lead Penetration promedio por país"
  - [ ] Multivariable: "Zonas con alta Lead Penetration pero bajo Perfect Order"
  - [ ] Inferencial: "Qué zonas crecen más en órdenes (5 semanas) y qué lo explica"

---

## Fase 4 — Skill: /insights-report (Reportes Automáticos)

- [ ] Crear `src/skills/insightsReport/handler.ts`
  - `POST /api/v1/insights-report` recibe `{ week?: string }` (default: semana más reciente)
- [ ] Implementar `src/skills/insightsReport/anomalyDetector.ts`
  - Detecta cambios >10% semana a semana en cualquier métrica/zona
- [ ] Implementar `src/skills/insightsReport/trendAnalyzer.ts`
  - Detecta 3+ semanas consecutivas de caída en una métrica
- [ ] Implementar `src/skills/insightsReport/benchmarker.ts`
  - Compara zonas similares del mismo tipo (Wealthy vs Wealthy, etc.)
- [ ] Implementar `src/skills/insightsReport/correlationFinder.ts`
  - Encuentra correlaciones entre métricas usando `simple-statistics`
- [ ] Implementar `src/skills/insightsReport/reportFormatter.ts`
  - Ensambla los hallazgos y los envía a Claude para generar narrativa ejecutiva
- [ ] Output del reporte: JSON estructurado con `top_findings[]`, `recommendations[]`, `at_risk_metrics[]`
- [ ] Validar detección de anomalías con datos del CSV dummy

---

## Fase 5 — Hook: Scheduler Semanal

- [ ] Crear `src/hooks/weeklyScheduler.ts`
  - Cron: `"0 9 * * 1"` (lunes a las 9am)
  - Llama automáticamente al endpoint `/api/v1/insights-report`
- [ ] Añadir logging de cada ejecución con timestamp y estado
- [ ] (Bonus) Crear `src/hooks/reportDistributor.ts` para envío por email/Slack

---

## Fase 6 — Frontend (Next.js + React)

- [ ] Setup de Next.js app en `frontend/`
- [ ] Crear `frontend/components/ChatInterface.tsx`
  - Input de texto + historial de mensajes con soporte Markdown
  - Indicador de carga mientras Claude procesa
- [ ] Crear `frontend/components/MetricsTable.tsx`
  - Tabla con TanStack Table para mostrar resultados tabulares
- [ ] Crear `frontend/components/TrendChart.tsx`
  - Gráfico de líneas con Recharts para tendencias temporales
- [ ] Crear `frontend/pages/index.tsx` — página principal con chat
- [ ] Crear `frontend/pages/reports.tsx` — panel de reportes automáticos
- [ ] Conectar frontend con endpoints del backend via `fetch`/`axios`
- [ ] (Bonus) Agregar tool `generate_chart()` para visualizaciones dinámicas

---

## Fase 7 — Testing, Documentación y Demo

- [ ] Escribir tests de integración para el agentic loop completo
- [ ] Validar los 6 tipos de queries end-to-end
- [ ] Verificar que prompt caching está activo (revisar `usage.cache_read_input_tokens`)
- [ ] Calcular costo estimado real vs estimado (~$10-20 USD/mes para 10 usuarios)
- [ ] Actualizar `EXPLAIN.md` con cualquier concepto nuevo descubierto durante implementación
- [ ] Preparar demo de 20 minutos:
  - [ ] Slide de arquitectura (2 min)
  - [ ] Demo del bot con los 6 tipos de queries (10 min)
  - [ ] Demo del reporte automático (5 min)
  - [ ] Costos y conclusiones (3 min)
- [ ] (Bonus) Deploy en Railway / Render / Vercel

---

## Métricas de éxito

| Criterio | Peso | Estado |
|----------|------|--------|
| Arquitectura & Diseño | 15% | Pendiente |
| Calidad del Bot | 35% | Pendiente |
| Calidad de Insights | 30% | Pendiente |
| Código & Documentación | 5% | Pendiente |
| Presentación | 20% | Pendiente |
