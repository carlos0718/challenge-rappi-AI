# TO-DO — Sistema de Análisis Inteligente para Operaciones Rappi

## Fase 0 — Setup del proyecto

- [x] Inicializar proyecto Node.js 20 + TypeScript con npm workspaces (`backend/` + `frontend/`)
- [x] Configurar `scripts/init-claude.js` — reemplaza `$PWD` en `settings.example.json` → `settings.local.json`
- [x] `npm run setup` disponible en root (`npm install && node scripts/init-claude.js`)
- [x] Instalar dependencias de backend:
    - [x] `@anthropic-ai/sdk`
    - [x] `express` + `@types/express`
    - [x] `node-cron`
    - [x] `dotenv`
    - [x] `zod`
- [x] Instalar dependencias de frontend (Vite + React 19):
    - [x] `react`, `react-dom` (v19)
    - [x] `@tanstack/react-table`
    - [x] `recharts`
    - [x] `tailwindcss`
    - [x] `vite` + `@vitejs/plugin-react`
    - [x] `react-markdown` + `remark-gfm`
- [x] Crear `.env.example` con variables requeridas
- [x] Configurar `.gitignore` (`.env`, `node_modules`, `dist`, `.next`, `settings.local.json`)
- [ ] Copiar archivos CSV a `data/` ← **carpeta inexistente, datos aún no cargados**
    - [ ] `data/raw_input_metrics.csv` (12,574 filas)
    - [ ] `data/raw_orders.csv` (1,243 filas)
- [ ] Verificar que los CSV cargan correctamente con Danfo.js

---

## Fase 1 — System Prompt + Prompt Caching

- [x] Crear `backend/src/config/metricsDict.ts` con las 13 métricas y sus definiciones
- [x] Crear `backend/src/config/businessRules.ts` con países, zone types y reglas de negocio
- [x] Crear `backend/src/config/systemPrompt.ts` que ensamble el prompt completo
- [ ] Verificar que `cache_control: { type: "ephemeral" }` está aplicado al bloque del diccionario
- [ ] Verificar en logs que los tokens cacheados aparecen en `usage.cache_read_input_tokens`

---

## Fase 2 — Tools (Function Calling con Danfo.js)

- [x] Crear `backend/src/tools/dataLoader.ts` — carga y parseo de CSV en DataFrames globales
- [x] Crear `backend/src/tools/definitions.ts` — JSON schemas de las 6 tools para la API de Anthropic
- [x] Implementar `backend/src/tools/implementations/filterZones.ts`
- [x] Implementar `backend/src/tools/implementations/compareSegments.ts`
- [x] Implementar `backend/src/tools/implementations/getTrend.ts`
- [x] Implementar `backend/src/tools/implementations/aggregateBy.ts`
- [x] Implementar `backend/src/tools/implementations/multivariateAnalysis.ts`
- [x] Implementar `backend/src/tools/implementations/getGrowthZones.ts`
- [x] Crear `backend/src/tools/toolExecutor.ts` — dispatcher de `tool_use` blocks
- [ ] Tests unitarios para cada tool con datos del CSV dummy

---

## Fase 3 — Skill: /insight-query (Bot Conversacional)

- [x] Crear `backend/src/insightQuery/handler.ts`
    - `POST /api/v1/insight-query` recibe `{ question: string, sessionId: string }`
- [x] Crear `backend/src/insightQuery/conversationStore.ts`
    - Almacena `messages[]` por `sessionId` en memoria (Map)
- [ ] Verificar agentic loop completo en `handler.ts`:
    ```
    1. Añadir pregunta del usuario a messages[]
    2. Llamar a Claude con tools + system prompt cacheado
    3. Si stop_reason === "tool_use": ejecutar tools, añadir tool_result, volver al paso 2
    4. Si stop_reason === "end_turn": devolver respuesta final
    ```
- [ ] Crear `backend/src/insightQuery/proactiveSuggestions.ts` ← **archivo faltante**
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

- [x] Crear `backend/src/insightsReport/handler.ts`
    - `POST /api/v1/insights-report` recibe `{ week?: string }`
- [x] Implementar `backend/src/insightsReport/anomalyDetector.ts`
- [x] Implementar `backend/src/insightsReport/trendAnalyzer.ts`
- [x] Implementar `backend/src/insightsReport/benchmarker.ts`
- [x] Implementar `backend/src/insightsReport/correlationFinder.ts`
- [ ] Crear `backend/src/insightsReport/reportFormatter.ts` ← **archivo faltante**
    - Ensambla los hallazgos y los envía a Claude para generar narrativa ejecutiva
- [ ] Verificar output JSON estructurado: `top_findings[]`, `recommendations[]`, `at_risk_metrics[]`
- [ ] Validar detección de anomalías con datos del CSV dummy

---

## Fase 5 — Hook: Scheduler Semanal

- [x] Crear `backend/src/hooks/weeklyReport.ts`
    - Cron: `"0 9 * * 1"` (lunes a las 9am)
    - Llama automáticamente al endpoint `/api/v1/insights-report`
- [ ] Verificar logging de cada ejecución con timestamp y estado
- [ ] (Bonus) Crear `backend/src/hooks/reportDistributor.ts` para envío por email/Slack

---

## Fase 6 — Frontend (Vite + React 19)

- [x] Setup de Vite + React 19 en `frontend/` (SPA — **no Next.js**)
- [x] `frontend/index.html` — entry point de Vite
- [x] `frontend/vite.config.ts` — proxy `/api` → `localhost:3001`
- [x] Crear `frontend/src/components/ChatInterface.tsx`
    - Input de texto + historial de mensajes con soporte Markdown
- [x] Crear `frontend/src/components/ReportsPanel.tsx` — panel de reportes automáticos
- [x] Crear `frontend/src/components/FindingCard.tsx` — tarjeta de un finding
- [x] Crear `frontend/src/App.tsx` — tabs Chat / Reportes
- [x] Crear `frontend/src/components/MetricsTable.tsx`
    - Tabla con TanStack Table para resultados tabulares
- [x] Crear `frontend/src/components/TrendChart.tsx`
    - Gráfico de líneas con Recharts para tendencias temporales
- [ ] Conectar frontend con endpoints del backend y probar flujo completo
- [ ] (Bonus) Agregar tool `generate_chart()` para visualizaciones dinámicas

---

## Fase 7 — Testing, Documentación y Demo

- [ ] Escribir tests de integración para el agentic loop completo
- [ ] Validar los 6 tipos de queries end-to-end
- [ ] Verificar que prompt caching está activo (`usage.cache_read_input_tokens`)
- [ ] Calcular costo estimado real vs estimado (~$10-20 USD/mes para 10 usuarios)
- [ ] Preparar demo de 20 minutos:
    - [ ] Slide de arquitectura (2 min)
    - [ ] Demo del bot con los 6 tipos de queries (10 min)
    - [ ] Demo del reporte automático (5 min)
    - [ ] Costos y conclusiones (3 min)
- [ ] (Bonus) Deploy en Railway / Render / Vercel

---

## Métricas de éxito

| Criterio               | Peso | Estado      |
| ---------------------- | ---- | ----------- |
| Arquitectura & Diseño  | 15%  | En progreso |
| Calidad del Bot        | 35%  | En progreso |
| Calidad de Insights    | 30%  | En progreso |
| Código & Documentación | 5%   | En progreso |
| Presentación           | 20%  | Pendiente   |
